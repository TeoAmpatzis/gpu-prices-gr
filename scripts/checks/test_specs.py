"""Unit tests for scraper/specs.py product-page parsers, with real page values (v2 Phase 2, probe of
2026-10-10). Run from the repo root: venv/Scripts/python scripts/checks/test_specs.py"""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, "scraper")
import names  # noqa: E402
import specs  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures" / "specs"
ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def page(name: str) -> dict[str, str]:
    return specs.labels((FIXTURES / name).read_text(encoding="utf-8"))


# --- BestPrice yes/no features are icons without text
p13r = page("bestprice-mobo-asus-p13r-e.html")
expect("BestPrice 'Bios Flashback' icon specs-no reads as Όχι", p13r.get("Bios Flashback"), "Όχι")
expect("BestPrice text values unchanged", (p13r.get("Μέγιστη Μνήμη"), p13r.get("SATA 3.0 Θύρες"), p13r.get("M.2 Θύρες")),
       ("128GB", "8", "2"))
# Synthetic: the same markup with the "yes" class (no sampled BestPrice board showed one).
yes = specs.labels('<dl data-type="yesno"><dt>Bios Flashback</dt><dd ><span class="specs-yes"><svg class="icon">'
                   '<use xlink:href="#icon-yes-12"></use></svg></span></dd></dl>')
expect("BestPrice icon specs-yes reads as Ναι (synthetic markup)", yes, {"Bios Flashback": "Ναι"})
expect("an empty dd without an icon stays empty", specs.labels("<dl><dt>Wi-Fi</dt><dd></dd></dl>"), {"Wi-Fi": ""})

# --- Boards: BestPrice
expect("BestPrice Asus P13R-E (server board, states everything)", specs.parse_mobo(p13r),
       {"m2Slots": 2, "m2Gen": None, "sataPorts": 8, "maxMemoryGB": 128, "biosFlashback": False})
expect("BestPrice Asus ROG Strix X870-A (consumer board: max memory only)",
       specs.parse_mobo(page("bestprice-mobo-asus-rog-strix-x870-a.html")),
       {"m2Slots": None, "m2Gen": None, "sataPorts": None, "maxMemoryGB": 192, "biosFlashback": None})

# --- Boards: Skroutz labels as read on 2026-10-10 (skroutz.gr/s/41678715, 45773549, 46474681, 58131383)
expect("Skroutz ASRock A620M-HDV/M.2", specs.parse_mobo({
    "Πλήθος": "2 DIMM Slots", "Πλήθος Υποδοχών M.2": "2", "Τύπος M.2": "2 Θύρες PCIe 4.0",
    "Πλήθος SATA III 6Gb/s": "4 Port", "Extra": "Bios Flashback"}),
    {"m2Slots": 2, "m2Gen": 4, "sataPorts": 4, "maxMemoryGB": None, "biosFlashback": True})
expect("Skroutz ASRock H610M-H2/M.2 (PCIe 3.0)", specs.parse_mobo({
    "Πλήθος Υποδοχών M.2": "1", "Τύπος M.2": "1 Θύρα PCIe 3.0", "Πλήθος SATA III 6Gb/s": "4 Port"}),
    {"m2Slots": 1, "m2Gen": 3, "sataPorts": 4, "maxMemoryGB": None, "biosFlashback": None})
expect("Skroutz ASRock H610M-HDV/M.2 (no M.2 label: unknown, not 0)", specs.parse_mobo({
    "Πλήθος": "2 DIMM Slots", "Πλήθος SATA III 6Gb/s": "4 Port"}),
    {"m2Slots": None, "m2Gen": None, "sataPorts": 4, "maxMemoryGB": None, "biosFlashback": None})
expect("Skroutz 'Extra: -' is silence, not 'no Flashback'", specs.parse_mobo({"Extra": "-"})["biosFlashback"], None)

# --- BestPrice writes thousands with a dot ("3.072GB" = 3,072 GB): run 38033729453 stored 3 for this board
expect("BestPrice Supermicro H13SSL-N: '3.072GB' is 3,072 GB, not 3",
       specs.parse_mobo(page("bestprice-mobo-supermicro-h13ssl-n.html"))["maxMemoryGB"], 3072)
expect("'1.024GB' is 1,024 GB", specs._gb("1.024GB"), 1024)
expect("a decimal comma still works ('1,5TB')", specs._gb("1,5TB"), 1536)
# --- Helpers
expect("highest PCIe generation of mixed M.2 slots", specs._pcie_gen("1 Θύρα PCIe 5.0, 2 Θύρες PCIe 4.0"), 5)
expect("max memory in TB", specs._gb("2TB"), 2048)
expect("max memory with a space", specs._gb("256 GB"), 256)
expect("count from '4 Port'", specs._count("4 Port"), 4)
expect("no count from text", specs._count("Όχι"), None)

