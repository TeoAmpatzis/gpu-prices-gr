"""Offline tests of the Skroutz scrape gate (scripts/checks/skroutz_gate.py). Run: venv/Scripts/python scripts/checks/test_skroutz_gate.py"""
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from skroutz_gate import decide  # noqa: E402

NOW = datetime(2026, 11, 10, 12, 0, tzinfo=timezone.utc)
ago = lambda h: (NOW - timedelta(hours=h)).isoformat()  # noqa: E731


class Gate(unittest.TestCase):
    def test_manual_run_always_goes(self):
        self.assertTrue(decide("workflow_dispatch", ago(1), "failure", ago(0.1), NOW)[0])

    def test_fresh_data_skips_a_scheduled_run(self):
        self.assertFalse(decide("schedule", ago(4), "success", ago(4), NOW)[0])
        self.assertFalse(decide("schedule", ago(10.9), "success", ago(11), NOW)[0])

    def test_old_data_runs(self):
        self.assertTrue(decide("schedule", ago(11.1), "success", ago(11), NOW)[0])
        self.assertTrue(decide("schedule", ago(26), "failure", ago(14), NOW)[0])

    def test_recent_failure_waits_then_retries_within_hours(self):
        self.assertFalse(decide("schedule", ago(13), "failure", ago(1), NOW)[0])
        self.assertTrue(decide("schedule", ago(13), "failure", ago(3.1), NOW)[0])

    def test_unknown_age_or_no_history_runs(self):
        self.assertTrue(decide("schedule", None, None, None, NOW)[0])
        self.assertTrue(decide("schedule", "garbage", "success", "garbage", NOW)[0])

    def test_failure_cooldown_beats_old_data_but_not_a_manual_run(self):
        self.assertFalse(decide("schedule", ago(30), "failure", ago(0.5), NOW)[0])
        self.assertTrue(decide("workflow_dispatch", ago(30), "failure", ago(0.5), NOW)[0])


if __name__ == "__main__":
    unittest.main()
