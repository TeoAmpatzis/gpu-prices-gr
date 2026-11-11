"""Mouse source sharing and pipeline integration; no network or production data writes."""
import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scraper'))
import main as mn
from categories import CATEGORIES


class MouseSharingTests(unittest.TestCase):
    def test_gaming_evidence_priority_is_order_independent_and_preserves_unknown(self):
        for observations, expected in (([True, False, None], True), ([False, None], False), ([None, None], None)):
            for reverse in (False, True):
                values = observations[::-1] if reverse else observations
                data = [{'chip': 'Logitech Example', 'gaming': v} for v in values]
                with self.subTest(observations=observations, reverse=reverse):
                    mn.share_fields(data, ('gaming',), CATEGORIES['mouse'].model_key)
                    self.assertEqual([r['gaming'] for r in data], [expected] * len(data))
                    before = copy.deepcopy(data)
                    mn.share_fields(data, ('gaming',), CATEGORIES['mouse'].model_key)
                    self.assertEqual(data, before)


if __name__ == '__main__':
    unittest.main()
