"""Unit tests for scraper/glitches.py (Q4b: Skroutz import glitches) and its use in site_history.enrich.
Run from the repo root: venv/Scripts/python scripts/checks/test_glitches.py

The rule is a port of v2's src/lib/dips.ts (sharedImportedDays, sharedImportedLows, importGlitches); the unit
cases below are v2's tests/unit/importGlitch.test.ts. Parity with v2 on real data runs only when both are given:
  GLITCH_PARITY_DATA=<copy of public/data>  GLITCH_PARITY_V2=<output of v2's rule on it, see report>
No network: the Skroutz price graphs are fixtures (scripts/checks/fixtures/history/, fetched 2026-10-20)."""
import json
import os
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, "scraper")
import glitches as g  # noqa: E402
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


def day(n: int) -> str:
    return (date(2025, 1, 1) + timedelta(days=n)).isoformat()


def pts(prices, imported=True, start=0):
    return [{"d": day(start + i), "min": m, "source": "skroutz", **({"i": 1} if imported else {})} for i, m in enumerate(prices)]


def shared_at(p, idx):
    out: dict[str, set] = {}
    for i in idx:
        out.setdefault(p[i]["d"], set()).add(p[i]["min"])
    return out


def same(a, b):
    """The same point objects, in this order (glitches return the input objects)."""
    return len(a) == len(b) and all(x is y for x, y in zip(a, b))


# ---------- sharedImportedLows ----------
imp = {"a": {"d": "x", "low": 10}, "b": {"d": "x", "low": 10}, "c": {"d": "x", "low": 20}, "d": {"d": "x", "low": 20},
       "e": {"d": "x", "low": 20}, "f": "2026-01-01", "g": {"d": "x"}}
expect("shared lows: from 3 models; strings and missing lows skipped", g.shared_imported_lows(imp), {20})
expect("constants = v2", (g.SHARED_LOW_MODELS, g.GLITCH_MAX_DAYS, g.GLITCH_RISE), (3, 3, 1.05))

# ---------- sharedImportedDays ----------
at = lambda m, i=True: [{"d": day(5), "min": m, "source": "skroutz", **({"i": 1} if i else {})}]
h = {"a": at(97.99), "b": at(97.99), "c": at(97.99), "d": at(50), "e": at(50), "f": at(50, False)}
expect("shared days: an imported value on one day in 3+ models; own points do not count", g.shared_imported_days(h),
       {day(5): {97.99}})

# ---------- importGlitches ----------
p = pts([484.69, 369.59, 484.76])
expect("one-day drop (Ryzen 9 7950X, 10/09/2025)", same(g.import_glitches(p, shared_at(p, [1])), [p[1]]), True)
two = pts([130, 97.99, 97.99, 130])
expect("2-day run is a glitch", len(g.import_glitches(two, shared_at(two, [1, 2]))), 2)
three = pts([130, 97.99, 97.99, 97.99, 130])
expect("3-day run is a glitch", len(g.import_glitches(three, shared_at(three, [1, 2, 3]))), 3)
half = pts([130, 97.99, 97.99, 130])
expect("a qualifying run is marked whole when one day is shared (750W Gold SFX)",
       same(g.import_glitches(half, shared_at(half, [1])), [half[1], half[2]]), True)
