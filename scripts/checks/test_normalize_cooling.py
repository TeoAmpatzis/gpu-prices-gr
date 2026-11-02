"""Unit tests for scraper/normalize_cooling.py fans and coolers (Q6, B9 grouping batch 1), with real shop titles and
URLs. BestPrice cooler titles are given as the site writes them (with "Υδρόψυξη CPU", which latest.json no longer
stores); e-shop passes its category name as the spec line.
Run from the repo root: venv/Scripts/python scripts/checks/test_normalize_cooling.py"""
import sys

sys.path.insert(0, "scraper")
import names  # noqa: E402
import normalize_cooling as nc  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def _make(fn, source, title, url, specs):
    try:
        return fn(source=source, native_id="1", title=title, url=url, price=100.0, shop_count=None,
                  scraped_at="2026-10-25T00:00:00+00:00", specs=specs)
    except Exception as e:  # noqa: BLE001
        return f"ERROR {type(e).__name__}: {e}"


def fan(source, title, url, specs=""):
    return _make(nc.make_fan_listing, source, title, url, specs)


def cooler(source, title, url, specs=""):
    """(chip, type, radiator) or the error / None."""
    l = _make(nc.make_cooler_listing, source, title, url, specs)
    return (l.chip, l.type, l.radiator) if hasattr(l, "chip") else l


def fkey(*a, **kw):
    l = fan(*a, **kw)
    return names.model_key(l.chip) if hasattr(l, "chip") else l


# ---------- fans ----------

# --- 11. Lian Li's wireless fans: "Ασύρματο" = Wireless, "LCD Οθόνη" = LCD, BestPrice's word order
expect("Shopflix 'Unifan SL Reverse Ασύρματο' = BestPrice 'Unifan SL Wireless Reverse'",
       (fkey("shopflix", "Lian Li Unifan SL Reverse Ασύρματο 120mm Λευκό",
             "https://shopflix.gr/p/SF-104053173/case-fan-lian-li-unifan-sl-reverse-asurmato-120mm-leuko"),
        fkey("bestprice", "Lian Li Unifan SL Wireless Reverse Case Fan 120mm ARGB με Σύνδεση 4-Pin PWM White",
             "https://www.bestprice.gr/item/2160061075/lian-li-unifan-sl-wireless-reverse-case-fan-120mm-argb-me-syndesi-4-pin-pwm-white.html")),
       ("lianliunifanslwirelessreverse120mm", "lianliunifanslwirelessreverse120mm"))
l = fan("shopflix", "Lian Li Unifan SL Reverse Ασύρματο LCD Οθόνη 120mm Μαύρο",
        "https://shopflix.gr/p/SF-104053175/case-fan-lian-li-unifan-sl-reverse-asurmato-lcd-othone-120mm-mauro")
expect("Shopflix '… Reverse Ασύρματο LCD Οθόνη 120mm' -> '… SL Wireless LCD Reverse 120mm'",
       getattr(l, "chip", l), "Lian Li Unifan SL Wireless LCD Reverse 120mm")
expect("… and = BestPrice 'Unifan SL Wireless LCD Reverse'",
       names.model_key(getattr(l, "chip", "")),
       fkey("bestprice", "Lian Li Unifan SL Wireless LCD Reverse Case Fan 120mm ARGB με Σύνδεση 4-Pin PWM 9-Pin (USB 2.0) Black",
            "https://www.bestprice.gr/item/2160078073/lian-li-unifan-sl-wireless-lcd-reverse-case-fan-120mm-argb-me-syndesi-4-pin-pwm-9-pin-black.html"))
l = fan("shopflix", "Lian Li Unifan SL Ασύρματο 120mm Λευκό",
        "https://shopflix.gr/p/SF-104053177/case-fan-lian-li-unifan-sl-asurmato-120mm-leuko")
expect("Shopflix 'Unifan SL Ασύρματο 120mm' -> '… SL Wireless 120mm' (never the plain SL)",
       getattr(l, "chip", l), "Lian Li Unifan SL Wireless 120mm")

# --- 12. Shopflix's "Kit LED ανεμιστήρων" in front of the vendor
l = fan("shopflix", "Kit LED ανεμιστήρων Aerocool MIRAGE-12PRO 120mm RGB",
        "https://shopflix.gr/p/SF-00263861/-kit-led-anemistiron-aerocool-mirage12pro-120mm-rgb-")
expect("Shopflix 'Kit LED ανεμιστήρων Aerocool MIRAGE-12PRO' -> brand Aerocool",
       (l.brand, l.chip) if hasattr(l, "chip") else l, ("Aerocool", "Aerocool MIRAGE-12PRO 120mm"))

