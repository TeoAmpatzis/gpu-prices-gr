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

# --- Q3 / B9 batch 4: RAM speeds (real titles + URLs from public/data/ram/latest.json, 2026-10-19).
# Plausible MT/s per type: DDR2 400–1066, DDR3 800–2933, DDR4 1600–5333, DDR5 4000–10000.
SF, SK, BP, SN, ES = "https://shopflix.gr/p/", "https://www.skroutz.gr/s/", "https://www.bestprice.gr/item/", \
    "https://www.snif.gr/showproduct/", "https://www.e-shop.gr/"

# Rule 1: Shopflix "Ταχύτητα N" is MT/s, DDR2 to DDR5
expect("Ταχύτητα 800 DDR2", ram("Kingston DDR2 με Module 1x2GB & Ταχύτητα 800 για Desktop",
       SF + "SF-201077460/kingston-ddr2-me-module-1x2gb-and-takhuteta-800-gia-desktop"),
       ("DDR2 2GB (1×2GB) 800MHz", 1, "Desktop"))
expect("Ταχύτητα 667 DDR2 server", ram("MicroMemory DDR2 4GB με Ταχύτητα 667 για Server",
       SF + "SF-105860227/mneme-ram-micromemory-ddr2-4gb-me-takhuteta-667-gia-server"),
       ("DDR2 4GB (1×4GB) 667MHz", 1, "Server"))
expect("Ταχύτητα 1333 DDR3", ram("Kingston DDR3 με Module 1x2GB & Ταχύτητα 1333 για Desktop",
       SF + "SF-201847149/kingston-ddr3-me-module-1x2gb-and-takhuteta-1333-gia-desktop"),
       ("DDR3 2GB (1×2GB) 1333MHz", 1, "Desktop"))
expect("Ταχύτητα 1600 DDR3 kit", ram("G.Skill Ares 16GB DDR3 RAM με 2 Modules (2x8GB) και Ταχύτητα 1600 για Desktop",
       SF + "SF-103228477/g-skill-ares-16gb-ddr3-ram-me-2-modules-2x8gb-kai-taxutita-1600-gia-desktop"),
       ("DDR3 16GB (2×8GB) 1600MHz", 2, "Desktop"))
expect("Ταχύτητα 3000 DDR4", ram("Corsair Vengeance LPX 16GB DDR4 με Ταχύτητα 3000 για Desktop",
       SF + "SF-09285390/mnimi-ram-corsair-vengeance-lpx-16gb-ddr4-me-taxytita-3000-gia-desktop-9259912"),
       ("DDR4 16GB (1×16GB) 3000MHz", 1, "Desktop"))
expect("Ταχύτητα 3200 DDR4 with part number", ram("Kingston Fury Beast DDR4 32GB RAM με 2x16GB Modules και Ταχύτητα 3200 για Desktop Κωδικός: KF432C16BBK2/32",
       SF + "SF-201565702/kingston-fury-beast-ddr4-32gb-ram-me-2x16gb-modules-kai-takhuteta-3200-gia-desktop-kodikos-kf432c16bbk2-32"),
       ("DDR4 32GB (2×16GB) 3200MHz", 2, "Desktop"))
expect("Ταχύτητα 2500 DDR4 (odd but in range)", ram("Synology 8GB DDR4 RAM με Ταχύτητα 2500 για Server",
       SF + "SF-103227952/synology-8gb-ddr4-ram-me-taxutita-2500-gia-server"),
       ("DDR4 8GB (1×8GB) 2500MHz", 1, "Server"))
expect("Ταχύτητα without a number: no speed", ram("Kingston 32GB DDR4 με Ταχύτητα για Server",
       SF + "SF-15201019/mnimi-ram-kingston-32gb-ddr4-me-taxytita-gia-server-15175541"),
       ("DDR4 32GB (1×32GB)", 1, "Server"))

