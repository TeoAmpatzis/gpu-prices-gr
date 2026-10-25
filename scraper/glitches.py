"""Skroutz import glitches (Q4b): bad days in Skroutz's own price graphs.

Skroutz's `price_graph` carries days with one wrong value shared by unrelated products (369.59 € on
2025-09-10 for CPUs, boards and drives; 115.43 € for six graphics cards; 97.99 € on 2026-06-26/27 for
boards). The import took the series' minimum as the model's all-time `low` and wrote the day into
history.json as an imported `"i": 1` point. The rule below is a line-by-line port of v2's
src/lib/dips.ts (`sharedImportedDays`, `sharedImportedLows`, `importGlitches`, same constants):

An imported point is a glitch when (a) its exact value on that day is an imported point of
SHARED_LOW_MODELS (3) or more models of the category, or its value is an imported `low` that 3+ models
share, and (b) it sits in a run of at most GLITCH_MAX_DAYS (3) days at that value, every point of the
run imported, whose neighbours are at least GLITCH_RISE (5 %) higher (a run at the start or end needs
only the neighbour it has). Then the whole run is a glitch, never half of it. A long flat run at a
round price (24 €, 12.90 € on many models) stays: a real price.

Used by site_history.enrich (a fetched series loses its glitch runs before it is merged and before its
low is taken) and by the one-off clean-up of the files already written:

  python scraper/glitches.py clean [--dry-run] [--data DIR] [--today YYYY-MM-DD]

for every category: removes the glitch points from history.json, resets the history_imported.json
entries whose `low` is a shared low (or one of the model's own removed glitch values) to a date-only
marker (re-fetched after the first imports, see site_history.enrich), except a model whose low is a
non-glitch imported point still in its history.json (the low is visibly real, e.g. a sibling promo of
4+ days, or a day under 5 % below its neighbours), and
records the evidence in <cat>/import_glitches.json (`{"days": {date: [values]}, "lows": [values]}`), so
later imports still recognise the glitch once its points are gone from history.json. `days` = the
removed glitch points' dates and values; `lows` = only the shared lows of entries actually reset (a
shared low kept by every holder stays out: it is still live in history_imported.json and stops being
suspect once fewer than 3 models hold it, as in v2). An unreadable evidence file stops the run. It removes
history points: run it only in the owner-approved `allow_history_shrink` run (history.yml input
`clean_glitches`); the push guard (merge_history check) stays strict.
"""

import argparse
import json
import sys
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path

# The same numbers as v2 src/lib/dips.ts.
SHARED_LOW_MODELS = 3
GLITCH_MAX_DAYS = 3
GLITCH_RISE = 1.05

EVIDENCE_FILE = "import_glitches.json"
CATEGORIES = ["gpu", "cpu", "mobo", "ram", "storage", "psu", "case", "fan", "cooler"]
DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "data"


def _imported(p: dict) -> bool:
    return p.get("i") == 1


def shared_imported_lows(imported: dict) -> set[float]:
    """The imported lows (history_imported.json `low`) that SHARED_LOW_MODELS or more models share."""
    count: Counter = Counter(v["low"] for v in imported.values() if isinstance(v, dict) and v.get("low") is not None)
    return {low for low, n in count.items() if n >= SHARED_LOW_MODELS}


def shared_imported_days(history: dict) -> dict[str, set[float]]:
    """Per date, the imported ("i": 1) values that SHARED_LOW_MODELS or more models have that day."""
    count: dict[str, Counter] = {}
    for points in history.values():
        for p in points:
            if _imported(p):
                count.setdefault(p["d"], Counter())[p["min"]] += 1
    out: dict[str, set[float]] = {}
    for d, by_value in count.items():
        values = {v for v, n in by_value.items() if n >= SHARED_LOW_MODELS}
        if values:
            out[d] = values
    return out


def _day_no(d: str) -> int:
    return date.fromisoformat(d).toordinal()


def import_glitches(points: list[dict], shared: dict, bad_lows=frozenset()) -> list[dict]:
    """The import glitches of one model (see the module doc): the input point objects, in date order.
    `shared` = shared_imported_days (date -> values), `bad_lows` = shared_imported_lows."""
    out: list[dict] = []

    def suspect(p: dict) -> bool:
        return _imported(p) and (p["min"] in shared.get(p["d"], ()) or p["min"] in bad_lows)

    if (not shared and not bad_lows) or len(points) < 2 or not any(suspect(p) for p in points):
        return out
    ordered = points
    for i in range(1, len(points)):
        if points[i - 1]["d"] > points[i]["d"]:
            ordered = sorted(points, key=lambda p: p["d"])
            break
    s = 0
    while s < len(ordered):
        value = ordered[s]["min"]
        e = s
        while e + 1 < len(ordered) and ordered[e + 1]["min"] == value:
            e += 1
        run = ordered[s:e + 1]
        candidate = any(suspect(p) for p in run)
        imported = all(_imported(p) for p in run)
        before = ordered[s - 1] if s > 0 else None
        after = ordered[e + 1] if e + 1 < len(ordered) else None

        def higher(q):
            return q is None or q["min"] >= value * GLITCH_RISE

        if (candidate and imported and (before is not None or after is not None) and higher(before) and higher(after)
                and _day_no(ordered[e]["d"]) - _day_no(ordered[s]["d"]) + 1 <= GLITCH_MAX_DAYS):
            out.extend(run)  # the whole run: one glitch, never half of it
        s = e + 1
    return out


# ---------- evidence (<cat>/import_glitches.json) ----------

