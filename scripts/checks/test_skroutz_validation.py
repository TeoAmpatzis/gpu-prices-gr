"""A green process must not disguise stale or truncated Skroutz data."""
import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate_skroutz as validation


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.before = {"started_at": "2026-11-04T16:00:00+00:00", "categories": {}}
        self.after = {}
        for cat in validation.CATEGORIES:
            self.before["categories"][cat] = {"count": 10, "updatedAt": "2026-11-03T00:00:00Z"}
            self.after[cat] = {"sources": {"skroutz": {"ok": True, "count": 10,
                                                       "updatedAt": "2026-11-04T16:01:00Z"}},
                               "listings": [{"id": f"skroutz:{n}", "source": "skroutz"} for n in range(10)]}

    def test_all_categories_need_current_success(self):
        self.assertEqual(validation.check(self.before, self.after), [])
        self.after["cpu"]["sources"]["skroutz"]["ok"] = False
        self.assertTrue(any("cpu" in e for e in validation.check(self.before, self.after)))

    def test_old_success_timestamp_cannot_pass(self):
        self.after["cpu"]["sources"]["skroutz"]["updatedAt"] = "2026-11-04T15:59:59Z"
        self.assertTrue(any("cpu" in e for e in validation.check(self.before, self.after)))

    def test_missing_category_and_invalid_timestamp_fail(self):
        del self.after["cpu"]
        self.after["gpu"]["sources"]["skroutz"]["updatedAt"] = None
        self.assertGreaterEqual(len(validation.check(self.before, self.after)), 2)

    def test_more_than_30_percent_drop_fails(self):
        self.after["cpu"]["listings"] = self.after["cpu"]["listings"][:6]
        self.after["cpu"]["sources"]["skroutz"]["count"] = 6
        self.assertTrue(any("cpu" in e for e in validation.check(self.before, self.after)))

    def test_empty_or_count_mismatch_fails(self):
        self.after["cpu"]["listings"] = []
        self.assertTrue(any("cpu" in e for e in validation.check(self.before, self.after)))

    def test_validation_does_not_mutate_data(self):
        saved = copy.deepcopy(self.after)
        validation.check(self.before, self.after)
        self.assertEqual(self.after, saved)

    def test_duplicate_ids_cannot_hide_missing_listings(self):
        self.after["cpu"]["listings"][1] = dict(self.after["cpu"]["listings"][0])
        self.assertTrue(any("cpu" in e for e in validation.check(self.before, self.after)))


if __name__ == "__main__":
    unittest.main()