# Rule 6: series names ending in digits are not speeds or counts
expect("Aegis 5 + Ταχύτητα 5200", ram("G.Skill Aegis 5 32GB DDR5 με 2 Modules (2x16GB) & Ταχύτητα 5200 για Desktop",
       SF + "SF-105393026/mnhmi-ram-g-skill-aegis-5-32gb-ddr5-me-2-modules-2x16gb-taxutita-5200-gia-desktop"),
       ("DDR5 32GB (2×16GB) 5200MHz", 2, "Desktop"))
expect("Viper Elite 5 + Ταχύτητα 6000", ram("Patriot Viper Elite 5 16GB DDR5 με Ταχύτητα 6000 για Desktop",
       SF + "SF-104269614/mnhmi-ram-patriot-viper-elite-5-16gb-ddr5-me-taxutita-6000-gia-desktop"),
       ("DDR5 16GB (1×16GB) 6000MHz", 1, "Desktop"))
expect("Elite 5 Ultra + 'με Modules' (no count)", ram("Patriot Viper RGB Elite 5 Ultra DDR5 32GB RAM με Modules & Ταχύτητα 6000 για Desktop",
       SF + "SF-201101293/patriot-viper-rgb-elite-5-ultra-ddr5-32gb-ram-me-modules-and-takhuteta-6000-gia-desktop"),
       ("DDR5 32GB (1×32GB) 6000MHz", 1, "Desktop"))
expect("Viper Elite 5 Ultra 8000MT/S (unchanged)", ram("PATRIOT VIPER ELITE 5 ULTRA 128GB (2X64GB) DDR5 8000MT/S CL44 INTEL/AMD DUAL KIT VEU5128G8044CK",
       ES + "ram-patriot-viper-elite-5-ultra-128gb-2x64gb-ddr5-8000mt-s-cl44-intel-amd-dual-kit-veu5128g8044ck-p-PER.324029"),
       ("DDR5 128GB (2×64GB) 8000MHz", 2, "Desktop"))
expect("Aegis 5 Skroutz slug (unchanged)", ram("G.Skill Aegis 5 DDR5",
       SK + "58723585/G-Skill-Aegis-5-DDR5-me-Module-1x16GB-kai-Tachytita-5200-gia-Desktop-F5-5200J4040A16GX1-IS.html"),
       ("DDR5 16GB (1×16GB) 5200MHz", 1, "Desktop"))

# Rule 2/3/5: stated values outside the type's range
expect("e-shop 60000MHZ -> part F5-6000", ram("G.SKILL F5-6000J3040G32GX2-TZ5RK TRIDENT Z5 RGB 64GB (2X32GB) DDR5 60000MHZ CL30 DUAL KIT",
       ES + "ram-gskill-f5-6000j3040g32gx2-tz5rk-trident-z5-rgb-64gb-2x32gb-ddr5-60000mhz-cl30-dual-kit-p-PER.559539"),
       ("DDR5 64GB (2×32GB) 6000MHz", 2, "Desktop"))
expect("e-shop 60000MHZ -> part F5-6000 (2)", ram("G.SKILL F5-6000J3238G32GX2-TZ5S TRIDENT Z5 64GB (2X32GB) DDR5 60000MHZ CL32 DUAL KIT",
       ES + "ram-gskill-f5-6000j3238g32gx2-tz5s-trident-z5-64gb-2x32gb-ddr5-60000mhz-cl32-dual-kit-p-PER.559544"),
       ("DDR5 64GB (2×32GB) 6000MHz", 2, "Desktop"))
expect("Snif Goodram 48000 MHz -> part GR4800", ram("Goodram GR4800S564L40S/16G DDR5 48000 MHz (1x16GB)",
       SN + "42516067/mnimi-ram-goodram-gr4800s564l40s-16g-ddr5-48000-mh"),
       ("DDR5 16GB (1×16GB) 4800MHz", 1, "Desktop"))
