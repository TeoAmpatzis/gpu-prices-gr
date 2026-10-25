"""Unit tests for scraper/normalize_case.py (Q6, B9 grouping batch 1) and the matching makers/lianli.norm, with
real shop titles and URLs. BestPrice titles are given as the site writes them (with "Κουτί Υπολογιστή", which
latest.json no longer stores); e-shop passes its category name as the spec line.
Run from the repo root: venv/Scripts/python scripts/checks/test_normalize_case.py"""
import sys

sys.path.insert(0, "scraper")
import names  # noqa: E402
import normalize_case  # noqa: E402

ok = bad = 0
ESHOP = "ΚΟΥΤΙΑ - CASES"


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def case(source, title, url, specs=""):
    try:
        return normalize_case.make_listing(source=source, native_id="1", title=title, url=url, price=100.0,
                                           shop_count=None, scraped_at="2026-10-25T00:00:00+00:00", specs=specs)
    except Exception as e:  # noqa: BLE001
        return f"ERROR {type(e).__name__}: {e}"


def chip(*a, **kw):
    l = case(*a, **kw)
    return l.chip if hasattr(l, "chip") else l


def key(*a, **kw):
    c = chip(*a, **kw)
    return names.model_key(c) if c and not c.startswith("ERROR") else c


# --- 5. look-alike capitals
expect("BestPrice 'Antec ΑΧ61 Elite' -> Antec AX61 Elite",
       chip("bestprice", "Antec ΑΧ61 Elite Black Midi Tower Κουτί Υπολογιστή RGB με Πλαϊνό Παράθυρο",
            "https://www.bestprice.gr/item/2160585224/antec-ach61-elite-black-midi-tower-kouti-ypologisti-rgb-me-plaino-parathyro.html"),
       "Antec AX61 Elite")

# --- 6. e-shop's Greek descriptors leave the name
expect("e-shop 'DARKFLASH ΚΟΥΤΙ ΥΠΟΛΟΓΙΣΤΗ C285 (ΜΑΥΡΟ)' -> Darkflash C285",
       chip("eshop", "DARKFLASH ΚΟΥΤΙ ΥΠΟΛΟΓΙΣΤΗ C285 (ΜΑΥΡΟ)",
            "https://www.e-shop.gr/darkflash-koyti-ypologisti-c285-mayro-p-PER.284285", ESHOP),
       "Darkflash C285")
expect("e-shop '… ATX ΠΕΡΙΠΤΩΣΗ ΥΠΟΛΟΓΙΣΤΗ ΧΩΡΙΣ ΑΝΕΜΙΣΤΗΡΕΣ' -> Darkflash DS900WS ATX",
       chip("eshop", "DARKFLASH DS900WS ATX ΠΕΡΙΠΤΩΣΗ ΥΠΟΛΟΓΙΣΤΗ ΧΩΡΙΣ ΑΝΕΜΙΣΤΗΡΕΣ (ΜΑΥΡΟ)",
            "https://www.e-shop.gr/darkflash-ds900ws-atx-periptosi-ypologisti-xoris-anemistires-mayro-p-PER.288285", ESHOP),
       "Darkflash DS900WS ATX")
c = chip("eshop", "RACKMOUNT CASE 2U SILVERSTONE RM23-502-MINI ΓΙΑ 2 ΣΥΣΚΕΥΕΣ 5.25 ΙΝΤΣΩΝ",
         "https://www.e-shop.gr/rackmount-case-2u-silverstone-rm23-502-mini-gia-2-syskeyes-525-intson-p-PER.619576", ESHOP)
expect("e-shop 'RM23-502-MINI ΓΙΑ 2 ΣΥΣΚΕΥΕΣ …': the name ends at RM23-502-MINI", str(c).endswith("RM23-502-MINI"), True)

