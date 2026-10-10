"""Unit tests for scraper/normalize_psu.py ATX 3.x reading, with real titles and URLs from public/data
(2026-10-10; v2 Phase 2). The two "is not a version" strings are made up to test the pattern.
Run from the repo root: venv/Scripts/python scripts/checks/test_normalize_psu.py"""
import sys

sys.path.insert(0, "scraper")
import normalize_psu  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def psu(source, title, url):
    l = normalize_psu.make_listing(source=source, native_id="1", title=title, url=url, price=100.0,
                                   shop_count=None, scraped_at="2026-10-10T00:00:00+00:00")
    return (l.chip, l.formFactor, l.atx3) if l else None


expect("BestPrice: 'atch-3-1' in the URL (its Form Factor field)",
       psu("bestprice", "Sharkoon Rebel P20 Gen2 1000W",
           "https://www.bestprice.gr/item/2164461300/sharkoon-rebel-p20-gen2-1000w-trofodotiko-ypologisti-atch-3-1.html"),
       ("1000W", "ATX", True))
expect("BestPrice: 'atx-3-0' in the URL",
       psu("bestprice", "Chieftec Vega M White 1000W",
           "https://www.bestprice.gr/item/2162784994/chieftec-vega-m-white-1000w-trofodotiko-ypologisti-atx-3-0-80-plus-gold.html"),
       ("1000W Gold", "ATX", True))
expect("BestPrice: plain 'atx-eps' says nothing about the version (None, not False)",
       psu("bestprice", "Chieftec BDF-1000C 1000W",
           "https://www.bestprice.gr/item/2155218182/chieftec-bdf-1000c-1000w-trofodotiko-ypologisti-atx-eps-80-plus-bronze.html"),
       ("1000W Bronze", "ATX", None))
expect("e-shop title 'ATX 3.1'",
       psu("eshop", "ENERMAX REVOLUTION III 1000W 80 PLUS GOLD FULL MODULAR ATX 3.1",
           "https://www.e-shop.gr/psu-enermax-revolution-iii-1000w-80-plus-gold-full-modular-atx-31-p-PER.645602"),
       ("1000W Gold", "ATX", True))
expect("Shopflix title 'ATX3.1' (no space)",
       psu("shopflix", "Lian Li RS1000G ATX3.1 1000W Λευκό",
           "https://shopflix.gr/p/SF-201482182/lian-li-rs1000g-atx3-1-1000w-leuko-trophodotiko-upologiste-full-modular-80-plus-gold"),
       ("1000W Gold", "ATX", True))
expect("a wattage after 'ATX ' is not a version ('ATX 300W')",
       normalize_psu.ATX3.search("Inter-Tech Argus ATX 300W") is None, True)
expect("'ATX 3 1000W' is not a version either", normalize_psu.ATX3.search("Some PSU ATX 3 1000W") is None, True)
expect("SFX with ATX 3.1 keeps its form factor",
       psu("bestprice", "Deepcool PS750G White 750W",
           "https://www.bestprice.gr/item/2163428668/deepcool-ps750g-white-750w-trofodotiko-ypologisti-sfx-atch-3-1-80-plus-gold.html"),
       ("750W Gold", "SFX", True))

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
