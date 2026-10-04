"""Unit tests for scraper/normalize_mobo.py, with real shop titles (v2 audit, docs/audit-v1.md D-05).
Run from the repo root: venv/Scripts/python scripts/checks/test_normalize_mobo.py"""
import sys

sys.path.insert(0, "scraper")
import normalize_mobo  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


def board(source, title, url):
    l = normalize_mobo.make_listing(source=source, native_id="1", title=title, url=url, price=100.0,
                                    shop_count=None, scraped_at="2026-10-04T00:00:00+00:00")
    return (l.chip, l.formFactor) if l else None


# --- D-05: Shopflix "… Extended ATX με …" is E-ATX, and "Extended" leaves the board name
expect("Asus ROG Maximus Z890 Extreme: E-ATX, no 'Extended' in the name",
       board("shopflix", "Asus Rog Maximus Z890 Extreme WiFi Extended ATX με Intel 1851 Socket",
             "https://shopflix.gr/p/SF-104762383/metrike-karta-asus-rog-maximus-z890-extreme-wifi-extended-atx-me-intel-1851-socket"),
       ("Asus Rog Maximus Z890 Extreme WiFi", "E-ATX"))
expect("ASRock X870E Taichi Lite: E-ATX",
       board("shopflix", "ASRock X870E Taichi Lite Wi-Fi Extended ATX με AMD AM5 Socket",
             "https://shopflix.gr/p/SF-104606887/metrike-karta-asrock-x870e-taichi-lite-wi-fi-extended-atx-me-amd-am5-socket"),
       ("ASRock X870E Taichi Lite WiFi", "E-ATX"))
expect("ASRock TRX50 WS: E-ATX",
       board("shopflix", "ASRock TRX50 WS Extended ATX με AMD sTR5 Socket",
             "https://shopflix.gr/p/SF-100379952/mitrikh-karta-asrock-trx50-ws-extended-atx-me-amd-str5-socket"),
       ("ASRock TRX50 WS", "E-ATX"))

# --- unchanged on purpose (owner 2026-10-04): "D5" still leaves board names, so e-shop's "… D5 RETAIL"
# meets the same board at other shops; DDR4/DDR5 versions are separated in v2 Phase 2 from memory data.
expect("e-shop 'B650M PRO RS D5 RETAIL' meets the plain name",
       board("eshop", "ASROCK B650M PRO RS D5 RETAIL", "https://www.e-shop.gr/mitriki-asrock-b650m-pro-rs-d5-retail-p-PER.607709"),
       ("ASRock B650M PRO RS", "Micro ATX"))
expect("e-shop 'ROG MAXIMUS Z890 EXTREME D5' meets the plain name",
       board("eshop", "ASUS ROG MAXIMUS Z890 EXTREME D5 LGA1851 RETAIL",
             "https://www.e-shop.gr/mitriki-asus-rog-maximus-z890-extreme-d5-lga1851-retail-p-PER.608613"),
       ("Asus ROG MAXIMUS Z890 EXTREME", "ATX"))
expect("BestPrice 'H610M-HDV/M.2+ D5' as today",
       board("bestprice", "Asrock H610M-HDV/M.2+ D5",
             "https://www.bestprice.gr/item/2159016261/asrock-h610m-hdv-m-2-plus-d5-motherboard-micro-atx-me-intel-1700-socket.html"),
       ("ASRock H610M-HDV/M.2", "Micro ATX"))

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