expect("Corsair DDR3 667MHz is impossible -> no speed", ram("Corsair 2GB (1X2GB) DDR3 RAM 667MHz SoDimm",
       BP + "2152702796/corsair-2gb-ddr3-ram-667mhz-sodimm.html"),
       ("DDR3 2GB (1×2GB)", 1, "Laptop"))
expect("Lenovo DDR4 6400 -> no speed", ram("Lenovo 32GB DDR4 4X77A90965",
       SK + "68019327/lenovo-ddr4-me-module-1x32gb-kai-tachytita-6400-gia-server-4x77a90965.html"),
       ("DDR4 32GB (1×32GB)", 1, "Server"))
expect("Snif Samsung DDR2 3200MHz -> no speed", ram("Samsung Refurbished DDR2 3200MHz (2x1GB)",
       SN + "40149663/samsung-refurbished-ddr2-3200mhz-2x1gb"),
       ("DDR2 2GB (2×1GB)", 2, "Desktop"))
expect("Dell DDR2 Tachytita-1600 -> no speed", ram("Dell 4GB DDR2 1WT39",
       SK + "53886650/Dell-DDR2-me-Module-1x4GB-kai-Tachytita-1600-gia-Server-1WT39.html"),
       ("DDR2 4GB (1×4GB)", 1, "Server"))
expect("Lexar DDR4 Ταχύτητα 5600 (no part) -> no speed", ram("Lexar DDR4 με Module 1x8GB & Ταχύτητα 5600 για Laptop",
       SF + "SF-202965663/lexar-ddr4-me-module-1x8gb-and-takhuteta-5600-gia-laptop"),
       ("DDR4 8GB (1×8GB)", 1, "Laptop"))

# Rule 4: DDR5 clock values (half the MT/s); the part number wins when there is one
expect("Corsair Tachytita-2800 -> part CMSX…5600", ram("Corsair Vengeance 24GB DDR5",
       SK + "63368834/corsair-vengeance-ddr5-me-module-1x24gb-kai-tachytita-2800-gia-laptop-cmsx24gx5m1a5600c48.html"),
       ("DDR5 24GB (1×24GB) 5600MHz", 1, "Laptop"))
expect("Corsair Tachytita-2800 32GB -> part 5600", ram("Corsair Vengeance 32GB DDR5",
       SK + "58722757/Corsair-Vengeance-DDR5-me-Module-1x32GB-kai-Tachytita-2800-gia-Laptop-CMSX32GX5M1A5600C48.html"),
       ("DDR5 32GB (1×32GB) 5600MHz", 1, "Laptop"))
expect("Adata Tachytita-2400 -> part AD5S4800", ram("Adata 32GB DDR5 AD5S480032G-S",
       SK + "40527055/Adata-DDR5-me-Module-1x32GB-kai-Tachytita-2400-gia-Laptop-AD5S480032G-S.html"),
       ("DDR5 32GB (1×32GB) 4800MHz", 1, "Laptop"))
expect("HP DDR5 2400MHz (no maker part) -> doubled 4800", ram("HP 32GB (1X32GB) DDR5 RAM 2400MHz C40 P64339-B21",
       BP + "2160758270/hp-32gb-ddr5-ram-2400mhz-c40-p64339-b21.html"),
       ("DDR5 32GB (1×32GB) 4800MHz", 1, "Desktop"))
expect("HP Skroutz Tachytita-2400 -> doubled 4800", ram("HP Dual Rank 32GB DDR5",
       SK + "57724317/HP-Dual-Rank-DDR5-me-Module-1x32GB-kai-Tachytita-2400-gia-Server-P64339-B21.html"),
       ("DDR5 32GB (1×32GB) 4800MHz", 1, "Server"))