four = pts([130, 97.99, 97.99, 97.99, 97.99, 130])
expect("4-day run is not a glitch", len(g.import_glitches(four, shared_at(four, [1, 2, 3, 4]))), 0)
first = pts([369.59, 744, 744])
expect("first point: only the one neighbour counts (EPYC 7443)", same(g.import_glitches(first, shared_at(first, [0])), [first[0]]), True)
last = pts([744, 744, 369.59])
expect("last point: only the one neighbour counts", same(g.import_glitches(last, shared_at(last, [2])), [last[2]]), True)
expect("a single point: no neighbour, no evidence", len(g.import_glitches(pts([369.59]), {day(0): {369.59}})), 0)
p = pts([87.06, 87, 87.01])
expect("tiny drop is a real price (asrockb850mx)", len(g.import_glitches(p, shared_at(p, [1]))), 0)
q = pts([100, 95.5, 100])
expect("4.5% under: real", len(g.import_glitches(q, shared_at(q, [1]))), 0)
r = pts([100, 95.2, 100])
expect("5.04% higher around it: glitch", len(g.import_glitches(r, shared_at(r, [1]))), 1)
flat = pts([15.9] + [12.9] * 21 + [15.9])
expect("multi-week flat round price stays, though every day is shared",
       len(g.import_glitches(flat, shared_at(flat, range(len(flat))))), 0)
p = pts([484, 369.59, 484])
expect("not shared by 3: not a glitch", len(g.import_glitches(p, {})), 0)
expect("own points: not a glitch", len(g.import_glitches(pts([484, 369.59, 484], False), shared_at(p, [1]))), 0)
mixed = pts([130, 97.99]) + [{"d": day(2), "min": 97.99, "source": "bestprice"}, {"d": day(3), "min": 130, "source": "skroutz", "i": 1}]
expect("a run with one of our own points in it: not a glitch", len(g.import_glitches(mixed, shared_at(mixed, [1, 2]))), 0)
p = pts([484.69, 369.59, 484.76])
expect("works on unsorted points", [x["d"] for x in g.import_glitches(list(reversed(p)), shared_at(p, [1]))], [day(1)])
b115 = {115.43}
p = pts([144.79, 115.43, 144.79])
expect("second signature: a short run at a shared imported low", same(g.import_glitches(p, {}, b115), [p[1]]), True)
edge = pts([115.43, 144.79])
expect("second signature at the edge", same(g.import_glitches(edge, {}, b115), [edge[0]]), True)
expect("second signature: not under 5%", len(g.import_glitches(pts([118, 115.43, 118]), {}, b115)), 0)
expect("second signature: not 4+ days", len(g.import_glitches(pts([144.79] + [115.43] * 4 + [144.79]), {}, b115)), 0)
expect("second signature: not our own point", len(g.import_glitches(pts([144.79, 115.43, 144.79], False), {}, b115)), 0)
expect("second signature: not a flat round price", len(g.import_glitches(pts([30] + [24] * 20 + [30]), {}, {24})), 0)
expect("an int and a float of the same value are the same price", len(g.import_glitches(pts([30, 24.0, 30]), {}, {24})), 1)

# ---------- parity with v2 on real data (only when both are given) ----------
pdata, pv2 = os.environ.get("GLITCH_PARITY_DATA"), os.environ.get("GLITCH_PARITY_V2")
if pdata and pv2 and Path(pdata).is_dir() and Path(pv2).is_file():
    v2 = json.loads(Path(pv2).read_text(encoding="utf-8"))
    for cat, want in v2.items():
        H = json.loads((Path(pdata) / cat / "history.json").read_text(encoding="utf-8"))
        I = json.loads((Path(pdata) / cat / "history_imported.json").read_text(encoding="utf-8"))
        shared, lows = g.shared_imported_days(H), g.shared_imported_lows(I)
        got = sorted((m, x["d"], x["min"]) for m, ps in H.items() for x in g.import_glitches(ps, shared, lows))
        expect(f"parity {cat}: same {len(want['points'])} points as v2", got, sorted(tuple(x) for x in want["points"]))
        expect(f"parity {cat}: same shared lows and shared day values", (sorted(lows), sum(len(v) for v in shared.values())),
               (want["sharedLows"], want["sharedDays"]))
else:
    print("SKIP parity with v2 (set GLITCH_PARITY_DATA and GLITCH_PARITY_V2)")


