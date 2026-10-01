"""Run every source for every category, merge with previous data, write
public/data/<category>/{latest,history}.json.

A source that fails or returns 0 listings keeps its previous listings (marked ok=false)
so one broken scraper never blanks the site."""

import argparse
import json
import sys
import time
import traceback
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import http_client  # noqa: E402
import shipping  # noqa: E402
import site_history  # noqa: E402
import specs  # noqa: E402
from categories import CATEGORIES, Category  # noqa: E402
from normalize import now_iso  # noqa: E402
from sources import bestprice, eshop, shopflix, skroutz, snif  # noqa: E402

SOURCES = {
    "skroutz": skroutz.fetch,
    "bestprice": bestprice.fetch,
    "snif": snif.fetch,
    "shopflix": shopflix.fetch,
    "eshop": eshop.fetch,
}

DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "data"
HISTORY_DAYS = 365


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def share_fields(listings: list[dict], fields: tuple[str, ...], model_key) -> None:
    """Fill each model's missing `fields` from its other listings: bools become true if any listing
    says so, other values take the model's most common one (a spec only one site states).
    `model_key` may return None for listings that must not be grouped."""
    models: dict[str, list[dict]] = {}
    for l in listings:
        if (key := model_key(l)) is not None:
            models.setdefault(key, []).append(l)
    for ls in models.values():
        for f in fields:
            values = [l.get(f) for l in ls if l.get(f) is not None]
            if not values:
                continue
            if f in TRI_STATE:  # an explicit "no" is information too: only fill gaps
                common = Counter(values).most_common(1)[0][0]
                for l in ls:
                    if l.get(f) is None:
                        l[f] = common
                continue
            if all(isinstance(v, bool) for v in values):
                if any(values):
                    for l in ls:
                        l[f] = True
                continue
            common = Counter(values).most_common(1)[0][0]
            for l in ls:
                if l.get(f) is None:
                    l[f] = common


# Bool fields where None means "not stated": shared by majority, not by "any true".
TRI_STATE = {"coolerIncluded"}


def update_history(history: dict, listings: list[dict], day: str, model_key) -> dict:
    """One point per model per day: the lowest price seen that day across runs."""
    cheapest: dict[str, dict] = {}
    for l in listings:
        key = model_key(l)
        c = cheapest.get(key)
        if c is None or l["price"] < c["price"]:
            cheapest[key] = l
    for key, l in cheapest.items():
        points = history.setdefault(key, [])
        if points and points[-1]["d"] == day:
            if l["price"] < points[-1]["min"]:
                points[-1] = {"d": day, "min": l["price"], "source": l["source"]}
        else:
            points.append({"d": day, "min": l["price"], "source": l["source"]})
        del points[:-HISTORY_DAYS]
    return dict(sorted(history.items()))


def finish(cat: Category, out_dir: Path, listings: list[dict], specs_budget: int) -> None:
    """Product-page specs, then fields shared across a model's listings."""
    print(f"[{cat.name}] specs…")
    specs.enrich(cat.name, out_dir, listings, cat.model_key, specs_budget)
    share_fields(listings, cat.shared, cat.model_key)
    for fields, key in cat.shared_by:
        share_fields(listings, fields, key)