expect("HP Shopflix Ταχύτητα 2400 -> doubled 4800", ram("HP Dual Rank DDR5 με Module 1x32GB & Ταχύτητα 2400 για Server",
       SF + "SF-200071870/hp-dual-rank-ddr5-me-module-1x32gb-and-takhuteta-2400-gia-server"),
       ("DDR5 32GB (1×32GB) 4800MHz", 1, "Server"))
expect("Shopflix Corsair 2800MHz SODIMM -> doubled 5600", ram("Corsair Vengeance DDR5 32GB (1x32GB) 2800MHz SODIMM Laptop Memory Module",
       SF + "SF-107113129/corsair-vengeance-ddr5-32gb-1x32gb-2800mhz-sodimm-laptop-memory-module"),
       ("DDR5 32GB (1×32GB) 5600MHz", 1, "Laptop"))
expect("Snif Kingston 'DDR5 2600' -> part KF552 = 5200", ram("Kingston KF552C40BBAK2-16 DDR5 2600 (2 x 16 GB)",
       SN + "39002185/mnimi-ram-kingston-kf552c40bbak2-16-ddr5-2600-2-x"),
       ("DDR5 32GB (2×16GB) 5200MHz", 2, "Desktop"))

# Rule 3: no stated speed -> the maker's part number (only patterns seen on 2+ real titles)
expect("G.Skill F5-5600 part, no stated speed", ram("G.Skill Ripjaws S5 32GB DDR5 με 2 Modules 2x16GB",
       SK + "33828251/G-Skill-Ripjaws-S5-DDR5-32GB-RAM-me-2x16GB-Modules-gia-Desktop-F5-5600J4040C16GX2-RS5K.html"),
       ("DDR5 32GB (2×16GB) 5600MHz", 2, "Desktop"))
expect("G.Skill 6800GHz typo -> 6800", ram("G.Skill Ripjaws S5 32GB (2X16GB) DDR5 RAM 6800GHz C34 Black F5-6800J3445G16GX2-RS5K",
       BP + "2158838026/g-skill-ripjaws-s5-32gb-ddr5-ram-6800ghz-c34-black-f5-6800j3445g16gx2-rs5k.html"),
       ("DDR5 32GB (2×16GB) 6800MHz", 2, "Desktop"))
expect("Goodram IR-6000 part", ram("GoodRAM IRDM 16GB DDR5",
       SK + "61482449/goodram-irdm-ddr5-me-module-1x16gb-gia-desktop-ir-6000d564l30s-16g.html"),
       ("DDR5 16GB (1×16GB) 6000MHz", 1, "Desktop"))
expect("Kingston KVR56 part", ram("Kingston 32GB DDR5 KVR56U46BS8-32",
       SK + "66108564/kingston-ddr5-me-module-1x32gb-gia-desktop-kvr56u46bs8-32.html"),
       ("DDR5 32GB (1×32GB) 5600MHz", 1, "Desktop"))
expect("Kingston KSM32 part", ram("Kingston Premier 16GB DDR4",
       SK + "38941699/Kingston-Premier-DDR4-me-Module-1x16GB-gia-Server-KSM32ES8-16MF.html"),
       ("DDR4 16GB (1×16GB) 3200MHz", 1, "Server"))
expect("Kingston KSM26 part = 2666", ram("Kingston 32GB DDR4 KSM26ED8/32MF",
       SK + "38941480/Kingston-DDR4-me-Module-1x32GB-gia-Server-KSM26ED8-32MF.html"),
       ("DDR4 32GB (1×32GB) 2666MHz", 1, "Server"))
expect("Adata AD4S3200 part", ram("Adata 16GB DDR4 με 2 Modules 2x8GB AD4S32008G22-DTGN",
       SK + "64904195/adata-ddr4-16gb-ram-me-2x8gb-modules-gia-laptop-ad4s32008g22-dtgn.html"),
       ("DDR4 16GB (2×8GB) 3200MHz", 2, "Laptop"))