def load_evidence(out_dir: Path) -> dict:
    """The category's evidence; a missing file is empty. An unreadable one raises: treating it as empty would let
    the re-imports bring the glitches back and the next save overwrite the record, without a word in the log."""
    path = out_dir / EVIDENCE_FILE
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {"days": {}, "lows": []}
    try:
        ev = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"{path}: unreadable import-glitch evidence ({e}); fix or restore it from git") from e
    return {"days": {d: list(v) for d, v in ev.get("days", {}).items()}, "lows": list(ev.get("lows", []))}


def evidence_days(evidence: dict) -> dict[str, set[float]]:
    return {d: set(v) for d, v in evidence.get("days", {}).items()}


def add_evidence(evidence: dict, days: dict[str, set] | None = None, lows=()) -> bool:
    """Adds glitch day values and lows to `evidence` (kept sorted); True when something was new."""
    changed = False
    for d, values in (days or {}).items():
        have = set(evidence["days"].get(d, []))
        if not set(values) <= have:
            evidence["days"][d] = sorted(have | set(values))
            changed = True
    if not set(lows) <= set(evidence["lows"]):
        evidence["lows"] = sorted(set(evidence["lows"]) | set(lows))
        changed = True
    if changed:
        evidence["days"] = dict(sorted(evidence["days"].items()))
    return changed


def save_evidence(out_dir: Path, evidence: dict) -> None:
    (out_dir / EVIDENCE_FILE).write_text(json.dumps(evidence, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


# ---------- one-off clean-up ----------

def _merge_days(a: dict, b: dict) -> dict[str, set]:
    out = {d: set(v) for d, v in a.items()}
    for d, v in b.items():
        out.setdefault(d, set()).update(v)
    return out


def clean_category(history: dict, imported: dict, evidence: dict, today: str):
    """(history, imported, evidence, stats) with the import glitches removed and the bad lows reset.
    The inputs are changed in place (and returned)."""
    evidence = {"days": dict(evidence.get("days", {})), "lows": list(evidence.get("lows", []))}
    shared = _merge_days(shared_imported_days(history), evidence_days(evidence))
    bad = shared_imported_lows(imported) | set(evidence["lows"])
    removed_days: dict[str, set] = {}
    own_glitch: dict[str, set] = {}
    removed = models = 0
    for key, points in history.items():
        found = import_glitches(points, shared, bad)
        if not found:
            continue
        ids = {id(p) for p in found}
        history[key] = [p for p in points if id(p) not in ids]
        removed += len(found)
        models += 1
        for p in found:
            removed_days.setdefault(p["d"], set()).add(p["min"])
            own_glitch.setdefault(key, set()).add(p["min"])
    reset = reset_own = spared = 0
    reset_keys, spared_keys = [], []
    reset_lows: set = set()  # shared lows of entries actually reset (the spared ones stay out of the evidence)
    for key, v in imported.items():
        if not isinstance(v, dict) or v.get("low") is None:
            continue
        low = v["low"]
        if low not in bad and low not in own_glitch.get(key, ()):
            continue
        if any(_imported(p) and p["min"] == low for p in history.get(key, [])):
            spared += 1  # a non-glitch imported point at that price: the low is visibly real
            spared_keys.append(key)
            continue
        imported[key] = today  # date-only: re-fetched after the first imports (site_history.enrich)
        reset += 1
        reset_keys.append(key)
        if low in bad:
            reset_lows.add(low)
        else:
            reset_own += 1
    add_evidence(evidence, removed_days, reset_lows)
    stats = {"removed": removed, "models": models, "reset": reset, "reset_own_glitch": reset_own, "spared": spared,
             "reset_keys": reset_keys, "spared_keys": spared_keys, "shared_lows": sorted(bad)}
    return history, imported, evidence, stats


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _dump(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def clean(data_dir: Path, dry_run: bool, today: str) -> int:
    print(f"{'DRY RUN: ' if dry_run else ''}import glitches clean-up in {data_dir} (today {today})")
    print(f"{'cat':8}{'points':>10}{'removed':>9}{'models':>8}{'entries':>9}{'reset':>7}{'(own)':>7}{'spared':>8}")
    total = [0, 0, 0]
    for cat in CATEGORIES:
        out = data_dir / cat
        if not (out / "history.json").exists():
            continue
        history = _load(out / "history.json")
        imp_path = out / "history_imported.json"
        imported = _load(imp_path) if imp_path.exists() else {}
        points = sum(len(v) for v in history.values())
        history, imported, evidence, st = clean_category(history, imported, load_evidence(out), today)
        print(f"{cat:8}{points:>10}{st['removed']:>9}{st['models']:>8}{len(imported):>9}{st['reset']:>7}"
              f"{st['reset_own_glitch']:>7}{st['spared']:>8}")
        total[0] += st["removed"]
        total[1] += st["models"]
        total[2] += st["reset"]
        if dry_run:
            continue
        _dump(out / "history.json", dict(sorted(history.items())))
        _dump(imp_path, imported)  # same key order as before: only the reset values change
        if evidence["days"] or evidence["lows"]:
            save_evidence(out, evidence)
    print(f"total: {total[0]} imported points removed in {total[1]} models, {total[2]} entries reset (re-imported later)")
    return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="glitches.py", description=__doc__.split("\n\n")[0])
    ap.add_argument("command", choices=["clean"])
    ap.add_argument("--dry-run", action="store_true", help="print what would change, write nothing")
    ap.add_argument("--data", type=Path, default=DATA_DIR, help="data directory (default: public/data)")
    ap.add_argument("--today", default=datetime.now(timezone.utc).strftime("%Y-%m-%d"), help="date of the reset markers")
    args = ap.parse_args(argv)
    return clean(args.data, args.dry_run, args.today)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
