"""Snapshot/check source freshness and listing coverage in an ephemeral CI checkout."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
from categories import CATEGORIES  # noqa: E402

DATA = Path(__file__).resolve().parents[2] / "public" / "data"


def read_categories() -> dict:
    return {cat: json.loads((DATA / cat / "latest.json").read_text(encoding="utf-8")) for cat in CATEGORIES}


def count(data: dict) -> int:
    return sum(row.get("source") == "skroutz" for row in data.get("listings", []))


def ids(data: dict) -> set[str]:
    return {row["id"] for row in data.get("listings", []) if row.get("source") == "skroutz"}


def check(before: dict, after: dict) -> list[str]:
    errors = []
    started = datetime.fromisoformat(before["started_at"].replace("Z", "+00:00"))
    for cat in CATEGORIES:
        data = after.get(cat, {})
        meta = data.get("sources", {}).get("skroutz", {})
        previous = before["categories"][cat]["count"]
        current = count(data)
        try:
            updated = datetime.fromisoformat((meta.get("updatedAt") or "").replace("Z", "+00:00"))
            fresh = updated >= started
        except (ValueError, TypeError):
            fresh = False
        if meta.get("ok") is not True or not fresh:
            errors.append(f"{cat}: no successful Skroutz update from this run")
        if current == 0 or current != meta.get("count") or current != len(ids(data)):
            errors.append(f"{cat}: empty listings or count mismatch ({current} vs {meta.get('count')})")
        if current * 10 < previous * 7:
            errors.append(f"{cat}: more than 30% fewer listings ({previous} -> {current})")
    return errors


if __name__ == "__main__":
    mode, snapshot_path = sys.argv[1:]
    if mode == "snapshot":
        current = read_categories()
        snapshot = {"started_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
                    "categories": {cat: {"count": count(data), "ids": sorted(ids(data)),
                                         "updatedAt": data.get("sources", {}).get("skroutz", {}).get("updatedAt")}
                                   for cat, data in current.items()}}
        Path(snapshot_path).write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    elif mode == "check":
        snapshot = json.loads(Path(snapshot_path).read_text(encoding="utf-8"))
        current = read_categories()
        errors = check(snapshot, current)
        report = {"errors": errors, "categories": {
            cat: {"before": snapshot["categories"][cat]["count"], "after": count(data),
                  "added_ids": len(ids(data) - set(snapshot["categories"][cat]["ids"])),
                  "removed_ids": len(set(snapshot["categories"][cat]["ids"]) - ids(data)),
                  "source": data.get("sources", {}).get("skroutz", {})}
            for cat, data in current.items()}}
        print(json.dumps(report, indent=2))
        Path("skroutz-validation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        sys.exit(1 if errors else 0)
    else:
        raise SystemExit("Use snapshot or check")
