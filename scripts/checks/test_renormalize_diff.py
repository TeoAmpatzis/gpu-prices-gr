"""Offline monitor replay must retain evidence and compare settled rows by source ID."""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scraper"))
import normalize_monitor as nm
import renormalize_diff as replay


def row(lid, title):
    out = nm.make_listing(source="test", native_id=lid, title=title, url="https://example.com/" + lid,
                          price=100, shop_count=1, scraped_at="2026-11-10").to_dict()
    nm.settle([out])
    return out


class MonitorReplayTests(unittest.TestCase):
    def test_replay_evidence_rejects_and_no_mutation(self):
        accepted = row("2", "Dell P2425")
        accepted["height"] = 1200  # A prior list-card observation, absent from the stored title.
        rejected = row("1", 'Elo 2495L 23.8IN FHD')
        before = copy.deepcopy([accepted, rejected])
        with tempfile.TemporaryDirectory() as temp:
            evidence = Path(temp)
            (evidence / "specs.json").write_text(json.dumps({"test:2": {"pgSize": 24, "pgWidth": 1920,
                "pgHeight": 1200, "pgHz": 100, "checked": "y", "v": 2}}), encoding="utf-8")
            rows = replay.replay_monitor(nm, before, evidence, baseline=nm)
        self.assertEqual(before, [accepted, rejected])
        by_id = {r["id"]: r for r in rows}
        self.assertEqual(by_id["test:1"]["reject"], "not-monitor")
        self.assertEqual(by_id["test:1"]["chip"], "")
        self.assertEqual(by_id["test:2"]["height"], 1200)
        self.assertEqual(by_id["test:2"]["pgHz"], 100)
        self.assertEqual(by_id["test:2"]["chip"], "Dell P2425")
        changes = replay.monitor_changes([accepted, rejected], list(reversed(rows)))
        self.assertEqual([r["id"] for r in changes], ["test:2"])
        report = replay.monitor_report(before, before, rows, {})
        self.assertEqual(report["acceptedKeyChanges"], [])
        self.assertEqual(report["newAcceptedSources"], {"test": 1})
        self.assertEqual(report["newRejectReasons"], {"not-monitor": 1})

    def test_explicit_list_specs_win_and_bad_title_observation_is_not_retained(self):
        item = row("1", 'Dell P2425 IPS Monitor 24" 1920x1200')
        with tempfile.TemporaryDirectory() as temp:
            rows = replay.replay_monitor(nm, [item], Path(temp), baseline=nm,
                                         list_specs={"test:1": "100Hz"})
        self.assertEqual(rows[0]["hz"], 100)
        # Simulate an older title parser's false positive. New None must not inherit that false size.
        from types import SimpleNamespace
        title = row("3", "Anmite AW03 IPS FHD 1920x1080")
        title["size"] = 3
        old = SimpleNamespace(parse=lambda t: SimpleNamespace(size=3, height=1080, width=1920, hz=None, panel="IPS"))
        with tempfile.TemporaryDirectory() as temp:
            rows = replay.replay_monitor(nm, [title], Path(temp), baseline=old)
        self.assertIsNone(rows[0]["size"])

    def test_loader_registers_dataclass_module(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "example.py"
            path.write_text('from __future__ import annotations\nfrom dataclasses import dataclass\n'
                            '@dataclass\nclass Example:\n    value: str\n', encoding="utf-8")
            loaded = replay.load("replay_dataclass_test", path)
        self.assertIs(sys.modules["replay_dataclass_test"], loaded)
        self.assertEqual(loaded.Example("ok").value, "ok")


if __name__ == "__main__":
    unittest.main()
