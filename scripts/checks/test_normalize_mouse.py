"""Mouse normalization/identity, using observed titles and labelled synthetic boundary cases. No network."""
import copy
import itertools
import json
import math
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scraper"))
import names
import normalize_mouse as nm

AT = "2026-11-11T00:00:00Z"


def row(title, source="bestprice", native_id="1", specs="", **kwargs):
    return nm.make_listing(source=source, native_id=native_id, title=title,
                           url="https://example.com/mouse", price=25, shop_count=1,
                           scraped_at=AT, specs=specs, **kwargs).to_dict()


def rows(*titles):
    return [row(title, native_id=str(i)) for i, title in enumerate(titles)]


def key(r):
    return names.model_key(r["chip"])


class ParseTests(unittest.TestCase):
    def test_observed_preflight_brands_and_full_colour_phrases(self):
        for brand in ('Apple', 'HyperX', 'Xiaomi', 'Sades', 'Ajazz', 'NGS', 'ATK', 'Spartan Gear',
                      'Attack Shark', 'Motospeed', 'Ugreen', 'Powerlogic', 'Zeroground', 'MediaRange', 'Vakoss', 'Approx', 'ET'):
            self.assertEqual(row(f'{brand} Example Mouse')['brand'], brand)
        variants = ('Space Grey', 'Space Gray', 'Pale Grey', 'Graphite', 'Anthracite', 'Dark Grey',
                    'White Mist', 'Space Black', 'Black Grey', 'Black/Silver', 'Black-Grey', 'Black / Red', 'Lime Green')
        data = rows(*(f'Logitech MX Master 3S Wireless {colour}' for colour in variants))
        nm.settle(data)
        self.assertEqual(len({key(r) for r in data}), 1)
        self.assertTrue(all(r['colour'] for r in data))
        self.assertNotEqual(data[0]['colour'], data[2]['colour'])
        self.assertEqual(data[0]['colour'], data[1]['colour'])

    def test_makers_observed_in_full_collection_source_filters(self):
        for title, brand in (('Yenkee YMS 2015 Wireless Mouse', 'Yenkee'),
                             ('R-GO Tools HE Mouse Wired Black', 'R-GO Tools'),
                             ('Cherry Gentix Mouse Black', 'Cherry'),
                             ('Bakker Elkhuizen Example Mouse', 'BakkerElkhuizen'),
                             ('Xtrike Me Example Mouse', 'Xtrike Me')):
            self.assertEqual(row(title)['brand'], brand)

    def test_snif_recognized_maker_may_follow_descriptors_or_a_model_code(self):
        cases = (
            ('Ποντίκι Ενσύρματο Gaming Zeroground RGB MS-3100G Hirashi', 'Zeroground', 'MS-3100G Hirashi'),
            ('Ασύρματο Ποντίκι Tracer Joy RF -Μπλέ', 'Tracer', 'Joy'),
            ('Ποντίκι MX707W 2.4Ghz Ασύρματο Msonic με USB Nano Receiver Άσπρο', 'Msonic', 'MX707W'),
            ('Ποντίκι με φωτισμό και μεταλλική βάση R.horse ROBOCOP FC-1800 USB 2 Wired LED Gaming Mouse - Black / Red', 'R.horse', 'ROBOCOP FC-1800'),
        )
        for title, brand, model in cases:
            data = rows(title)
            nm.settle(data)
            self.assertEqual(data[0]['brand'], brand)
            self.assertIsNone(data[0]['reject'], title)
            self.assertIn(model, data[0]['chip'])
        data = rows('Logitech Razer Example Mouse')
        nm.settle(data)
        self.assertEqual(data[0]['reject'], 'no-identity')

    def test_silent_vertical_and_ergonomic_model_words_are_preserved(self):
        for title in ('Logitech M240 Silent Wireless Graphite', 'Logitech MX Vertical Wireless Black',
                      'Trust Verto Ergonomic Wireless Black'):
            data = rows(title)
            nm.settle(data)
            self.assertIn(title.split()[2], data[0]['chip'])

    def test_persisted_list_page_identity_recovers_a_missing_model_without_changing_card_title(self):
        data = nm.make_listing(source='skroutz', native_id='51236506', title='Trust Ασύρματο Μαύρο',
                               identity_title='Trust 25145 Ασύρματο Εργονομικό Ποντίκι Μαύρο',
                               url='https://www.skroutz.gr/s/51236506/product.html', price=32.8,
                               shop_count=None, scraped_at=AT).to_dict()
        nm.settle([data])
        self.assertIsNone(data['reject'])
        self.assertIn('25145', data['chip'])
        self.assertEqual(data['title'], 'Trust Ασύρματο Μαύρο')
        self.assertTrue(data['identityTitle'])
        before = copy.deepcopy(data)
        nm.settle([data])
        self.assertEqual(data, before)

    def test_supplemental_identity_preserves_card_evidence_and_quarantines_conflicts(self):
        def recover(extra):
            return nm.make_listing(source='skroutz', native_id='1', title='Trust Wireless Black',
                                   identity_title=extra, url='https://example.com/1', price=20,
                                   shop_count=None, scraped_at=AT).to_dict()
        data = recover('Trust 25145 Mouse')
        self.assertEqual((data['connection'], data['colour']), ('wireless', 'black'))
        for title in ('Trust 25145 Mousepad Black', 'Trust 25145 Wireless Refurbished Black'):
            data = recover(title)
            self.assertIn(data['reject'], ('not-mouse', 'used'))
            data['reject'] = None
            nm.settle([data])
            self.assertIn(data['reject'], ('not-mouse', 'used'))
        for title in ('Trust 25145 Wired Black', 'Trust 25145 Wireless White', 'Razer 25145 Wireless Black'):
            self.assertEqual(recover(title)['reject'], 'identity-conflict', title)
        data = []
        for i, model in enumerate(('25145', '25146')):
            item = nm.make_listing(source='skroutz', native_id=str(i), title='Trust Wireless Black 910-004424',
                                   identity_title=f'Trust {model} Mouse', url='https://example.com', price=20,
                                   shop_count=None, scraped_at=AT).to_dict()
            data.append(item)
        nm.settle(data)
        self.assertEqual([r['reject'] for r in data], ['identity-conflict', 'identity-conflict'])

    def test_documented_titles_and_synthetic_cases(self):
        fixture = json.loads((ROOT / "scripts/checks/fixtures/mouse-titles.json").read_text(encoding="utf-8"))
        for case in fixture:
            with self.subTest(title=case["title"]):
                r = row(case["title"], source=case["source"], specs=case.get("specs", ""))
                self.assertIsNone(r["reject"])
                for field, expected in case["expected"].items():
                    self.assertEqual(r[field], expected, field)

    def test_missing_specs_are_unknown_and_extras_survive_serialization(self):
        listing = nm.make_listing(source="snif", native_id="7", title="Logitech M171 Mouse",
                                  url="https://example.com/7", price=12.345, shop_count=None,
                                  scraped_at=AT)
        listing.image = "https://example.com/photo.jpg"
        listing.shipping = 3
        listing.drop = 12
        data = listing.to_dict()
        self.assertEqual((data["id"], data["price"], data["shipping"], data["drop"]), ("snif:7", 12.35, 3, 12))
        self.assertEqual(data["image"], listing.image)
        for field in ("connection", "dpi", "pollingHz", "buttons", "rgb", "gaming", "bluetooth", "rf",
                      "rechargeable", "ergonomic", "silent", "colour", "partNumber"):
            self.assertIsNone(data[field], field)

    def test_a_brand_containing_gaming_is_not_a_gaming_spec(self):
        self.assertIsNone(row('Mars Gaming Example Mouse')['gaming'])
        self.assertIs(row('Gaming Mouse Logitech Example')['gaming'], True)

    def test_invalid_prices_never_produce_listings(self):
        for price in (0, -1, 0.001, math.nan, math.inf, -math.inf, True):
            with self.subTest(price=price):
                self.assertIsNone(nm.make_listing(source="snif", native_id="1", title="Logitech M171",
                                                 url="https://example.com", price=price,
                                                 shop_count=1, scraped_at=AT))

    def test_only_complete_positive_numeric_units_are_specs(self):
        r = row("Logitech Example Mouse 800dpi 1600 DPI", specs="Κουμπιά:5, Polling Rate:1000Hz")
        self.assertEqual((r["dpi"], r["pollingHz"], r["buttons"]), (1600, 1000, 5))
        for spec in ("-1600 DPI", "0 DPI", "1.5 DPI", "1600DPIModel", "X1600DPI", "1600", "NaN DPI"):
            self.assertIsNone(row("Logitech Example Mouse", specs=spec)["dpi"], spec)
        self.assertIsNone(row("Logitech Example Mouse", specs="2.4GHz")["pollingHz"])
        self.assertIsNone(row("Logitech Example Mouse", specs="-1000Hz")["pollingHz"])
        self.assertIsNone(row("Logitech Example Mouse", specs="Buttons:0")["buttons"])

    def test_wireless_substrings_and_charging_cables_do_not_mean_wired(self):
        for title, expected in (("Wireless", "wireless"), ("Wired", "wired"), ("Wireless & Wired", "both"),
                                ("Ασύρματο", "wireless"), ("Ενσύρματο", "wired"),
                                ("Wireless USB charging cable", "wireless")):
            self.assertEqual(row("Logitech Example Mouse " + title)["connection"], expected)
        self.assertIsNone(row("Logitech Example Mouse USB charging")["connection"])
        self.assertIsNone(row("Logitech Example Mouse Bluetooth")["rechargeable"])
        accepted = rows('Logitech Example Mouse Wireless with USB charging cable')
        nm.settle(accepted)
        self.assertIsNone(accepted[0]['reject'])
        self.assertEqual(accepted[0]['connection'], 'wireless')

    def test_colour_keys_handle_unaccented_greek_but_keep_distinct_named_colours(self):
        self.assertEqual(row('Logitech Example Mouse ΜΑΥΡΟ')['colour'], 'black')
        self.assertEqual(row('Logitech Example Mouse Charcoal')['colour'], 'charcoal')

    def test_included_receiver_is_not_a_standalone_accessory(self):
        data = rows('Logitech Example Wireless Mouse with USB Receiver',
                    'Logitech Example Wireless Mouse includes Dongle',
                    'Logitech M171 Wireless with USB Receiver')
        nm.settle(data)
        self.assertTrue(all(r['reject'] is None for r in data))

    def test_explicit_negatives_are_false_without_title_omission_becoming_false(self):
        for text in ("No RGB", "Without RGB", "Χωρίς RGB"):
            self.assertIs(row("Logitech Example Mouse " + text)["rgb"], False)
        self.assertIsNone(row("Logitech Example Mouse")["rgb"])

    def test_mouse_descriptors_are_not_brands(self):
        for title in ("Mouse Example Wireless Black", "Ποντίκι Wireless Black", "Gaming Mouse Black", "Logitech Mouse"):
            data = rows(title)
            nm.settle(data)
            self.assertEqual(data[0]["reject"], "no-identity", title)
        for brand in ("Logitech", "HP", "Microsoft", "Razer", "Mars Gaming"):
            self.assertEqual(row(f"Ποντίκι {brand} Example Mouse")["brand"], brand)

    def test_existing_vendor_aliases_share_the_canonical_name(self):
        data = rows('CM Example Mouse', 'Coolermaster Example Mouse', 'Cooler Master Example Mouse')
        nm.settle(data)
        self.assertEqual({r['brand'] for r in data}, {'Cooler Master'})
        self.assertEqual(len({key(r) for r in data}), 1)

    def test_accessories_bundles_and_used_products_are_reported_not_dropped(self):
        cases = {
            "Mousepad": "not-mouse", "Mouse Pad": "not-mouse", "Μαξιλαράκι": "not-mouse",
            "Bungee": "not-mouse", "Mouse Feet": "not-mouse", "Mouse Skates": "not-mouse",
            "Grip Tape": "not-mouse", "USB Hub": "not-mouse", "Receiver": "not-mouse",
            "Dongle": "not-mouse", "Charging Dock": "not-mouse", "Replacement Cable": "not-mouse",
            "USB Cable for M171": "not-mouse", "Replacement Mouse Shell": "not-mouse",
            "Replacement Switch": "not-mouse", "Replacement Shell": "not-mouse", "Wrist Rest": "not-mouse",
            "Presenter": "not-mouse", "Trackpad": "not-mouse", "Graphics Tablet": "not-mouse",
            "Game Controller": "not-mouse", "Combo Keyboard & Mouse": "bundle",
            "Mouse + Mousepad": "bundle", "Mouse + Headset": "bundle", "Σετ Mouse": "bundle",
            "Mouse + Keyboard": "bundle",
            "M171 Mouse + K120 Keyboard": "bundle", "Keyboard + M171 Mouse": "bundle",
            "Used Mouse": "used", "Refurbished Mouse": "used", "Open Box Mouse": "used",
        }
        for title, reason in cases.items():
            data = rows("Logitech " + title)
            nm.settle(data)
            self.assertEqual(data[0]["reject"], reason, title)
        for title in ("Logitech Example Trackball", "Logitech Example Vertical Mouse"):
            data = rows(title)
            nm.settle(data)
            self.assertIsNone(data[0]["reject"], title)


