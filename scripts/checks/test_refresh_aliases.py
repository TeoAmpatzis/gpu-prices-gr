"""Unit tests for scripts/checks/refresh_aliases.py (owner's alias procedure, 2026-10-26: committed entries + fresh
ones; drop an entry only when its old key has listings today). Run from the repo root:
venv/Scripts/python scripts/checks/test_refresh_aliases.py"""
import sys

sys.path.insert(0, "scripts/checks")
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

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
