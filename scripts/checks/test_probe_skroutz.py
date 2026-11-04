"""Read-only Skroutz probe regressions. Run: python scripts/checks/test_probe_skroutz.py"""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import probe_skroutz as probe

HTML = '''<li class="card" data-skuid="123">
<a class="sku-card-title-link" href="/s/123/AMD-Ryzen-5-7600-Box.html">AMD Ryzen 5 7600 Box</a>
<a class="sku-link">180,00 €</a></li><link rel="next" href="?page=2">'''


class ProbeTests(unittest.TestCase):
    def run_probe(self, code=200, body=HTML, error=None):
        session = Mock()
        session.get.side_effect = error
        session.get.return_value = SimpleNamespace(status_code=code, text=body,
                                                   headers={"server": "cloudflare"})
        with patch.object(probe.http, "session", return_value=session), \
                patch.object(probe.http, "dump") as dump, patch.object(Path, "write_text") as write:
            result = probe.probe()
        session.get.assert_called_once_with(probe.URL)
        session.close.assert_called_once()
        dump.assert_not_called()
        write.assert_not_called()
        return result

    def test_real_parser_accepts_category_cards(self):
        result = self.run_probe()
        self.assertEqual(result["result"], "ok")
        self.assertEqual(result["listings"], 1)
        self.assertTrue(result["has_next"])
        self.assertEqual(result["status"], 200)

    def test_403_is_blocked(self):
        result = self.run_probe(403, "challenge")
        self.assertEqual(result["result"], "blocked")
        self.assertEqual(result["status"], 403)

    def test_200_challenge_is_not_success(self):
        self.assertEqual(self.run_probe(200, "<title>Just a moment...</title>")["result"], "blocked")

    def test_200_with_no_cards_is_distinct(self):
        self.assertEqual(self.run_probe(200, "<html>No cards</html>")["result"], "empty")

    def test_http_error_is_distinct(self):
        self.assertEqual(self.run_probe(404, "missing")["result"], "http_error")

    def test_timeout_is_distinct_and_no_retry(self):
        result = self.run_probe(error=TimeoutError("timeout"))
        self.assertEqual(result["result"], "network_error")
        self.assertEqual(result["error"], "TimeoutError")
        self.assertIsNone(result["status"])


if __name__ == "__main__":
    unittest.main()