# --- 7. panel versions written in Greek = the English the other sites use
expect("e-shop 'DK431 ΓΥΑΛΙΝΗ … + 4 ΑΝΕΜΙΣΤΗΡΕΣ' = Shopflix 'DK431 Glass & 4 Fans' (darkflashdk431glass)",
       (key("eshop", "DARKFLASH DK431 ΓΥΑΛΙΝΗ ΘΗΚΗ ΥΠΟΛΟΓΙΣΤΗ (ΜΑΥΡΗ) + 4 ΑΝΕΜΙΣΤΗΡΕΣ RGB",
            "https://www.e-shop.gr/darkflash-dk431-gyalini-thiki-ypologisti-mayri-4-anemistires-rgb-p-PER.284213", ESHOP),
        key("shopflix", "Darkflash DK431 Glass & 4 Fans Gaming Midi Tower με Πλαϊνό Παράθυρο Μαύρο",
            "https://shopflix.gr/p/SF-101888542/kouti-upologiste-darkflash-dk431-glass-and-4-fans-gaming-midi-tower-me-plaino-parathuro-mauro")),
       ("darkflashdk431glass", "darkflashdk431glass"))
expect("e-shop 'AQUARIUS ΑΚΡΥΛΙΚΗ' -> Acrylic, = BestPrice 'Aquarius Acrylic'",
       (chip("eshop", "DARKFLASH AQUARIUS ΑΚΡΥΛΙΚΗ ΘΗΚΗ ΥΠΟΛΟΓΙΣΤΗ",
             "https://www.e-shop.gr/darkflash-aquarius-akryliki-thiki-ypologisti-p-PER.284281", ESHOP),
        key("bestprice", "Darkflash Aquarius Acrylic Black Gaming Midi Tower Κουτί Υπολογιστή με Πλαϊνό Παράθυρο",
            "https://www.bestprice.gr/item/2158328695/darkflash-aquarius-acrylic-black-gaming-midi-tower-kouti-ypologisti-me-plaino-parathyro.html")),
       ("Darkflash AQUARIUS Acrylic", "darkflashaquariusacrylic"))

# --- 8. glued word "Towerμε"
l = case("shopflix", "Gigabyte C500 Panoramic Stealth Gaming Midi Towerμε Πλαϊνό Παράθυρο & RGB Φωτισμό Black",
         "https://shopflix.gr/p/SF-105119410/kouti-upologiste-gigabyte-c500-panoramic-stealth-gaming-midi-towerme-plaino-parathuro-and-rgb-photismo-black")
expect("Shopflix '… Midi Towerμε Πλαϊνό …' -> gigabytec500panoramicstealth, Midi Tower",
       (names.model_key(l.chip), l.size) if hasattr(l, "chip") else l, ("gigabytec500panoramicstealth", "Midi Tower"))

# --- 9. Thermaltake's own name "The Tower 300"
expect("BestPrice 'Thermaltake Tower 300 Gravel Sand' = 'Thermaltake The Tower 300 Black' (thermaltakethetower300)",
       (key("bestprice", "Thermaltake Tower 300 Gravel Sand Gaming Micro Tower Κουτί Υπολογιστή με Πλαϊνό Παράθυρο",
            "https://www.bestprice.gr/item/2160316744/thermaltake-tower-300-gravel-sand-gaming-micro-tower-kouti-ypologisti-me-plaino-parathyro.html"),
        key("bestprice", "Thermaltake The Tower 300 Black Micro Tower Κουτί Υπολογιστή με Πλαϊνό Παράθυρο",
            "https://www.bestprice.gr/item/2159412153/thermaltake-the-tower-300-black-micro-tower-kouti-ypologisti-me-plaino-parathyro.html")),
       ("thermaltakethetower300", "thermaltakethetower300"))
expect("e-shop 'THERMALTAKE THE TOWER 300 …' keeps 'THE' once",
       key("eshop", "THERMALTAKE THE TOWER 300 MICRO TOWER CHASIS MINI-ITX BLACK",
           "https://www.e-shop.gr/case-thermaltake-the-tower-300-micro-tower-chasis-mini-itx-black-p-PER.645505", ESHOP),
       "thermaltakethetower300")
# No other maker's case name starts with "Tower <n>" in today's data, so the rule is checked on maker_name itself.
expect("maker_name: a non-Thermaltake 'Tower 300' is untouched",
       getattr(normalize_case, "maker_name", lambda v, n, t: "ERROR no maker_name")("Montech", "Tower 300", "Montech Tower 300"),
       "Tower 300")

