"""Headphone normalization and identity, on titles observed on the five sources (2026-11-13/14) plus labelled
boundary cases. No network. A spec no title states must stay None."""
import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scraper"))
import names
import normalize_headphones as nh

AT = "2026-11-14T00:00:00Z"


def row(title, source="bestprice", native_id="1", specs="", price=50.0):
    listing = nh.make_listing(source=source, native_id=native_id, title=title, url="https://example.invalid/" + native_id,
                              price=price, shop_count=3, scraped_at=AT, specs=specs)
    return listing


def identity(title):
    brand, model, colour, _ = nh._identity(title)
    return brand, model, colour


def settled(*items):
    """items: (source, title[, specs[, price]]) -> settled dict rows, in order."""
    rows = []
    for i, item in enumerate(items):
        source, title, *rest = item
        rows.append(row(title, source=source, native_id=str(i), specs=rest[0] if rest else "",
                        price=rest[1] if len(rest) > 1 else 50.0).to_dict())
    nh.settle(rows)
    return rows


class IdentityTests(unittest.TestCase):
    CASES = (  # (title, brand, model, colour)
        ("Marshall Major V Bluetooth / 3.5mm με 100 ώρες Λειτουργίας Καφέ", "Marshall", "Major V", "brown"),
        ("Sony WH-1000XM5 με Μαλακή Θήκη Bluetooth / 3.5mm με 30 ώρες Λειτουργίας Μαύρα", "Sony", "WH-1000XM5", "black"),
        ("Anker Soundcore Space One Pro Bluetooth / USB-C με 60 ώρες Λειτουργίας", "Soundcore", "Space One Pro", None),
        ("Nothing Headphone (a) Bluetooth / 3.5mm με 75 ώρες Λειτουργίας", "Nothing", "Headphone (a)", None),
        ("Edifier W830NB Hybrid Bluetooth / USB-C με 94 ώρες Λειτουργίας", "Edifier", "W830NB", None),
        ("Edifier W830NB Ασύρματα Bluetooth Ακουστικά Over Ear με Noise Cancelling Λευκά", "Edifier", "W830NB", "white"),
        ("Sony WH-CH720N Bluetooth / 3.5mm με 35 ώρες Λειτουργίας Ροζ", "Sony", "WH-CH720N", "pink"),
        ("HyperX Cloud Earbuds II In Ear Κόκκινο", "HyperX", "Cloud Earbuds II", "red"),
        ("HyperX Cloud II Core Ασύρματο Over Ear", "HyperX", "Cloud II Core", None),
        ("Logitech Pro X3 Lightspeed Ασύρματο Over Ear Ματζέντα", "Logitech", "Pro X3 Lightspeed", "magenta"),
        ("Sennheiser SC-30-USB-ML Headset Call Center", "Sennheiser", "SC-30-USB-ML", None),
        ("Jabra Jabra Evolve 65 SE UC Ασύρματα", "Jabra", "Evolve 65 SE UC", None),
        ("Plantronics Voyager 5200 UC Ασύρματα", "Poly", "Voyager 5200 UC", None),
        ("Apple EarPods Earbuds Handsfree με Βύσμα 3.5mm Λευκό", "Apple", "EarPods 3.5mm", "white"),
        ("Apple EarPods MTJY3 Handsfree Ακουστικά με Βύσμα USB-C Λευκό", "Apple", "EarPods USB-C", "white"),
        ("Apple EarPods Handsfree Earbud USB-C White (2023)", "Apple", "EarPods USB-C", "white"),
        ("Apple EarPods (2024) Earbuds Handsfree Ακουστικά με Βύσμα Lightning Λευκό", "Apple", "EarPods Lightning", "white"),
        ("Apple AirPods 4 Earbud Λευκά", "Apple", "AirPods 4", "white"),
        ("Apple AirPods 4 with Active Noise Cancellation Earbud Λευκά", "Apple", "AirPods 4 ANC", "white"),
        ("Apple AirPods 4 (2024) Ακουστικά Bluetooth Earbud Ανθεκτικά στο Νερό", "Apple", "AirPods 4", None),
        ("Earfun Air Pro 4+ In-ear", "Earfun", "Air Pro 4 Plus", None),
        ("Sony WH-CH520 Ασύρματα Bluetooth Ακουστικά On Ear Μαύρα", "Sony", "WH-CH520", "black"),
        ("Allocacoc Ακουστικά Ψείρες In Ear Earbeans Nano Μωβ", "Allocacoc", "Earbeans Nano", "purple"),
        ("4SMARTS TWS HEADSET SKYBUDS AIR WHITE", "4Smarts", "SKYBUDS AIR", "white"),
        ("ESPERANZA EH200K EARPHONES WITH MICROPHONE AND VOLUME CONTROL EH200K BLACK", "Esperanza", "EH200K", "black"),
        ("Headset H111 Logitech 981-000593", "Logitech", "H111", None),
        ("Remax RB-S8 Neckband Bluetooth Sports Ακουστικά με Μικρόφωνο Μαύρο BT", "Remax", "RB-S8", "black"),
    )

    def test_observed_titles(self):
        for title, brand, model, colour in self.CASES:
            with self.subTest(title=title):
                self.assertEqual(identity(title), (brand, model, colour))

    def test_same_product_from_two_sources_has_one_model_key(self):
        pairs = (
            ("Sony WH-CH520 Bluetooth με 50 ώρες Λειτουργίας Μαύρα", "Sony WH-CH520 Ασύρματα Bluetooth Ακουστικά On Ear Μαύρα"),
            ("Edifier W830NB Hybrid Bluetooth / USB-C με 94 ώρες Λειτουργίας", "Edifier W830NB Ασύρματα Bluetooth Ακουστικά Over Ear Λευκά"),
            ("Logitech G321 Lightspeed Ασύρματο Over Ear Λευκό", "Logitech G321 Lightspeed Ασύρματο Gaming Headset Over Ear White"),
        )
        for a, b in pairs:
            with self.subTest(a=a):
                self.assertEqual([names.model_key(identity(t)[1]) for t in (a, b)][0], names.model_key(identity(b)[1]))
                self.assertEqual(identity(a)[0], identity(b)[0])

    def test_features_that_make_another_product_stay_in_the_name(self):
        self.assertNotEqual(identity("Apple AirPods 4 Earbud Λευκά")[1], identity("Apple AirPods 4 with Active Noise Cancellation Earbud Λευκά")[1])
        self.assertNotEqual(identity("Apple EarPods Handsfree Earbud USB-C White")[1], identity("Apple EarPods Handsfree Earbud Lightning White")[1])

    def test_a_title_with_only_type_words_has_no_identity(self):
        for title in ("Fiio In Ear Διάφανα", "Xiaomi Earphones In-ear Handsfree Ακουστικά με Βύσμα USB-C", "Samsung Usb-c Hands-free Earphones Black"):
            with self.subTest(title=title):
                listing = row(title)
                self.assertEqual(listing.reject, "no-identity")


