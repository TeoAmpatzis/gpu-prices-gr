"""Complete-or-fail Skroutz page extraction and traversal; no network requests."""
import json
import sys
import unittest
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from categories import CATEGORIES
from sources import skroutz

AT = "2026-11-04T19:00:00Z"
URL = skroutz.BASE + CATEGORIES["cpu"].skroutz_paths[0]


def card(native_id="123", title="AMD Ryzen 5 7600 Box", price="180,00", href=None):
    href = href or f"/s/{native_id}/product.html"
    return (f'<li class="card" data-skuid="{native_id}"><a class="sku-card-title-link" '
            f'href="{href}">{title}</a><a class="sku-link">{price}</a></li>')


def page(native_id="123", next_href=None, **kwargs):
    return card(native_id, **kwargs) + (f'<link href="{next_href}" rel="next">' if next_href else "")


class CollectorTests(unittest.TestCase):
    def test_mouse_path_tags_keep_cheapest_price_and_gaming_priority_in_either_order(self):
        cat = replace(CATEGORIES['mouse'], skroutz_paths=('/gaming', '/office'),
                      skroutz_tags=({'gaming': True}, {'gaming': False}))
        for reverse in (False, True):
            current = replace(cat, skroutz_paths=cat.skroutz_paths[::-1], skroutz_tags=cat.skroutz_tags[::-1]) if reverse else cat

            def fill(session, url, label, category, at, seen):
                gaming = url.endswith('/gaming')
                listing = cat.make_listing(source='skroutz', native_id='same', title='Logitech M171 Wireless Mouse',
                                           url='https://www.skroutz.gr/s/123/mouse.html',
                                           price=20 if gaming else 18, shop_count=1, scraped_at=AT)
                seen[listing.id] = listing

            with self.subTest(reverse=reverse), patch.object(skroutz.http, 'session', return_value=Mock()), \
                    patch.object(skroutz.http, 'polite_sleep'), patch.object(skroutz, 'fetch_category', side_effect=fill):
                result = skroutz.fetch(current)
                self.assertEqual(len(result), 1)
                self.assertEqual(result[0].price, 18)
                self.assertIs(result[0].gaming, True)

    def test_office_only_mouse_tag_is_explicit_false(self):
        cat = replace(CATEGORIES['mouse'], skroutz_paths=('/office',), skroutz_tags=({'gaming': False},))
        listing = cat.make_listing(source='skroutz', native_id='1', title='Logitech M171 Wireless Mouse',
                                   url='https://www.skroutz.gr/s/1/mouse.html', price=18, shop_count=1, scraped_at=AT)
        with patch.object(skroutz.http, 'session', return_value=Mock()), \
                patch.object(skroutz, 'fetch_category', side_effect=lambda *args: args[-1].update({listing.id: listing})):
            self.assertIs(skroutz.fetch(cat)[0].gaming, False)

    def test_mismatched_path_tags_fail_before_any_request(self):
        cat = replace(CATEGORIES['mouse'], skroutz_paths=('/gaming', '/office'), skroutz_tags=({'gaming': True},))
        with patch.object(skroutz.http, 'session') as session, self.assertRaisesRegex(ValueError, 'tags'):
            skroutz.fetch(cat)
        session.assert_not_called()

    def fetch(self, bodies, *, cat=None, max_pages=80):
        session = Mock()
        responses = [SimpleNamespace(text=body) if isinstance(body, str) else body for body in bodies]
        with patch.object(skroutz.http, "session", return_value=session), \
                patch.object(skroutz.http, "get", side_effect=responses) as get, \
                patch.object(skroutz.http, "polite_sleep"), patch.object(skroutz.http, "dump"), \
                patch.object(skroutz, "MAX_PAGES", max_pages):
            try:
                result = skroutz.fetch(cat or CATEGORIES["cpu"])
                return result, get
            finally:
                session.close.assert_called_once()

    def test_next_link_attribute_order_is_irrelevant(self):
        self.assertTrue(skroutz.parse(page(next_href="?page=2"), AT, CATEGORIES["cpu"])[1])

    def test_lazy_monitor_card_uses_exact_product_jsonld_photo(self):
        photo = "https://b.scdn.gr/images/sku_main_images/055390/55390540/xlarge_20240809095956_aoc_c27g4zxe.jpeg"
        product = {"@type": "Product", "url": "https://www.skroutz.gr/s/55390540/aoc.html",
                   "image": [photo], "offers": {"price": "180.25", "priceCurrency": "EUR"}}
        for img in ("", '<img src="">', '<img data-src="ignored">'):
            with self.subTest(img=img):
                html = card("55390540", 'AOC C27G4ZXE VA Monitor 27" FHD 1920x1080 280Hz', "100,00 - 300,00")
                html = html.replace("</li>", img + "</li>") + '<link rel="next" href="?page=2">'
                data = [{"@graph": [{"itemListElement": [{"item": product}]}]}]
                html += f'<script type="application/ld+json">{json.dumps(data)}</script>'
                rows, has_next = skroutz.parse(html, AT, CATEGORIES["monitor"])
                self.assertEqual(len(rows), 1)
                self.assertEqual((rows[0].id, rows[0].price, getattr(rows[0], "image", None), has_next),
                                 ("skroutz:55390540", 180.25, photo, True))
                self.assertEqual(skroutz.jsonld_prices(skroutz.HTMLParser(html)), {"55390540": 180.25})

    def test_card_photo_has_priority_over_jsonld_for_existing_categories(self):
        photo = "https://a.scdn.gr/images/sku_main_images/123/card.jpg"
        data = {"itemListElement": [{"item": {"@type": "Product", "url": "/s/123/product.html",
                 "image": "https://b.scdn.gr/images/sku_main_images/123/jsonld.jpg"}}]}
        html = card().replace("</li>", f'<img src="{photo}"></li>')
        rows, _ = skroutz.parse(html + f'<script type="application/ld+json">{json.dumps(data)}</script>', AT, CATEGORIES["cpu"])
        self.assertEqual((len(rows), getattr(rows[0], "image", None), rows[0].price), (1, photo, 180))

    def test_unrelated_or_unsafe_jsonld_photo_is_ignored_without_changing_listing(self):
        safe = "https://b.scdn.gr/images/sku_main_images/123/photo.jpg"
        bad_products = [{"@type": "Product", "url": url, "image": safe} for url in (
            "/s/456/product.html", "https://foreign.example/s/123/product.html", "javascript:/s/123/product.html")]
        bad_products += [{"@type": "Product", "url": "/s/123/product.html", "image": image} for image in (
            "data:image/png;base64,abc", "javascript:alert(1)", "file:///photo.jpg",
            "https://127.0.0.1/images/sku_main_images/photo.jpg", "http://b.scdn.gr/images/sku_main_images/photo.jpg",
            "https://b.scdn.gr.evil.example/images/sku_main_images/photo.jpg", "//b.scdn.gr/images/sku_main_images/photo.jpg",
            "https://user@b.scdn.gr/images/sku_main_images/photo.jpg", "https://b.scdn.gr:8443/images/sku_main_images/photo.jpg",
            "https://b.scdn.gr/unrelated.jpg", None, {}, [])]
        for product in bad_products:
            with self.subTest(product=product):
                data = {"itemListElement": [{"item": product}]}
                html = card() + f'<script type="application/ld+json">{json.dumps(data)}</script>'
                rows, has_next = skroutz.parse(html, AT, CATEGORIES["cpu"])
                self.assertEqual(len(rows), 1)
                self.assertEqual((rows[0].id, rows[0].price, getattr(rows[0], "image", None), has_next), ("skroutz:123", 180, None, False))

    def test_malformed_jsonld_has_no_photo_and_no_extra_request(self):
        with patch.object(skroutz.http, "get", side_effect=AssertionError("unexpected request")):
            rows, _ = skroutz.parse(card() + '<script type="application/ld+json">{oops</script>', AT, CATEGORIES["cpu"])
        self.assertEqual((len(rows), rows[0].price, getattr(rows[0], "image", None)), (1, 180, None))

    def test_rel_tokens_and_single_quotes_are_supported(self):
        html = card() + "<link href='?page=2' rel='alternate next'>"
        self.assertTrue(skroutz.parse(html, AT, CATEGORIES["cpu"])[1])

    def test_exact_linked_variant_price_beats_family_range(self):
        data = {"itemListElement": [{"item": {"url": "/s/123/product.html", "offers": {"price": 180.25}}}]}
        html = card(price="100,00 - 300,00") + f'<script type="application/ld+json">{json.dumps(data)}</script>'
        rows, _ = skroutz.parse(html, AT, CATEGORIES["cpu"])
        self.assertEqual(rows[0].price, 180.25)

    def test_graph_array_and_decimal_string_offer(self):
        data = [{"@graph": [{"itemListElement": [{"item": {"url": "/s/123/product.html", "offers": [{"price": "180.25", "priceCurrency": "EUR"}]}}]}]}]
        html = card(price="100,00 - 300,00") + f'<script type="application/ld+json">{json.dumps(data)}</script>'
        rows, _ = skroutz.parse(html, AT, CATEGORIES["cpu"])
        self.assertEqual(rows[0].price, 180.25)

    def test_malformed_jsonld_can_use_unambiguous_card_price(self):
        rows, _ = skroutz.parse(card() + '<script type="application/ld+json">{oops</script>', AT, CATEGORIES["cpu"])
        self.assertEqual(rows[0].price, 180)

    def test_unresolved_family_range_is_not_invented_price(self):
        rows, _ = skroutz.parse(card(price="100,00 - 300,00"), AT, CATEGORIES["cpu"])
        self.assertEqual(rows, [])

    def test_absolute_product_url_and_id_are_preserved(self):
        rows, _ = skroutz.parse(card(href="https://www.skroutz.gr/s/123/product.html?from=category"), AT, CATEGORIES["cpu"])
        self.assertEqual(rows[0].id, "skroutz:123")
        self.assertEqual(rows[0].url, "https://www.skroutz.gr/s/123/product.html")

    def test_foreign_or_mismatched_product_url_is_not_published(self):
        for href in ("https://example.com/s/123/product.html", "/s/456/product.html", "javascript:alert(1)"):
            with self.subTest(href=href):
                self.assertEqual(skroutz.parse(card(href=href), AT, CATEGORIES["cpu"])[0], [])

    def test_existing_normalizers_work_for_every_category(self):
        titles = {"gpu": "Sparkle Arc A310 4GB Omni View", "cpu": "AMD Athlon 200GE 3.2GHz Tray",
                  "mobo": "ASRock A520M Phantom Gaming 4", "ram": "Kingston Fury Beast 32GB DDR5 6000MHz (2x16GB)",
                  "psu": "Chieftec VEGA M 1000W Full Wired", "case": "1stCOOL COMPACT 1 Micro Tower",
                  "fan": "Arctic P12 120mm Case Fan", "cooler": "1STPLAYER CC360",
                  "storage": "Adata XPG GAMMIX S60 1TB M.2 AGAMMIXS60-1T-CS"}
        for name, title in titles.items():
            with self.subTest(category=name):
                rows, _ = skroutz.parse(card(title=title), AT, CATEGORIES[name])
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0].id, "skroutz:123")
                self.assertEqual(rows[0].source, "skroutz")

    def test_complete_relative_and_absolute_pagination(self):
        rows, get = self.fetch([page("1", "?page=2"), page("2", URL + "?page=3"), page("3")])
        self.assertEqual([row.id for row in rows], ["skroutz:1", "skroutz:2", "skroutz:3"])
        self.assertEqual([call.args[1] for call in get.call_args_list], [URL, URL + "?page=2", URL + "?page=3"])

    def test_sponsored_duplicates_keep_lowest_price(self):
        rows, _ = self.fetch([page("1", "?page=2", price="200,00"), card("1", price="150,00") + card("2")])
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0].price, 150)

    def test_later_http_failure_rejects_whole_category(self):
        with self.assertRaisesRegex(RuntimeError, "blocked"):
            self.fetch([page("1", "?page=2"), RuntimeError("blocked")])

    def test_empty_or_challenge_page_cannot_end_partial_collection(self):
        for body in ("<html>No products</html>", "<title>Just a moment...</title>"):
            with self.subTest(body=body), self.assertRaisesRegex(RuntimeError, "cards|challenge"):
                self.fetch([page("1", "?page=2"), body])

    def test_filtered_product_page_continues_to_next_page(self):
        # Accessory cards are intentionally excluded by the GPU normalizer.
        rows, get = self.fetch([page("1", "?page=2", title="GPU riser cable"),
                                page("2", title="Sparkle Arc A310 4GB Omni View")], cat=CATEGORIES["gpu"])
        self.assertEqual([row.id for row in rows], ["skroutz:2"])
        self.assertEqual(get.call_count, 2)

    def test_duplicate_only_page_with_next_is_not_completion(self):
        with self.assertRaisesRegex(RuntimeError, "repeat|progress"):
            self.fetch([page("1", "?page=2"), page("1", "?page=3")])

    def test_page_limit_with_next_is_not_completion(self):
        with self.assertRaisesRegex(RuntimeError, "limit"):
            self.fetch([page("1", "?page=2")], max_pages=1)

    def test_invalid_next_destination_or_sequence_is_rejected_before_request(self):
        for href in ("https://example.com/c/32/cpu-epeksergastes.html?page=2",
                     "https://www.skroutz.gr/c/55/kartes-grafikwn.html?page=2", "?page=1", "?page=3",
                     "?page=2&page=3", "?page=2&order_by=price", "https://user@www.skroutz.gr/c/32/cpu-epeksergastes.html?page=2"):
            with self.subTest(href=href), self.assertRaisesRegex(RuntimeError, "pagination"):
                self.fetch([page("1", href)])

    def test_failed_later_subcategory_does_not_return_first_path(self):
        cat = replace(CATEGORIES["cpu"], skroutz_paths=("/first.html", "/second.html"))
        with self.assertRaisesRegex(RuntimeError, "second path"):
            self.fetch([page(), RuntimeError("second path")], cat=cat)

    def test_ambiguous_or_missing_next_target_is_rejected(self):
        for next_markup in ('<link rel="next">', '<link rel="next" href="?page=2"><link rel="next" href="?page=3">'):
            with self.subTest(markup=next_markup), self.assertRaisesRegex(RuntimeError, "pagination"):
                self.fetch([card() + next_markup])

    def test_equivalent_head_and_body_next_links_are_one_destination(self):
        html = card("1") + f'<link rel="next" href="{URL}?page=2"><a rel="next" href="?page=%32#results">Next</a>'
        rows, get = self.fetch([html, page("2")])
        self.assertEqual([row.id for row in rows], ["skroutz:1", "skroutz:2"])
        self.assertEqual(get.call_args_list[1].args[1], URL + "?page=2")

    def test_raw_progress_is_not_confused_with_normalizer_filtering(self):
        rows, get = self.fetch([page("1", "?page=2", title="GPU riser cable"),
                                page("2", "?page=3", title="GPU riser cable"),
                                page("3", title="Sparkle Arc A310 4GB Omni View")], cat=CATEGORIES["gpu"])
        self.assertEqual([row.id for row in rows], ["skroutz:3"])
        self.assertEqual(get.call_count, 3)

    def test_invalid_exact_price_cannot_become_a_range_price(self):
        for price in (True, -5, 0, "NaN", "Infinity"):
            data = {"itemListElement": [{"item": {"url": "/s/123/product.html", "offers": {"price": price}}}]}
            html = card(price="100,00 - 300,00") + f'<script type="application/ld+json">{json.dumps(data)}</script>'
            with self.subTest(price=price):
                self.assertEqual(skroutz.parse(html, AT, CATEGORIES["cpu"])[0], [])