# --- 10. Lian Li O11 Dynamic EVO RGB: one model for "O11D EVO RGB" and "O11 Dynamic Evo RGB"; the plain EVO apart
EVO_RGB = [
    ("skroutz", "Lian Li O11D EVO RGB Gaming Midi Tower με Πλαϊνό Παράθυρο",
     "https://www.skroutz.gr/s/49438982/Lian-Li-O11D-EVO-RGB-Gaming-Midi-Tower-Kouti-Ypologisti-me-Plaino-Parathyro-Black.html", ""),
    ("bestprice", "Lian Li O11 Dynamic Evo RGB White Gaming Midi Tower Κουτί Υπολογιστή RGB με Πλαϊνό Παράθυρο",
     "https://www.bestprice.gr/item/2159389084/lian-li-o11-dynamic-evo-rgb-white-gaming-midi-tower-kouti-ypologisti-rgb-me-plaino-parathyro.html", ""),
    ("snif", "LIAN LI O11 Dynamic EVO RGB Midi Tower - Λευκό",
     "https://www.snif.gr/showproduct/38832062/kouti-desktop-lian-li-o11-dynamic-evo-rgb-midi-tow", ""),
    ("eshop", "LIAN LI O11D EVO RGB WHITE COLUMNLESS TOWER",
     "https://www.e-shop.gr/case-lian-li-o11d-evo-rgb-white-columnless-tower-p-PER.607859", ESHOP),
    ("shopflix", "Lian Li O11D EVO RGB Gaming Midi Tower με Πλαϊνό Παράθυρο Λευκό",
     "https://shopflix.gr/p/SF-19395434/kouti-upologiste-lian-li-o11d-evo-rgb-gaming-midi-tower-me-plaino-parathuro-leuko", ""),
]
for src, t, u, s in EVO_RGB:
    expect(f"{src} '{t[:40]}…' -> lianlio11dynamicevorgb", key(src, t, u, s), "lianlio11dynamicevorgb")
expect("BestPrice 'Lian Li O11D Evo White' (plain EVO) -> lianlio11dynamicevo",
       key("bestprice", "Lian Li O11D Evo White Gaming Midi Tower Κουτί Υπολογιστή με Πλαϊνό Παράθυρο",
           "https://www.bestprice.gr/item/2157548580/lian-li-o11d-evo-white-gaming-midi-tower-kouti-ypologisti-me-plaino-parathyro.html"),
       "lianlio11dynamicevo")
expect("BestPrice 'O11 Dynamic Evo XL … RGB' keeps lianlio11dynamicevoxl",
       key("bestprice", "Lian Li O11 Dynamic Evo XL White Gaming Full Tower Κουτί Υπολογιστή RGB με Πλαϊνό Παράθυρο",
           "https://www.bestprice.gr/item/2159144318/lian-li-o11-dynamic-evo-xl-white-gaming-full-tower-kouti-ypologisti-rgb-me-plaino-parathyro.html"),
       "lianlio11dynamicevoxl")
expect("e-shop 'LIAN LI O11D MINI V2 BLACK - ATX PC …' -> 'O11 Dynamic MINI V2 …'",
       str(chip("eshop", "LIAN LI O11D MINI V2 BLACK - ATX PC GAMING CASE - IMPROVED AIRFLOW - GPU SUPPORT BRACKET",
                "https://www.e-shop.gr/lian-li-o11d-mini-v2-black-atx-pc-gaming-case-improved-airflow-gpu-support-bracket-p-PER.271474",
                ESHOP)).startswith("Lian Li O11 Dynamic MINI V2"),
       True)

# --- makers/lianli.norm: the maker page /product/o11d-evo-rgb/ reads as the renamed listings
try:
    from makers import lianli  # noqa: E402
    norm = lianli.norm
except Exception as e:  # noqa: BLE001
    norm = lambda t, e=e: f"ERROR {type(e).__name__}: {e}"
expect("lianli.norm('o11d-evo-rgb') == norm('O11 Dynamic EVO RGB')", norm("o11d-evo-rgb"), norm("O11 Dynamic EVO RGB"))
expect("lianli.norm('O11 Dynamic EVO RGB') = O11DYNAMICEVORGB", norm("O11 Dynamic EVO RGB"), "O11DYNAMICEVORGB")
expect("lianli.norm('O11DYNAMIC') unchanged", norm("O11DYNAMIC"), "O11DYNAMIC")
expect("lianli.norm('o11-dynamic-evo') unchanged (plain EVO page)", norm("o11-dynamic-evo"), "O11DYNAMICEVO")

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