# --- 13. e-shop's Greek "120ΜΜ" in mid-name: the key stays (the Sync edition stays apart from the plain EX12)
l = fan("eshop", "THERMALTAKE SWAFAN EX12 120ΜΜ ARGB SYNC PC COOLING FAN TT PREMIUM EDITION BLACK 3-PACK",
        "https://www.e-shop.gr/thermaltake-swafan-ex12-120mm-argb-sync-pc-cooling-fan-tt-premium-edition-black-3-pack-p-PER.645761",
        "ΑΝΕΜΙΣΤΗΡΑΣ ΚΟΥΤΙΟΥ")
expect("e-shop 'SWAFAN EX12 120ΜΜ … 3-PACK': key unchanged, 120 mm, pack 3",
       (names.model_key(l.chip), l.size, l.pack) if hasattr(l, "chip") else l,
       ("thermaltakeswafanex12120syncpccoolingttpremiumedition120mm3", 120, 3))

# --- 14. Greek "ο" in "Duο"
expect("BestPrice 'NZXT F120 RGB Duο' = 'NZXT F120 RGB Duo' (nzxtf120duo120mm)",
       (fkey("bestprice", "NZXT F120 RGB Duο Case Fan 120mm RGB με Σύνδεση 4-Pin PWM Black",
             "https://www.bestprice.gr/item/2159436074/nzxt-f120-rgb-duo-case-fan-120mm-rgb-me-syndesi-4-pin-pwm-black.html"),
        fkey("bestprice", "NZXT F120 RGB Duo Case Fan 120mm RGB με Σύνδεση 4-Pin PWM White",
             "https://www.bestprice.gr/item/2159378655/nzxt-f120-rgb-duo-case-fan-120mm-rgb-me-syndesi-4-pin-pwm-white.html")),
       ("nzxtf120duo120mm", "nzxtf120duo120mm"))
expect("BestPrice 'Uni Fan Ιnfinity SL Wireless' -> 'Uni Infinity SL Wireless'",
       getattr(fan("bestprice", "Lian Li Uni Fan Ιnfinity SL Wireless Case Fan 140mm ARGB με Σύνδεση 3-Pin 4-Pin PWM White",
                   "https://www.bestprice.gr/item/2163901955/lian-li-uni-fan-infinity-sl-wireless-case-fan-140mm-argb-me-syndesi-3-pin-4-pin-pwm-white.html"),
               "chip", None),
       "Lian Li Uni Infinity SL Wireless 140mm")

# ---------- coolers ----------

# --- 15. Shopflix AIO: Greek fan words leave the name, the AIO keeps its radiator from the name
expect("Shopflix 'Asus ROG Ryujin III 240 Διπλού Ανεμιστήρα 120mm …' -> AIO 240 (not 120)",
       cooler("shopflix", "Asus ROG Ryujin III 240 Διπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700/1200/115x με ARGB Φωτισμό Λευκό",
              "https://shopflix.gr/p/SF-15010268/udropsuxe-epexergaste-asus-rog-ryujin-iii-240-diplou-anemistera-120mm-gia-socket-am4-am5-1700-1200-115x-me-argb-photismo-leuko"),
       ("Asus ROG Ryujin III 240", "AIO", 240))
expect("Shopflix 'Arctic Liquid Freezer III Pro 360 A-RGB Τριπλού Ανεμιστήρα 120mm' -> '… Pro 360'",
       cooler("shopflix", "Arctic Liquid Freezer III Pro 360 A-RGB Τριπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700",
              "https://shopflix.gr/p/SF-105823196/udropsuxe-arctic-liquid-freezer-iii-pro-360-a-rgb-triplou-anemistera-120mm-gia-socket-am4-am5-1700"),
       ("Arctic Liquid Freezer III Pro 360", "AIO", 360))

# --- 16. radiator from the fan count × size when the name has none
expect("Shopflix 'Be Quiet Light Loop Διπλού Ανεμιστήρα 120mm' -> Light Loop 240",
       cooler("shopflix", "Be Quiet Light Loop Διπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700/1200/115x με ARGB Φωτισμό",
              "https://shopflix.gr/p/SF-104217766/udropsuxe-epexergaste-be-quiet-light-loop-diplou-anemistera-120mm-gia-socket-am4-am5-1700-1200-115x-me-argb-photismo"),
       ("Be Quiet Light Loop 240", "AIO", 240))
expect("Shopflix 'Be Quiet Light Loop Τριπλού Ανεμιστήρα 120mm' -> Light Loop 360",
       cooler("shopflix", "Be Quiet Light Loop Τριπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700/1200/115x με RGB Φωτισμό",
              "https://shopflix.gr/p/SF-104458278/udropsuxe-epexergaste-be-quiet-light-loop-triplou-anemistera-120mm-gia-socket-am4-am5-1700-1200-115x-me-rgb-photismo"),
       ("Be Quiet Light Loop 360", "AIO", 360))