class SpecTests(unittest.TestCase):
    def test_unknown_stays_unknown(self):
        listing = row("Sony MDR-EX15LP In Ear")
        for field in ("bluetooth", "anc", "microphone", "batteryHours", "driverMm", "waterResistance", "multipoint", "foldable"):
            with self.subTest(field=field):
                self.assertIsNone(getattr(listing, field))

    def test_stated_specs(self):
        listing = row("JBL Tune 780NC Bluetooth / 3.5mm με 76 ώρες Λειτουργίας Μαύρα", specs="Over Ear, Active Noise Cancellation, Quick Charge")
        self.assertEqual((listing.formFactor, listing.connection, listing.bluetooth, listing.anc, listing.batteryHours),
                         ("over-ear", "both", True, True, 76))
        self.assertIsNone(listing.trueWireless)

    def test_wired_is_never_true_wireless(self):
        listing = row("JBL Tune 500 3.5mm", specs="On Ear")
        self.assertEqual(listing.connection, "wired")
        self.assertIs(listing.trueWireless, False)

    def test_earbuds_are_true_wireless_and_in_ear(self):
        listing = row("Samsung Galaxy Buds3 Silver")
        self.assertEqual(listing.formFactor, "in-ear")
        self.assertIs(listing.trueWireless, True)


