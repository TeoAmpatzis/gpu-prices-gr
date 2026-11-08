"""Monitor title parsing and the strict same-monitor rule (scraper/normalize_monitor.py).
Real titles from the Phase 2 experiment; the last class runs the rule over the whole matching test set and
checks it against BestPrice barcodes (docs/peripherals/phase2-ean-check.json)."""
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scraper"))
import normalize_monitor as nm

DOCS = ROOT / "docs" / "peripherals"


def p(title, specs=""):
    return nm.parse(title, specs)


class ParseTests(unittest.TestCase):
    def test_full_title(self):
        r = p('Samsung Odyssey G7 G70D LS27DG702 IPS HDR Smart Gaming Monitor 27" 3840x2160 4K UHD 144Hz 1ms')
        self.assertEqual((r.brand, r.code, r.size, r.height, r.hz, r.panel), ("Samsung", "LS27DG702", 27.0, 2160, 144, "IPS"))

    def test_skroutz_title_plus_spec_line_gives_refresh(self):
        r = p('AOC Q27G4XF 27" IPS HDR QHD 2560x1440', "Gaming, Ρυθμός Ανανέωσης: 180Hz, Χρόνος Απόκρισης: 1ms")
        self.assertEqual((r.code, r.hz, r.height), ("Q27G4XF", 180, 1440))

    def test_hyphen_and_colour_suffix_fold(self):
        self.assertEqual(p('LG 27U421A-B 27" VA FHD 1920x1080').code, p('LG 27U421AB Monitor 27" 1920x1080').code)

    def test_decimal_sizes_and_tolerance(self):
        self.assertEqual(p('Dell P2425 IPS Monitor 24.07" 1920x1200 100Hz').size, 24.07)
        self.assertEqual(p("Asus VP227HF VA Monitor 21.45\" 1920x1080 100Hz").size, 21.45)
        a, b = p('AOC CQ32G4VE VA 31.5" 2560x1440 180Hz'), p('AOC CQ32G4VE 32" VA QHD 2560x1440')
        self.assertTrue(nm.compatible(a, b))

    def test_snif_greek_title_strips_shop_code(self):
        r = p('Οθόνη Dell UltraSharp U2724DE 27" IPS QHD Thunderbolt Hub Platinum Silver 210-BKTV')
        self.assertEqual((r.brand, r.code), ("Dell", "U2724DE"))
        r = p("Οθόνη Philips Evnia 3000 27M2N3500NL/00 27\" VA Quad HD 180Hz")
        self.assertEqual(r.code, "27M2N3500NL")

    def test_colour_is_read_not_part_of_code(self):
        r = p('Samsung M5 M50F IPS HDR Smart Monitor 27" 1920x1080 FHD 60Hz 5ms White')
        self.assertEqual((r.code, r.colour), ("M50F", "white"))

    def test_rejects_with_reason(self):
        self.assertEqual(p("ΒΟΗΘΗΤΙΚΟ ΡΑΦΑΚΙ ΤΗΛΕΟΡΑΣΗΣ SCREEN TOP SHELF").reject, "not-monitor")
        self.assertEqual(p("Οθόνη TFT NEC LCD2170NX (Ανακατασκευασμένη)").reject, "used")
        self.assertIsNone(p("Dell χωρίς Βάση IPS FHD 1920x1080").reject)  # "without stand" is still a monitor

    def test_parse_is_stable(self):
        t = 'Philips 24E2N1110 23.8" IPS FHD 1920x1080'
        self.assertEqual(p(t), p(t))


