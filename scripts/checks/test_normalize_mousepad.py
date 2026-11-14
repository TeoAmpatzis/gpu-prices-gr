"""Mousepad normalization and identity, on titles observed on the five sources (2026-11-14) plus labelled boundary cases.
No network. A spec no title states must stay None; mice and mousepads must never enter each other's category."""
import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scraper"))
import normalize_mouse as nmouse
import normalize_mousepad as nm

AT = "2026-11-14T00:00:00Z"


def row(title, source="bestprice", native_id="1", specs="", price=20.0):
    return nm.make_listing(source=source, native_id=native_id, title=title, url="https://example.invalid/" + native_id,
                           price=price, shop_count=3, scraped_at=AT, specs=specs)


def settled(*items):
    """items: (source, title[, price]) -> settled dict rows, in order."""
    rows = [row(t, source=s, native_id=str(i), price=(rest[0] if rest else 20.0)).to_dict()
            for i, (s, t, *rest) in enumerate(items)]
    nm.settle(rows)
    return rows


class IdentityTests(unittest.TestCase):
    CASES = (  # (title, brand, model, size)
        ("Trust GXT-754 Gaming Mouse Pad Medium 320mm Μαύρο", "Trust", "GXT-754", "Medium"),
        ("Razer Gigantus V2 XXL 940mm Μαύρο", "Razer", "Gigantus V2", "XXL"),
        ("Corsair Mouse Pad Gaming Corsair Mm Pro Control Large Gray", "Corsair", "MM Pro Control", "Large"),
        ("Equip Non-Slip Large 430mm Κόκκινο", "Equip", "Non-Slip", "Large"),
        ("MP-GAMEPRO-XL-2 Medium", "Other", "", "Medium"),  # the XL inside a hyphenated code is not a size
    )

    def test_brand_model_size(self):
        for title, brand, model, size in self.CASES:
            with self.subTest(title=title):
                got = nm._identity(title)
                self.assertEqual((got[0], got[4]), (brand, size))
                if brand != "Other":
                    self.assertEqual(nm.names.model_key(got[1]), nm.names.model_key(model))

    def test_colour_is_not_part_of_the_model(self):
        a, b = settled(("bestprice", "Trust Gel Bigfoot Black"), ("bestprice", "Trust Gel Bigfoot Red"))
        self.assertEqual(a["chip"], b["chip"])
        self.assertEqual((a["colour"], b["colour"]), ("black", "red"))

    def test_size_variants_never_merge(self):
        a, b, c = settled(("skroutz", "Razer Gigantus V2 Medium 360mm Μαύρο"), ("skroutz", "Razer Gigantus V2 XXL 940mm Μαύρο"),
                          ("bestprice", "Razer Gigantus V2 Black XXL"))
        self.assertNotEqual(a["chip"], b["chip"])
        self.assertEqual(b["chip"], c["chip"])


class DimensionTests(unittest.TestCase):
    CASES = (  # (title, width, height, thickness)
        ("Mousepad 900x400x4mm", 900, 400, 4),
        ("Mouse Pad 40x90cm", 900, 400, None),  # long side first, whatever the order
        ("Mouse Pad 90 x 40", 900, 400, None),  # unitless, both <=100: cm
        ("Mouse Pad 220x250", 250, 220, None),  # unitless, both >=200: mm
        ("Mouse Pad 150x120", None, None, None),  # unitless and between: unknown
        ("Natec Time Zone XXL 800mm", 800, None, None),  # a lone length is the long side only
        ("Mouse Pad Medium", None, None, None),
    )

    def test_dimensions(self):
        for title, w, h, t in self.CASES:
            with self.subTest(title=title):
                self.assertEqual(nm._dimensions(title), (w, h, t))


