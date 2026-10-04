"""Offline before/after of a normalizer change: runs the committed version (git REF) and the working copy
of scraper/normalize_<module>.py over every listing title + URL in public/data/<cat>/latest.json and
reports the listings whose model or fields change. No network. The Skroutz spec line isn't stored in
latest.json, so both sides run without it (the difference isolates the code change).

Run from the repo root: venv/Scripts/python scripts/checks/renormalize_diff.py <cat> <module> [REF=HEAD]
e.g. renormalize_diff.py ram ram   ·   renormalize_diff.py mobo mobo HEAD~1"""
import importlib.util
import json
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

sys.path.insert(0, "scraper")
cat, module = sys.argv[1], sys.argv[2]
ref = sys.argv[3] if len(sys.argv) > 3 else "HEAD"
FIELDS = ["chip", "type", "capacity", "modules", "speed", "formFactor", "socket", "chipset", "memory"]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


src = f"scraper/normalize_{module}.py"
with tempfile.TemporaryDirectory() as d:
    old_path = Path(d) / f"old_normalize_{module}.py"
    old_path.write_text(subprocess.run(["git", "show", f"{ref}:{src}"], capture_output=True, text=True, encoding="utf-8", check=True).stdout, encoding="utf-8")
    old, new = load(f"old_{module}", old_path), load(f"new_{module}", src)

listings = json.loads(Path(f"public/data/{cat}/latest.json").read_text(encoding="utf-8"))["listings"]


def run(mod, l):
    src_id, native = l["id"].split(":", 1)
    out = mod.make_listing(source=src_id, native_id=native, title=l["title"], url=l["url"], price=l["price"],
                           shop_count=l.get("shopCount"), scraped_at=l.get("scrapedAt", ""))
    return None if out is None else {f: getattr(out, f, None) for f in FIELDS}


changed = Counter()
examples = []
for l in listings:
    a, b = run(old, l), run(new, l)
    if a == b:
        continue
    what = "dropped" if b is None else "added" if a is None else ",".join(f for f in FIELDS if a.get(f) != b.get(f))
    changed[what] += 1
    if len(examples) < 25:
        examples.append(f"  {l['id']} | {l['title'][:80]}\n      {a and a['chip']} [{a and a.get('formFactor')}] -> {b and b['chip']} [{b and b.get('formFactor')}]")
print(f"{cat}: {len(listings)} listings, {sum(changed.values())} change ({ref} -> working copy)")
for k, v in changed.most_common():
    print(f"  {v:5}  {k}")
print("\n".join(examples))