class SnapshotTests(unittest.TestCase):
    def rows(self, count=10):
        return [{"id": f"skroutz:{number}", "source": "skroutz"} for number in range(count)]

    def test_complete_snapshot_and_exact_30_percent_drop_pass(self):
        self.assertEqual(skroutz.snapshot_errors(self.rows(), 10), [])
        self.assertEqual(skroutz.snapshot_errors(self.rows(7), 10), [])

    def test_larger_drop_and_empty_snapshot_fail(self):
        self.assertTrue(any("30%" in error for error in skroutz.snapshot_errors(self.rows(6), 10)))
        self.assertTrue(skroutz.snapshot_errors([], 0))

    def test_duplicate_or_invalid_identity_is_rejected_without_mutation(self):
        for bad in ({"id": "skroutz:0", "source": "skroutz"}, {"id": None, "source": "skroutz"},
                    {"id": {}, "source": "skroutz"}, {"id": "bestprice:2", "source": "bestprice"}):
            rows = self.rows() + [bad]
            before = json.dumps(rows)
            self.assertTrue(skroutz.snapshot_errors(rows, 10))
            self.assertEqual(json.dumps(rows), before)


class MissingBaseline(unittest.TestCase):
    def test_unpublished_category_starts_empty(self):
        import validate_skroutz
        with patch.object(validate_skroutz, "DATA", Path("does-not-exist")):
            data = validate_skroutz.read_categories()
        self.assertEqual(data, {cat: {} for cat in validate_skroutz.CATEGORIES})


if __name__ == "__main__":
    unittest.main()
