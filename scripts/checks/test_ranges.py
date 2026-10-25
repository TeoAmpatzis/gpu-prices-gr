"""Tests for scraper/ranges.py (Q4: plausible ranges before specs.SAFER joins values). Real saved values:
Spire U20M (BestPrice "3.502" mm beat Skroutz 350 through min()), a cooler with a fan's 25 mm thickness.
Run from the repo root: venv/Scripts/python scripts/checks/test_ranges.py"""
import re
import sys
from pathlib import Path

sys.path.insert(0, "scraper")
import main  # noqa: E402
import makers  # noqa: E402
import ranges  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def case(source, **kw):
    return {"id": f"{source}:1", "source": source, "chip": "Spire U20M", **kw}


# 1. Spire U20M: the bad 3.502 is dropped before the share, so every listing gets 350.
ls = [case("bestprice", gpuMaxMm=3502.0), case("skroutz", gpuMaxMm=350.0)]
ranges.clean("case", ls, None)
main.share_fields(ls, ("gpuMaxMm",), lambda l: "spire")
expect("spire U20M both 350", [l["gpuMaxMm"] for l in ls], [350.0, 350.0])
# the old behaviour, for contrast: min() lets 3.502 beat 350
ls = [case("bestprice", gpuMaxMm=3.502), case("skroutz", gpuMaxMm=350.0)]
main.share_fields(ls, ("gpuMaxMm",), lambda l: "spire")
expect("old behaviour: 3.502 beats 350", [l["gpuMaxMm"] for l in ls], [3.502, 3.502])
ls = [case("bestprice", gpuMaxMm=3.502), case("skroutz", gpuMaxMm=350.0)]
ranges.clean("case", ls, None)
main.share_fields(ls, ("gpuMaxMm",), lambda l: "spire")
expect("spire 3.502 + 350 -> 350", [l["gpuMaxMm"] for l in ls], [350.0, 350.0])

# 2. cooler 25 mm only -> unknown
ls = [{"id": "skroutz:2", "source": "skroutz", "heightMm": 25.0}]
ranges.clean("cooler", ls, None)
expect("cooler 25 mm -> None", ls[0]["heightMm"], None)

# 3. boundaries inclusive, one step outside dropped
BOUNDS = [("cooler", "heightMm", 30, 200), ("case", "gpuMaxMm", 100, 700), ("case", "coolerMaxMm", 25, 300),
          ("gpu", "lengthMm", 100, 400), ("cpu", "tdp", 10, 500), ("mobo", "maxMemoryGB", 4, 16384), ("ram", "cas", 5, 60)]
for cat, f, lo, hi in BOUNDS:
    for v, keep in ((lo, True), (hi, True), (lo - 0.5, False), (hi + 0.5, False)):
        ls = [{"id": "x:1", "source": "x", f: v}]
        ranges.clean(cat, ls, None)
        expect(f"{cat}.{f}={v} {'kept' if keep else 'dropped'}", ls[0][f], v if keep else None)
ls = [{"id": "x:1", "source": "x", "heightMm": None, "other": 5}]
ranges.clean("cooler", ls, None)
expect("None stays None, other fields untouched", ls[0], {"id": "x:1", "source": "x", "heightMm": None, "other": 5})
ls = [{"id": "x:1", "source": "x", "watts": 99999, "speed": 99999}]
ranges.clean("psu", ls, None)
expect("psu watts / ram speed not in the table", ls[0]["watts"], 99999)
ls = [{"id": "x:1", "source": "x", "tdp": 5}]
ranges.clean("gpu", ls, None)
expect("a field is checked only in its own category", ls[0]["tdp"], 5)

# 3b. real clearances of big towers (owner 20/10: raised from 250 to 300): Tower 500 275, Tower 900 260, Siege 265
for v in (260.0, 265.0, 275.0, 300.0):
    ls = [{"id": "x:1", "source": "skroutz", "coolerMaxMm": v}]
    ranges.clean("case", ls, None)
    expect(f"case coolerMaxMm {v} kept (real tower clearance)", ls[0]["coolerMaxMm"], v)
ls = [{"id": "x:1", "source": "skroutz", "coolerMaxMm": 301.0}]
ranges.clean("case", ls, None)
expect("case coolerMaxMm 301 dropped", ls[0]["coolerMaxMm"], None)

# 4. counts and log line
import io, contextlib  # noqa: E402,E401
buf = io.StringIO()
ls = [case("bestprice", gpuMaxMm=3.502), case("skroutz", gpuMaxMm=350.0)]
with contextlib.redirect_stdout(buf):
    n = ranges.clean("case", ls, None)
expect("log line", buf.getvalue().strip(),
       "[case] range: gpuMaxMm 3.502 from bestprice dropped (case-gpu-max)")
expect("count per field", dict(n), {"gpuMaxMm": 1})
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    ranges.clean("case", [case("shopflix", gpuMaxMm=3.502)], "gigabyte")
expect("origin overrides source", "from gigabyte" in buf.getvalue(), True)

