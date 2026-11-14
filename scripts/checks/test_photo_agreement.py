"""Which listings may give a model its photo: the ones that agree on size and length. No network."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
import main as mn
import normalize_mousepad as nm
from categories import CATEGORIES

CAT = CATEGORIES["mousepad"]


def row(title, source="bestprice", image=None, size=None):
    return {"title": title, "source": source, "size": size, "image": image}


class AgreeTests(unittest.TestCase):
    def test_stated_lengths_and_sizes_decide(self):
        agree = nm.photo_agree
        self.assertFalse(agree(row("HyperX Pulsefire XXL 900mm"), row("HyperX Pulsefire XXL 1220mm")))
        self.assertTrue(agree(row("Disney Cars 237mm"), row("Disney Cars 240mm")))  # within 8%
        self.assertFalse(agree(row("Cougar Arena", size="XXL"), row("Cougar Arena", size="XL")))
        self.assertTrue(agree(row("Razer Gigantus V2 Black XXL"), row("Razer Gigantus V2 XXL 940mm")))  # one states nothing


class GroupTests(unittest.TestCase):
    def test_no_conflict_keeps_every_listing(self):
        rows = [row("A 900mm"), row("A"), row("A 920mm")]
        self.assertEqual(mn.photo_group(rows, nm.photo_agree), rows)

    def test_without_agree_nothing_changes(self):
        rows = [row("A 900mm"), row("A 1220mm")]
        self.assertEqual(mn.photo_group(rows, None), rows)

    def test_the_larger_group_wins_and_a_silent_title_is_left_out(self):
        big = [row("HyperX XXL 1220mm", "bestprice"), row("HyperX XXL 1220mm", "shopflix")]
        rows = big + [row("HyperX XXL 900mm", "snif"), row("HyperX XXL", "skroutz")]
        self.assertEqual(mn.photo_group(rows, nm.photo_agree), big)

    def test_a_tie_gives_no_photo(self):
        rows = [row("Havit Large 400mm"), row("Havit Large 500mm")]
        self.assertEqual(mn.photo_group(rows, nm.photo_agree), [])


class WriteTests(unittest.TestCase):
    def run_write(self, rows, prev=None):
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp)
            if prev is not None:
                (out / "image_urls.json").write_text(json.dumps(prev), encoding="utf-8")
            mn.write_image_urls(out, rows, lambda l: "m", nm.photo_agree)
            return json.loads((out / "image_urls.json").read_text(encoding="utf-8")), rows

    BP = "https://bbpcdn.pstatic.gr/a.webp"
    SF = "https://cdn.shopflix.gr/b.webp"
    SN = "https://shop.example/c.jpg"

    def test_only_the_agreeing_listings_give_candidates_and_images_are_stripped(self):
        urls, rows = self.run_write([row("X XXL 1220mm", "bestprice", self.BP), row("X XXL 1220mm", "shopflix", self.SF),
                                     row("X XXL 900mm", "snif", self.SN)])
        self.assertEqual(urls, {"m": [self.BP, self.SF]})
        self.assertTrue(all("image" not in r for r in rows))

    def test_a_tie_writes_no_entry(self):
        urls, _ = self.run_write([row("X 400mm", "bestprice", self.BP), row("X 500mm", "shopflix", self.SF)])
        self.assertEqual(urls, {})

    def test_a_previous_candidate_is_kept_only_for_an_agreeing_source_with_no_fresh_photo(self):
        rows = [row("X XXL 1220mm", "bestprice", self.BP), row("X XXL 1220mm", "shopflix"), row("X XXL 900mm", "snif")]
        urls, _ = self.run_write(rows, prev={"m": ["https://bbpcdn.pstatic.gr/old.webp", self.SF, self.SN]})
        # bestprice has a fresh photo (its old one is dropped), shopflix failed this run (kept), snif disagrees (dropped)
        self.assertEqual(urls, {"m": [self.BP, self.SF]})


if __name__ == "__main__":
    unittest.main()
