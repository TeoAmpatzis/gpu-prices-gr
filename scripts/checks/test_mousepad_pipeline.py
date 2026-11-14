"""Mousepads through the real pipeline (main.scrape_category) with every source stubbed; no network, no production data.

Real titles from the 2026-11-14 trial (fixtures/mousepad-titles.json): the same pad listed by several sources must settle
to one model, size variants must stay separate, rejects must carry their reason, and a second settle must change nothing.
"""
import contextlib
import copy
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scraper'))
import main as mn
from categories import CATEGORIES

AT = '2026-11-14T12:00:00Z'
CAT = CATEGORIES['mousepad']
FIXTURE = json.loads((Path(__file__).parent / 'fixtures' / 'mousepad-titles.json').read_text(encoding='utf-8'))


def listing(source, native_id, title, price):
    return CAT.make_listing(source=source, native_id=native_id, title=title, price=price,
                            url='https://example.com/' + native_id, shop_count=1, scraped_at=AT)


class MousepadPipelineTests(unittest.TestCase):
    def setUp(self):
        scratch = ROOT / 'local' / 'mousepad' / 'tmp'
        scratch.mkdir(parents=True, exist_ok=True)
        temp = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.out = self.root / 'mousepad'
        self.out.mkdir()
        self.sources = {source: Mock(return_value=[]) for source in mn.SOURCES}
        stack = contextlib.ExitStack()
        self.addCleanup(stack.close)
        for p in (patch.object(mn, 'DATA_DIR', self.root), patch.object(mn, 'SOURCES', self.sources),
                  patch.object(mn, 'now_iso', return_value=AT), contextlib.redirect_stdout(io.StringIO()),
                  patch.object(mn.traceback, 'print_exc'), patch.object(sys.stdout, 'reconfigure', create=True),
                  patch.object(mn.http_client, 'session', side_effect=AssertionError('unexpected network session')),
                  patch.object(mn.http_client, 'get', side_effect=AssertionError('unexpected network request'))):
            stack.enter_context(p)

    def read(self, name):
        return json.loads((self.out / name).read_text(encoding='utf-8'))

    def run_fixture(self):
        by_source = {}
        n = 0
        for group in FIXTURE['groups']:
            for source, price, title in group['listings']:
                n += 1
                by_source.setdefault(source, []).append(listing(source, f'{9000 + n}', title, price))
        for source, price, title, _ in FIXTURE['rejects']:
            n += 1
            by_source.setdefault(source, []).append(listing(source, f'{9000 + n}', title, price))
        for source, rows in by_source.items():
            self.sources[source].return_value = rows
        self.assertTrue(mn.scrape_category(CAT, list(by_source), with_shipping=False))
        return n

    def test_one_pad_across_sources_is_one_model_and_rejects_carry_their_reason(self):
        self.run_fixture()
        rows = self.read('latest.json')['listings']
        expected = {g['chip']: len(g['listings']) for g in FIXTURE['groups']}
        found = {}
        for row in rows:
            found[row['chip']] = found.get(row['chip'], 0) + 1
        self.assertEqual(found, expected)
        # Gigantus V2 Medium and XXL are two models: two history keys, never merged by the shop's wording.
        self.assertEqual(len(self.read('history.json')), len(expected))
        report = self.read('rejected.json')
        self.assertEqual({r['title']: r['reject'] for r in report['listings']}, {title: why for _, _, title, why in FIXTURE['rejects']})
        again = copy.deepcopy(rows)
        CAT.settle(again)
        self.assertEqual(again, rows)

    def test_unknown_specs_stay_unknown(self):
        self.run_fixture()
        rows = {r['title']: r for r in self.read('latest.json')['listings']}
        plain = rows['Natec Time Zone XXL 800mm']
        self.assertTrue(all(plain[f] is None for f in ('rgb', 'wristRest', 'usbPort', 'wirelessCharging', 'antiSlip', 'surface')))
        self.assertEqual((plain['size'], plain['widthMm'], plain['heightMm']), ('XXL', 800, None))

    def test_mousepad_is_registered_apart_from_the_mouse_category(self):
        from category_ids import CATEGORY_IDS
        self.assertEqual(CATEGORY_IDS[-3:], ('mouse', 'headphones', 'mousepad'))
        mouse = CATEGORIES['mouse']
        pad = 'Razer Gigantus V2 Gaming Mouse Pad Medium 360mm'
        self.assertEqual(mouse.make_listing(source='skroutz', native_id='1', title=pad, price=10.0, url='https://example.com/1',
                                            shop_count=1, scraped_at=AT).reject, 'not-mouse')
        self.assertIsNone(listing('skroutz', '1', pad, 10.0).reject)


if __name__ == '__main__':
    unittest.main()
