"""A green process must not disguise stale or truncated Skroutz data."""
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate_skroutz as validation


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.before = {"started_at": "2026-11-04T16:00:00+00:00", "finished_at": "2026-11-04T16:02:00+00:00", "categories": {}}
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

    def test_later_run_timestamp_cannot_satisfy_this_run(self):
        self.after["cpu"]["sources"]["skroutz"]["updatedAt"] = "2026-11-04T16:02:01Z"
        self.assertTrue(any("cpu" in e for e in validation.check(self.before, self.after)))

    def test_missing_listing_identity_is_rejected(self):
        del self.after["cpu"]["listings"][0]["id"]
        self.assertTrue(any("cpu" in e for e in validation.check(self.before, self.after)))

    def test_naive_timestamp_is_not_a_valid_success(self):
        self.after["cpu"]["sources"]["skroutz"]["updatedAt"] = "2026-11-04T16:01:00"
        self.assertTrue(any("cpu" in e for e in validation.check(self.before, self.after)))

    def test_commit_pinning_ignores_later_working_copy_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            def git(*args):
                return subprocess.check_output(["git", *args], cwd=root, text=True, stderr=subprocess.PIPE).strip()
            git("init", "-q")
            git("config", "user.name", "Test")
            git("config", "user.email", "test@example.com")
            for cat, data in self.after.items():
                folder = root / "public" / "data" / cat
                folder.mkdir(parents=True)
                (folder / "latest.json").write_text(json.dumps(data), encoding="utf-8")
            git("add", "public/data")
            git("commit", "-qm", "snapshot")
            commit = git("rev-parse", "HEAD")
            (root / "public/data/cpu/latest.json").write_text('{}', encoding="utf-8")
            with patch.object(validation, "DATA", root / "public/data"):
                self.assertEqual(validation.read_categories(commit), self.after)
                self.assertEqual(validation.read_categories()["cpu"], {})


if __name__ == "__main__":
    unittest.main()
