"""Unit tests for model key aliases (scraper/aliases.py, scraper/model_aliases.json) and the history fold in
main.update_history, site_history and merge_history.check (plan Q5).
Run from the repo root: venv/Scripts/python scripts/checks/test_aliases.py"""
import copy
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, "scraper")
import aliases  # noqa: E402
import main as mn  # noqa: E402
import merge_history as mh  # noqa: E402
import site_history as sh  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def raises(name, fn, *words):
    """fn() must raise aliases.AliasError whose message names every word."""
    global ok, bad
    try:
        fn()
    except aliases.AliasError as e:
        if all(w in str(e) for w in words):
            ok += 1
            print("PASS", name)
        else:
            bad += 1
            print("FAIL", name, "\n   message", e, "\n   should name", words)
        return
    bad += 1
    print("FAIL", name, "\n   no AliasError")


P = lambda d, m, i=False, s="skroutz": {"d": d, "min": m, "source": s, **({"i": 1} if i else {})}

# --- loading: chains collapse, self-aliases and cycles are rejected with the keys named
expect("chain A->B, B->C resolves to C", aliases.resolve({"A": "B", "B": "C"}), {"A": "C", "B": "C"})
expect("longer chain", aliases.resolve({"A": "B", "B": "C", "C": "D"}), {"A": "D", "B": "D", "C": "D"})
raises("self-alias rejected", lambda: aliases.resolve({"A": "A"}), "A")
raises("cycle A->B->A rejected, keys named", lambda: aliases.resolve({"A": "B", "B": "A"}), "A", "B")
raises("cycle A->B->C->A rejected, keys named", lambda: aliases.resolve({"X": "Y", "A": "B", "B": "C", "C": "A"}),
       "A", "B", "C")
with tempfile.TemporaryDirectory() as d:
    p = Path(d) / "model_aliases.json"
    p.write_text(json.dumps({"ram": {"A": "B", "B": "C"}, "gpu": {}}), encoding="utf-8")
    expect("load() resolves chains per category", aliases.load(p), {"ram": {"A": "C", "B": "C"}, "gpu": {}})
    expect("for_cat() of a category without aliases", aliases.for_cat("psu", p), {})
    p.write_text(json.dumps({"ram": {"A": "B", "B": "A"}}), encoding="utf-8")
    raises("load() rejects a cycle in the file", lambda: aliases.load(p), "ram", "A", "B")
    expect("missing file = no aliases", aliases.load(Path(d) / "none.json"), {})
expect("the committed scraper/model_aliases.json loads", isinstance(aliases.load(), dict), True)

# --- fold: same-day rule, idempotent, target without history
AL = {"old": "new"}
h = {"old": [P("2026-10-01", 90, s="snif"), P("2026-10-02", 80, True), P("2026-10-03", 70, s="eshop")],
     "new": [P("2026-10-01", 95, True), P("2026-10-02", 85, s="bestprice"), P("2026-10-03", 75, s="bestprice"),
             P("2026-10-04", 60, s="bestprice")],
     "other": [P("2026-10-01", 1)]}
once = aliases.fold_history(copy.deepcopy(h), AL)
expect("alias to a key with history: same-day rule (own beats imported, else lower), old key gone", once,
       {"new": [P("2026-10-01", 90, s="snif"), P("2026-10-02", 85, s="bestprice"), P("2026-10-03", 70, s="eshop"),
                P("2026-10-04", 60, s="bestprice")],
        "other": [P("2026-10-01", 1)]})
expect("fold is idempotent (twice = once)", aliases.fold_history(copy.deepcopy(once), AL), once)
expect("two imported the same day: lower wins",
       aliases.fold_history({"old": [P("2026-10-01", 80, True)], "new": [P("2026-10-01", 85, True)]}, AL),
       {"new": [P("2026-10-01", 80, True)]})
expect("alias to a key that does not exist yet still moves the history",
       aliases.fold_history({"old": [P("2026-10-01", 80), P("2026-10-02", 81)]}, AL),
       {"new": [P("2026-10-01", 80), P("2026-10-02", 81)]})