# ---------- site_history: parse a price graph (fixture) ----------
FIX = Path("scripts/checks/fixtures/history")
xeon = sh.parse_graph(json.loads((FIX / "skroutz-price-graph-xeon-e-2486.json").read_text(encoding="utf-8")))
i9 = sh.parse_graph(json.loads((FIX / "skroutz-price-graph-core-i9-14900kf.json").read_text(encoding="utf-8")))
expect("fixture: Xeon E-2486 has 369.59 on 2025-09-10 between ~525 days", (xeon["2025-09-09"], xeon["2025-09-10"], xeon["2025-09-11"]),
       (524.29, 369.59, 526.95))
expect("fixture: zero values are skipped", min(xeon.values()) > 0, True)
expect("fixture: Core i9-14900KF has 369.59 on 2025-09-10 and 286 on 2026-01-23", (i9["2025-09-10"], i9["2026-01-23"]), (369.59, 286.0))


# ---------- site_history.enrich with the rule (no network: price_graph is the fixtures) ----------
TODAY = "2026-10-20"
GRAPHS: dict[str, dict] = {}
fetched: list[str] = []


def fake_graph(s, url):
    fetched.append(url)
    return dict(GRAPHS[url])


sh.price_graph = fake_graph
sh.http.session = lambda: None
sh.time.sleep = lambda _s: None
sh.now_iso = lambda: TODAY + "T12:00:00Z"


def L(key, url, n=1, price=100.0):
    return [{"chip": key, "source": "skroutz", "price": price, "url": url}] + [{"chip": key, "source": "bestprice", "price": price}] * (n - 1)


def run(cat, history, done, listings, budget=60, evidence=None):
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)
        (d / "history.json").write_text(json.dumps(history), encoding="utf-8")
        (d / "history_imported.json").write_text(json.dumps(done), encoding="utf-8")
        if evidence is not None:
            (d / g.EVIDENCE_FILE).write_text(json.dumps(evidence), encoding="utf-8")
        fetched.clear()
        sh.enrich(cat, d, listings, lambda l: l["chip"], budget, model_aliases={})
        ev = d / g.EVIDENCE_FILE
        return (json.loads((d / "history.json").read_text(encoding="utf-8")),
                json.loads((d / "history_imported.json").read_text(encoding="utf-8")),
                json.loads(ev.read_text(encoding="utf-8")) if ev.exists() else None, list(fetched))


XU, IU = "https://www.skroutz.gr/s/51124323/Intel-Xeon-E-2486", "https://www.skroutz.gr/s/46852434/Intel-Core-i9-14900KF"
GRAPHS[XU], GRAPHS[IU] = xeon, i9
three_low = {f"cpu{k}": {"d": "2026-10-01", "low": 369.59, "since": "2024-10-01"} for k in range(3)}
past_x = {d: v for d, v in xeon.items() if d < TODAY}
real_x = min(v for d, v in past_x.items() if d != "2025-09-10")

H, I, E, F = run("cpu", {}, {}, L("Xeon E-2486", XU))
expect("enrich without evidence: Xeon gets the 369.59 glitch as its low (the old behaviour)", I["Xeon E-2486"]["low"], 369.59)
H, I, E, F = run("cpu", {}, dict(three_low), L("Xeon E-2486", XU))
expect("enrich: Xeon's 369.59 day is dropped (3 models share that low), low = the real minimum",
       (I["Xeon E-2486"]["low"], real_x), (real_x, min(v for d, v in past_x.items() if v != 369.59)))
expect("enrich: real Xeon low is far above 369.59", real_x > 450, True)
expect("enrich: evidence records the dropped day", E, {"days": {"2025-09-10": [369.59]}, "lows": []})
H, I, E, F = run("cpu", {}, dict(three_low), L("Core i9-14900KF", IU))
past_i = {d: v for d, v in i9.items() if d < TODAY}
expect("enrich: i9's 369.59 is dropped, but 286 on 2026-01-23 (no other model has it) stays its low — known limit",
       I["Core i9-14900KF"]["low"], 286.0)