class RejectTests(unittest.TestCase):
    def test_not_headphones_and_accessories(self):
        cases = (
            ("Maxell DIGITAL SOUNDBAR TV SPEAKER MXSP-SB3000", "not-headphones"),
            ("Replacement Ear Pads for Sony WH-1000XM5", "accessory"),
            ("JBL Tune 500 Μεταχειρισμένα", "used"),
        )
        for title, reason in cases:
            with self.subTest(title=title):
                self.assertEqual(row(title).reject, reason)

    def test_price_floor(self):
        self.assertEqual(row("JBL Tune 310C Handsfree In-Ear USB-C Black", price=9.99).reject, "below-floor")
        self.assertIsNone(row("JBL Tune 310C Handsfree In-Ear USB-C Black", price=10.0).reject)

    def test_bad_prices_are_dropped(self):
        for price in (0, -1, float("nan"), float("inf"), True):
            with self.subTest(price=price):
                self.assertIsNone(row("JBL Tune 500 3.5mm", price=price))


class SettleTests(unittest.TestCase):
    def test_sources_share_one_model_name_and_colours_are_variants(self):
        rows = settled(
            ("skroutz", "Sony WH-CH520 Bluetooth με 50 ώρες Λειτουργίας Μαύρα"),
            ("bestprice", "Sony WH-CH520 Ασύρματα Bluetooth Ακουστικά On Ear Λευκά"),
            ("eshop", "SONY WH-CH520 ON-EAR HEADPHONES BLUE"),
        )
        self.assertEqual({r["chip"] for r in rows}, {"Sony WH-CH520"})
        self.assertEqual([r["colour"] for r in rows], ["black", "white", "blue"])

    def test_settle_is_idempotent(self):
        rows = settled(("skroutz", "Edifier W830NB Hybrid Bluetooth / USB-C με 94 ώρες Λειτουργίας"),
                       ("bestprice", "Edifier W830NB Ασύρματα Bluetooth Ακουστικά Over Ear Λευκά"),
                       ("snif", "Ακουστικά για παιδιά iFrogz ΤΙΓΡΗ Με προστασία έντασης"))
        before = copy.deepcopy(rows)
        nh.settle(rows)
        self.assertEqual(rows, before)

    def test_price_floor_is_decided_again_each_run(self):
        rows = settled(("bestprice", "JBL Tune 310C Handsfree In-Ear USB-C Black", "", 9.0))
        self.assertEqual(rows[0]["reject"], "below-floor")
        rows[0]["price"] = 12.0  # the sale ended
        nh.settle(rows)
        self.assertIsNone(rows[0]["reject"])
        self.assertEqual(rows[0]["chip"], "JBL Tune 310C")

    def test_a_part_number_with_two_names_is_an_identity_conflict(self):
        rows = settled(("skroutz", "Logitech Zone Vibe 100 981-001213 Black"), ("bestprice", "Logitech Zone Vibe 125 981-001213 Black"))
        self.assertEqual({r["reject"] for r in rows}, {"identity-conflict"})

    def test_a_both_ways_title_joins_the_wireless_one_but_wired_against_wireless_still_splits(self):
        rows = settled(("skroutz", "Hoco W33 Bluetooth / 3.5mm με 10 ώρες Λειτουργίας"), ("bestprice", "Hoco W33 Ασύρματα Bluetooth Ακουστικά Over Ear Μαύρα"))
        self.assertEqual({r["reject"] for r in rows}, {None})
        self.assertEqual(len({r["chip"] for r in rows}), 1)
        rows = settled(("bestprice", "Acme Zed Ενσύρματα Ακουστικά Over Ear Μαύρα"), ("shopflix", "Acme Zed Ασύρματα Bluetooth Ακουστικά Over Ear Μαύρα"))
        self.assertEqual(len({r["chip"] for r in rows}), 2)

    def test_a_bt_prefix_in_a_model_code_is_part_of_the_name(self):
        rows = settled(("bestprice", "Crystal Audio BT-02 Ενσύρματα & Ασύρματα Bluetooth Ακουστικά On Ear Μαύρα"))
        self.assertEqual(rows[0]["chip"], "Crystal Audio BT-02")

    def test_the_row_follows_the_brand_list_not_the_brand_it_was_first_stored_with(self):
        rows = settled(("bestprice", "GJBY CA-025 Ασύρματα Bluetooth Ακουστικά On Ear Ροζ"))
        rows[0]["brand"] = "Other"
        nh.settle(rows)
        self.assertEqual((rows[0]["brand"], rows[0]["chip"]), ("GJBY", "GJBY CA-025"))


if __name__ == "__main__":
    unittest.main()