class RuleTests(unittest.TestCase):
    def ids(self, *titles):
        items = [(str(i), p(t)) for i, t in enumerate(titles)]
        models, ambiguous, unidentified = nm.group(items)
        return sorted(sorted(m[2]) for m in models), ambiguous, unidentified

    def test_panel_disagreement_splits(self):  # the S70H false merge found with barcodes
        models, _, _ = self.ids('Samsung ViewFinity S7 S70H VA HDR Monitor 32" 3840x2160 4K UHD 60Hz 5ms',
                                'Samsung ViewFinity S7 S70H IPS HDR Monitor 32" 3840x2160 4K UHD 60Hz 5ms')
        self.assertEqual(models, [["0"], ["1"]])

    def test_colour_variants_are_one_model(self):
        models, _, _ = self.ids('Samsung M5 M50F IPS HDR Smart Monitor 27" 1920x1080 FHD 60Hz 5ms White',
                                'Samsung M5 M50F IPS HDR Smart Monitor 27" 1920x1080 FHD 60Hz 5ms Black')
        self.assertEqual(models, [["0", "1"]])

    def test_series_code_with_two_sizes_stays_two_models(self):
        models, _, _ = self.ids('Samsung Essential S3 S30GD IPS HDR Monitor 24" 1920x1080 FHD 100Hz',
                                'Samsung Essential S3 S30GD IPS HDR Monitor 27" 1920x1080 FHD 100Hz')
        self.assertEqual(models, [["0"], ["1"]])

    def test_suffix_variants_are_never_merged(self):
        models, _, _ = self.ids('Dell P2425 IPS Monitor 24.07" 1920x1200 100Hz', 'Dell P2425E 24.07" IPS 1920x1200 100Hz')
        self.assertEqual(models, [["0"], ["1"]])

    def test_different_refresh_splits(self):
        models, _, _ = self.ids('Xiaomi G27i 2026 IPS HDR Gaming Monitor 27" 1920x1080 FHD 200Hz',
                                'Xiaomi G27i 27" IPS HDR FHD 1920x1080')
        self.assertEqual(len(models), 1)  # the second states nothing that disagrees ...
        models, _, _ = self.ids('Xiaomi G27i 2026 IPS HDR Gaming Monitor 27" 1920x1080 FHD 200Hz',
                                'Xiaomi G27i 27" IPS HDR FHD 1920x1080 165Hz')
        self.assertEqual(len(models), 2)  # ... unless it states 165 Hz

    def test_unknown_size_joins_only_when_one_model_fits(self):
        a = 'Samsung Odyssey G5 G50F IPS HDR Gaming Monitor 27" 2560x1440 QHD 180Hz'
        b = 'Samsung Odyssey G5 G50F IPS HDR Gaming Monitor 32" 2560x1440 QHD 180Hz'
        unknown = "Samsung Odyssey G5 G50F IPS HDR QHD 2560x1440"
        models, ambiguous, _ = self.ids(a, b, unknown)
        self.assertEqual((models, ambiguous), ([["0"], ["1"]], ["2"]))
        models, ambiguous, _ = self.ids(a, unknown)
        self.assertEqual((models, ambiguous), ([["0", "1"]], []))

    def test_no_code_is_unidentified(self):
        self.assertEqual(self.ids("Dell IPS FHD 1920x1080")[2], ["0"])


class TestSetTests(unittest.TestCase):
    """Whole matching test set: every model that mixes two BestPrice barcodes must differ in colour only."""

    @classmethod
    def setUpClass(cls):
        t = json.loads((DOCS / "phase2-matching-testset.json").read_text(encoding="utf-8"))
        cls.barcodes = json.loads((DOCS / "phase2-ean-check.json").read_text(encoding="utf-8"))["barcodes"]
        cls.rows = {(l["source"], l["id"]): l for l in t["listings"]}
        items = [(f"{s}:{i}", p(l["title"], l["specs"])) for (s, i), l in cls.rows.items()]
        cls.parsed = dict(items)
        cls.models, cls.ambiguous, cls.unidentified = nm.group(items)

    def test_barcode_conflicts_are_colour_variants_only(self):
        bad = []
        for brand, code, ids in self.models:
            bp = [(i, self.barcodes[i.split(":")[1]]) for i in ids if i.startswith("bestprice:") and i.split(":")[1] in self.barcodes]
            for a in range(len(bp)):
                for b in range(a + 1, len(bp)):
                    if bp[a][1] != bp[b][1] and self.parsed[bp[a][0]].colour == self.parsed[bp[b][0]].colour:
                        bad.append((brand, code, bp[a][0], bp[b][0]))
        # Two BestPrice products with different barcodes and the same stated colour: titles cannot tell them apart
        self.assertEqual(bad, [], "different barcodes under one model without a colour difference")

    def test_same_barcode_never_split(self):
        where = {}
        for n, (_, _, ids) in enumerate(self.models):
            for i in ids:
                where[i] = n
        by_code = {}
        for i, n in where.items():
            if i.startswith("bestprice:") and i.split(":")[1] in self.barcodes:
                by_code.setdefault(self.barcodes[i.split(":")[1]], set()).add(n)
        split = {c: s for c, s in by_code.items() if len(s) > 1}
        self.assertEqual(split, {})

    def test_every_listing_is_placed_once(self):
        placed = [i for _, _, ids in self.models for i in ids] + self.ambiguous + self.unidentified
        self.assertEqual(sorted(placed), sorted(self.parsed))

    def test_size_of_the_result_is_close_to_the_experiment(self):
        multi = [m for m in self.models if len({i.split(":")[0] for i in m[2]}) > 1]
        self.assertGreaterEqual(len(multi), 400)  # experiment: 467 models seen in more than one source