H, I, E, F = run("cpu", {}, {}, L("Xeon E-2486", XU), evidence={"days": {}, "lows": [369.59]})
expect("enrich: evidence lows count as shared lows (after the clean-up reset them)", I["Xeon E-2486"]["low"], real_x)
H, I, E, F = run("cpu", {}, {}, L("Xeon E-2486", XU), evidence={"days": {"2025-09-10": [369.59]}, "lows": []})
expect("enrich: evidence days count as shared days (after the clean-up removed them)", I["Xeon E-2486"]["low"], real_x)

# synthetic category: two models already hold the glitch day, the third import is caught
GD = "2026-03-13"
series = lambda glitch: {"2026-03-10": 75.0, "2026-03-11": 74.0, "2026-03-12": 70.0, GD: glitch, "2026-03-14": 70.0, "2026-03-15": 71.0}
for k in ("C1", "C2", "C3", "C4"):
    GRAPHS[f"https://www.skroutz.gr/s/{k}/x"] = series(62.9)
hold = lambda: [{"d": "2026-03-12", "min": 70, "source": "skroutz", "i": 1}, {"d": GD, "min": 62.9, "source": "skroutz", "i": 1},
                {"d": "2026-03-14", "min": 70, "source": "skroutz", "i": 1}]
base_h = {"A": hold(), "B": hold()}
base_i = {"A": {"d": "2026-10-01", "low": 62.9, "since": "2026-03-12"}, "B": {"d": "2026-10-01", "low": 62.9, "since": "2026-03-12"}}
H, I, E, F = run("mobo", base_h, base_i, L("C1", "https://www.skroutz.gr/s/C1/x"))
expect("enrich: 2 models hold the day + this series = 3 -> the day is dropped", [x["d"] for x in H["C1"]],
       ["2026-03-10", "2026-03-11", "2026-03-12", "2026-03-14", "2026-03-15"])
expect("enrich: its low is the lowest point left", I["C1"], {"d": TODAY, "low": 70.0, "since": "2026-03-10"})
expect("enrich: the holders' points are never removed by an import", (H["A"], H["B"]), (hold(), hold()))
H, I, E, F = run("mobo", {"A": hold()}, {"A": base_i["A"]}, L("C1", "https://www.skroutz.gr/s/C1/x", 3) + L("C2", "https://www.skroutz.gr/s/C2/x", 2))
expect("enrich: 1 holder + C1 = 2 -> C1 keeps the day; C2 (imported after C1 in the same run) sees 3 -> dropped",
       (any(x["d"] == GD for x in H["C1"]), any(x["d"] == GD for x in H["C2"]), I["C1"]["low"], I["C2"]["low"]), (True, False, 62.9, 70.0))
H, I, E, F = run("mobo", {"A": hold()}, {"A": base_i["A"]}, L("C3", "https://www.skroutz.gr/s/C3/x"))
expect("enrich: 1 holder + this series = 2 -> kept (not shared)", (any(x["d"] == GD for x in H["C3"]), I["C3"]["low"]), (True, 62.9))
expect("enrich: no evidence file when nothing was dropped", E, None)
# a holder that is re-imported does not count twice (its own old point is not "another model")
H, I, E, F = run("mobo", {"A": hold(), "C4": hold()}, {"A": base_i["A"], "C4": "2026-10-20"}, L("C4", "https://www.skroutz.gr/s/C4/x"))
expect("enrich: a re-imported holder counts once (A + C4 = 2 -> kept)", any(x["d"] == GD for x in H["C4"]), True)

# queue: first imports before re-imports (date-only markers), each most-listed first, same budget
for k in ("N1", "N2", "R1", "R2"):
    GRAPHS[f"https://www.skroutz.gr/s/{k}/x"] = {"2026-10-01": 50.0, "2026-10-02": 51.0}
