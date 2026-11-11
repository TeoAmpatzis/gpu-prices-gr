"""Source/category capabilities and the single category list."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
import capabilities
import glitches
import merge_history
from categories import CATEGORIES
from category_ids import CATEGORY_IDS

SOURCE_NAMES = ("skroutz", "bestprice", "snif", "shopflix", "eshop")


class CapabilityTests(unittest.TestCase):
    def test_mouse_sources_and_operations_are_explicit(self):
        self.assertIn('mouse', CATEGORY_IDS)
        self.assertEqual(CATEGORY_IDS[-1], 'mouse')
        for source in SOURCE_NAMES:
            for op in capabilities.OPERATIONS:
                expected = source in ('bestprice', 'snif') or (source == 'skroutz' and op == capabilities.LISTS)
                with self.subTest(source=source, operation=op):
                    self.assertEqual(capabilities.supports(source, 'mouse', op), expected)

    def test_one_category_list(self):
        self.assertEqual(tuple(CATEGORIES), CATEGORY_IDS)
        self.assertEqual(tuple(glitches.CATEGORIES), CATEGORY_IDS)
        self.assertEqual(tuple(merge_history.CATEGORIES), CATEGORY_IDS)

    def test_everything_is_supported_unless_listed(self):
        for source in SOURCE_NAMES:
            for cat in CATEGORY_IDS:
                for op in capabilities.OPERATIONS:
                    self.assertEqual(capabilities.supports(source, cat, op),
                                     op not in capabilities.UNSUPPORTED.get((source, cat), ()))

    def test_table_names_known_things_only(self):
        for (source, cat), ops in capabilities.UNSUPPORTED.items():
            self.assertIn(source, SOURCE_NAMES)
            self.assertIn(cat, CATEGORY_IDS)
            self.assertLessEqual(set(ops), set(capabilities.OPERATIONS))

    def test_unsupported_pair_is_skipped(self):
        saved = dict(capabilities.UNSUPPORTED)
        try:
            capabilities.UNSUPPORTED[("skroutz", "gpu")] = frozenset({capabilities.SHIPPING})
            self.assertFalse(capabilities.supports("skroutz", "gpu", capabilities.SHIPPING))
            self.assertTrue(capabilities.supports("skroutz", "gpu", capabilities.LISTS))
            self.assertTrue(capabilities.supports("bestprice", "gpu", capabilities.SHIPPING))
        finally:
            capabilities.UNSUPPORTED.clear()
            capabilities.UNSUPPORTED.update(saved)

    def test_unknown_operation_is_an_error(self):
        with self.assertRaises(ValueError):
            capabilities.supports("skroutz", "gpu", "scrape")


if __name__ == "__main__":
    unittest.main()
