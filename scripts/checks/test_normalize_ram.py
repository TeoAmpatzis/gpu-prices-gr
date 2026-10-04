"""Unit tests for scraper/normalize_ram.py, with real shop titles (v2 audit, docs/audit-v1.md D-03/D-04).
Run from the repo root: venv/Scripts/python scripts/checks/test_normalize_ram.py"""
import sys

sys.path.insert(0, "scraper")
import normalize_ram  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def ram(title, url="https://example.invalid/p/1"):
    l = normalize_ram.make_listing(source="shopflix", native_id="1", title=title, url=url, price=100.0,
                                   shop_count=None, scraped_at="2026-10-04T00:00:00+00:00")
    return (l.chip, l.modules, l.formFactor) if l else None


# --- D-03: kits written without "GB" (Shopflix), trusted only when they make the stated total
expect("(2x8) after the speed", ram("Kingston Fury Beast DDR5 16GB 5200Mhz (2x8)",
       "https://shopflix.gr/p/SF-09442459/mnimi-ram-kingston-fury-beast-ddr5-16gb-5200mhz-2x8-9416981"),
       ("DDR5 16GB (2×8GB) 5200MHz", 2, "Desktop"))
expect("bare 2x8 at the end", ram("Kingston Fury Impact DDR5 16GB 4800MHz 2x8",
       "https://shopflix.gr/p/SF-12718096/mnimi-ram-kingston-fury-impact-ddr5-16gb-4800mhz-2x8--12692618"),
       ("DDR5 16GB (2×8GB) 4800MHz", 2, "Desktop"))
expect("2x16 without a speed", ram("G.Skill Ripjaws S5 DDR5 32GB 2x16",
       "https://shopflix.gr/p/SF-12718290/mnimi-ram-gskill-ripjaws-s5-ddr5-32gb-2x16-12692812"),
       ("DDR5 32GB (2×16GB)", 2, "Desktop"))
expect("(4x32) on a 128GB DDR4 kit", ram("Desktop GSkill Ripjaws V 128GB DDR4 3200MHz (4x32)"),
       ("DDR4 128GB (4×32GB) 3200MHz", 4, "Desktop"))
expect("DDR3 2x8", ram("G.Skill DDR3 16GB 1333MHz 2x8"), ("DDR3 16GB (2×8GB) 1333MHz", 2, "Desktop"))
expect("(1x4) stays one stick", ram("TeamGroup Elite DDR3 4GB 1600MHz (1x4)"), ("DDR3 4GB (1×4GB) 1600MHz", 1, "Desktop"))
expect("a kit with GB is read as before", ram("Kingston Fury Beast 32GB (2X16GB) DDR5 RAM 6000MHz C30 Black"),
       ("DDR5 32GB (2×16GB) 6000MHz", 2, "Desktop"))
expect("a single stick stays one stick", ram("Lexar 32GB (1X32GB) DDR5 RAM 5600MHz C46 LD5S32G56C46ST-BGS"),
       ("DDR5 32GB (1×32GB) 5600MHz", 1, "Desktop"))
# synthetic: a bare NxM that doesn't make the stated total is not trusted
expect("synthetic: (2x8) on a 32GB title is ignored", ram("Corsair Vengeance DDR5 32GB 6000MHz (2x8)"),
       ("DDR5 32GB (1×32GB) 6000MHz", 1, "Desktop"))

# --- D-04: the part number decides the DDR type when the title disagrees; server DIMMs are Server
expect("G.Skill F5- titled DDR4 is DDR5", ram("G.Skill Trident Z5 RGB 64GB (2X32GB) DDR4 RAM 6000MHz C36 White F5-6000J3636F32GX2-TZ5RW",
       "https://www.bestprice.gr/item/2159382238/g-skill-trident-z5-rgb-64gb-ddr4-ram-6000mhz-c36-white-f5-6000j3636f32gx2-tz5rw.html"),
       ("DDR5 64GB (2×32GB) 6000MHz", 2, "Desktop"))
expect("Lexar LD5S titled DDR4 (also in the Skroutz slug) is DDR5", ram("Lexar 8GB DDR4 LD5S08G56C46ST-BGS",
       "https://www.skroutz.gr/s/62826559/lexar-ddr4-me-module-1x8gb-kai-tachytita-5600-gia-laptop-ld5s08g56c46st-bgs.html"),
       ("DDR5 8GB (1×8GB) 5600MHz", 1, "Laptop"))
expect("G.Skill F4- stays DDR4", ram("G.Skill Aegis Ddr4-3000Mhz F4-3000C16D-16Gisb 16GB Kit (2x8)"),
       ("DDR4 16GB (2×8GB) 3000MHz", 2, "Desktop"))
expect("Kingston KSM…R is Server", ram("Kingston 16GB (1X16GB) DDR4 RAM 3200MHz C22 KSM32RS8/16HD",
       "https://www.bestprice.gr/item/2164455745/kingston-16gb-ddr4-ram-3200mhz-c22-ksm32rs8-16hd.html"),
       ("DDR4 16GB (1×16GB) 3200MHz", 1, "Server"))
expect("Micron MTA…72P is Server", ram("Micron 16GB (1X16GB) DDR4 RAM 3200MHz MTA18ASF2G72PDZ-3G2R1TI",
       "https://www.bestprice.gr/item/2159223206/micron-16gb-ddr4-ram-3200mhz-mta18asf2g72pdz-3g2r1ti.html"),
       ("DDR4 16GB (1×16GB) 3200MHz", 1, "Server"))
expect("Samsung M393 is Server", ram("Samsung 16GB (1X16GB) DDR4 RAM 3200MHz M393A2K43DB3-CWE",
       "https://www.bestprice.gr/item/2156351890/samsung-16gb-ddr4-ram-3200mhz-m393a2k43db3-cwe.html"),
       ("DDR4 16GB (1×16GB) 3200MHz", 1, "Server"))
expect("SK Hynix HMA…R7 is Server", ram("Hynix 32GB DDR4 HMA84GR7DJR4N-XN",
       "https://www.skroutz.gr/s/42362691/Hynix-DDR4-me-Module-1x32GB-kai-Tachytita-3200-gia-Server-HMA84GR7DJR4N-XN.html"),
       ("DDR4 32GB (1×32GB) 3200MHz", 1, "Server"))
expect("a desktop kit without a server part number stays Desktop", ram("Kingston Fury Beast 32GB (2X16GB) DDR5 RAM 6000MHz C30 Black"),
       ("DDR5 32GB (2×16GB) 6000MHz", 2, "Desktop"))

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
