"""Mouse source sharing and pipeline integration; no network or production data writes."""
import copy
import contextlib
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scraper'))
import main as mn
import images
from categories import CATEGORIES

AT = '2026-11-11T12:00:00Z'
OLD = '2026-11-10T12:00:00Z'
CAT = CATEGORIES['mouse']


def listing(source, native_id, title='Logitech M171 Wireless Black 910-004424', price=25, image=None):
    result = CAT.make_listing(source=source, native_id=native_id, title=title, price=price,
                              url='https://example.com/' + native_id, shop_count=1, scraped_at=AT)
    if image:
        result.image = image
    return result


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


class MousePipelineTests(unittest.TestCase):
    def setUp(self):
        scratch = ROOT / 'local' / 'mouse' / 'tmp'
        scratch.mkdir(parents=True, exist_ok=True)
        temp = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.out = self.root / 'mouse'
        self.out.mkdir()
        self.sources = {source: Mock(return_value=[]) for source in mn.SOURCES}
        self.stack = contextlib.ExitStack()
        self.addCleanup(self.stack.close)
        for p in (patch.object(mn, 'DATA_DIR', self.root), patch.object(mn, 'SOURCES', self.sources),
                  patch.object(mn, 'now_iso', return_value=AT), contextlib.redirect_stdout(io.StringIO()),
                  patch.object(mn.traceback, 'print_exc')):
            self.stack.enter_context(p)
        self.stack.enter_context(patch.object(sys.stdout, 'reconfigure', create=True))
        self.stack.enter_context(patch.object(mn.http_client, 'session', side_effect=AssertionError('unexpected network session')))
        self.stack.enter_context(patch.object(mn.http_client, 'get', side_effect=AssertionError('unexpected network request')))

    def read(self, name):
        return json.loads((self.out / name).read_text(encoding='utf-8'))

    def write(self, name, data):
        (self.out / name).write_text(json.dumps(data), encoding='utf-8')

    def scrape(self, only=None):
        return mn.scrape_category(CAT, only, with_shipping=False)

    def test_admission_keys_counts_colours_history_and_image_candidates_agree(self):
        accepted = [listing('bestprice', 'black', image='https://example.com/black.jpg'),
                    listing('bestprice', 'white', 'Logitech M171 Wireless White 910-004425', price=30),
                    listing('bestprice', 'wired', 'Logitech M171 Wired Black', price=20)]
        rejected = [listing('bestprice', 'pad', 'Logitech Mousepad', image='https://example.com/pad.jpg'),
                    listing('bestprice', 'set', 'Logitech M171 Mouse + K120 Keyboard')]
        self.sources['bestprice'].return_value = accepted + rejected
        self.assertTrue(self.scrape(['bestprice']))
        snapshot = self.read('latest.json')
        rows = snapshot['listings']
        self.assertEqual({r['id'] for r in rows}, {r.id for r in accepted})
        self.assertEqual(snapshot['sources']['bestprice'], {'count': 3, 'ok': True, 'updatedAt': AT})
        keys = {CAT.model_key(r) for r in rows}
        self.assertEqual(len(keys), 2)
        self.assertEqual({r['colour'] for r in rows if r['connection'] == 'wireless'}, {'black', 'white'})
        history = self.read('history.json')
        self.assertEqual(set(history), keys)
        self.assertEqual({k: v[0]['min'] for k, v in history.items()},
                         {CAT.model_key(r): r['price'] for r in sorted(rows, key=lambda r: -r['price'])})
        candidates = self.read('image_urls.json')
        self.assertEqual(list(candidates.values()), [['https://example.com/black.jpg']])
        self.assertLessEqual(set(candidates), keys)
        self.assertTrue(all('image' not in r for r in rows))
        report = self.read('rejected.json')
        self.assertEqual(report['counts'], {'bundle': 1, 'not-mouse': 1})
        self.assertEqual({r['title'] for r in report['listings']}, {r.title for r in rejected})
        again = copy.deepcopy(rows)
        CAT.settle(again)
        self.assertEqual(again, rows)

    def seed_previous_source(self, source='skroutz'):
        rows = [listing(source, '10').to_dict()]
        CAT.settle(rows)
        rows[0]['scrapedAt'] = OLD
        self.write('latest.json', {'updatedAt': OLD, 'sources': {source: {'count': 1, 'ok': True, 'updatedAt': OLD}},
                                   'listings': rows})
        bad = listing(source, '11', 'Logitech Mousepad').to_dict()
        self.write('rejected.json', {'updatedAt': OLD, 'counts': {'not-mouse': 1}, 'listings': [bad]})
        key = CAT.model_key(rows[0])
        self.write('image_urls.json', {key: ['https://example.com/old.jpg']})
        self.write('history.json', {key: [{'d': OLD[:10], 'min': 25, 'source': source}]})
        return rows[0], key

    def test_failed_or_unselected_source_retains_rows_rejects_photos_and_freshness(self):
        for selected in (False, True):
            with self.subTest(selected=selected):
                old, key = self.seed_previous_source()
                self.sources['bestprice'].return_value = [listing('bestprice', 'new', 'Logitech Other Mouse', price=40)]
                self.sources['skroutz'].side_effect = RuntimeError('partial list traversal')
                only = ['bestprice', 'skroutz'] if selected else ['bestprice']
                self.assertTrue(self.scrape(only))
                snapshot = self.read('latest.json')
                self.assertEqual(next(r for r in snapshot['listings'] if r['source'] == 'skroutz'), old)
                self.assertEqual(snapshot['sources']['skroutz'], {'count': 1, 'ok': not selected, 'updatedAt': OLD})
                self.assertEqual(self.read('rejected.json')['listings'][0]['id'], 'skroutz:11')
                self.assertEqual(self.read('image_urls.json')[key], ['https://example.com/old.jpg'])
                self.assertEqual(self.read('history.json')[key], [{'d': OLD[:10], 'min': 25, 'source': 'skroutz'}])

    def test_all_source_failure_reports_failure_and_keeps_existing_observations(self):
        old, key = self.seed_previous_source()
        self.assertFalse(self.scrape())
        self.assertEqual(self.read('latest.json')['listings'], [old])
        self.assertEqual(self.read('history.json')[key][0]['d'], OLD[:10])
        self.sources['eshop'].assert_not_called()
        self.sources['shopflix'].assert_not_called()

    def test_corrupt_prior_json_aborts_before_sources_and_preserves_bytes(self):
        path = self.out / 'latest.json'
        path.write_text('{broken', encoding='utf-8')
        with self.assertRaises(json.JSONDecodeError):
            self.scrape()
        self.assertEqual(path.read_bytes(), b'{broken')
        for source in self.sources.values():
            source.assert_not_called()

    def test_malformed_source_identity_cannot_replace_previous_skroutz_snapshot(self):
        old, _ = self.seed_previous_source()
        self.sources['skroutz'].return_value = [listing('snif', '20')]
        self.sources['bestprice'].return_value = [listing('bestprice', '30', 'Logitech Other Mouse')]
        self.assertTrue(self.scrape(['skroutz', 'bestprice']))
        snapshot = self.read('latest.json')
        self.assertIn(old, snapshot['listings'])
        self.assertFalse(any(r['source'] == 'snif' for r in snapshot['listings']))
        self.assertEqual(snapshot['sources']['skroutz']['updatedAt'], OLD)
        self.assertIs(snapshot['sources']['skroutz']['ok'], False)

    def test_malformed_shop_source_or_id_retains_previous_snapshot(self):
        for source in ('bestprice', 'snif'):
            for field, value in (('source', 'unknown'), ('source', 'skroutz'), ('id', ''),
                                 ('id', 'wrong:20'), ('id', None), ('id', source + ': ')):
                with self.subTest(source=source, field=field, value=value):
                    old, key = self.seed_previous_source(source)
                    incoming = listing(source, '20')
                    setattr(incoming, field, value)
                    self.sources[source].return_value = [incoming]
                    self.assertFalse(self.scrape([source]))
                    snapshot = self.read('latest.json')
                    self.assertEqual(snapshot['listings'], [old])
                    self.assertEqual(snapshot['sources'][source], {'count': 1, 'ok': False, 'updatedAt': OLD})
                    self.assertEqual(self.read('history.json')[key][0]['d'], OLD[:10])

    def test_specs_only_changes_no_mouse_snapshot_or_history_and_fetches_no_pages(self):
        self.seed_previous_source()
        before = {p.name: p.read_bytes() for p in self.out.iterdir()}
        with patch.object(mn.specs, 'collect') as specs, patch.object(mn.makers, 'collect') as makers:
            mn.collect_specs([CAT], {'bestprice': 0, 'skroutz': 0}, 0)
        self.assertEqual({p.name: p.read_bytes() for p in self.out.iterdir()}, before)
        self.assertEqual(specs.call_args.args[0], [])
        self.assertEqual(makers.call_args.args[0], {})

    def test_unsupported_sources_shipping_and_history_never_reach_network_collectors(self):
        rows = [listing(source, source).to_dict() for source in self.sources]
        with patch.object(mn.shipping, 'enrich') as shipping:
            mn.enrich_shipping(CAT, rows)
        self.assertEqual({r['source'] for r in shipping.call_args.args[1]}, {'bestprice', 'snif'})
        self.seed_previous_source()
        with patch.object(sys, 'argv', ['main.py', '--category', 'mouse', '--history-only']), \
                patch.object(mn.site_history, 'enrich') as history:
            self.assertEqual(mn.main(), 0)
        history.assert_not_called()
        self.sources['bestprice'].return_value = [listing('bestprice', 'one')]
        self.assertTrue(self.scrape())
        self.sources['eshop'].assert_not_called()
        self.sources['shopflix'].assert_not_called()

    def test_image_job_discovers_mouse_and_writes_existing_sizes_for_accepted_models_only(self):
        self.sources['bestprice'].return_value = [listing('bestprice', 'good', image='https://example.com/good.jpg'),
                                                 listing('bestprice', 'bad', 'Logitech Mousepad', image='https://example.com/bad.jpg')]
        self.assertTrue(self.scrape(['bestprice']))
        key = CAT.model_key(self.read('latest.json')['listings'][0])
        raw = io.BytesIO()
        Image.new('RGB', (12, 8), 'red').save(raw, 'PNG')
        photos = self.root / 'photos'
        photos.mkdir()
        with patch.object(images.http, 'session', return_value=Mock()), \
                patch.object(images.http, 'get', return_value=SimpleNamespace(content=raw.getvalue())) as get, \
                patch.object(images.time, 'sleep'), \
                patch.object(sys, 'argv', ['images.py', '--data', str(self.root), '--out', str(photos), '--budget', '1']):
            self.assertEqual(images.main(), 0)
        mid = hashlib.sha1(('mouse\0' + key).encode()).hexdigest()[:12]
        self.assertEqual((key, mid), ('logitechm171wireless', '9656df6b22f8'))
        self.assertEqual(images.model_id('mouse', key), mid)
        index = json.loads((photos / 'index.json').read_text(encoding='utf-8'))
        self.assertEqual(set(index), {mid})
        for size in (96, 320):
            with Image.open(photos / 'img' / 'mouse' / f'{mid}-{size}.webp') as photo:
                self.assertEqual((photo.format, photo.size), ('WEBP', (size, size)))
        self.assertEqual([call.args[1] for call in get.call_args_list], ['https://example.com/good.jpg'])


if __name__ == '__main__':
    unittest.main()