lst = L("R1", "https://www.skroutz.gr/s/R1/x", 9) + L("N1", "https://www.skroutz.gr/s/N1/x", 2) + L("R2", "https://www.skroutz.gr/s/R2/x", 5) + L("N2", "https://www.skroutz.gr/s/N2/x", 3)
done0 = {"R1": "2026-10-20", "R2": "2026-10-20", "X": {"d": "2026-10-01", "low": 5}}
H, I, E, F = run("case", {}, done0, lst)
expect("queue: first imports (most-listed first), then re-imports (most-listed first)", [u.split("/")[4] for u in F], ["N2", "N1", "R1", "R2"])
expect("queue: a re-imported entry is a full entry again", I["R1"], {"d": TODAY, "low": 50.0, "since": "2026-10-01"})
H, I, E, F = run("case", {}, done0, lst, budget=3)
expect("queue: the budget is spent on first imports first", [u.split("/")[4] for u in F], ["N2", "N1", "R1"])
H, I, E, F = run("case", {}, done0, lst, budget=2)
expect("queue: a tight budget leaves the re-imports queued", (I["R1"], I["R2"]), ("2026-10-20", "2026-10-20"))


# ---------- clean-up (one-off, owner-OK'd allow_history_shrink run) ----------
def Pt(n, m, i=True, s="skroutz"):
    return {"d": day(n), "min": m, "source": s, **({"i": 1} if i else {})}


hist = {
    # the same glitch day in 3 models (one-day drop) -> removed
    "m1": [Pt(0, 500), Pt(1, 369.59), Pt(2, 500), Pt(3, 480, False, "bestprice")],
    "m2": [Pt(0, 700), Pt(1, 369.59), Pt(2, 700)],
    "m3": [Pt(1, 369.59), Pt(2, 900)],
    # a sibling promo: 5 days at the shared low -> stays, and so does its low
    "s1": [Pt(10, 120)] + [Pt(11 + k, 94.9) for k in range(5)] + [Pt(16, 120)],
    "s2": [Pt(10, 130)] + [Pt(11 + k, 94.9) for k in range(5)] + [Pt(16, 130)],
    "s3": [Pt(20, 130), Pt(21, 140)],  # low 94.90 is older than its history.json: reset
    # own points only
    "own": [Pt(1, 369.59, False, "bestprice"), Pt(2, 400, False, "snif")],
}
imported = {
    "m1": {"d": "2026-10-01", "low": 369.59, "since": "2024-10-01"},
    "m2": {"d": "2026-10-01", "low": 369.59, "since": "2024-10-01"},
    "m3": {"d": "2026-10-01", "low": 369.59, "since": "2024-10-01"},
    "s1": {"d": "2026-10-01", "low": 94.9, "since": "2024-10-01"},
    "s2": {"d": "2026-10-01", "low": 94.9, "since": "2024-10-01"},
    "s3": {"d": "2026-10-01", "low": 94.9, "since": "2024-10-01"},
    "keep": {"d": "2026-10-01", "low": 55.5, "since": "2024-10-01"},
    "old": "2025-01-01",
    "none": {"d": "2026-10-01"},
}
own_before = sorted((m, x["d"]) for m, ps in hist.items() for x in ps if not x.get("i"))
H2, I2, E2, st = g.clean_category(json.loads(json.dumps(hist)), json.loads(json.dumps(imported)), {}, TODAY)
expect("clean: the glitch day is removed from the 3 models", [[x["d"] for x in H2[m]] for m in ("m1", "m2", "m3")],
       [[day(0), day(2), day(3)], [day(0), day(2)], [day(2)]])
expect("clean: the sibling promo run stays", (H2["s1"], H2["s2"]), (hist["s1"], hist["s2"]))
expect("clean: our own points are untouched", sorted((m, x["d"]) for m, ps in H2.items() for x in ps if not x.get("i")), own_before)
expect("clean: models are never removed", sorted(H2), sorted(hist))
expect("clean: shared lows without a real point in history.json are reset to a date-only marker",
       {k: I2[k] for k in ("m1", "m2", "m3", "s3")}, {k: TODAY for k in ("m1", "m2", "m3", "s3")})
