"""Run every source for every category, merge with previous data, write
public/data/<category>/{latest,history}.json.

A source that fails or returns 0 listings keeps its previous listings (marked ok=false)
so one broken scraper never blanks the site."""

import argparse
import json
import os
import sys
import time
import traceback
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import aliases  # noqa: E402
import capabilities  # noqa: E402
import http_client  # noqa: E402
import makers  # noqa: E402
import overrides  # noqa: E402
import ranges  # noqa: E402
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
            if any(isinstance(v, list) for v in values):
                # Lists (a case's included fans) can't be counted: the most detailed one goes to the
                # listings without one (positions, then sizes, then the count).
                best = max(values, key=lambda v: (sum(1 for x in v if x.get("pos")), sum(1 for x in v if x.get("size")), sum(x.get("n") or 0 for x in v)))
                for l in ls:
                    if l.get(f) is None:
                        l[f] = best
                continue
            if f in SAFER:  # measurements: when sites disagree, every listing gets the safer value
                safe = SAFER[f](values)
                if max(values) - min(values) > 5:
                    disagreements[f] += 1
                for l in ls:
                    l[f] = safe
                continue
            if f in PRIORITY:  # the most specific value wins for every listing (a drive's tier)
                top = min(values, key=PRIORITY[f].index)
                for l in ls:
                    l[f] = top
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
TRI_STATE = {"coolerIncluded", "dram", "heatsink"}
# Fields whose values rank: any listing saying "Server" makes the model Server (normalize_storage).
PRIORITY = {"tier": ["Server", "NAS", "Consumer"]}
SAFER = specs.SAFER  # measurements: the safer of two disagreeing values
disagreements: Counter = Counter()  # per run, logged by finish()


# Product photos: the sources read a photo URL from the pages they already fetch (no extra request);
# the images workflow (scraper/images.py, run in the images repo) downloads one per model.
IMAGE_PREFERENCE = ["bestprice", "shopflix", "skroutz", "snif"]  # 500px, 530px, 250px, the shop's own
IMAGE_CANDIDATES = 4


def write_image_urls(out_dir: Path, listings: list[dict], model_key) -> None:
    """public/data/<cat>/image_urls.json: {model key: [photo URLs, best first]}. Takes the `image`
    field off the listings (latest.json stays as it was) and keeps the previous candidates of models
    still listed, since a source that failed this run reuses its previous listings, which have none."""
    path = out_dir / "image_urls.json"
    prev = load_json(path, {})
    found: dict[str, dict[str, str]] = {}
    keys = set()
    for l in listings:
        key = model_key(l)
        keys.add(key)
        url = l.pop("image", None)
        if url:
            found.setdefault(key, {}).setdefault(l["source"], url)
    out = {}
    for key in sorted(keys):
        now = [found.get(key, {})[s] for s in IMAGE_PREFERENCE if s in found.get(key, {})]
        urls = list(dict.fromkeys(now + prev.get(key, [])))[:IMAGE_CANDIDATES]
        if urls:
            out[key] = urls
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def drop_images(listings: list[dict]) -> None:
    """A category without a photo job (Category.images False): its listings must not keep the shop's photo URL,
    or it rides along in latest.json and every list file (about 40% of the monitor list's size)."""
    for l in listings:
        l.pop("image", None)
        l.pop("photoSku", None)


def update_history(history: dict, listings: list[dict], day: str, model_key, model_aliases: dict | None = None) -> dict:
    """One point per model per day: the lowest price seen that day across runs. Renamed models
    (scraper/model_aliases.json) first move their points to the new key (aliases.fold_history, idempotent)."""
    aliases.fold_history(history, model_aliases or {})
    cheapest: dict[str, dict] = {}
    for l in listings:
        key = model_key(l)
        c = cheapest.get(key)
        if c is None or l["price"] < c["price"]:
            cheapest[key] = l
    for key, l in cheapest.items():
        points = history.setdefault(key, [])
        if points and points[-1]["d"] == day:
            # Our own point beats an imported one for the same day (merge_history._pick).
            if points[-1].get("i") or l["price"] < points[-1]["min"]:
                points[-1] = {"d": day, "min": l["price"], "source": l["source"]}
        else:
            points.append({"d": day, "min": l["price"], "source": l["source"]})
        del points[:-HISTORY_DAYS]
    return dict(sorted(history.items()))


