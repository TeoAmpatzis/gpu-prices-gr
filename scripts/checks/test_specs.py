"""Unit tests for scraper/specs.py product-page parsers, with real page values (v2 Phase 2, probe of
2026-10-10). Run from the repo root: venv/Scripts/python scripts/checks/test_specs.py"""
import sys
from pathlib import Path

sys.path.insert(0, "scraper")
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

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
