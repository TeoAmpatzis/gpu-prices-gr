"""Check a published monitor snapshot without settling or changing its observations.

Usage: python scripts/checks/monitor_admission.py <latest.json>
Exit 0: nonempty and clean; 1: admission violations; 2: invalid input.
"""
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
from normalize_monitor import rejection_reason


def check_rows(listings: list[dict]) -> list[tuple[str, str]]:
    """Return offending ID/reason pairs; malformed or empty input raises ValueError."""
    if not isinstance(listings, list) or not listings:
        raise ValueError("listings must be a nonempty list")
    problems = []
    for row in listings:
        if not isinstance(row, dict) or any(not isinstance(row.get(k), str) or not row[k].strip()
                                            for k in ("id", "title")):
            raise ValueError("each listing requires nonempty id and title strings")
        for key in ("size", "pgSize"):
            size = row.get(key)
            if size is not None and (isinstance(size, bool) or not isinstance(size, (int, float))
                                     or not math.isfinite(size) or size <= 0):
                raise ValueError(f"{row['id']}: invalid {key}")
        if row.get("reject") is not None and not isinstance(row["reject"], str):
            raise ValueError(f"{row['id']}: invalid reject")
        reason = row.get("reject") or rejection_reason(row["title"], size=row.get("size") or row.get("pgSize"))
        if not reason and any(not isinstance(row.get(k), str) or not row[k].strip() or row[k] == "Other"
                              for k in ("brand", "code")):
            reason = "no-identity"
        if not reason and (not isinstance(row.get("chip"), str) or not row["chip"].strip()):
            reason = "no-model-key"
        if reason:
            problems.append((row["id"], reason))
    return problems


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("usage: monitor_admission.py <latest.json>", file=sys.stderr)
        return 2
    try:
        data = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("snapshot must be an object")
        problems = check_rows(data.get("listings"))
    except (OSError, UnicodeError, ValueError) as exc:
        print(f"invalid input: {exc}", file=sys.stderr)
        return 2
    for lid, reason in problems:
        print(f"{lid}: {reason}")
    print(f"{len(data['listings'])} listings, {len(problems)} admission violations")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
