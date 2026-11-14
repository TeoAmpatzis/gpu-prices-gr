"""The photo queue serves the least covered category first, and the time limit ends a run cleanly. No network."""
import io
import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
import images


def stage(data: Path, cat: str, keys) -> None:
    (data / cat).mkdir(parents=True, exist_ok=True)
    (data / cat / "image_urls.json").write_text(json.dumps({k: ["https://x.invalid/" + k + ".jpg"] for k in keys}), encoding="utf-8")


class QueueTests(unittest.TestCase):
    def test_least_covered_category_goes_first(self):
        with tempfile.TemporaryDirectory() as temp:
            data = Path(temp)
            stage(data, "gpu", ["a", "b", "c", "d"])  # registry order puts gpu before mousepad
            stage(data, "mousepad", ["p", "q"])
            index = {images.model_id("gpu", k): {} for k in ("a", "b", "c")}  # gpu 75% covered, mousepad 0%
            queue = images.build_queue(data, index, {}, set())
            self.assertEqual([(c, k) for c, k, *_ in queue], [("mousepad", "p"), ("mousepad", "q"), ("gpu", "d")])

    def test_blocked_and_recent_failures_are_skipped_old_failures_retried(self):
        with tempfile.TemporaryDirectory() as temp:
            data = Path(temp)
            stage(data, "gpu", ["a", "b", "c", "d"])
            mid = lambda k: images.model_id("gpu", k)
            failed = {mid("b"): date.today().isoformat(), mid("c"): "2000-01-01"}
            queue = images.build_queue(data, {}, failed, {mid("a")})
            self.assertEqual([k for _, k, *_ in queue], ["c", "d"])


class TimeLimitTests(unittest.TestCase):
    def test_a_time_limit_stops_the_loop_and_still_writes_the_index(self):
        with tempfile.TemporaryDirectory() as temp:
            data, out = Path(temp) / "data", Path(temp) / "out"
            out.mkdir()
            stage(data, "gpu", ["a", "b", "c"])
            raw = io.BytesIO()
            Image.new("RGB", (8, 8), "red").save(raw, "PNG")
            clock = iter([0, 0, 10_000, 10_000, 10_000])  # deadline set at 0; second photo is past it
            with patch.object(images.http, "session", return_value=Mock()), \
                    patch.object(images.http, "get", return_value=SimpleNamespace(content=raw.getvalue())), \
                    patch.object(images.time, "sleep"), patch.object(images.time, "monotonic", side_effect=lambda: next(clock)), \
                    patch.object(sys, "argv", ["images.py", "--data", str(data), "--out", str(out), "--minutes", "1"]):
                self.assertEqual(images.main(), 0)
            index = json.loads((out / "index.json").read_text(encoding="utf-8"))
            self.assertEqual(len(index), 1)


if __name__ == "__main__":
    unittest.main()