expect("clean: a shared low that is a non-glitch imported point in history.json is kept (sibling promo)",
       (I2["s1"], I2["s2"]), (imported["s1"], imported["s2"]))
expect("clean: other entries untouched", {k: I2[k] for k in ("keep", "old", "none")}, {k: imported[k] for k in ("keep", "old", "none")})
expect("clean: evidence = removed day values + the shared lows of reset entries (94.90: s3 is reset)", E2,
       {"days": {day(1): [369.59]}, "lows": [94.9, 369.59]})
expect("clean: stats", (st["removed"], st["models"], st["reset"], st["spared"]), (3, 3, 4, 2))

# a low equal to one of the model's own removed glitch points, though fewer than 3 models share that low
h3 = {"a": [Pt(0, 100), Pt(1, 80), Pt(2, 100)], "b": [Pt(0, 100), Pt(1, 80), Pt(2, 100)], "c": [Pt(0, 100), Pt(1, 80), Pt(2, 100)]}
i3 = {"a": {"d": "x", "low": 80}, "b": {"d": "x", "low": 79}, "c": {"d": "x", "low": 70}}
H3, I3, E3, st3 = g.clean_category(h3, i3, {}, TODAY)
expect("clean: a low that is the model's own removed glitch value is reset too", (I3["a"], I3["b"], I3["c"]), (TODAY, i3["b"], i3["c"]))
expect("clean: counted apart", (st3["reset"], st3["reset_own_glitch"]), (1, 1))
expect("clean: an own-glitch low is not an evidence low", E3["lows"], [])
# a second clean-up uses the stored evidence (the 3 holders are gone from history.json)
H4, I4, E4, st4 = g.clean_category({"z": [Pt(0, 500), Pt(1, 369.59), Pt(2, 500)]}, {"z": {"d": "x", "low": 369.59}}, E2, TODAY)
expect("clean: stored evidence catches a later model", ([x["d"] for x in H4["z"]], I4["z"], st4["removed"]), ([day(0), day(2)], TODAY, 1))
# running it twice changes nothing more
H5, I5, E5, st5 = g.clean_category(H2, I2, E2, TODAY)
expect("clean: idempotent", (H5, I5, E5, st5["removed"], st5["reset"]), (H2, I2, E2, 0, 0))

# review 1, I1: a shared low that every holder keeps (a real sibling promo) is not written to the evidence lows,
# so it stops being suspect once fewer than 3 models hold it (as in v2) and a later real short deal at that price stays
promo = lambda: [Pt(10, 120)] + [Pt(11 + k, 94.9) for k in range(5)] + [Pt(16, 120)]
h6 = {"p1": promo(), "p2": promo(), "p3": promo()}
i6 = {k: {"d": "2026-10-01", "low": 94.9, "since": "2024-10-01"} for k in h6}
H6, I6, E6, st6 = g.clean_category(json.loads(json.dumps(h6)), dict(i6), {}, TODAY)
expect("clean: every holder keeps the shared low -> nothing reset, the low is not in the evidence",
       (st6["spared"], st6["reset"], E6), (3, 0, {"days": {}, "lows": []}))
GRAPHS["https://www.skroutz.gr/s/P4/x"] = {"2026-03-10": 120.0, "2026-03-11": 120.0, "2026-03-12": 94.9, "2026-03-13": 120.0}
two_hold = {"p1": i6["p1"], "p2": i6["p2"]}  # later: one holder was re-imported with another low
H, I, E, F = run("mobo", H6, two_hold, L("P4", "https://www.skroutz.gr/s/P4/x"), evidence=E6)
expect("enrich: a later import keeps a real 1-day deal at a spared low (only 2 models hold it now)", I["P4"]["low"], 94.9)
H, I, E, F = run("mobo", H6, two_hold, L("P4", "https://www.skroutz.gr/s/P4/x"), evidence={"days": {}, "lows": [94.9]})
expect("enrich: (what an evidence low still blocks: a real 1-day deal at a reset glitch price is dropped)", I["P4"]["low"], 120.0)

