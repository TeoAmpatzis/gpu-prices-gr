"""Run every source, merge with previous data, write public/data/*.json.

A source that fails or returns 0 listings keeps its previous listings (marked ok=false)
so one broken scraper never blanks the site."""

import argparse
import json
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import http_client  # noqa: E402
from normalize import now_iso  # noqa: E402
from sources import bestprice, skroutz  # noqa: E402

SOURCES = {
    "skroutz": skroutz.fetch,
    "bestprice": bestprice.fetch,
}

DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "data"
LATEST = DATA_DIR / "latest.json"
HISTORY = DATA_DIR / "history.json"
HISTORY_DAYS = 365


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def model_key(l: dict) -> str:
    """Grouping key shared with the frontend (src/lib/data.ts): "RTX 5060 Ti 16GB"."""
    return f"{l['chip']} {l['vram']}GB"


def update_history(history: dict, listings: list[dict], day: str) -> dict:
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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=SOURCES.keys(), action="append")
    ap.add_argument("--debug", action="store_true", help="dump fetched HTML to scraper/debug/")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    http_client.debug = args.debug

    prev = load_json(LATEST, {"sources": {}, "listings": []})
    prev_by_source: dict[str, list[dict]] = {}
    for l in prev.get("listings", []):
        prev_by_source.setdefault(l["source"], []).append(l)

    run_at = now_iso()
    sources_meta: dict[str, dict] = {}
    listings: list[dict] = []
    for name, fetch in SOURCES.items():
        if args.only and name not in args.only:
            old = prev_by_source.get(name, [])
            listings += old
            if name in prev.get("sources", {}):
                sources_meta[name] = prev["sources"][name]
            continue
        print(f"[{name}] fetching…")
        try:
            got = [l.to_dict() for l in fetch()]
        except Exception:
            traceback.print_exc()
            got = []
        if got:
            listings += got
            sources_meta[name] = {"count": len(got), "ok": True, "updatedAt": run_at}
            print(f"[{name}] {len(got)} listings")
        else:
            old = prev_by_source.get(name, [])
            listings += old
            prev_meta = prev.get("sources", {}).get(name, {})
            sources_meta[name] = {"count": len(old), "ok": False, "updatedAt": prev_meta.get("updatedAt")}
            print(f"[{name}] FAILED — keeping {len(old)} previous listings")

    listings.sort(key=lambda l: (l["brand"], l["chip"], l["price"]))
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LATEST.write_text(
        json.dumps({"updatedAt": run_at, "sources": sources_meta, "listings": listings}, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    fresh = [l for l in listings if sources_meta.get(l["source"], {}).get("ok")]
    history = update_history(load_json(HISTORY, {}), fresh, run_at[:10])
    HISTORY.write_text(json.dumps(history, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {len(listings)} listings, {len(history)} models in history")
    return 0 if any(m["ok"] for m in sources_meta.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