class IdentityTests(unittest.TestCase):
    def test_colours_share_a_product_without_losing_listing_colour_or_part_number(self):
        data = rows("Logitech M171 Wireless Black 910-004424", "Logitech M171 Wireless White 910-004425")
        nm.settle(data)
        self.assertEqual(key(data[0]), key(data[1]))
        self.assertNotEqual(data[0]["colour"], data[1]["colour"])
        self.assertNotEqual(data[0]["partNumber"], data[1]["partNumber"])

    def test_connection_families_are_distinct_and_unknown_cannot_bridge_them(self):
        data = rows("Logitech Example Mouse Wired", "Logitech Example Mouse Wireless",
                    "Logitech Example Mouse Wireless & Wired", "Logitech Example Mouse")
        nm.settle(data)
        self.assertEqual(len({key(r) for r in data[:3]}), 3)
        self.assertTrue(all(r["reject"] is None for r in data[:3]))
        self.assertEqual(data[3]["reject"], "identity-conflict")

    def test_connection_separators_do_not_create_extra_dual_mode_models(self):
        data = rows('Logitech Example Wireless + Wired Mouse', 'Logitech Example Wired/Wireless Mouse',
                    'Logitech Example Wireless & Wired Mouse')
        nm.settle(data)
        self.assertEqual(len({key(r) for r in data}), 1)

    def test_unknown_attaches_only_to_one_known_connection(self):
        for connection in ("Wired", "Wireless", "Wireless & Wired"):
            data = rows("Logitech Example Mouse " + connection, "Logitech Example Mouse")
            nm.settle(data)
            self.assertEqual(key(data[0]), key(data[1]), connection)
            self.assertIsNone(data[1]["connection"], "identity must not invent a stated spec")
        unknown = rows("Logitech Example Mouse Black", "Logitech Example Mouse White")
        nm.settle(unknown)
        self.assertEqual(key(unknown[0]), key(unknown[1]))

    def test_identity_words_and_specific_editions_are_preserved(self):
        names_ = ["Logitech Example " + word for word in ("Pro", "Plus", "SE", "Lite", "Mini", "Max", "X", "V2",
                                                         "2S", "3S", "Lightspeed", "for Mac", "for Business", "Bluetooth Edition")]
        data = rows(*names_)
        nm.settle(data)
        self.assertTrue(all(r["reject"] is None for r in data))
        self.assertEqual(len({key(r) for r in data}), len(data))
        for title, r in zip(names_, data):
            self.assertIn(title.lower(), r["chip"].lower())
        near = rows("Logitech G502 X Wireless", "Logitech G502 X Plus Wireless")
        nm.settle(near)
        self.assertNotEqual(key(near[0]), key(near[1]))

    def test_part_number_conflicts_reject_every_member_and_are_scoped_to_brand(self):
        data = rows("Logitech Example A Mouse 910-004424", "Logitech Example B Mouse 910-004424",
                    "HP Example Mouse 910-004424")
        nm.settle(data)
        self.assertEqual([r["reject"] for r in data], ["identity-conflict", "identity-conflict", None])

    def test_distinct_punctuated_model_names_never_collide_after_key_folding(self):
        data = rows("Logitech Example A+B Mouse", "Logitech Example AB Mouse",
                    "Logitech Example A/B Mouse", "Logitech Example A B Mouse")
        nm.settle(data)
        self.assertEqual(len({key(r) for r in data}), len(data))

    def test_minus_model_variants_keep_their_identity(self):
        data = rows('Glorious Model O- Wired Black', 'Glorious Model O Wired Black',
                    'Glorious Model D- Wired Black', 'Glorious Model D Wired Black')
        nm.settle(data)
        self.assertEqual(len({key(r) for r in data}), 4)
        self.assertIn('O-', data[0]['chip'])
        self.assertIn('D-', data[2]['chip'])

    def test_polling_prefix_consumes_the_whole_spec_in_model_names(self):
        data = rows('Logitech G502 Mouse Polling Rate:1000Hz', 'Logitech G502 Mouse 1000Hz')
        nm.settle(data)
        self.assertEqual(key(data[0]), key(data[1]))

    def test_settling_is_idempotent_order_independent_and_rechecks_derived_rejects(self):
        source = rows("Logitech Example Wired Black", "Logitech Example Wireless White", "Logitech Example",
                      "Logitech Other Mousepad")
        expected = None
        for perm in itertools.permutations(source):
            data = copy.deepcopy(list(perm))
            nm.settle(data)
            once = copy.deepcopy(data)
            nm.settle(data)
            self.assertEqual(data, once)
            by_id = {r["id"]: r for r in data}
            if expected is None:
                expected = by_id
            self.assertEqual(by_id, expected)
        reduced = [copy.deepcopy(expected['bestprice:0']), copy.deepcopy(expected['bestprice:2'])]
        nm.settle(reduced)
        self.assertIsNone(reduced[1]["reject"])
        self.assertEqual(key(reduced[0]), key(reduced[1]))


if __name__ == "__main__":
    unittest.main()
