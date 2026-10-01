"""Safe merging of the history files, which both data workflows write.

On 2026-09-30 a scrape that had waited in the queue started from an old checkout and its commit
(`git pull --rebase -X theirs`) replaced history.json, wiping the Skroutz history imported meanwhile.
This script makes that impossible:

  driver BASE OURS THEIRS PATH   git merge driver for history.json / history_imported.json
                                 (.gitattributes): a 3-way merge per (model, day), so points added
                                 on either side are kept and only a deliberate removal on one side
                                 removes; the result is written to OURS. Unreadable input exits 1
                                 (git then reports a conflict and the job stops).
  check REF [--allow-shrink]     run before every push: fails if any (model, day) point that REF
                                 (origin/main) has is missing now, other than the oldest points
                                 trimmed by the 365-point limit. --allow-shrink (workflow input
                                 allow_history_shrink, for planned changes such as merging
                                 duplicate products) logs what was removed and passes.
  restore COMMIT [--dry-run]     merges the history files of COMMIT into the current ones (all
                                 categories); models marked imported that still have no imported
                                 point lose their marker, so the importer fetches them again.

History rules (the same as main.update_history and site_history.merge): one point per model and
day; on a day both sides have, the lower price wins (on a tie our own point beats an imported
`"i": 1` one); at most KEEP points per model, the newest.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "public" / "data"
KEEP = 365  # main.HISTORY_DAYS = site_history.KEEP_DAYS
CATEGORIES = ["gpu", "cpu", "mobo", "ram", "psu", "case", "fan", "cooler"]


# ---------- history.json ----------

def _pick(a: dict, b: dict) -> dict:
    """Two points for the same model and day: the lower price; on a tie our own (not imported)."""
    if a["min"] != b["min"]:
        return a if a["min"] < b["min"] else b
    return a if not a.get("i") else b


def _by_day(points: list[dict]) -> dict[str, dict]:
    return {p["d"]: p for p in points}


def merge_history(base: dict, ours: dict, theirs: dict) -> dict:
    """3-way merge of two history.json versions with their common ancestor."""
    out: dict[str, list[dict]] = {}
    for model in sorted(set(ours) | set(theirs) | set(base)):
        b, o, t = _by_day(base.get(model, [])), _by_day(ours.get(model, [])), _by_day(theirs.get(model, []))
        days: dict[str, dict] = {}
        for d in set(b) | set(o) | set(t):
            bp, op, tp = b.get(d), o.get(d), t.get(d)
            if op == bp:  # unchanged on our side: theirs decides (added, changed or removed)
                p = tp
            elif tp == bp:  # unchanged on their side: ours decides
                p = op
            elif op and tp:  # changed on both sides
                p = _pick(op, tp)
            else:  # removed on one side, changed on the other: keep the data
                p = op or tp
            if p:
                days[d] = p
        if days:
            out[model] = [days[d] for d in sorted(days)][-KEEP:]
    return out


def _imported_rank(v) -> tuple:
    """history_imported.json values: a full entry (with `low`) beats a date-only one; then newer."""
    if isinstance(v, dict):
        return (2 if "low" in v else 1, v.get("d", ""))
    return (0, v or "")


def merge_imported(base: dict, ours: dict, theirs: dict) -> dict:
    out = {}
    for k in set(ours) | set(theirs) | set(base):
        bv, ov, tv = base.get(k), ours.get(k), theirs.get(k)
        if ov == bv:
            v = tv
        elif tv == bv:
            v = ov
        elif ov is not None and tv is not None:
            v = max(ov, tv, key=_imported_rank)
        else:
            v = ov if ov is not None else tv
        if v is not None:
            out[k] = v
    return dict(sorted(out.items()))


def _dump(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def _load(path: Path, missing_ok: bool = False) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        if missing_ok:
            return {}
        raise


def driver(base: str, ours: str, theirs: str, path: str) -> int:
    try:
        b, o, t = (_load(Path(p), missing_ok=True) for p in (base, ours, theirs))
        merged = merge_imported(b, o, t) if path.endswith("history_imported.json") else merge_history(b, o, t)
    except (ValueError, KeyError, TypeError) as e:
        print(f"merge_history: cannot merge {path}: {e}", file=sys.stderr)
        return 1
    _dump(Path(ours), merged)
    print(f"merge_history: merged {path}")
    return 0


# ---------- push guard ----------

def _git_json(ref: str, rel: str) -> dict:
    r = subprocess.run(["git", "show", f"{ref}:{rel}"], cwd=ROOT, capture_output=True)
    if r.returncode != 0:
        return {}  # file not in that commit (new category)
    return json.loads(r.stdout.decode("utf-8"))


def removed_points(old: dict, new: dict) -> list[tuple[str, str]]:
    """(model, day) points of `old` missing from `new`, except the oldest ones dropped by the KEEP limit."""
    gone = []
    for model, points in old.items():
        now = new.get(model, [])
        have = {p["d"] for p in now}
        oldest_kept = now[0]["d"] if len(now) >= KEEP else ""
        for p in points:
            if p["d"] not in have and not (oldest_kept and p["d"] < oldest_kept):
                gone.append((model, p["d"]))
    return gone


def check(ref: str, allow_shrink: bool) -> int:
    problems = 0
    for cat in CATEGORIES:
        rel = f"public/data/{cat}/history.json"
        old, new = _git_json(ref, rel), _load(DATA_DIR / cat / "history.json", missing_ok=True)
        gone = removed_points(old, new)
        models = sorted({m for m, _ in gone})
        old_imp, new_imp = _git_json(ref, f"public/data/{cat}/history_imported.json"), _load(
            DATA_DIR / cat / "history_imported.json", missing_ok=True
        )
        lost_marks = sorted(set(old_imp) - set(new_imp))
        if not gone and not lost_marks:
            continue
        problems += 1
        print(f"{cat}: {len(gone)} history points of {len(models)} models would disappear, {len(lost_marks)} import markers")
        for m in models[:15]:
            print(f"    {m}: {sum(1 for x, _ in gone if x == m)} points")
        if len(models) > 15:
            print(f"    … and {len(models) - 15} more models")
        for m in lost_marks[:15]:
            print(f"    marker: {m}")
    if not problems:
        print(f"history check: nothing lost compared with {ref}")
        return 0
    if allow_shrink:
        print("allow_history_shrink: the removals above are deliberate for this run; pushing")
        return 0
    print(f"history check FAILED: not pushing (data compared with {ref}); see scraper/merge_history.py")
    return 1


# ---------- restore ----------

def restore(commit: str, dry_run: bool) -> int:
    print(f"{'DRY RUN: ' if dry_run else ''}restoring history from {commit}")
    print(f"{'cat':7}{'imported pts':>14}{'in commit':>11}{'after':>9}{'own pts now':>13}{'after':>8}"
          f"{'models w/ imp':>15}{'after':>7}{'markers':>9}{'reset':>7}")
    for cat in CATEGORIES:
        hist_path, imp_path = DATA_DIR / cat / "history.json", DATA_DIR / cat / "history_imported.json"
        cur, cur_imp = _load(hist_path, missing_ok=True), _load(imp_path, missing_ok=True)
        old, old_imp = _git_json(commit, f"public/data/{cat}/history.json"), _git_json(
            commit, f"public/data/{cat}/history_imported.json"
        )
        # Nothing in the old commit should remove anything now: merge both as additions (empty base).
        merged = merge_history({}, cur, old)
        merged_imp = merge_imported({}, cur_imp, old_imp)
        with_imp = {m for m, pts in merged.items() if any(p.get("i") for p in pts)}
        # A marker that had data (`low`, or an old date-only entry) but no imported point left: that
        # import is lost for good, so the importer fetches it again. Markers without `low` are
        # models Skroutz had no history for; they stay.
        reset = [m for m, v in merged_imp.items() if (isinstance(v, str) or "low" in v) and m not in with_imp]
        for m in reset:
            del merged_imp[m]

        def count(h: dict, imported: bool) -> int:
            return sum(1 for pts in h.values() for p in pts if bool(p.get("i")) == imported)

        print(f"{cat:7}{count(cur, True):>14}{count(old, True):>11}{count(merged, True):>9}"
              f"{count(cur, False):>13}{count(merged, False):>8}"
              f"{sum(1 for pts in cur.values() if any(p.get('i') for p in pts)):>15}{len(with_imp):>7}"
              f"{len(merged_imp):>9}{len(reset):>7}")
        # Never lose anything we have now (the merge only adds; this guards the guarantee).
        lost = removed_points(cur, merged)
        if lost:
            print(f"    ERROR: {len(lost)} current points would be lost; nothing written")
            return 1
        if not dry_run:
            _dump(hist_path, merged)
            _dump(imp_path, merged_imp)
    return 0


def main(argv: list[str]) -> int:
    if len(argv) >= 5 and argv[0] == "driver":
        return driver(*argv[1:5])
    if len(argv) >= 2 and argv[0] == "check":
        return check(argv[1], "--allow-shrink" in argv)
    if len(argv) >= 2 and argv[0] == "restore":
        return restore(argv[1], "--dry-run" in argv)
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