expect("Corsair CMP…6000C36 part ('DDR5 6000' bare)", ram("CORSAIR CMP64GX5M4B6000C36W DOMINATOR TITANIUM RGB WHITE 64GB (4X16GB) DDR5 6000 CL36 INTEL XMP",
       ES + "ram-corsair-cmp64gx5m4b6000c36w-dominator-titanium-rgb-white-64gb-4x16gb-ddr5-6000-cl36-intel-xmp-p-PER.547544"),
       ("DDR5 64GB (4×16GB) 6000MHz", 4, "Desktop"))

# Other stated notations: "DDR3-1333", "5200MT", "6000GHz"
expect("DDR3-1333 notation", ram("PATRIOT DIMM 4GB DDR3-1333 SIGNATURE LINE PSD34G13332",
       ES + "ram-patriot-dimm-4gb-ddr3-1333-signature-line-psd34g13332-p-PER.553492"),
       ("DDR3 4GB (1×4GB) 1333MHz", 1, "Desktop"))
expect("CoreParts part 'MMHP-DDR3-0001' is not a speed (unchanged)", ram("CoreParts 8GB DDR3 MMHP-DDR3-0001-8GB",
       SK + "46645781/CoreParts-DDR3-me-Module-1x8GB-kai-Tachytita-1866-gia-Desktop-MMHP-DDR3-0001-8GB.html"),
       ("DDR3 8GB (1×8GB) 1866MHz", 1, "Desktop"))
expect("5200MT",ram("64GB 5200MT DDR5 Kit2 FURY Beast RGB (2x32)",
       SF + "SF-101899493/mnhmi-ram-64gb-5200mt-ddr5-kit2-fury-beast-rgb-2x32"),
       ("DDR5 64GB (2×32GB) 5200MHz", 2, "Desktop"))
expect("6000GHz typo, no part", ram("G.Skill Ripjaws S5 64GB 6000GHz CL36 DDR5 Black",
       SF + "SF-201784149/g-skill-ripjaws-s5-64gb-6000ghz-cl36-ddr5-black"),
       ("DDR5 64GB (1×64GB) 6000MHz", 1, "Desktop"))

# Rule 7: a valid stated speed is kept even when the part number says another one
expect("Corsair stated 5200, part 6400 -> 5200", ram("Corsair Vengeance White 32GB DDR5 με 2 Modules 2x16GB",
       SK + "43910214/Corsair-Vengeance-White-DDR5-32GB-RAM-me-2x16GB-Modules-kai-Tachytita-5200-gia-Desktop-CMK32GX5M2B6400C32W.html"),
       ("DDR5 32GB (2×16GB) 5200MHz", 2, "Desktop"))
expect("G.Skill stated 5600, part F5-6000 -> 5600", ram("G.Skill Trident Z5 128GB DDR5 με 2 Modules 2x64GB",
       SK + "61681871/g-skill-trident-z5-ddr5-128gb-ram-me-2x64gb-modules-kai-tachytita-5600-gia-desktop-f5-6000j3444f64gx2-tz5rk.html"),
       ("DDR5 128GB (2×64GB) 5600MHz", 2, "Desktop"))
expect("Kingston stated 2666, KSM32 -> 2666", ram("Kingston 32GB DDR4 KSM32RS4/32HCR",
       SK + "37689277/Kingston-DDR4-me-Module-1x32GB-kai-Tachytita-2666-gia-Server-KSM32RS4-32HCR.html"),
       ("DDR4 32GB (1×32GB) 2666MHz", 1, "Server"))
expect("Kingston KF442 stated 4266 (unchanged)", ram("Kingston Fury Renegade 16GB DDR4 με 2 Modules 2x8GB",
       SK + "46672697/Kingston-Fury-Renegade-DDR4-16GB-RAM-me-2x8GB-Modules-kai-Tachytita-4266-gia-Desktop-KF442C19RB2K2-16.html"),
       ("DDR4 16GB (2×8GB) 4266MHz", 2, "Desktop"))

