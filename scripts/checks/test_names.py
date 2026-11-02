"""Unit tests for scraper/names.py latin() / prepare() (Q6, B9 grouping batch 1), with real shop titles.
Run from the repo root: venv/Scripts/python scripts/checks/test_names.py"""
import sys

sys.path.insert(0, "scraper")
import names  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def call(fn, *args, **kw):
    """fn(*args) or the error as text, so one missing function fails its own tests only."""
    try:
        return fn(*args, **kw)
    except Exception as e:  # noqa: BLE001
        return f"ERROR {type(e).__name__}: {e}"


latin = lambda *a, **kw: call(lambda: names.latin(*a, **kw))
prepare = lambda t: call(lambda: names.prepare(t))

# --- 1. Greek look-alike capitals in a Latin token become Latin; Greek words stay Greek
expect("BestPrice 'Antec ΑΧ61 Elite': ΑΧ61 -> AX61, Greek words kept",
       latin("Antec ΑΧ61 Elite Black Midi Tower RGB με Πλαϊνό Παράθυρο"),
       "Antec AX61 Elite Black Midi Tower RGB με Πλαϊνό Παράθυρο")
expect("e-shop 'ΚΟΥΤΙ ΥΠΟΛΟΓΙΣΤΗ', 'ΜΑΥΡΟ' untouched",
       latin("DARKFLASH ΚΟΥΤΙ ΥΠΟΛΟΓΙΣΤΗ C285 (ΜΑΥΡΟ)"), "DARKFLASH ΚΟΥΤΙ ΥΠΟΛΟΓΙΣΤΗ C285 (ΜΑΥΡΟ)")

# --- 2. a word mixing Latin and Greek letters is a typo; "Ιι" alone = II
expect("BestPrice 'Uni Fan Ιnfinity' -> Infinity",
       prepare("Lian Li Uni Fan Ιnfinity SL Wireless"), "Lian Li Uni Fan Infinity SL Wireless")
expect("BestPrice 'NZXT F120 RGB Duο' -> Duo", prepare("NZXT F120 RGB Duο"), "NZXT F120 RGB Duo")
expect("Snif 'Hydroshift Ιι Lcd' -> II", prepare("Lian Li Hydroshift Ιι Lcd 360"), "Lian Li Hydroshift II Lcd 360")
expect("Greek words with no Latin letter stay Greek",
       prepare("Lian Li Unifan SL Reverse Ασύρματο 120mm Λευκό"), "Lian Li Unifan SL Reverse Ασύρματο 120mm Λευκό")

# --- 3. a Latin word glued to a Greek one is split
expect("Shopflix 'Midi Towerμε Πλαϊνό' -> 'Midi Tower με Πλαϊνό'",
       prepare("Gigabyte C500 Panoramic Stealth Gaming Midi Towerμε Πλαϊνό Παράθυρο"),
       "Gigabyte C500 Panoramic Stealth Gaming Midi Tower με Πλαϊνό Παράθυρο")
expect("prepare collapses whitespace", prepare("  Antec  ΑΧ61   Elite "), "Antec AX61 Elite")

# --- 4. boards keep the capitals-only pass (normalize_mobo's behaviour before Q6)
expect("latin(mixed=False): Snif 'Asus Τuf B650E-PLUS' unchanged",
       latin("Asus Τuf B650E-PLUS", mixed=False), "Asus Τuf B650E-PLUS")
expect("latin(mixed=False): 'Χ870' -> X870, 'WiFi ΙΙ' -> II, '(ΜΤΧ)' -> MTX",
       latin("Gigabyte Χ870 Eagle WiFi ΙΙ (ΜΤΧ)", mixed=False), "Gigabyte X870 Eagle WiFi II (MTX)")

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