def write_history(cat: str, model_key, out_dir: Path, listings: list[dict], fresh: list[dict], day: str,
                  model_aliases: dict | None = None) -> dict:
    """history.json (+ history_imported.json markers) for one scrape: renamed models are folded first,
    except an old key that has listings again (taken from ALL listings, also the kept ones of a failed
    source); then today's points from the fresh listings."""
    out_dir.mkdir(parents=True, exist_ok=True)
    history_path = out_dir / "history.json"
    live = {model_key(l) for l in listings}
    folding = aliases.active(cat, aliases.for_cat(cat) if model_aliases is None else model_aliases, live)
    history = update_history(load_json(history_path, {}), fresh, day, model_key, folding)
    site_history.follow_aliases(out_dir, folding)
    history_path.write_text(json.dumps(history, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return history


def finish(cat: Category, out_dir: Path, listings: list[dict]) -> None:
    """Cached observations and shared fields, with early-category identity stable before publication."""
    specs.apply(cat.name, out_dir, listings)
    if cat.name in specs.EARLY and cat.settle:
        overrides.apply(cat.name, listings, cat.model_key)  # exact-ID observations participate in identity
        cat.settle(listings)
    accepted = [l for l in listings if not l.get("reject")] if cat.rejects else listings
    dropped = ranges.clean(cat.name, accepted, None)  # scraping errors out, before SAFER joins values
    dropped.update(makers.apply(cat.name, accepted))  # maker values are checked inside; counted here too
    disagreements.clear()
    share_fields(accepted, cat.shared, cat.model_key)
    for fields, key in cat.shared_by:
        share_fields(accepted, fields, key)
    if disagreements:
        print(f"[{cat.name}] sites disagree by >5 (safer value kept): {dict(disagreements)}")
    if dropped:
        print(f"[{cat.name}] range: values dropped as implausible: {dict(dropped)}")
    overrides.apply(cat.name, accepted, cat.model_key)  # manual fixes win over everything above
    if cat.name in specs.EARLY and cat.settle:
        cat.settle(listings)  # shared observations must not rename the next retained scrape


def stage(out_dir: Path, listings: list[dict], sources_meta: dict[str, dict], run_at: str) -> None:
    """Take the listings settle() rejected out of `listings` and write them with their reason to rejected.json,
    so nothing is dropped silently. A source that was not freshly scraped in this run (failed, or left out by
    --only) keeps its previous rejects: its listings were retained, so the report must still describe them."""
    rejected_by_id = {l["id"]: l for l in listings if l.get("reject")}
    listings[:] = [l for l in listings if not l.get("reject")]
    path = out_dir / "rejected.json"
    for l in load_json(path, {}).get("listings", []):
        meta = sources_meta.get(l["source"], {})
        if not (meta.get("ok") is True and meta.get("updatedAt") == run_at):
            rejected_by_id.setdefault(l["id"], l)
    rejected = sorted(rejected_by_id.values(), key=lambda l: (l["reject"], l["id"]))
    counts: dict[str, int] = {}
    for l in rejected:
        counts[l["reject"]] = counts.get(l["reject"], 0) + 1
    path.write_text(json.dumps({"updatedAt": run_at, "counts": counts, "listings": rejected}, ensure_ascii=False, indent=1),
                    encoding="utf-8")
    print(f"[{out_dir.name}] rejected {len(rejected)}: {counts}")


def allowed(cat: Category, listings: list[dict], operation: str) -> list[dict]:
    """The listings whose source may do `operation` for this category (capabilities.py); the dicts are the
    same objects, so what an operation writes reaches the originals. An unsupported pair is skipped, not failed."""
    return [l for l in listings if capabilities.supports(l["source"], cat.name, operation)]


def collect_specs(cats: list[Category], budget: dict[str, int], makers_budget: int) -> None:
    """New product pages for every category — the shops' (one queue per site, see specs.collect) and
    the makers' (makers.collect), all hosts in parallel — then the specs re-applied to each
    latest.json. Runs after all the lists, and alone with --specs-only."""
    loaded = []
    for cat in cats:
        data = load_json(DATA_DIR / cat.name / "latest.json", None)
        if data and cat.name in specs.PARSERS:
            loaded.append((cat, data))
    print("specs…")
    with ThreadPoolExecutor(max_workers=2) as pool:
        shops = pool.submit(specs.collect, [(cat.name, DATA_DIR / cat.name, allowed(cat, data["listings"], capabilities.SPECS),
                                             cat.model_key) for cat, data in loaded], budget)
        makers_done = pool.submit(makers.collect, {cat.name: allowed(cat, data["listings"], capabilities.SPECS)
                                                   for cat, data in loaded}, makers_budget)
        shops.result()
        makers_done.result()
    for cat, data in loaded:
        out_dir = DATA_DIR / cat.name
        finish(cat, out_dir, data["listings"])
        if cat.name in specs.EARLY:
            stage(out_dir, data["listings"], {}, data["updatedAt"])
            for source, meta in data["sources"].items():
                meta["count"] = sum(l["source"] == source for l in data["listings"])
            write_image_urls(out_dir, data["listings"], cat.model_key)
            data["listings"].sort(key=lambda l: (l["chip"], l["price"]))
        (out_dir / "latest.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def report_sources(category: str, sources: dict[str, dict], attempted: list[str]) -> None:
    """Expose failed sources in Actions while preserving the scrape's partial-success policy."""
    rows = []
    for name in attempted:
        meta = sources[name]
        last_success = meta.get("updatedAt") or "never"
        count = meta["count"]
        status = "fresh" if meta["ok"] else "failed; retained"
        rows.append(f"| {name} | {status} | {count} | {last_success} |")
        if not meta["ok"] and os.environ.get("GITHUB_ACTIONS") == "true":
            message = (f"{category}/{name}: scrape failed; retained {count} previous listings; "
                       f"last successful update: {last_success}")
            message = message.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
            print(f"::warning::{message}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary and rows:
        with Path(summary).open("a", encoding="utf-8") as out:
            out.write(f"\n### {category} source results\n\n"
                      "| Source | Result | Listings | Last successful update |\n"
                      "| --- | --- | ---: | --- |\n"
                      + "\n".join(rows) + "\n")


def scrape_category(cat: Category, only: list[str] | None, with_shipping: bool = True) -> bool:
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

    seconds: dict[str, float] = {}  # per source, for the [timing] line (measurement only)

    def run(name: str) -> list[dict]:
        print(f"[{cat.name}/{name}] fetching…")
        http_client.set_label(f"{cat.name}/{name}")
        start = time.monotonic()
        try:
            return [l.to_dict() for l in SOURCES[name](cat)]
        except Exception:
            traceback.print_exc()
            return []
        finally:
            seconds[f"{cat.name}/{name}"] = time.monotonic() - start

    # Sources are different sites, so they run in parallel; each stays polite to its own host.
    # A source the category does not use (capabilities.py) is not run and never reported as failed.
    wanted = [name for name in SOURCES if (not only or name in only) and capabilities.supports(name, cat.name, capabilities.LISTS)]
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
        if name == "skroutz" and got:
            errors = skroutz.snapshot_errors(got, len(prev_by_source.get(name, [])))
            if errors:
                print(f"[{cat.name}/{name}] rejected snapshot: {'; '.join(errors)}")
                got = []
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
    if cat.name in specs.EARLY:
        finish(cat, out_dir, listings)
    elif cat.settle:  # before any model key is used (photos, specs sharing, history)
        cat.settle(listings)
    if cat.rejects:
        stage(out_dir, listings, sources_meta, run_at)
        for name, meta in sources_meta.items():  # a fresh source's count = the listings kept, as the check compares
            if meta.get("ok") is True and meta.get("updatedAt") == run_at:
                meta["count"] = sum(1 for l in listings if l["source"] == name)
    if cat.images:
        write_image_urls(out_dir, listings, cat.model_key)
    else:
        drop_images(listings)
    if cat.name not in specs.EARLY:
        finish(cat, out_dir, listings)
    listings.sort(key=lambda l: (l["chip"], l["price"]))
    if with_shipping:
        enrich_shipping(cat, listings)
    latest_path.write_text(
        json.dumps({"updatedAt": run_at, "sources": sources_meta, "listings": listings}, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    fresh = [l for l in listings if l["source"] in results and sources_meta[l["source"]]["ok"]]
    history = write_history(cat.name, cat.model_key, out_dir, listings, fresh, run_at[:10])
    print(f"[{cat.name}] wrote {len(listings)} listings, {len(history)} models in history")
    print(http_client.summary(f"{cat.name} sources", seconds))
    report_sources(cat.name, sources_meta, wanted)
    return any(sources_meta[name]["ok"] for name in wanted)



def enrich_shipping(cat: Category, listings: list[dict]) -> None:
    """Refresh shipping after listing retries, or apply cached totals when its budget is zero."""
    print(f"[{cat.name}] best totals (price + shipping)...")
    label = f"{cat.name}/shipping"
    http_client.set_label(label)
    start = time.monotonic()
    try:
        shipping.enrich(DATA_DIR / cat.name, allowed(cat, listings, capabilities.SHIPPING), cat.model_key)
    finally:
        print(http_client.summary(f"{cat.name} shipping", {label: time.monotonic() - start}))
        http_client.set_label(None)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=SOURCES.keys(), action="append")
    ap.add_argument("--category", choices=CATEGORIES.keys(), action="append")
    ap.add_argument("--debug", action="store_true", help="dump fetched HTML to scraper/debug/")
    ap.add_argument("--no-shipping", action="store_true", help="skip the price + shipping refresh (cache still applied)")
    ap.add_argument("--specs-budget", type=int, help="product pages per site for specs (default: specs.BUDGET)")
    ap.add_argument("--makers-budget", type=int, default=makers.BUDGET, help="makers' product pages per maker")
    ap.add_argument("--specs-only", action="store_true", help="only backfill specs into the existing latest.json")
    ap.add_argument("--history-only", action="store_true", help="only import Skroutz price history into history.json")
    ap.add_argument("--history-budget", type=int, default=site_history.BUDGET, help="price_graph requests per category")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    http_client.debug = args.debug

    if args.no_shipping:
        shipping.BUDGET = {src: 0 for src in shipping.BUDGET}
    if args.only:  # a run limited to some sources makes no shipping/spec requests to the others
        for budget in (shipping.BUDGET, specs.BUDGET):
            for site in budget:
                if site not in args.only:
                    budget[site] = 0
    cats = [cat for name, cat in CATEGORIES.items() if not args.category or name in args.category]
    if args.history_only:
        for cat in cats:
            data = load_json(DATA_DIR / cat.name / "latest.json", None)
            if data and capabilities.supports("skroutz", cat.name, capabilities.HISTORY):
                print(f"[{cat.name}] price history…")
                site_history.enrich(cat.name, DATA_DIR / cat.name, data["listings"], cat.model_key, args.history_budget)
        return 0
    budget = specs.BUDGET if args.specs_budget is None else {site: args.specs_budget for site in specs.BUDGET}
    if args.specs_only:
        collect_specs(cats, budget, args.makers_budget)
        return 0
    cats = run_order(cats)
    print("order: " + ", ".join(cat.name for cat in cats))
    start = time.monotonic()
    # Listings get the shared retry allowance before optional shipping requests consume it.
    ok = [scrape_category(cat, args.only, with_shipping=False) for cat in cats]
    if not args.only or "skroutz" in args.only:
        # A challenge can clear later in the same run. One fresh-session pass over failed
        # categories keeps the existing retry allowance; successful categories are not repeated.
        for cat in cats:
            data = load_json(DATA_DIR / cat.name / "latest.json", {})
            if data.get("sources", {}).get("skroutz", {}).get("ok") is False:
                print(f"[{cat.name}/skroutz] retrying after the listing pass...")
                ok.append(scrape_category(cat, ["skroutz"], with_shipping=False))
    lists = time.monotonic() - start
    for cat in cats:
        path = DATA_DIR / cat.name / "latest.json"
        data = load_json(path, None)
        if data:
            enrich_shipping(cat, data["listings"])
            path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    collect_specs(cats, budget, args.makers_budget)
    rest = time.monotonic() - start - lists
    print(f"[timing] run: lists {lists:.0f}s, specs + makers {rest:.0f}s, total {lists + rest:.0f}s")
    other = http_client.stats().get("other")
    if other:
        print(f"[timing] requests without a label: {other}")
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
