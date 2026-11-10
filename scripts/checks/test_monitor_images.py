"""Accepted monitor photos use the existing candidate and WebP pipeline, without network access."""
import copy
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

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
from categories import CATEGORIES
import images
import main as mn

AT = "2026-11-10T00:00:00Z"
CAT = CATEGORIES["monitor"]
TITLE = 'Dell U2724DE IPS Monitor 27" 2560x1440 QHD 120Hz'


def listing(source, native_id, title=TITLE, image=None):
    row = CAT.make_listing(source=source, native_id=native_id, title=title, price=321.25,
                           url="https://example.com/" + native_id, shop_count=None,
                           specs="", scraped_at=AT).to_dict()
    if image:
        row["image"] = image
    return row


class MonitorImagesTests(unittest.TestCase):
    def stage(self, out, rows):
        CAT.settle(rows)
        mn.stage(out, rows, {"bestprice": {"ok": True, "updatedAt": AT},
                             "skroutz": {"ok": False, "updatedAt": "2026-11-09T00:00:00Z"}}, AT)

    def test_candidates_follow_admission_source_priority_and_failed_source_retention(self):
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp)
            rows = [listing("snif", "3", image="https://shop.example/snif.jpg"),
                    listing("skroutz", "2", image="https://b.scdn.gr/images/sku_main_images/2.jpg"),
                    listing("bestprice", "1", image="https://a.scdn.gr/pstatic.gr/best.jpg"),
                    listing("bestprice", "4", "Dell Single Monitor Arm - MSA20", "https://example.com/arm.jpg"),
                    listing("skroutz", "5", 'Asus MB166C IPS Monitor 15.6" 1920x1080 FHD 60Hz')]
            self.stage(out, rows)
            key, retained = CAT.model_key(rows[0]), CAT.model_key(rows[-1])
            prior = {key: ["https://previous.example/dell.jpg"], retained: ["https://previous.example/asus.jpg"],
                     "removed model": ["https://previous.example/removed.jpg"]}
            (out / "image_urls.json").write_text(json.dumps(prior), encoding="utf-8")
            before = [{k: v for k, v in row.items() if k != "image"} for row in rows]
            history = mn.update_history({}, copy.deepcopy(rows), "2026-11-10", CAT.model_key)
            mn.write_image_urls(out, rows, CAT.model_key)
            self.assertEqual(rows, before)
            self.assertEqual(mn.update_history({}, rows, "2026-11-10", CAT.model_key), history)
            self.assertEqual(json.loads((out / "image_urls.json").read_text(encoding="utf-8")), {
                key: ["https://a.scdn.gr/pstatic.gr/best.jpg", "https://b.scdn.gr/images/sku_main_images/2.jpg",
                      "https://shop.example/snif.jpg", "https://previous.example/dell.jpg"],
                retained: ["https://previous.example/asus.jpg"]})
            rejected = json.loads((out / "rejected.json").read_text(encoding="utf-8"))["listings"]
            self.assertEqual([row["id"] for row in rejected], ["bestprice:4"])

    def test_generator_writes_both_sizes_and_hashed_index_for_only_accepted_model(self):
        with tempfile.TemporaryDirectory() as temp:
            data, out = Path(temp) / "data", Path(temp) / "photos"
            monitor = data / "monitor"
            monitor.mkdir(parents=True)
            out.mkdir()
            url = "https://b.scdn.gr/images/sku_main_images/dell.jpg"
            rows = [listing("skroutz", "1", image=url),
                    listing("bestprice", "2", "Dell Single Monitor Arm - MSA20", "https://example.com/arm.jpg")]
            self.stage(monitor, rows)
            if CAT.images:
                mn.write_image_urls(monitor, rows, CAT.model_key)
            else:
                mn.drop_images(rows)
            raw = io.BytesIO()
            Image.new("RGB", (12, 8), "red").save(raw, "PNG")
            with patch.object(images.http, "session", return_value=Mock()), \
                    patch.object(images.http, "get", return_value=SimpleNamespace(content=raw.getvalue())) as get, \
                    patch.object(images.time, "sleep"), patch.object(sys, "argv", ["images.py", "--data", str(data),
                                                                                 "--out", str(out), "--budget", "1"]):
                self.assertEqual(images.main(), 0)
            key = CAT.model_key(rows[0])
            mid = hashlib.sha1(("monitor\0" + key).encode()).hexdigest()[:12]
            self.assertEqual(images.model_id("monitor", key), mid)
            index = json.loads((out / "index.json").read_text(encoding="utf-8"))
            self.assertEqual(set(index), {mid})
            self.assertEqual((index[mid]["c"], index[mid]["s"]), ("monitor", "skroutz"))
            for size in (96, 320):
                with Image.open(out / "img" / "monitor" / f"{mid}-{size}.webp") as photo:
                    self.assertEqual((photo.format, photo.size), ("WEBP", (size, size)))
            self.assertEqual([call.args[1] for call in get.call_args_list], [url])


if __name__ == "__main__":
    unittest.main()