class RejectTests(unittest.TestCase):
    CASES = (  # (title, reason)
        ("Mousepad Disney Cars Tp1002 με Ποντίκι Two Pack 135-0021", "bundle"),
        ("Lazerbuilt - Minions - Σετ ασύρματου ποντικιού και mouse pad", "bundle"),
        ("Razer Viper V3 Pro + Gigantus V2 XXL", "bundle"),
        ("Logitech M185 Ασύρματο Mini Ποντίκι Μαύρο/Κόκκινο", "not-mousepad"),
        ("Ergonomic Foam Mouse Wrist Pad Black Fellowes", "not-mousepad"),
        ("Razer Goliathus Chroma Medium Μεταχειρισμένο", "used"),
    )
    KEPT = (  # looks like a reject word, is a real pad
        "Razer Pro Glide XXL", "Trust GXT 756 Glide Mouse Pad XL", "Cooler Master MP510 Glides Extended",
        "Spacer SP-PAD-GAME-B 900 X 300 X 3 Mm Natural Rubber Foam + Fabric Black",
        "Mouse Pad Minnie Mouse Large", "Mouse Pad Gel Wrist Rest Ugreen", "Mouse Pad Laptop Desk Mat 90x45 Καφέ",
    )

    def test_reasons(self):
        for title, reason in self.CASES:
            with self.subTest(title=title):
                self.assertEqual(nm.rejection_reason(title), reason)

    def test_real_pads_are_kept(self):
        for title in self.KEPT:
            with self.subTest(title=title):
                self.assertIsNone(nm.rejection_reason(title))

    def test_print_on_demand_is_custom_print(self):
        for title in ("Tstudio Mousepad «ουφ Πληττω»", "Mousepad δώρο για το νονό, My godfather 22x18cm, με δυνατότητα προσθήκης ονόματος",
                      "Koupakoupa Anime 230mm"):
            with self.subTest(title=title):
                self.assertEqual(row(title).reject, "custom-print")

    def test_a_pad_with_no_maker_is_no_identity(self):
        self.assertEqual(row("World Map RGB XXL 900mm Μαύρο").reject, "no-identity")

    def test_current_mouse_rule_still_rejects_pads(self):
        """normalize_mouse.py is untouched: it keeps sending pads to `not-mouse`, which is what keeps them out of /mouse."""
        self.assertEqual(nmouse.rejection_reason("Razer Gigantus V2 Gaming Mouse Pad Medium 360mm"), "not-mouse")
        self.assertIsNotNone(nm.rejection_reason("Logitech G203 Ενσύρματο Ποντίκι 8000 DPI"))


class UnknownStaysUnknownTests(unittest.TestCase):
    def test_nothing_is_invented(self):
        got = row("Natec Time Zone XXL")
        for field in ("rgb", "wristRest", "usbPort", "wirelessCharging", "antiSlip", "stitchedEdges", "shape", "surface",
                      "widthMm", "heightMm", "thicknessMm", "partNumber", "colour", "gaming", "extended"):
            self.assertIsNone(getattr(got, field), field)

    def test_stated_flags_are_true_and_never_false(self):
        got = row("Trust GXT-754 Gaming Mouse Pad Medium Μαύρο με RGB Φωτισμό και Στήριγμα καρπού")
        self.assertIs(got.rgb, True)
        self.assertIs(got.wristRest, True)
        self.assertIsNone(got.usbPort)


class SettleTests(unittest.TestCase):
    def test_part_number_joins_a_bare_part_title_to_the_named_model(self):
        rows = settled(("snif", "Mouse Pad Razer Atlas Pro Tempered Glass Black RZ02-05760100-R3M1"),
                       ("skroutz", "Razer RZ02-05760100-R3M1 Μαύρο"))
        self.assertEqual(rows[0]["chip"], rows[1]["chip"])
        self.assertIsNone(rows[1]["reject"])

    def test_a_part_with_two_names_is_a_conflict_not_a_guess(self):
        rows = settled(("snif", "Mouse Pad Corsair MM Anti-Fray 2XL Υφασμάτινο Gaming Black CH-941D070-WW"),
                       ("shopflix", "Corsair Mm Extended Mouse Pad XXL (930mm) Μαύρο CH-941D070-WW"))
        self.assertEqual([r["reject"] for r in rows], ["identity-conflict"] * 2)

    def test_settle_is_idempotent(self):
        rows = settled(("skroutz", "Trust GXT-754 Medium 320mm Μαύρο"), ("snif", "Trust GXT 754 Gaming Mouse Pad Medium 320mm Μαύρο"),
                       ("bestprice", "Tstudio Mousepad «ουφ Πληττω»"), ("snif", "Logitech M185 Ασύρματο Mini Ποντίκι"))
        again = copy.deepcopy(rows)
        nm.settle(again)
        self.assertEqual(again, rows)

    def test_chip_label_collisions_get_a_suffix(self):
        rows = settled(("skroutz", "Trust Gel Bigfoot Black"), ("skroutz", "Trust Gel-Bigfoot XL Black"))
        self.assertEqual(len({r["chip"] for r in rows if not r["reject"]}), len([r for r in rows if not r["reject"]]))


if __name__ == "__main__":
    unittest.main()
