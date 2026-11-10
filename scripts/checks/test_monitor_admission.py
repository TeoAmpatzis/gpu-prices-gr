"""Read-only snapshot admission checks. Run from the repository root."""
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import monitor_admission as admission

ROOT = Path(__file__).resolve().parents[2]


def row(**changes):
    return {"id": "test:1", "title": 'Dell P2425 IPS Monitor 24" 1920x1200',
            "brand": "Dell", "code": "P2425", "chip": "Dell P2425", "size": 24,
            "reject": None, **changes}


class AdmissionTests(unittest.TestCase):
    def test_clean_snapshot_and_no_mutation(self):
        rows = [row()]
        before = copy.deepcopy(rows)
        self.assertEqual(admission.check_rows(rows), [])
        self.assertEqual(rows, before)

    def test_retained_unwanted_without_reject(self):
        self.assertEqual(admission.check_rows([row(title='Elo 2495L 23.8IN FHD 600NIT')]),
                         [("test:1", "not-monitor")])

    def test_stored_rejection_cannot_be_published(self):
        self.assertEqual(admission.check_rows([row(reject="ambiguous")]), [("test:1", "ambiguous")])

    def test_missing_and_empty_model_key(self):
        for value in (None, "", "  "):
            with self.subTest(value=value):
                self.assertEqual(admission.check_rows([row(chip=value)]), [("test:1", "no-model-key")])
        missing = row()
        del missing["chip"]
        self.assertEqual(admission.check_rows([missing]), [("test:1", "no-model-key")])

    def test_missing_identity(self):
        for field in ("brand", "code"):
            item = row()
            del item[field]
            self.assertEqual(admission.check_rows([item]), [("test:1", "no-identity")])

    def test_missing_required_title_and_id(self):
        for field in ("title", "id"):
            item = row()
            del item[field]
            with self.assertRaises(ValueError):
                admission.check_rows([item])

    def test_cli_status_and_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "latest.json"
            for data, code in (({"listings": [row()]}, 0),
                               ({"listings": [row(title="Dell monitor arm")]}, 1),
                               ({"listings": [row(reject="used")]}, 1),
                               ({"listings": []}, 2), ({}, 2),
                               ({"listings": [42]}, 2), ({"listings": [row(title=None)]}, 2),
                               ({"listings": [row(size="large")]}, 2)):
                path.write_text(json.dumps(data), encoding="utf-8")
                before = path.read_bytes()
                proc = subprocess.run([sys.executable, str(ROOT / "scripts/checks/monitor_admission.py"), str(path)],
                                      capture_output=True, text=True)
                with self.subTest(data=data):
                    self.assertEqual(proc.returncode, code, proc.stdout + proc.stderr)
                    self.assertEqual(path.read_bytes(), before)
                    if code == 1:
                        self.assertIn("test:1", proc.stdout)
            path.write_bytes(b"{malformed")
            before = path.read_bytes()
            proc = subprocess.run([sys.executable, str(ROOT / "scripts/checks/monitor_admission.py"), str(path)],
                                  capture_output=True, text=True)
            self.assertEqual(proc.returncode, 2)
            self.assertEqual(path.read_bytes(), before)
            path.unlink()
            proc = subprocess.run([sys.executable, str(ROOT / "scripts/checks/monitor_admission.py"), str(path)],
                                  capture_output=True, text=True)
            self.assertEqual(proc.returncode, 2)


if __name__ == "__main__":
    unittest.main()