def listing(source, native_id, title, price=100.0, specs=""):
    return nm.make_listing(source=source, native_id=native_id, title=title, url="https://x/" + native_id,
                           price=price, shop_count=None, scraped_at="2026-11-08T00:00:00Z", specs=specs).to_dict()


class SettleTests(unittest.TestCase):
    def test_make_listing_fields_and_id(self):
        l = listing("skroutz", "7", 'AOC Q27G4XF 27" IPS HDR QHD 2560x1440', specs="Ρυθμός Ανανέωσης: 180Hz")
        self.assertEqual((l["id"], l["brand"], l["code"], l["size"], l["height"], l["hz"], l["panel"]),
                         ("skroutz:7", "AOC", "Q27G4XF", 27.0, 1440, 180, "IPS"))
        self.assertIsNone(nm.make_listing(source="snif", native_id="1", title="x", url="u", price=0, shop_count=None, scraped_at="t"))

    def test_models_are_named_brand_and_code_unless_the_code_has_two_models(self):
        rows = [listing("bestprice", "1", 'Dell U2724DE IPS Monitor 27" 2560x1440 QHD 120Hz'),
                listing("skroutz", "2", 'Dell Ultrasharp U2724DE 27" IPS QHD 2560x1440'),
                listing("bestprice", "3", 'Samsung Essential S3 S30GD IPS HDR Monitor 24" 1920x1080 FHD 100Hz'),
                listing("bestprice", "4", 'Samsung Essential S3 S30GD IPS HDR Monitor 27" 1920x1080 FHD 100Hz')]
        nm.settle(rows)
        self.assertEqual([r["chip"] for r in rows], ["Dell U2724DE", "Dell U2724DE", 'Samsung S30GD 24"', 'Samsung S30GD 27"'])

    def test_unplaced_listings_get_a_reason(self):
        a = 'Samsung Odyssey G5 G50F IPS HDR Gaming Monitor 27" 2560x1440 QHD 180Hz'
        b = a.replace('27"', '32"')
        rows = [listing("bestprice", "1", a), listing("bestprice", "2", b),
                listing("skroutz", "3", "Samsung Odyssey G5 G50F IPS HDR QHD 2560x1440"),
                listing("skroutz", "4", "Dell IPS FHD 1920x1080"),
                listing("snif", "5", "Οθόνη TFT NEC LCD2170NX (Ανακατασκευασμένη)")]
        nm.settle(rows)
        self.assertEqual([r["reject"] for r in rows], [None, None, "ambiguous", "no-identity", "used"])
        self.assertEqual([r["chip"] for r in rows[2:]], ["", "", ""])

    def test_settle_twice_is_settle_once(self):
        rows = [listing("bestprice", "1", 'Samsung Essential S3 S30GD IPS Monitor 24" 1920x1080 100Hz'),
                listing("bestprice", "2", 'Samsung Essential S3 S30GD IPS Monitor 27" 1920x1080 100Hz'),
                listing("skroutz", "3", "Dell IPS FHD 1920x1080")]
        nm.settle(rows)
        once = json.dumps(rows, sort_keys=True)
        nm.settle(rows)
        self.assertEqual(json.dumps(rows, sort_keys=True), once)

    def test_a_listing_that_becomes_placeable_loses_its_reject(self):
        rows = [listing("skroutz", "3", "Samsung Odyssey G5 G50F IPS HDR QHD 2560x1440")]
        rows[0]["reject"] = "ambiguous"  # decided by an earlier run
        nm.settle(rows)  # now alone: nothing competes, it is its own incomplete model
        self.assertIsNone(rows[0]["reject"])
        self.assertEqual(rows[0]["chip"], "Samsung G50F")