# review 1, M1: an unreadable evidence file stops the run (never treated as empty, never overwritten)
with tempfile.TemporaryDirectory() as d:
    d = Path(d)
    (d / "history.json").write_text("{}", encoding="utf-8")
    (d / "history_imported.json").write_text("{}", encoding="utf-8")
    (d / g.EVIDENCE_FILE).write_text('{"days": {"2025-09-10": [369.5', encoding="utf-8")
    try:
        g.load_evidence(d)
        raised = None
    except ValueError as e:
        raised = str(e)
    expect("evidence: a corrupt file raises, naming the file", raised is not None and g.EVIDENCE_FILE in raised, True)
    fetched.clear()
    try:
        sh.enrich("cpu", d, L("Xeon E-2486", XU), lambda l: l["chip"], 60, model_aliases={})
        stopped = False
    except ValueError:
        stopped = True
    expect("enrich: a corrupt evidence file stops before any request and leaves the file as it was",
           (stopped, fetched, (d / g.EVIDENCE_FILE).read_text(encoding="utf-8")), (True, [], '{"days": {"2025-09-10": [369.5'))
    (d / g.EVIDENCE_FILE).unlink()
    expect("evidence: a missing file is empty", g.load_evidence(d), {"days": {}, "lows": []})

# the command: --dry-run writes nothing; a real run writes the three files
with tempfile.TemporaryDirectory() as d:
    d = Path(d)
    (d / "cpu").mkdir()
    (d / "cpu" / "history.json").write_text(json.dumps(hist), encoding="utf-8")
    (d / "cpu" / "history_imported.json").write_text(json.dumps(imported), encoding="utf-8")
    before = {f.name: f.read_bytes() for f in (d / "cpu").iterdir()}
    rc = g.main(["clean", "--dry-run", "--data", str(d), "--today", TODAY])
    expect("command: --dry-run exits 0 and writes nothing", (rc, {f.name: f.read_bytes() for f in (d / "cpu").iterdir()}), (0, before))
    rc = g.main(["clean", "--data", str(d), "--today", TODAY])
    expect("command: writes history.json, history_imported.json and the evidence",
           (rc, json.loads((d / "cpu" / "history.json").read_text(encoding="utf-8")),
            json.loads((d / "cpu" / "history_imported.json").read_text(encoding="utf-8")),
            json.loads((d / "cpu" / g.EVIDENCE_FILE).read_text(encoding="utf-8"))),
           (0, H2, I2, E2))
    expect("command: history_imported.json keeps its key order", list(json.loads((d / "cpu" / "history_imported.json").read_text(encoding="utf-8"))), list(imported))
    expect("command: a missing category is skipped", (d / "gpu").exists(), False)


# ---------- the reset marker and the git merge driver / push guard ----------
full = {"d": "2026-10-01", "low": 369.59, "since": "2024-10-01"}
expect("merge driver: base full, ours reset, theirs unchanged -> reset", mh.merge_imported({"k": full}, {"k": TODAY}, {"k": full}), {"k": TODAY})
expect("merge driver: base full, ours unchanged, theirs reset -> reset", mh.merge_imported({"k": full}, {"k": full}, {"k": TODAY}), {"k": TODAY})
redone = {"d": "2026-10-21", "low": 420.0, "since": "2024-10-21"}
expect("merge driver: base reset, one side re-imported -> the re-import", mh.merge_imported({"k": TODAY}, {"k": TODAY}, {"k": redone}), {"k": redone})
expect("guard: a reset is not a lost marker", mh.lost_markers({"k": full}, {"k": TODAY}), [])
expect("guard: removed glitch points are removed points (needs --allow-shrink)", mh.removed_points(hist, H2),
       [("m1", day(1)), ("m2", day(1)), ("m3", day(1))])

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