# 5. a maker value out of range is dropped, the shop's value kept; a good maker value still joins
class FakeMaker:
    NAME = "fake"
    BRANDS = {"case": {"Spire"}}

    @staticmethod
    def listing_parts(cat, l):
        return ["PN1"]

    @staticmethod
    def listing_key(cat, l):
        return None


LAST_COUNT = None


def run_maker(items, listing):
    global LAST_COUNT
    old_makers, old_load = makers.MAKERS, makers._load
    makers.MAKERS = [FakeMaker]
    makers._load = lambda m: {"u": {"items": items}}
    try:
        with contextlib.redirect_stdout(io.StringIO()) as out:
            LAST_COUNT = makers.apply("case", [listing])
    finally:
        makers.MAKERS, makers._load = old_makers, old_load
    return listing, out.getvalue()


l, out = run_maker([{"cat": "case", "name": "n", "parts": ["PN1"], "gpuMaxMm": 3502.0}],
                   {"brand": "Spire", "id": "skroutz:1", "source": "skroutz", "gpuMaxMm": 350.0})
expect("maker out of range: shop value kept", l["gpuMaxMm"], 350.0)
expect("maker drop logged with maker name", "from fake dropped (case-gpu-max)" in out, True)
expect("maker drop counted per field", dict(LAST_COUNT), {"gpuMaxMm": 1})
l, _ = run_maker([{"cat": "case", "name": "n", "parts": ["PN1"], "gpuMaxMm": 3502.0}],
                 {"brand": "Spire", "id": "skroutz:1", "source": "skroutz", "gpuMaxMm": None})
expect("maker out of range, nothing else: unknown", l["gpuMaxMm"], None)
l, _ = run_maker([{"cat": "case", "name": "n", "parts": ["PN1"], "gpuMaxMm": 3502.0},
                  {"cat": "case", "name": "m", "parts": ["PN1"], "gpuMaxMm": 400.0}],
                 {"brand": "Spire", "id": "skroutz:1", "source": "skroutz", "gpuMaxMm": 350.0})
expect("one bad one good maker value: good joins via min", l["gpuMaxMm"], 350.0)
l, _ = run_maker([{"cat": "case", "name": "n", "parts": ["PN1"], "gpuMaxMm": 3502.0},
                  {"cat": "case", "name": "m", "parts": ["PN1"], "gpuMaxMm": 400.0}],
                 {"brand": "Spire", "id": "skroutz:1", "source": "skroutz", "gpuMaxMm": None})
expect("bad maker value ignored, good one fills", l["gpuMaxMm"], 400.0)

# 6. finish() cleans values already on the listings (shared in an earlier run), before makers and share
import tempfile  # noqa: E402
cat = main.CATEGORIES["case"]
ls = [case("bestprice", gpuMaxMm=3.502, title="a"), case("skroutz", gpuMaxMm=350.0, title="a")]
with tempfile.TemporaryDirectory() as d, contextlib.redirect_stdout(io.StringIO()):
    main.finish(cat, Path(d), ls)
expect("finish: stale 3.502 cleaned", [l["gpuMaxMm"] for l in ls], [350.0, 350.0])

# 6b. the run summary counts shop and maker drops together
class SummaryMaker(FakeMaker):
    pass


old_makers, old_load = makers.MAKERS, makers._load
makers.MAKERS = [SummaryMaker]
makers._load = lambda m: {"u": {"items": [{"cat": "case", "name": "n", "parts": ["PN1"], "gpuMaxMm": 3502.0}]}}
ls = [{"id": "bestprice:1", "source": "bestprice", "brand": "Spire", "title": "a", "chip": "Spire U20M", "gpuMaxMm": 3.502},
      {"id": "skroutz:1", "source": "skroutz", "brand": "Spire", "title": "a", "chip": "Spire U20M", "gpuMaxMm": 350.0}]
buf = io.StringIO()
try:
    with tempfile.TemporaryDirectory() as d, contextlib.redirect_stdout(buf):
        main.finish(cat, Path(d), ls)
finally:
    makers.MAKERS, makers._load = old_makers, old_load
expect("finish summary counts shop + maker drops", "values dropped as implausible: {\x27gpuMaxMm\x27: 3}" in buf.getvalue(), True)

# 7. table equals v2's ranges.ts (when the sibling repo is there)
V2 = Path(r"C:\Users\Teo\Desktop\PROJECTS\buildcraft-v2\src\data\validate\ranges.ts")
if V2.exists():
    text = V2.read_text(encoding="utf-8")
    v2 = {m.group(1): (m.group(2), m.group(3), float(m.group(4)), float(m.group(5))) for m in re.finditer(
        r"id: '([\w-]+)', cat: '(\w+)', field: '(\w+)', min: (\d+), max: (\d+)", text)}
    ours = {r[0]: (r[1], r[2], float(r[3]), float(r[4])) for r in ranges.RANGES}
    expect("table ids are v2 ids", set(ours) <= set(v2), True)
    expect("table equals v2 (min/max/cat/field)", {k: v2[k] for k in ours}, ours)
    expect("seven ids", len(ours), 7)
else:
    print("SKIP table equality with v2 (ranges.ts not found)")

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
