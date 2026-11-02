"""Refreshes one category's key aliases (scraper/model_aliases.json) for a normalizer change, right before its push,
on the data the first scrape will see (REF's latest.json, default origin/main), and runs the push guard on the fold.
Owner's procedure (2026-10-26): the alias set = the committed entries + the freshly regenerated ones; an entry is
dropped ONLY when its old key has listings today (printed). Run from the repo root:
  venv/Scripts/python scripts/checks/refresh_aliases.py <cat> [REF] [--write]
- Old key = the category's model_key on each stored listing; new key = the working copy's make_listing (+ settle) on
  its title and URL. Fresh alias = every listing of an old key moves to one new key and the old key is gone (not when
  that new key is itself an old key whose listings move elsewhere: its history is another product's).
- A committed and a fresh entry for one old key with different targets is an error (exit 2): decide by hand.
- Check: REF's history.json / history_imported.json folded as main.write_history would (aliases.active on today's
  keys) into a temp folder, then merge_history.check(REF) without shrink; exit 1 when it fails.
- --write rewrites only this category's block (sorted); the other categories stay byte for byte."""
import json
import subprocess
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, "scraper")
import aliases  # noqa: E402
import merge_history as mh  # noqa: E402


def fresh_aliases(pairs: list[tuple[str, str]]) -> dict[str, str]:
    """[(old key, new key)] per listing -> {old: new} where all of old's listings move to one gone-away key."""
    by_old = defaultdict(set)
    for old, new in pairs:
        by_old[old].add(new)
    now = {new for _, new in pairs}
    out = {}
    for old, targets in by_old.items():
        if len(targets) != 1 or old in now:
            continue
        (new,) = targets
        if new in by_old and by_old[new] != {new}:
            continue  # the target is an old key whose own listings go elsewhere
        out[old] = new
    return out


def union(committed: dict[str, str], fresh: dict[str, str], live: set[str]):
    """-> (aliases, dropped {old: new}, conflicts [(old, committed target, fresh target)])."""
    conflicts = [(o, committed[o], n) for o, n in fresh.items() if o in committed and committed[o] != n]
    merged = {**committed, **fresh}
    dropped = {o: n for o, n in merged.items() if o in live}
    return {o: n for o, n in sorted(merged.items()) if o not in live}, dropped, conflicts


def _git(ref: str, rel: str) -> bytes:
    return subprocess.run(["git", "show", f"{ref}:{rel}"], capture_output=True, check=True).stdout


def main(argv: list[str]) -> int:
    import categories

    write = "--write" in argv
    args = [a for a in argv if a != "--write"]
    name, ref = args[0], (args[1] if len(args) > 1 else "origin/main")
    cat = categories.CATEGORIES[name]
    rev = subprocess.run(["git", "rev-parse", "--short", ref], capture_output=True, text=True).stdout.strip()
    stored = json.loads(_git(ref, f"public/data/{name}/latest.json"))["listings"]
    fresh_rows, olds = [], []
    for l in stored:
        src, native = l["id"].split(":", 1)
        out = cat.make_listing(source=src, native_id=native, title=l["title"], url=l["url"], price=l["price"],
                               shop_count=l.get("shopCount"), scraped_at=l.get("scrapedAt", ""))
        if out is not None:
            fresh_rows.append(out.to_dict())
            olds.append(cat.model_key(l))
    if cat.settle:
        cat.settle(fresh_rows)
    pairs = [(o, cat.model_key(d)) for o, d in zip(olds, fresh_rows)]
    live = {n for _, n in pairs}

    path = Path("scraper/model_aliases.json")
    text = path.read_text(encoding="utf-8")
    data = json.loads(text)
    committed = data.get(name, {})
    fresh = fresh_aliases(pairs)
    result, dropped, conflicts = union(committed, fresh, live)
    print(f"{name} @ {ref} ({rev}): {len(stored)} listings, {len(live)} models; committed {len(committed)}, "
          f"fresh {len(fresh)}, union {len(result)}")
    for o in sorted(set(fresh) - set(committed)):
        print(f"  new:      {o} -> {fresh[o]}")
    for o in sorted(set(committed) - set(fresh)):
        print(f"  kept:     {o} -> {committed[o]} (not regenerated today)")
    for o, n in sorted(dropped.items()):
        print(f"  DROPPED:  {o} -> {n} ({o} has listings today)")
    for o, c, f in conflicts:
        print(f"  CONFLICT: {o}: committed -> {c}, fresh -> {f}")
    if conflicts:
        return 2
    aliases.resolve(result)  # raises on a self-alias or a cycle

    with tempfile.TemporaryDirectory() as d:
        out = Path(d) / name
        out.mkdir()
        folding = aliases.active(name, aliases.resolve(result), live)
        hist = aliases.fold_history(json.loads(_git(ref, f"public/data/{name}/history.json")), folding)
        imp = aliases.fold_imported(json.loads(_git(ref, f"public/data/{name}/history_imported.json")), folding)
        (out / "history.json").write_text(json.dumps(hist), encoding="utf-8")
        (out / "history_imported.json").write_text(json.dumps(imp), encoding="utf-8")
        mh.DATA_DIR, mh.CATEGORIES = Path(d), [name]
        real = aliases.for_cat
        aliases.for_cat = lambda c, p=None: aliases.resolve(result) if c == name else real(c)
        try:
            rc = mh.check(ref, False)
        finally:
            aliases.for_cat = real

    if write and rc == 0:
        indent = 1 if json.dumps(data, ensure_ascii=False, indent=1) + "\n" == text else None
        if indent is None:
            print("model_aliases.json is not in json.dumps(indent=1) layout: not written")
            return 1
        new = {**data, name: result}
        new_text = json.dumps(new, ensure_ascii=False, indent=1) + "\n"
        assert all(json.loads(new_text)[c] == data[c] for c in data if c != name)
        path.write_text(new_text, encoding="utf-8", newline="\n")
        print(f"written: scraper/model_aliases.json [{name}] = {len(result)} entries")
    return rc


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