expect("Shopflix 'Be Quiet SILENT LOOP 3 Τριπλού Ανεμιστήρα 140mm' -> SILENT LOOP 3 420",
       cooler("shopflix", "Be Quiet SILENT LOOP 3 Τριπλού Ανεμιστήρα 140mm για Socket AM4/AM5/1700/1200 με ARGB Φωτισμό",
              "https://shopflix.gr/p/SF-106614822/udropsuxe-epexergaste-be-quiet-silent-loop-3-triplou-anemistera-140mm-gia-socket-am4-am5-1700-1200-me-argb-photismo"),
       ("Be Quiet SILENT LOOP 3 420", "AIO", 420))

# --- 17. the name beats Shopflix's fan count
expect("Shopflix 'Thermaltake TH420 V2 Ultra Τριπλού Ανεμιστήρα 120mm' -> radiator 420",
       cooler("shopflix", "Thermaltake TH420 V2 Ultra Τριπλού Ανεμιστήρα 120mm για Socket AM4/AM5/1700/1200/115x με ARGB Φωτισμό",
              "https://shopflix.gr/p/SF-105202614/udropsuxe-epexergaste-thermaltake-th420-v2-ultra-triplou-anemistera-120mm-gia-socket-am4-am5-1700-1200-115x-me-argb-photismo"),
       ("Thermaltake TH420 V2 Ultra", "AIO", 420))

# --- 18. (owner Q8a) an AIO name that still ends in its fan size loses it
expect("Snif 'Corsair Nautilus 360 RS 120mm - Μαύρο' (water URL) -> Nautilus 360 RS, AIO 360",
       cooler("snif", "Corsair Nautilus 360 RS 120mm - Μαύρο",
              "https://www.snif.gr/showproduct/43331050/ydropsuxi-epexergasti-corsair-nautilus-360-rs-120mm"),
       ("Corsair Nautilus 360 RS", "AIO", 360))
expect("Shopflix 'Deepcool LD240 120mm για Socket …' (water URL) -> Deepcool LD240, AIO 240",
       cooler("shopflix", "Deepcool LD240 120mm για Socket AM4/AM5/1700/1200/115x",
              "https://shopflix.gr/p/SF-105991192/ydropsuxi-epexergasth-deepcool-ld240-120mm-gia-socket-am4-am5-1700-1200-115x"),
       ("Deepcool LD240", "AIO", 240))

# --- 19. (owner Q8b) a bare 120/140 is a radiator only with a water word or water URL
expect("Shopflix 'Mars Gaming ML-ONE120 Μαύρο' (water URL) -> AIO 120",
       cooler("shopflix", "Mars Gaming ML-ONE120 Μαύρο", "https://shopflix.gr/p/SF-100056425/udropsuxe-mars-gaming-ml-one120-mauro"),
       ("Mars Gaming ML-ONE120", "AIO", 120))
expect("Shopflix 'Thermalright Peerless Assassin 120 SE Διπλού Ανεμιστήρα …' -> Air, no radiator",
       cooler("shopflix", "Thermalright Peerless Assassin 120 SE Διπλού Ανεμιστήρα για Socket AM4 / AM5 / 1200 / 115x / 1700",
              "https://shopflix.gr/p/SF-105395896/psuktra-epexergaste-thermalright-peerless-assassin-120-se-diplou-anemistera-gia-socket-am4-am5-1200-115x-1700"),
       ("Thermalright Peerless Assassin 120 SE", "Air", None))

# Fix round 1 (review M1): on an air-cooler URL the Greek fan count never makes an AIO. The title is the real Shopflix
# one with a fan size added (0 such listings today); the URL is that product's real air-cooler URL.
expect("air-cooler URL + 'Peerless Assassin 120 SE Διπλού Ανεμιστήρα 120mm' -> stays Air, same key, no radiator",
       cooler("shopflix", "Thermalright Peerless Assassin 120 SE Διπλού Ανεμιστήρα 120mm",
              "https://shopflix.gr/p/SF-105395896/psuktra-epexergaste-thermalright-peerless-assassin-120-se-diplou-anemistera-gia-socket-am4-am5-1200-115x-1700"),
       ("Thermalright Peerless Assassin 120 SE", "Air", None))
expect("Skroutz air-cooler URL 'PSyktra' + '… Διπλού Ανεμιστήρα 120mm' -> stays Air",
       cooler("skroutz", "Thermalright Peerless Assassin 120 SE Διπλού Ανεμιστήρα 120mm",
              "https://www.skroutz.gr/s/51031768/Thermalright-Peerless-Assassin-120-SE-PSyktra-Epexergasti-Diplou-Anemistira-gia-Socket-AM4-AM5-1200-115x-1700.html"),
       ("Thermalright Peerless Assassin 120 SE", "Air", None))