# Models that must not change
expect("BestPrice Viper Elite 5 kit (unchanged)", ram("Patriot Viper Elite 5 32GB (2X16GB) DDR5 RAM 6000MHz C36 Black",
       BP + "2164079880/patriot-viper-elite-5-32gb-ddr5-ram-6000mhz-c36-black.html"),
       ("DDR5 32GB (2×16GB) 6000MHz", 2, "Desktop"))
expect("Kingston KCP432 (unchanged)", ram("Kingston 16GB (1X16GB) DDR4 RAM 3200MHz KCP432ND8/16",
       BP + "2157157668/kingston-16gb-ddr4-ram-3200mhz-kcp432nd8-16.html"),
       ("DDR4 16GB (1×16GB) 3200MHz", 1, "Desktop"))
expect("Shopflix 1066 Mhz (unchanged)", ram("για Laptop 1GB DDR3 με Ταχύτητα 1066 Mhz",
       SF + "SF-101157737/mnhmi-ram-gia-laptop-1gb-ddr3-me-taxutita-1066-mhz"),
       ("DDR3 1GB (1×1GB) 1066MHz", 1, "Laptop"))
expect("Corsair Value Select Skroutz (unchanged)", ram("Corsair Value Select DDR4",
       SK + "12892202/Corsair-Value-Select-DDR4-me-Module-1x16GB-kai-Tachytita-2666-gia-Desktop-CMV16GX4M1A2666C18.html"),
       ("DDR4 16GB (1×16GB) 2666MHz", 1, "Desktop"))
expect("G.Skill F3-12800 (PC rating) is not a speed; 1600Mhz stated (unchanged)", ram("G.Skill Ripjawsx 16GB Ddr3 1600Mhz Cl10 F3-12800Cl10D-16Gbxl",
       SF + "SF-00059250/ram-gskill-ripjawsx-16gb-2-x-8gb-ddr3-1600mhz-cl10-f3-12800cl10d-16gbxl"),
       ("DDR3 16GB (1×16GB) 1600MHz", 1, "Desktop"))
expect("DDR2 6400S (PC rating) is not a speed", ram("DDR2 6400S 1GB με Ταχύτητα 800 για Laptop",
       SF + "SF-105328415/mnhmi-ram-ddr2-6400s-1gb-me-taxutita-800-gia-laptop"),
       ("DDR2 1GB (1×1GB) 800MHz", 1, "Laptop"))

# Part-number speeds alone
P = normalize_ram.part_speed
expect("part: Kingston KF442 = 4266", P("KF442C19RB2K2/16"), 4266)
expect("part: Kingston KF453 (code 53 seen on 1 title only) gives no speed", P("KF453C20RB2K2-16"), None)
expect("Kingston KF453 stated 5333 is kept (unchanged)", ram("Kingston Fury Renegade 16GB DDR4 με 2 Modules 2x8GB",
       SK + "47349866/Kingston-Fury-Renegade-DDR4-16GB-RAM-me-2x8GB-Modules-kai-Tachytita-5333-gia-Desktop-KF453C20RB2K2-16.html"),
       ("DDR4 16GB (2×8GB) 5333MHz", 2, "Desktop"))
expect("part: Kingston KVR26 = 2666", P("KVR26S19S6-8"), 2666)
expect("part: Goodram IR-X3200", P("ir-x3200d464l16sa-16g"), 3200)
expect("part: Corsair DDR4 CMK16GX4M1A2400C16", P("CMK16GX4M1A2400C16"), 2400)
expect("part: G.Skill F3- is not read (PC ratings)", P("F3-12800CL10D-16GBXL"), None)
expect("part: an unseen Kingston code gives no speed (synthetic)", P("KVR21N15S8/8"), None)
expect("part: Kingston KCP432 is not read",P("KCP432ND8/16"), None)
expect("part: Kingston DDR2 KVR800D2 is not read", P("KVR800D2N6/4G"), None)

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