# --- Queue: boards go to BestPrice while Skroutz is paused
board = lambda i, src: {"id": f"{src}:{i}", "source": src, "chip": "Asus Prime B650-Plus", "price": 100.0}
q = specs.queue("mobo", [board(1, "skroutz"), board(2, "bestprice")], {}, lambda l: "asusprimeb650plus")
expect("paused Skroutz: the board is queued on BestPrice only", ({k: [l["id"] for l in v] for k, v in q.items()}),
       {"skroutz": [], "bestprice": ["bestprice:2"]})
q = specs.queue("mobo", [board(2, "bestprice")], {"bestprice:2": {"maxMemoryGB": 192}}, lambda l: "asusprimeb650plus")
expect("a board BestPrice already answered is not read again", q, {"skroutz": [], "bestprice": []})
q = specs.queue("case", [{**board(3, "skroutz"), "chip": "NZXT H5"}], {}, lambda l: "nzxth5")
expect("other categories still read Skroutz", [l["id"] for l in q["skroutz"]], ["skroutz:3"])

# --- Cases: drive bays and front USB-C (labels as read on 2026-10-10)
def case_fields(sp):
    p = specs.parse_case(sp)
    return {k: p[k] for k in ("bays35", "bays25", "usbCFront")}


expect("BestPrice Thermaltake The Tower 300 (bestprice.gr/item/2159412153)", case_fields({
    "Εσωτερικές Θέσεις 3.5''": "3", "Εσωτερικές Θέσεις 2.5''": "3", "Συνδεσιμότητα": "Ήχος • USB-C • USB 3.0"}),
    {"bays35": 3, "bays25": 3, "usbCFront": True})
expect("Skroutz Asus ProArt PA401 (skroutz.gr/s/59013449)", case_fields({
    "Εσωτερικές Θύρες 3.5''": "2", "Εσωτερικές Θύρες 2.5''": "2", "Συνδεσιμότητα": "USB 3.2, USB-C"}),
    {"bays35": 2, "bays25": 2, "usbCFront": True})
expect("Skroutz The Tower 300: no bay labels = unknown", case_fields({"Συνδεσιμότητα": "USB 3.2, USB-C"}),
       {"bays35": None, "bays25": None, "usbCFront": True})
expect("a stated port list without USB-C = no front USB-C", case_fields({"Συνδεσιμότητα": "Ήχος • USB 3.0"})["usbCFront"], False)
expect("'Type-C' counts as USB-C", case_fields({"Συνδεσιμότητα": "USB 3.2 Gen 2 Type-C"})["usbCFront"], True)
expect("no port list = unknown", case_fields({})["usbCFront"], None)
expect("drive bays are not fan positions", specs.parse_case({"Εσωτερικές Θέσεις 3.5''": "3", "Άνω Θέσεις": "2"})["fanSlots"], 2)
expect("fewer bays is the safe value when sites disagree", (specs.SAFER["bays35"](1, 2), specs.SAFER["bays25"](2, 3)), (1, 2))

# --- Re-reading pages of an older parser version (cases v2), BestPrice only
key = lambda l: "thermaltakethetower600"
tt = lambda i, src: {"id": f"{src}:{i}", "source": src, "chip": "Thermaltake The Tower 600", "price": 120.0}
old = {"gpuMaxMm": 415.0, "coolerMaxMm": 185.0, "checked": "2026-10-01T00:00:00+00:00"}
q = specs.queue("case", [tt(1, "skroutz"), tt(2, "bestprice")], {"skroutz:1": old}, key)
expect("a case read by v1 on Skroutz is re-read on BestPrice (never on Skroutz)", {k: [l["id"] for l in v] for k, v in q.items()},
       {"skroutz": [], "bestprice": ["bestprice:2"]})
q = specs.queue("case", [tt(1, "skroutz"), tt(2, "bestprice")], {"skroutz:1": old, "bestprice:2": {**old, "v": 2}}, key)
expect("a case with a v2 page is not read again", q, {"skroutz": [], "bestprice": []})
q = specs.queue("case", [tt(1, "skroutz")], {"skroutz:1": old}, key)
expect("a case only Skroutz lists waits (no re-read anywhere)", q, {"skroutz": [], "bestprice": []})
new_case = {"id": "skroutz:9", "source": "skroutz", "chip": "NZXT H5 Flow", "price": 90.0}
q = specs.queue("case", [tt(1, "skroutz"), tt(2, "bestprice"), new_case], {"skroutz:1": old},
                lambda l: names.model_key(l["chip"]))
expect("new products come before re-reads", ([l["id"] for l in q["skroutz"]], [l["id"] for l in q["bestprice"]]),
       (["skroutz:9"], ["bestprice:2"]))
with tempfile.TemporaryDirectory() as d:
    Path(d, "specs.json").write_text(json.dumps({"bestprice:2": {"bays35": 1, "usbCFront": True, "checked": "x", "v": 2}}), encoding="utf-8")
    ls = [dict(tt(2, "bestprice"))]
    specs.apply("case", Path(d), ls)
    expect("apply copies the fields and leaves the version marker out", (ls[0]["bays35"], ls[0]["usbCFront"], "v" in ls[0], "checked" in ls[0]),
           (1, True, False, False))

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