# --- 20. a water URL with nothing to size it stays Air (that URL category also lists air towers)
expect("Shopflix 'MSI MAG CoreFrozr AA13 120mm …' (water URL) -> stays Air",
       cooler("shopflix", "MSI MAG CoreFrozr AA13 120mm για Socket AM4/AM5/1700 με Λευκό Φωτισμό",
              "https://shopflix.gr/p/SF-106988893/udropsuxe-epexergaste-msi-mag-corefrozr-aa13-120mm-gia-socket-am4-am5-1700-me-leuko-photismo"),
       ("MSI MAG CoreFrozr AA13 120mm", "Air", None))

# --- 21. Greek descriptors of air coolers leave the name (never the first word)
expect("Shopflix 'Deepcool AK620 Διπλού Ανεμιστήρα …' -> Deepcool AK620, Air",
       cooler("shopflix", "Deepcool AK620 Διπλού Ανεμιστήρα για Socket AM4 / 1200 / 115x",
              "https://shopflix.gr/p/SF-11324073/psuktra-epexergaste-deepcool-ak620-diplou-anemistera-gia-socket-am4-1200-115x"),
       ("Deepcool AK620", "Air", None))
expect("Shopflix 'Noctua NH-P1 Παθητική …' -> Noctua NH-P1",
       cooler("shopflix", "Noctua NH-P1 Παθητική για Socket AM4 / AM5 / 1200 / 115x Ασημί",
              "https://shopflix.gr/p/SF-11324067/psuktra-epexergaste-noctua-nh-p1-pathetike-gia-socket-am4-am5-1200-115x-asemi"),
       ("Noctua NH-P1", "Air", None))
expect("Shopflix 'Be Quiet Shadow Rock TF 2 Ενεργητική 160W' -> '… TF 2'",
       cooler("shopflix", "Be Quiet Shadow Rock TF 2 Ενεργητική 160W",
              "https://shopflix.gr/p/SF-00033679/psuktra-epexergaste-be-quiet-shadow-rock-tf-2-energetike-160w"),
       ("Be Quiet Shadow Rock TF 2", "Air", None))
expect("Skroutz 'SM Παθητική Ψύκτρα Επεξεργαστή' keeps 'Παθητική' (its only name)",
       cooler("skroutz", "SM Παθητική Ψύκτρα Επεξεργαστή", "https://www.skroutz.gr/s/70124340/sm-pathitiki-psyktra-epexergasti.html"),
       ("SM Παθητική", "Air", None))

# --- 22. e-shop's leading Greek descriptor; Snif's Greek "Ιι"
expect("e-shop 'DARKFLASH ΣΥΣΤΗΜΑ ΥΔΡΟΨΥΞΗΣ DN360 (ΛΕΥΚΟ)' -> Darkflash DN360, AIO 360",
       cooler("eshop", "DARKFLASH ΣΥΣΤΗΜΑ ΥΔΡΟΨΥΞΗΣ DN360 (ΛΕΥΚΟ)",
              "https://www.e-shop.gr/darkflash-systima-ydropsyxis-dn360-leyko-p-PER.284346", "ΥΔΡΟΨΥΞΗ"),
       ("Darkflash DN360", "AIO", 360))
expect("Snif 'Lian Li Hydroshift Ιι Lcd 360' -> Hydroshift II Lcd 360 (not the first Hydroshift)",
       cooler("snif", "Lian Li Hydroshift Ιι Lcd 360",
              "https://www.snif.gr/showproduct/42183908/ydropsuxi-epexergasti-lian-li-hydroshift-ii-lcd-360"),
       ("Lian Li Hydroshift II Lcd 360", "AIO", 360))

# --- 23. unchanged
expect("BestPrice 'Arctic Liquid Freezer III Pro 360 Black Υδρόψυξη CPU 120mm …' unchanged",
       cooler("bestprice", "Arctic Liquid Freezer III Pro 360 Black Υδρόψυξη CPU 120mm για Socket 1700 / 1851 / AM4 / AM5",
              "https://www.bestprice.gr/item/2160575906/arctic-liquid-freezer-iii-pro-360-black-ydropsyxi-cpu-120mm-gia-socket-1700-1851-am4-am5.html"),
       ("Arctic Liquid Freezer III Pro 360", "AIO", 360))
expect("Skroutz 'Asus ROG Ryujin III 240' with spec '(2x120mm)' unchanged",
       cooler("skroutz", "Asus ROG Ryujin III 240",
              "https://www.skroutz.gr/s/45075330/Asus-ROG-Ryujin-III-240-Ydropsyxi-AIO-CPU-me-2-Anemistires-120mm-kai-ARGB-Fotismo-Leyki.html",
              "Διπλός Ανεμιστήρας (2x120mm)"),
       ("Asus ROG Ryujin III 240", "AIO", 240))

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
