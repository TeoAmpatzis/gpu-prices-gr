"""Checks for the scraper fixes of the 2026-11-10 audit (docs/audits/full-system-audit): P3-002 a shop's wrong
memory size never makes a GPU family; P3-007 a corrupt data file stops the run and files are written whole.
Titles are real ones from public/data/gpu/latest.json (2026-11-10).
Run from the repo root: venv/Scripts/python scripts/checks/test_audit_scraper.py"""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, "scraper")
import main  # noqa: E402
import normalize  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def gpu(title):
    l = normalize.make_listing(source="snif", native_id="1", title=title, url="https://www.snif.gr/showproduct/1/",
                               price=100.0, shop_count=None, scraped_at="2026-11-10T00:00:00+00:00")
    return (l.chip, l.vram) if l else None


expect("part number beats the title's size", gpu("Gigabyte GeForce RTX 5070 Gaming 16GB GDDR7 OC GV-N5070GAMING-OC-12GD"), ("RTX 5070", 12))
expect("part number beats the title's size (Ti)", gpu("Gigabyte VGA GV-N507TWF3OC-16GD GeForce RTX 5070 Ti 12GB"), ("RTX 5070 Ti", 16))
expect("a size the chip is not sold in is dropped", gpu("Gigabyte GeForce RTX 5070 Gaming 16GB OC"), None)
expect("a valid size is kept", gpu("Gigabyte GeForce RTX 5070 Gaming OC 12GB"), ("RTX 5070", 12))
expect("both sizes of a two-size chip are kept", [gpu("MSI GeForce RTX 5060 Ti 8GB Ventus"), gpu("MSI GeForce RTX 5060 Ti 16GB Ventus")],
       [("RTX 5060 Ti", 8), ("RTX 5060 Ti", 16)])
expect("a chip outside the table keeps any size", gpu("Sapphire Radeon RX 7900 XTX 24GB Nitro+"), ("RX 7900 XTX", 24))

with tempfile.TemporaryDirectory() as d:
    path = Path(d) / "history.json"
    expect("a missing file gives the default", main.load_json(path, {"x": 1}), {"x": 1})
    path.write_text('{"model": [{"d": "2026-11-', encoding="utf-8")  # cut short, as by a killed job
    try:
        main.load_json(path, {})
        expect("a corrupt file raises", "returned", "raised")
    except json.JSONDecodeError:
        expect("a corrupt file raises", "raised", "raised")
    main.write_atomic(path, '{"a": 1}')
    expect("write_atomic replaces the file", main.load_json(path, None), {"a": 1})
    expect("write_atomic leaves no temporary file", [p.name for p in Path(d).iterdir()], ["history.json"])

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