class StageTests(unittest.TestCase):
    def test_rejects_leave_the_listings_and_are_reported_with_reason(self):
        import tempfile
        import main as mn
        rows = [listing("bestprice", "1", 'Dell U2724DE IPS Monitor 27" 2560x1440 QHD 120Hz'), listing("skroutz", "4", "Dell IPS FHD 1920x1080")]
        nm.settle(rows)
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)
            day1, day2 = "2026-11-08T00:00:00Z", "2026-11-09T00:00:00Z"
            fresh = lambda at: {"ok": True, "updatedAt": at}
            mn.stage(out, rows, {"bestprice": fresh(day1), "skroutz": fresh(day1)}, day1)
            rep = json.loads((out / "rejected.json").read_text(encoding="utf-8"))
            self.assertEqual([r["id"] for r in rows], ["bestprice:1"])
            self.assertEqual((rep["counts"], [r["id"] for r in rep["listings"]]), ({"no-identity": 1}, ["skroutz:4"]))
            # next run: skroutz failed, so its earlier reject stays in the report; bestprice has nothing new to reject
            mn.stage(out, [rows[0]], {"bestprice": fresh(day2), "skroutz": {"ok": False, "updatedAt": day1}}, day2)
            rep = json.loads((out / "rejected.json").read_text(encoding="utf-8"))
            self.assertEqual([r["id"] for r in rep["listings"]], ["skroutz:4"])
            # a run limited with --only bestprice: skroutz kept its old meta (ok, but not from this run), so its rejects stay
            mn.stage(out, [rows[0]], {"bestprice": fresh("2026-11-10T00:00:00Z"), "skroutz": fresh(day1)}, "2026-11-10T00:00:00Z")
            rep = json.loads((out / "rejected.json").read_text(encoding="utf-8"))
            self.assertEqual([r["id"] for r in rep["listings"]], ["skroutz:4"])
            # a source that was scraped now and rejects nothing any more loses its old rejects
            mn.stage(out, [rows[0]], {"bestprice": fresh("2026-11-11T00:00:00Z"), "skroutz": fresh("2026-11-11T00:00:00Z")}, "2026-11-11T00:00:00Z")
            self.assertEqual(json.loads((out / "rejected.json").read_text(encoding="utf-8"))["listings"], [])