expect("chain folded straight to the end key",
       aliases.fold_history({"A": [P("2026-10-01", 5)], "B": [P("2026-10-02", 6)]}, aliases.resolve({"A": "B", "B": "C"})),
       {"C": [P("2026-10-01", 5), P("2026-10-02", 6)]})
long_ = {"old": [P(f"2025-{1 + i // 28:02d}-{1 + i % 28:02d}", 100) for i in range(300)],
         "new": [P(f"2026-{1 + i // 28:02d}-{1 + i % 28:02d}", 50) for i in range(100)]}
r = aliases.fold_history(copy.deepcopy(long_), AL)["new"]
expect("fold keeps the 365-point trim (newest)", (len(r), r[0]["d"], r[-1]["d"]),
       (365, long_["old"][35]["d"], long_["new"][-1]["d"]))
expect("no aliases: history untouched", aliases.fold_history(copy.deepcopy(h), {}), h)

# --- main.update_history folds before adding today's points
lst = [{"chip": "new", "price": 50, "source": "skroutz"}]
got = mn.update_history({"old": [P("2026-10-01", 90, s="snif")]}, lst, "2026-10-05", lambda l: l["chip"], AL)
expect("update_history: old points moved, today's point added to the new key",
       got, {"new": [P("2026-10-01", 90, s="snif"), P("2026-10-05", 50)]})
again = mn.update_history(copy.deepcopy(got), lst, "2026-10-05", lambda l: l["chip"], AL)
expect("update_history twice on the same day = once", again, got)
expect("update_history without aliases works as before",
       mn.update_history({"x": [P("2026-10-01", 9)]}, [{"chip": "x", "price": 8, "source": "snif"}], "2026-10-02",
                         lambda l: l["chip"]),
       {"x": [P("2026-10-01", 9), P("2026-10-02", 8, s="snif")]})

# --- history_imported.json follows the alias (merge_history._imported_rank: full entry beats a date, then newer)
imp = {"old": {"d": "2026-10-01", "low": 40.0, "since": "2024-10-01"}, "new": "2026-09-01", "keep": {"d": "2026-10-02"}}
f = aliases.fold_imported(copy.deepcopy(imp), AL)
expect("imported: old marker moves onto a date-only target (full entry wins)", f,
       {"new": {"d": "2026-10-01", "low": 40.0, "since": "2024-10-01"}, "keep": {"d": "2026-10-02"}})
expect("imported fold is idempotent", aliases.fold_imported(copy.deepcopy(f), AL), f)
expect("imported: target without a marker gets the old one",
       aliases.fold_imported({"old": {"d": "2026-10-01"}}, AL), {"new": {"d": "2026-10-01"}})
expect("imported: two full entries, the newer import wins",
       aliases.fold_imported({"old": {"d": "2026-10-03", "low": 50}, "new": {"d": "2026-10-01", "low": 40}}, AL),
       {"new": {"d": "2026-10-03", "low": 50}})
with tempfile.TemporaryDirectory() as d:
    (Path(d) / "history_imported.json").write_text(json.dumps(imp), encoding="utf-8")
    sh.follow_aliases(Path(d), AL)
    expect("site_history.follow_aliases rewrites the file",
           json.loads((Path(d) / "history_imported.json").read_text(encoding="utf-8")), f)

# --- merge_history.check: moved points count as present, vanished ones don't
old = {"old": [P("2026-10-01", 90, s="snif"), P("2026-10-02", 80, True)], "new": [P("2026-10-01", 95, True)]}
moved = aliases.fold_history(copy.deepcopy(old), AL)
expect("check: points moved to the alias target are present", mh.removed_points(old, moved, AL), [])
expect("check without the alias would fail", len(mh.removed_points(old, moved)), 2)
lost = copy.deepcopy(moved)
lost["new"] = [p for p in lost["new"] if p["d"] != "2026-10-02"]
expect("check: a point that really vanished still fails", mh.removed_points(old, lost, AL), [("old", "2026-10-02")])
gone_target = {"other": []}
expect("check: alias target missing entirely fails", len(mh.removed_points(old, gone_target, AL)), 3)
big_old = {"old": [P(f"2025-{1 + i // 28:02d}-{1 + i % 28:02d}", 100) for i in range(300)],
           "new": [P(f"2026-{1 + i // 28:02d}-{1 + i % 28:02d}", 50) for i in range(100)]}