def specs_only(cat: Category, budget: int) -> None:
    """Backfill product-page specs into the current latest.json without scraping (--specs-only)."""
    out_dir = DATA_DIR / cat.name
    path = out_dir / "latest.json"
    data = load_json(path, None)
    if not data or cat.name not in specs.PARSERS:
        return
    finish(cat, out_dir, data["listings"], budget)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def scrape_category(cat: Category, only: list[str] | None, with_shipping: bool = True,
                    specs_budget: int = specs.BUDGET) -> bool:
    """Scrape one category and write its JSON files. Returns True if any source succeeded."""
    out_dir = DATA_DIR / cat.name
    latest_path, history_path = out_dir / "latest.json", out_dir / "history.json"
    prev = load_json(latest_path, {"sources": {}, "listings": []})
    prev_by_source: dict[str, list[dict]] = {}
    for l in prev.get("listings", []):
        prev_by_source.setdefault(l["source"], []).append(l)

    run_at = now_iso()
    sources_meta: dict[str, dict] = {}
    listings: list[dict] = []

    def run(name: str) -> list[dict]:
        print(f"[{cat.name}/{name}] fetching…")
        try:
            return [l.to_dict() for l in SOURCES[name](cat)]
        except Exception:
            traceback.print_exc()
            return []

    # Sources are different sites, so they run in parallel; each stays polite to its own host.
    wanted = [name for name in SOURCES if not only or name in only]
    with ThreadPoolExecutor(max_workers=len(wanted) or 1) as pool:
        results = dict(zip(wanted, pool.map(run, wanted)))

    for name in SOURCES:
        if name not in results:
            old = prev_by_source.get(name, [])
            listings += old
            if name in prev.get("sources", {}):
                sources_meta[name] = prev["sources"][name]
            continue
        got = results[name]
        if got:
            listings += got
            sources_meta[name] = {"count": len(got), "ok": True, "updatedAt": run_at}
            print(f"[{cat.name}/{name}] {len(got)} listings")
        else:
            old = prev_by_source.get(name, [])
            listings += old
            prev_meta = prev.get("sources", {}).get(name, {})
            sources_meta[name] = {"count": len(old), "ok": False, "updatedAt": prev_meta.get("updatedAt")}
            print(f"[{cat.name}/{name}] FAILED — keeping {len(old)} previous listings")

    out_dir.mkdir(parents=True, exist_ok=True)
    finish(cat, out_dir, listings, specs_budget)
    listings.sort(key=lambda l: (l["chip"], l["price"]))
    if with_shipping:
        print(f"[{cat.name}] best totals (price + shipping)…")
        shipping.enrich(out_dir, listings, cat.model_key)
    latest_path.write_text(
        json.dumps({"updatedAt": run_at, "sources": sources_meta, "listings": listings}, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    fresh = [l for l in listings if sources_meta.get(l["source"], {}).get("ok")]
    history = update_history(load_json(history_path, {}), fresh, run_at[:10], cat.model_key)
    history_path.write_text(json.dumps(history, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"[{cat.name}] wrote {len(listings)} listings, {len(history)} models in history")
    return any(m["ok"] for m in sources_meta.values())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=SOURCES.keys(), action="append")
    ap.add_argument("--category", choices=CATEGORIES.keys(), action="append")
    ap.add_argument("--debug", action="store_true", help="dump fetched HTML to scraper/debug/")
    ap.add_argument("--no-shipping", action="store_true", help="skip the price + shipping refresh (cache still applied)")
    ap.add_argument("--specs-budget", type=int, default=specs.BUDGET, help="product pages per category for specs")
    ap.add_argument("--specs-only", action="store_true", help="only backfill specs into the existing latest.json")
    ap.add_argument("--history-only", action="store_true", help="only import Skroutz price history into history.json")
    ap.add_argument("--history-budget", type=int, default=site_history.BUDGET, help="price_graph requests per category")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    http_client.debug = args.debug

    if args.no_shipping:
        shipping.BUDGET = {src: 0 for src in shipping.BUDGET}
    cats = [cat for name, cat in CATEGORIES.items() if not args.category or name in args.category]
    if args.history_only:
        for cat in cats:
            data = load_json(DATA_DIR / cat.name / "latest.json", None)
            if data:
                print(f"[{cat.name}] price history…")
                site_history.enrich(cat.name, DATA_DIR / cat.name, data["listings"], cat.model_key, args.history_budget)
        return 0
    if args.specs_only:
        for cat in cats:
            specs_only(cat, args.specs_budget)
        return 0
    cats = run_order(cats)
    print("order: " + ", ".join(cat.name for cat in cats))
    ok = [scrape_category(cat, args.only, specs_budget=args.specs_budget) for cat in cats]
    return 0 if any(ok) else 1


def run_order(cats: list[Category]) -> list[Category]:
    """Categories whose Skroutz scrape failed last run go first, then the rest; each group is rotated
    by the 6-hour run slot. Retry waiting is capped per run (http_client.RETRY_CAP), so this keeps the
    same category from always being the one that finds the allowance used up."""
    slot = int(time.time() // (6 * 3600))

    def failed(cat: Category) -> bool:
        prev = load_json(DATA_DIR / cat.name / "latest.json", {})
        return prev.get("sources", {}).get("skroutz", {}).get("ok") is False

    def rotate(xs: list[Category]) -> list[Category]:
        k = slot % len(xs) if xs else 0
        return xs[k:] + xs[:k]

    bad = [cat for cat in cats if failed(cat)]
    return rotate(bad) + rotate([cat for cat in cats if cat.name not in {b.name for b in bad}])


if __name__ == "__main__":
    sys.exit(main())
