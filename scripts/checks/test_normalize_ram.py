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

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
