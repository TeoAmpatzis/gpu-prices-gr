"""Unit tests for scripts/checks/refresh_aliases.py (owner's alias procedure, 2026-10-26: committed entries + fresh
ones; drop an entry only when its old key has listings today). Run from the repo root:
venv/Scripts/python scripts/checks/test_refresh_aliases.py"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, "scripts/checks")
sys.path.insert(0, "scraper")
import aliases  # noqa: E402
import categories  # noqa: E402
import merge_history as mh  # noqa: E402
import refresh_aliases as ra  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def expect_raises(name, fn, exc=Exception):
    global ok, bad
    try:
        fn()
    except exc:
        ok += 1
        print("PASS", name)
        return
    except Exception as e:
        bad += 1
        print("FAIL", name, f"\n   unexpected {type(e).__name__}: {e}")
        return
    bad += 1
    print("FAIL", name, f"\n   did not raise {exc.__name__}")


# Fresh: every listing of the old key moves to one new key, and the old key is gone.
pairs = [("a", "a sas"), ("a", "a sas"),          # rename
         ("b", "b"), ("b", "b sas"),              # split: b stays alive
         ("c", "c u2"), ("c", "d"),               # split into two new keys
         ("e", "f"), ("f", "g"),                  # e's target f is an old key whose listings go elsewhere; f is
                                                  # reused by e's listings, so f is no alias either
         ("h", "x"), ("i", "x")]                  # merge of two old keys
expect("fresh: renames, merges; no split, no reused target", ra.fresh_aliases(pairs),
       {"a": "a sas", "h": "x", "i": "x"})

# Union: committed entries stay unless their old key has listings today; fresh ones are added.
committed = {"old1": "new1", "old2": "new2", "toshiba": "toshiba sas"}
fresh = {"old1": "new1", "lenovo": "lenovo sas"}
live = {"new1", "new2", "old2", "lenovo sas", "toshiba sas"}
got, dropped, conflicts = ra.union(committed, fresh, live)
expect("union: committed + fresh, minus live old keys", got,
       {"lenovo": "lenovo sas", "old1": "new1", "toshiba": "toshiba sas"})
expect("union: dropped = the old keys with listings today", dropped, {"old2": "new2"})
expect("union: no conflicts", conflicts, [])
expect("union: a committed entry not regenerated today is kept (toshiba case)",
       ra.union({"toshiba": "toshiba sas"}, {}, {"toshiba sas"})[0], {"toshiba": "toshiba sas"})
expect("union: a fresh entry missing from the committed file is added",
       ra.union({}, {"toshiba": "toshiba sas"}, {"toshiba sas"})[0], {"toshiba": "toshiba sas"})
expect("union: a different target for one old key is a conflict",
       ra.union({"a": "b"}, {"a": "c"}, set())[2], [("a", "b", "c")])

# --- Monitor-safe replay_rows & _git_json helpers ---
mon = categories.CATEGORIES["monitor"]
with tempfile.TemporaryDirectory() as d:
    d = Path(d)
    (d / "specs.json").write_text(json.dumps({
        "bestprice:1": {"pgSize": 27.0, "pgHeight": 1440, "pgHz": 180, "pgPanel": "IPS"},
        "skroutz:2": {"pgSize": 27.0, "pgHeight": 1440, "pgHz": 180, "pgPanel": "IPS"},
    }), encoding="utf-8")
    stored = [
        {"id": "bestprice:1", "title": "Dell G2724D", "url": "https://example.com/1", "price": 200, "scrapedAt": "2026-11-10T00:00:00Z"},
        {"id": "bestprice:4", "title": "Ocypus Sigma ES916 IPS Monitor 9.16\"", "url": "https://example.com/4", "price": 42, "scrapedAt": "2026-11-10T00:00:00Z"},
        {"id": "snif:5", "title": "Lenovo ThinkVision T24-40 23.8\" FHD IPS 120Hz", "url": "https://example.com/5", "price": 120, "scrapedAt": "2026-11-10T00:00:00Z"},
        {"id": "snif:6", "title": "Lenovo ThinkVision T24-40 Full HD IPS 60Hz", "url": "https://example.com/6", "price": 169, "scrapedAt": "2026-11-10T00:00:00Z"},
    ]
    accepted = ra.replay_rows(mon, stored, d)
    by_id = {r["id"]: r for r in accepted}
    expect("replay_rows: rejected accessory and ambiguous row omitted", sorted(by_id), ["bestprice:1", "snif:5"])
    expect("replay_rows: no empty target chip", all(bool(r.get("chip")) for r in accepted), True)
    expect("replay_rows: cached page evidence respected for EARLY category",
           (by_id["bestprice:1"].get("pgSize"), by_id["bestprice:1"].get("pgHz")), (27.0, 180))

# Retained live old key never folded in active/union
expect("retained live old key stays excluded from alias fold",
       ra.union({"Old X": "New Y"}, {}, {"Old X", "New Y"})[0], {})

# _git_json: missing optional imported file returns {}, missing required raises, malformed raises even if missing_ok
with tempfile.TemporaryDirectory() as g:
    g = Path(g)
    def git(*args):
        subprocess.run(["git", *args], cwd=g, check=True, capture_output=True)
    git("init")
    git("config", "user.name", "Test")
    git("config", "user.email", "test@example.com")
    (g / "public/data/monitor").mkdir(parents=True)
    (g / "public/data/monitor/history.json").write_text('{"M":[{"d":"2026-11-10","min":100}]}', encoding="utf-8")
    (g / "public/data/monitor/bad.json").write_text("{bad json", encoding="utf-8")
    git("add", ".")
    git("commit", "-m", "seed")
    rev = subprocess.run(["git", "rev-parse", "HEAD"], cwd=g, capture_output=True, text=True, check=True).stdout.strip()
    orig_cwd = Path.cwd()
    import os
    os.chdir(g)
    try:
        expect("_git_json: missing optional file returns {}",
               ra._git_json(rev, "public/data/monitor/history_imported.json", missing_ok=True), {})
        expect_raises("_git_json: missing required file raises",
                      lambda: ra._git_json(rev, "public/data/monitor/missing.json", missing_ok=False))
        expect_raises("_git_json: malformed json raises even with missing_ok=True",
                      lambda: ra._git_json(rev, "public/data/monitor/bad.json", missing_ok=True))
    finally:
        os.chdir(orig_cwd)

# End-to-end dry run on monitor @ 3d08e64 leaves model_aliases.json & globals unchanged and passes merge_history
aliases_before = Path("scraper/model_aliases.json").read_bytes()
before_globals = (mh.DATA_DIR, list(mh.CATEGORIES), aliases.for_cat)
# Dry run allowed even when optional history_imported.json is absent; existing markers preserved check below
rc = ra.main(["monitor", "3d08e64"])
expect("main dry run exits 0 cleanly", rc, 0)
expect("main dry run leaves scraper/model_aliases.json untouched",
       Path("scraper/model_aliases.json").read_bytes(), aliases_before)
expect("main dry run restores module globals",
       (mh.DATA_DIR, list(mh.CATEGORIES), aliases.for_cat), before_globals)

# Existing history_imported markers preserved when present through fold + check
imp_old = {"Lenovo E2440 24\" IPS": {"d": "2026-11-09", "low": 100.0}, "Keep": "2026-11-08"}
imp_folded = aliases.fold_imported(dict(imp_old), {"Lenovo E2440 24\" IPS": "Lenovo E2440"})
expect("existing import markers preserved after fold",
       mh.lost_markers(imp_old, imp_folded, {"Lenovo E2440 24\" IPS": "Lenovo E2440"}), [])

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
