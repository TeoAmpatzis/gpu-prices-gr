"""Snapshot/check source freshness and listing coverage in an ephemeral CI checkout."""
import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
from categories import CATEGORIES  # noqa: E402
from sources import skroutz  # noqa: E402

DATA = Path(__file__).resolve().parents[2] / "public" / "data"


def read_categories(ref: str | None = None) -> dict:
    if ref is not None and not re.fullmatch(r"[0-9a-f]{40}", ref):
        raise ValueError("Expected a full data commit SHA")
    def read(cat):
        if ref is None:
            return (DATA / cat / "latest.json").read_text(encoding="utf-8")
        return subprocess.check_output(["git", "show", f"{ref}:public/data/{cat}/latest.json"],
                                       cwd=DATA.parent.parent, text=True, encoding="utf-8")
    return {cat: json.loads(read(cat)) for cat in CATEGORIES}


def count(data: dict) -> int:
    return sum(row.get("source") == "skroutz" for row in data.get("listings", []))


def ids(data: dict) -> set[str]:
    return {row["id"] for row in data.get("listings", [])
            if row.get("source") == "skroutz" and isinstance(row.get("id"), str)}


def check(before: dict, after: dict) -> list[str]:
    errors = []
    started = datetime.fromisoformat(before["started_at"].replace("Z", "+00:00"))
    ended = datetime.fromisoformat(before["finished_at"].replace("Z", "+00:00")) if before.get("finished_at") else datetime.now(timezone.utc)
    for cat in CATEGORIES:
        data = after.get(cat, {})
        meta = data.get("sources", {}).get("skroutz", {})
        previous = before["categories"][cat]["count"]
        current = count(data)
        try:
            updated = datetime.fromisoformat((meta.get("updatedAt") or "").replace("Z", "+00:00"))
            fresh = started <= updated <= ended
        except (ValueError, TypeError):
            fresh = False
        if meta.get("ok") is not True or not fresh:
            errors.append(f"{cat}: no successful Skroutz update from this run")
        if current == 0 or current != meta.get("count") or current != len(ids(data)):
            errors.append(f"{cat}: empty listings or count mismatch ({current} vs {meta.get('count')})")
        rows = [row for row in data.get("listings", []) if row.get("source") == "skroutz"]
        errors.extend(f"{cat}: {error}" for error in skroutz.snapshot_errors(rows, previous))
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("snapshot", "finish", "check"))
    parser.add_argument("snapshot_path", type=Path)
    parser.add_argument("--ref", help="Check the exact published 40-character commit SHA")
    args = parser.parse_args()
    mode, snapshot_path = args.mode, args.snapshot_path
    if mode == "snapshot":
        current = read_categories()
        snapshot = {"started_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
                    "categories": {cat: {"count": count(data), "ids": sorted(ids(data)),
                                         "updatedAt": data.get("sources", {}).get("skroutz", {}).get("updatedAt")}
                                   for cat, data in current.items()}}
        snapshot_path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    elif mode == "finish":
        snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
        snapshot["finished_at"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        snapshot_path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    elif mode == "check":
        snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
        current = read_categories(args.ref)
        errors = check(snapshot, current)
        report = {"errors": errors, "data_commit": args.ref, "started_at": snapshot["started_at"],
                  "finished_at": snapshot.get("finished_at"), "categories": {
            cat: {"before": snapshot["categories"][cat]["count"], "after": count(data),
                  "added_ids": len(ids(data) - set(snapshot["categories"][cat]["ids"])),
                  "removed_ids": len(set(snapshot["categories"][cat]["ids"]) - ids(data)),
                  "source": data.get("sources", {}).get("skroutz", {})}
            for cat, data in current.items()}}
        print(json.dumps(report, indent=2))
        Path("skroutz-validation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        sys.exit(1 if errors else 0)