class ReviewFixTests(unittest.TestCase):
    """Bugs found by the first real scrape and by the independent review of the first version."""

    def test_sku_filter_needs_its_hyphen(self):
        self.assertEqual(p("MSI MPG 321CURX Gaming Monitor 31.5 4K OLED Curved 240Hz 0.03ms").code, "321CURX")
        self.assertEqual(p('Οθόνη Dell UltraSharp U2724DE 27" IPS QHD 210-BKTV').code, "U2724DE")  # Dell's SKU still dropped

    def test_double_escaped_quotes_from_snif(self):
        r = p("DELL Monitor Pro P 27 P2726DEV 27&amp;apos;&amp;apos; QHD IPS, HDMI, DisplayPort")
        self.assertEqual((r.size, r.code, r.panel), (27.0, "P2726DEV", "IPS"))

    def test_unknown_maker_uses_its_first_word(self):
        for title, brand, code in (('Turbo-X TS2142RBB IPS Gaming Monitor 21.5" 1920x1080 FHD 75Hz', "Turbo-x", "TS2142RBB"),
                                   ('Οθόνη ZEUSLAP Z15W 15.6" FHD 1920x1080', "Zeuslap", "Z15W"),
                                   ('Zeuslap Z15W 15.6" FHD 1920x1080', "Zeuslap", "Z15W")):
            r = p(title)
            self.assertEqual((r.brand, r.code), (brand, code))

    def test_brand_spellings_are_one_maker_and_one_address(self):
        # found by the build's data check: two spellings gave two models with one page address
        rows = [listing("bestprice", "1", 'Cooler Master GM27QPA IPS Gaming Monitor 27" 2560x1440 QHD 165Hz'),
                listing("skroutz", "2", 'Coolermaster GM27QPA 27" IPS QHD 2560x1440', specs="Ρυθμός Ανανέωσης: 165Hz")]
        nm.settle(rows)
        self.assertEqual(rows[0]["chip"], rows[1]["chip"])
        self.assertEqual(rows[0]["chip"], "Cooler Master GM27QPA")

    def test_two_names_never_share_an_address(self):
        # "Foo BAR1234" and "Foob AR1234" are different makers and codes, but the site files both under "foobar1234"
        rows = [listing("bestprice", "1", 'Foo BAR1234 IPS Monitor 27" 2560x1440 100Hz'),
                listing("bestprice", "2", 'Foob AR1234 IPS Monitor 27" 2560x1440 100Hz')]
        nm.settle(rows)
        self.assertTrue(all(r["chip"] for r in rows))
        forms = {re.sub(r"[^a-z0-9]", "", r["chip"].lower()) for r in rows}
        self.assertEqual(len(forms), 2)
        again = [r["chip"] for r in rows]
        nm.settle(rows)  # and settling again changes nothing
        self.assertEqual([r["chip"] for r in rows], again)

    def test_model_number_without_letters(self):
        self.assertEqual(p('Lenovo Legion 24-15 IPS HDR Gaming Monitor 23.8" 1920x1080 FHD 240Hz').code, "2415")

    def test_curvature_is_not_the_code(self):
        self.assertEqual(p('Samsung G50F 27" 1000R IPS 180Hz').code, "G50F")

    def test_year_must_stand_alone(self):
        self.assertIsNone(p('Dell E2020H 20" 1600x900').revision)
        self.assertEqual(p('Xiaomi G27i 2026 IPS 27"').revision, "2026")

    def test_mount_pattern_is_not_a_resolution(self):
        self.assertEqual(p('X 27" VESA 100x100 2560x1440').height, 1440)

    def test_accented_greek_words(self):
        self.assertEqual(p("Οθόνη μεταχειρισμένη LG 24MK430H").reject, "used")
        self.assertEqual(p('Τηλεόραση LG 32" 1920x1080').reject, "not-monitor")
        self.assertEqual(p("LG 27GP850 ΜΑΥΡΟ").colour, "black")
        self.assertEqual(p("LG 27GP850 24 ιντσες IPS").size, 24.0)

    def test_model_names_do_not_depend_on_listing_order(self):
        # B (refresh unknown) is compatible with both A (144 Hz) and C (165 Hz); A and C are different models.
        a = 'Samsung Odyssey G5 G50F IPS Monitor 27" 2560x1440 144Hz'
        b = 'Samsung Odyssey G5 G50F IPS Monitor 27" 2560x1440'
        c = 'Samsung Odyssey G5 G50F IPS Monitor 27" 2560x1440 165Hz'
        ids = {a: "1", b: "2", c: "3"}  # a shop's native id never changes; only the order they arrive in does
        names = []
        for order in ((a, b, c), (c, b, a), (b, a, c)):
            rows = [listing("bestprice", ids[t], t) for t in order]
            nm.settle(rows)
            names.append(sorted((r["id"], r["chip"]) for r in rows))
        self.assertEqual(names[0], names[1])
        self.assertEqual(names[0], names[2])

    def test_identical_names_are_all_numbered(self):
        rows = [listing("bestprice", str(i), f'Samsung Essential S3 S30GD IPS Monitor 24" 1920x1080 100Hz {extra}')
                for i, extra in enumerate(("2025", "2025", "2025"), 1)]
        models, _, _ = nm.group([(r["id"], nm._of(r)) for r in rows])
        self.assertEqual(len(models), 1)  # same year, same facts: one model, no numbering needed
        two = [listing("bestprice", "1", 'Dell P2425 24.07" 1920x1200 IPS 100Hz'), listing("bestprice", "2", 'Dell P2425 27" 1920x1200 IPS 100Hz')]
        nm.settle(two)
        self.assertEqual(len({r["chip"] for r in two}), 2)


class CategoryTests(unittest.TestCase):
    def test_monitor_category_is_listed_and_limited(self):
        import capabilities
        from categories import CATEGORIES
        c = CATEGORIES["monitor"]
        self.assertTrue(c.rejects and not c.images)
        self.assertEqual((c.eshop_categories, c.shopflix_categories), ((), ()))  # not monitor sources (Phase 0: O5, O6)
        for op in (capabilities.SPECS, capabilities.SHIPPING, capabilities.HISTORY):
            self.assertFalse(capabilities.supports("skroutz", "monitor", op))
        self.assertTrue(capabilities.supports("skroutz", "monitor", capabilities.LISTS))
        self.assertTrue(capabilities.supports("skroutz", "gpu", capabilities.HISTORY))  # nine categories unchanged
        for source in ("eshop", "shopflix"):  # not monitor sources: not run, never reported as failed
            self.assertFalse(capabilities.supports(source, "monitor", capabilities.LISTS))
            self.assertTrue(capabilities.supports(source, "gpu", capabilities.LISTS))


if __name__ == "__main__":
    unittest.main()