big_new = aliases.fold_history(copy.deepcopy(big_old), AL)
expect("check: the 365-point trim of the target is still allowed", mh.removed_points(big_old, big_new, AL), [])
expect("check: import markers that moved are present",
       mh.lost_markers({"old": {"d": "x"}, "k": "y"}, {"new": {"d": "x"}, "k": "y"}, AL), [])
expect("check: an import marker that vanished is reported",
       mh.lost_markers({"old": {"d": "x"}, "k": "y"}, {"k": "y"}, AL), ["old"])

# --- an old key that has listings again (a new bare title recreates "X") is not folded: X keeps its own history
expect("active(): a live old key is skipped", aliases.active("ram", {"X": "Y", "Z": "Y"}, {"X", "Y"}), {"Z": "Y"})
key = lambda l: l["chip"]
with tempfile.TemporaryDirectory() as d:
    d = Path(d)
    (d / "history.json").write_text(json.dumps({"X": [P("2026-10-01", 90, s="snif")], "Y": [P("2026-10-01", 50)]}),
                                    encoding="utf-8")
    (d / "history_imported.json").write_text(json.dumps({"X": {"d": "2026-10-01", "low": 80}}), encoding="utf-8")
    al = {"X": "Y"}
    run1 = [{"chip": "X", "price": 91, "source": "snif"}, {"chip": "Y", "price": 51, "source": "skroutz"}]
    # 3 runs: two on the same day (X only from a failed source the 2nd time: still live, so still not folded), one later
    mn.write_history("ram", key, d, run1, run1, "2026-10-05", al)
    mn.write_history("ram", key, d, run1, [run1[1]], "2026-10-05", al)
    h = mn.write_history("ram", key, d, run1, run1, "2026-10-06", al)
    expect("recreated old key: X and Y keep separate histories across 3 runs (same day included)", h,
           {"X": [P("2026-10-01", 90, s="snif"), P("2026-10-05", 91, s="snif"), P("2026-10-06", 91, s="snif")],
            "Y": [P("2026-10-01", 50), P("2026-10-05", 51), P("2026-10-06", 51)]})
    expect("recreated old key: its import marker stays on X",
           json.loads((d / "history_imported.json").read_text(encoding="utf-8")), {"X": {"d": "2026-10-01", "low": 80}})
    h = mn.write_history("ram", key, d, [run1[1]], [run1[1]], "2026-10-07", al)
    expect("once X has no listings, the next run folds it into Y",
           (sorted(h), [p["d"] for p in h["Y"]],
            json.loads((d / "history_imported.json").read_text(encoding="utf-8"))),
           (["Y"], ["2026-10-01", "2026-10-05", "2026-10-06", "2026-10-07"], {"Y": {"d": "2026-10-01", "low": 80}}))

# --- site_history.enrich (budget 0: no requests) folds only aliases whose old key is not live
for live, want_marker in ((True, {"X": {"d": "2026-10-01", "low": 80}}), (False, {"Y": {"d": "2026-10-01", "low": 80}})):
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)
        (d / "history.json").write_text(json.dumps({"X": [P("2026-10-01", 90, s="snif")]}), encoding="utf-8")
        (d / "history_imported.json").write_text(json.dumps({"X": {"d": "2026-10-01", "low": 80}}), encoding="utf-8")
        ls = [{"chip": "Y", "price": 51, "source": "skroutz", "url": "https://www.skroutz.gr/s/1/y.html"}]
        if live:
            ls.append({"chip": "X", "price": 91, "source": "skroutz", "url": "https://www.skroutz.gr/s/2/x.html"})
        sh.enrich("ram", d, ls, key, budget=0, model_aliases={"X": "Y"})
        expect(f"enrich: X {'live -> marker and history stay on X' if live else 'gone -> both move to Y'}",
               (json.loads((d / "history_imported.json").read_text(encoding="utf-8")),
                sorted(json.loads((d / "history.json").read_text(encoding="utf-8")))),
               (want_marker, ["X"] if live else ["Y"]))

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
