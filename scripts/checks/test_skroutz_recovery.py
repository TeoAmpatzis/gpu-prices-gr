"""Listing retries take priority over shipping; a failed source gets one late recovery pass."""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
import main as mn


class Output(io.StringIO):
    def reconfigure(self, **kwargs):
        pass


class RecoveryTests(unittest.TestCase):
    def run_pipeline(self, only=None, stubborn=False, all_failed=False):
        events = []
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cats = {name: SimpleNamespace(name=name, model_key=lambda row: row["chip"])
                    for name in ("cpu", "gpu")}

            def scrape(cat, selected, with_shipping=True):
                recovery = selected == ["skroutz"]
                events.append(("recover" if recovery else "list", cat.name))
                success = not stubborn if recovery else not all_failed and cat.name != "cpu"
                folder = root / cat.name
                folder.mkdir(exist_ok=True)
                (folder / "latest.json").write_text(json.dumps({
                    "sources": {"skroutz": {"ok": success, "count": 1, "updatedAt": "2026-11-04T00:00:00Z"}},
                    "listings": [{"id": "skroutz:1", "source": "skroutz", "chip": "cpu", "price": 100}],
                }), encoding="utf-8")
                if with_shipping:
                    events.append(("shipping", cat.name))
                return success

            def shipping(folder, listings, model_key):
                events.append(("shipping", folder.name))
                listings[0]["total"] = 105

            args = ["main.py", "--specs-budget", "0", "--makers-budget", "0"]
            if only:
                args += ["--only", only]
            with patch.object(sys, "argv", args), patch.object(mn, "CATEGORIES", cats), \
                    patch.object(mn, "DATA_DIR", root), patch.object(mn, "run_order", side_effect=lambda rows: rows), \
                    patch.object(mn, "scrape_category", side_effect=scrape), \
                    patch.object(mn.shipping, "enrich", side_effect=shipping), \
                    patch.object(mn, "collect_specs", side_effect=lambda *a: events.append(("specs", "all"))), \
                    contextlib.redirect_stdout(Output()):
                code = mn.main()
            data = json.loads((root / "cpu/latest.json").read_text())
        return code, events, data

    def test_listings_and_one_late_recovery_precede_shipping(self):
        code, events, data = self.run_pipeline()
        self.assertEqual(events, [("list", "cpu"), ("list", "gpu"), ("recover", "cpu"),
                                  ("shipping", "cpu"), ("shipping", "gpu"), ("specs", "all")])
        self.assertEqual(code, 0)
        self.assertEqual(data["listings"][0]["total"], 105)

    def test_recovery_is_bounded_when_source_remains_blocked(self):
        code, events, data = self.run_pipeline(stubborn=True)
        self.assertEqual(events.count(("recover", "cpu")), 1)
        self.assertFalse(data["sources"]["skroutz"]["ok"])
        self.assertEqual(code, 0)  # the GPU category succeeded

    def test_unselected_skroutz_is_not_retried(self):
        _, events, _ = self.run_pipeline(only="bestprice")
        self.assertFalse(any(event[0] == "recover" for event in events))

    def test_late_success_restores_exit_status_when_initial_pass_all_failed(self):
        code, events, _ = self.run_pipeline(all_failed=True)
        self.assertEqual(code, 0)
        self.assertEqual(sum(event[0] == "recover" for event in events), 2)

    def test_persistent_total_failure_stays_failed(self):
        code, events, _ = self.run_pipeline(all_failed=True, stubborn=True)
        self.assertEqual(code, 1)
        self.assertEqual(sum(event[0] == "recover" for event in events), 2)


if __name__ == "__main__":
    unittest.main()
