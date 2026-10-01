"""Unit tests for scraper/merge_history.py, site_history.merge and main.update_history.
Run from the repo root: venv/Scripts/python scripts/checks/test_merge_history.py"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, "scraper")
import merge_history as mh  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


P = lambda d, m, i=False, s="skroutz": {"d": d, "min": m, "source": s, **({"i": 1} if i else {})}

# --- history.json
base = {"A": [P("2026-09-29", 100, s="bestprice")]}
ours = {"A": [P("2026-09-29", 100, s="bestprice"), P("2026-10-01", 95, s="bestprice")], "B": [P("2026-10-01", 50)]}
theirs = {"A": [P("2025-01-01", 120, True), P("2026-09-29", 100, s="bestprice")], "C": [P("2025-02-02", 70, True)]}
m = mh.merge_history(base, ours, theirs)
expect("additions on both sides are all kept (the 30/9 case)", m,
       {"A": [P("2025-01-01", 120, True), P("2026-09-29", 100, s="bestprice"), P("2026-10-01", 95, s="bestprice")],
        "B": [P("2026-10-01", 50)], "C": [P("2025-02-02", 70, True)]})

# same day changed on both sides: lower price wins; tie -> own point beats imported
b = {"A": []}
o = {"A": [P("2026-09-30", 90, s="bestprice")]}
t = {"A": [P("2026-09-30", 85, True)]}
expect("same day: own point beats a CHEAPER imported one", mh.merge_history(b, o, t)["A"], [P("2026-09-30", 90, s="bestprice")])
expect("same day, two imported: lower wins", mh.merge_history(b, {"A": [P("2026-09-30", 90, True)]}, {"A": [P("2026-09-30", 85, True)]})["A"], [P("2026-09-30", 85, True)])
expect("same day, two own: lower wins", mh.merge_history(b, {"A": [P("2026-09-30", 90, s="snif")]}, {"A": [P("2026-09-30", 85, s="eshop")]})["A"], [P("2026-09-30", 85, s="eshop")])
expect("same day: own beats imported whichever side it is on", mh.merge_history(b, {"A": [P("2026-09-30", 70, True)]}, {"A": [P("2026-09-30", 90, s="snif")]})["A"], [P("2026-09-30", 90, s="snif")])
t = {"A": [P("2026-09-30", 90, True)]}
expect("same day, same price: own point beats imported", mh.merge_history(b, o, t)["A"], [P("2026-09-30", 90, s="bestprice")])

# deliberate removal on one side (other side unchanged) is honoured; removed+changed keeps data
b = {"A": [P("2026-09-01", 10)], "X": [P("2026-09-01", 5)]}
o = {"A": [P("2026-09-01", 10)]}  # ours removed model X on purpose
t = {"A": [P("2026-09-01", 10)], "X": [P("2026-09-01", 5)]}
expect("removal on one side, other unchanged: removed", "X" in mh.merge_history(b, o, t), False)
t = {"A": [P("2026-09-01", 10)], "X": [P("2026-09-01", 4)]}  # theirs changed X meanwhile
expect("removal vs change: data kept", mh.merge_history(b, o, t).get("X"), [P("2026-09-01", 4)])

# 365-point trim keeps the newest
long = {"A": [P(f"2025-{1 + i // 28:02d}-{1 + i % 28:02d}", 100 + i) for i in range(300)]}
more = {"A": long["A"] + [P(f"2026-{1 + i // 28:02d}-{1 + i % 28:02d}", 50) for i in range(100)]}
r = mh.merge_history(long, more, long)["A"]
expect("trim to 365 points, newest kept", (len(r), r[-1]["d"], r[0]["d"]), (365, more["A"][-1]["d"], more["A"][35]["d"]))

# --- the importer (site_history.merge) and the scraper (main.update_history) use the same rule
import site_history as sh  # noqa: E402
own = [P("2026-09-28", 90, s="snif")]
r = sh.merge(own, {"2026-09-28": 70.0, "2026-09-27": 80.0}, "2026-10-01")
expect("importer: never replaces our own day, fills the others", r, [P("2026-09-27", 80, True), P("2026-09-28", 90, s="snif")])
r = sh.merge([P("2026-09-28", 90, True)], {"2026-09-28": 70.0}, "2026-10-01")
expect("importer: a lower imported price replaces an imported one", r, [P("2026-09-28", 70, True)])
import main as mn  # noqa: E402
h = {"A": [P("2026-10-01", 50, True)]}
mn.update_history(h, [{"price": 60, "source": "snif", "k": "A"}], "2026-10-01", lambda l: l["k"])
expect("scraper: own point replaces a same-day imported one even if dearer", h["A"], [{"d": "2026-10-01", "min": 60, "source": "snif"}])
h = {"A": [P("2026-10-01", 50, s="eshop")]}
mn.update_history(h, [{"price": 60, "source": "snif", "k": "A"}], "2026-10-01", lambda l: l["k"])
expect("scraper: between own points the lower stays", h["A"], [P("2026-10-01", 50, s="eshop")])

# --- history_imported.json
expect("imported: union of models", mh.merge_imported({}, {"A": "2026-09-30"}, {"B": {"d": "2026-10-01", "low": 5, "since": "2024-10-01"}}),
       {"A": "2026-09-30", "B": {"d": "2026-10-01", "low": 5, "since": "2024-10-01"}})
expect("imported: full entry beats date-only", mh.merge_imported({}, {"A": "2026-09-30"}, {"A": {"d": "2026-09-01", "low": 5}})["A"],
       {"d": "2026-09-01", "low": 5})
expect("imported: newer full entry wins", mh.merge_imported({}, {"A": {"d": "2026-09-30", "low": 5}}, {"A": {"d": "2026-10-01", "low": 4}})["A"],
       {"d": "2026-10-01", "low": 4})

# --- removed_points (guard)
old = {"A": [P("2026-09-29", 1), P("2026-09-30", 1)], "B": [P("2026-09-30", 2)]}
expect("guard: nothing lost", mh.removed_points(old, old), [])
expect("guard: lost point and lost model found", sorted(mh.removed_points(old, {"A": [P("2026-09-30", 1)]})),
       [("A", "2026-09-29"), ("B", "2026-09-30")])
trimmed = {"A": [P(f"2026-{1 + i // 28:02d}-{1 + i % 28:02d}", 1) for i in range(365)]}
older = {"A": [P("2025-12-31", 1)] + trimmed["A"]}
expect("guard: points dropped by the 365 limit are fine", mh.removed_points(older, trimmed), [])

# --- driver: broken input stops the merge without writing
with tempfile.TemporaryDirectory() as d:
    d = Path(d)
    (d / "base").write_text("{}", encoding="utf-8")
    (d / "ours").write_text('{"A":[{"d":"2026-10-01","min":1,"source":"snif"}]}', encoding="utf-8")
    (d / "theirs").write_text("{not json", encoding="utf-8")
    rc = subprocess.run([sys.executable, "scraper/merge_history.py", "driver", str(d / "base"), str(d / "ours"), str(d / "theirs"), "public/data/gpu/history.json"],
                        capture_output=True, text=True).returncode
    expect("driver: unreadable input -> exit 1, ours untouched", (rc, json.loads((d / "ours").read_text())["A"][0]["min"]), (1, 1))

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
