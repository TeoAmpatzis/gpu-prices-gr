"""Source-failure CI reporting and data-retention regressions, without network requests.

Run from the repo root: venv/Scripts/python scripts/checks/test_source_status.py
"""
import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
import main as mn  # noqa: E402


class SourceStatusTests(unittest.TestCase):
    def test_monitor_policy_rechecks_retained_failed_or_unselected_source(self):
        import normalize_monitor as nm
        from categories import CATEGORIES
        for unselected in (False, True):
            with self.subTest(unselected=unselected), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                out = root / "monitor"
                out.mkdir()
                old_at, run_at = "2026-11-03T00:00:00Z", "2026-11-04T00:00:00Z"
                def row(source, native_id, at):
                    return nm.make_listing(source=source, native_id=native_id,
                        title='Dell P2425 24" IPS FHD 1920x1080', url="https://example.com/" + native_id,
                        price=100, shop_count=2, scraped_at=at).to_dict()
                valid = row("skroutz", "valid", old_at)
                valid.update(hz=100, pgHeight=1200, gtin="1234567890123", shipping=4.5, merchant="Old shop")
                accessory = dict(valid, id="skroutz:accessory", title="PowerTech Charger PT-135", chip="PowerTech PT135", reject=None)
                old_meta = {"count": 2, "ok": True, "updatedAt": old_at}
                (out / "latest.json").write_text(json.dumps({"sources": {"skroutz": old_meta},
                                                             "listings": [valid, accessory]}), encoding="utf-8")
                fresh = row("bestprice", "fresh", run_at)
                fresh_bad = dict(fresh, id="bestprice:bad", title='Ocypus Sigma ES916 IPS Monitor 9.16"')
                def retained(_):
                    if unselected:
                        self.fail("unselected source was fetched")
                    raise RuntimeError("source unavailable")
                sources = {"skroutz": retained, "bestprice": lambda _: [
                    SimpleNamespace(to_dict=lambda r=r: dict(r)) for r in (fresh, fresh_bad)]}
                with patch.object(mn, "DATA_DIR", root), patch.object(mn, "SOURCES", sources), \
                        patch.object(mn, "now_iso", return_value=run_at), patch.object(mn, "finish"), \
                        patch.object(mn.specs, "apply"), patch.object(mn, "report_sources"), \
                        patch.object(mn.traceback, "print_exc"), patch.object(mn, "write_history", return_value={}) as history, \
                        contextlib.redirect_stdout(io.StringIO()):
                    self.assertTrue(mn.scrape_category(CATEGORIES["monitor"], ["bestprice"] if unselected else None,
                                                       with_shipping=False))
                data = json.loads((out / "latest.json").read_text(encoding="utf-8"))
                self.assertEqual({r["id"] for r in data["listings"]}, {valid["id"], fresh["id"]})
                kept = next(r for r in data["listings"] if r["id"] == valid["id"])
                self.assertEqual({k: kept[k] for k in valid if k != "chip"}, {k: v for k, v in valid.items() if k != "chip"})
                self.assertEqual(data["sources"]["skroutz"], dict(old_meta, ok=unselected))
                self.assertEqual(data["sources"]["bestprice"], {"count": 1, "ok": True, "updatedAt": run_at})
                self.assertEqual([r["id"] for r in history.call_args.args[4]], [fresh["id"]])
                rejects = json.loads((out / "rejected.json").read_text(encoding="utf-8"))["listings"]
                self.assertEqual({r["id"]: r["reject"] for r in rejects},
                                 {accessory["id"]: "not-monitor", fresh_bad["id"]: "not-monitor"})

    def test_suspicious_skroutz_snapshot_retains_source_but_publishes_other_store(self):
        for duplicate in (False, True):
            with self.subTest(duplicate=duplicate), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                out = root / "cpu"
                out.mkdir()
                old_at, run_at = "2026-11-03T00:00:00Z", "2026-11-04T00:00:00Z"
                old = [{"id": f"skroutz:{n}", "source": "skroutz", "chip": "old", "price": 100} for n in range(10)]
                incoming = old[:6] if not duplicate else old[:9] + [old[0]]
                fresh = {"id": "bestprice:2", "source": "bestprice", "chip": "fresh", "price": 110}
                (out / "latest.json").write_text(json.dumps({"sources": {"skroutz": {"count": 10, "ok": True, "updatedAt": old_at}}, "listings": old}), encoding="utf-8")
                def wrap(rows):
                    return [SimpleNamespace(to_dict=lambda row=row: dict(row)) for row in rows]
                sources = {"skroutz": lambda _: wrap(incoming), "bestprice": lambda _: wrap([fresh])}
                cat = SimpleNamespace(name="cpu", settle=None, rejects=False, images=True, model_key=lambda row: row["chip"])
                with patch.object(mn, "DATA_DIR", root), patch.object(mn, "SOURCES", sources), \
                        patch.object(mn, "now_iso", return_value=run_at), patch.object(mn, "write_image_urls"), \
                        patch.object(mn, "finish"), patch.object(mn, "write_history", return_value={}) as history, \
                        contextlib.redirect_stdout(io.StringIO()):
                    self.assertTrue(mn.scrape_category(cat, None, with_shipping=False))
                data = json.loads((out / "latest.json").read_text(encoding="utf-8"))
                self.assertEqual([row for row in data["listings"] if row["source"] == "skroutz"], old)
                self.assertEqual(data["sources"]["skroutz"], {"count": 10, "ok": False, "updatedAt": old_at})
                self.assertEqual(data["sources"]["bestprice"]["updatedAt"], run_at)
                self.assertEqual(history.call_args.args[4], [fresh])

    def test_failed_and_empty_sources_preserve_data_and_exclude_stale_history(self):
        for fails_with_exception in (True, False):
            with self.subTest(exception=fails_with_exception), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                out = root / "cpu"
                out.mkdir()
                old_at = "2026-11-03T00:00:00Z"
                run_at = "2026-11-04T00:00:00Z"
                old = {"id": "skroutz:1", "source": "skroutz", "chip": "old", "price": 100}
                fresh = {"id": "bestprice:2", "source": "bestprice", "chip": "fresh", "price": 110}
                (out / "latest.json").write_text(json.dumps({
                    "sources": {"skroutz": {"count": 1, "ok": True, "updatedAt": old_at}},
                    "listings": [old],
                }), encoding="utf-8")

                def skroutz(_):
                    if fails_with_exception:
                        raise RuntimeError("HTTP 403 Cloudflare challenge")
                    return []

                sources = {"skroutz": skroutz,
                           "bestprice": lambda _: [SimpleNamespace(to_dict=lambda: dict(fresh))]}
                cat = SimpleNamespace(name="cpu", settle=None, rejects=False, images=True, model_key=lambda row: row["chip"])
                summary = root / "summary.md"
                captured = io.StringIO()
                with patch.dict(os.environ, {"GITHUB_ACTIONS": "true", "GITHUB_STEP_SUMMARY": str(summary)}), \
                        patch.object(mn, "DATA_DIR", root), patch.object(mn, "SOURCES", sources), \
                        patch.object(mn, "now_iso", return_value=run_at), \
                        patch.object(mn, "write_image_urls"), patch.object(mn, "finish"), \
                        patch.object(mn, "write_history", return_value={}) as history, \
                        patch.object(mn.traceback, "print_exc"), contextlib.redirect_stdout(captured):
                    self.assertTrue(mn.scrape_category(cat, None, with_shipping=False))

                data = json.loads((out / "latest.json").read_text(encoding="utf-8"))
                self.assertIn(old, data["listings"])
                self.assertEqual(data["sources"]["skroutz"], {"count": 1, "ok": False, "updatedAt": old_at})
                self.assertEqual(data["sources"]["bestprice"]["updatedAt"], run_at)
                self.assertEqual(history.call_args.args[4], [fresh])
                self.assertIn("::warning", captured.getvalue())
                self.assertIn("cpu/skroutz", captured.getvalue())
                self.assertIn(old_at, captured.getvalue())
                table = summary.read_text(encoding="utf-8")
                self.assertIn("skroutz", table)
                self.assertIn("retained", table)
                self.assertIn(old_at, table)
                self.assertIn("bestprice", table)
                self.assertIn(run_at, table)

    def test_unselected_source_is_not_reported_and_summaries_append(self):
        with tempfile.TemporaryDirectory() as tmp:
            summary = Path(tmp) / "summary.md"
            summary.write_text("Existing summary\n", encoding="utf-8")
            sources = {"skroutz": {"ok": False, "count": 2, "updatedAt": None},
                       "bestprice": {"ok": True, "count": 3, "updatedAt": "2026-11-04T00:00:00Z"}}
            output = io.StringIO()
            with patch.dict(os.environ, {"GITHUB_ACTIONS": "true", "GITHUB_STEP_SUMMARY": str(summary)}), \
                    contextlib.redirect_stdout(output):
                mn.report_sources("cpu", sources, ["bestprice"])
                mn.report_sources("gpu", sources, ["bestprice"])
            self.assertNotIn("::warning", output.getvalue())
            text = summary.read_text(encoding="utf-8")
            self.assertTrue(text.startswith("Existing summary\n"))
            self.assertIn("cpu", text)
            self.assertIn("gpu", text)
            self.assertNotIn("skroutz", text)

    def test_no_previous_data_is_explicit_and_workflow_data_is_escaped(self):
        sources = {"skroutz": {"ok": False, "count": 0, "updatedAt": None}}
        output = io.StringIO()
        with patch.dict(os.environ, {"GITHUB_ACTIONS": "true", "GITHUB_STEP_SUMMARY": ""}), \
                contextlib.redirect_stdout(output):
            mn.report_sources("cpu%\r\n::error::injected", sources, ["skroutz"])
        warning = output.getvalue().splitlines()
        self.assertEqual(len(warning), 1)
        self.assertIn("::warning", warning[0])
        self.assertIn("%25%0D%0A", warning[0])
        self.assertIn("0", warning[0])
        self.assertIn("never", warning[0].lower())

    def test_local_runs_do_not_emit_workflow_commands(self):
        output = io.StringIO()
        with patch.dict(os.environ, {"GITHUB_ACTIONS": "", "GITHUB_STEP_SUMMARY": ""}), \
                contextlib.redirect_stdout(output):
            mn.report_sources("cpu", {"skroutz": {"ok": False, "count": 1, "updatedAt": None}}, ["skroutz"])
        self.assertNotIn("::warning", output.getvalue())

    def test_unselected_successful_source_is_not_fresh_history(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            out = root / "cpu"
            out.mkdir()
            old = {"id": "bestprice:1", "source": "bestprice", "chip": "old", "price": 100}
            fresh = {"id": "skroutz:2", "source": "skroutz", "chip": "fresh", "price": 110}
            meta = {"count": 1, "ok": True, "updatedAt": "2026-11-03T00:00:00Z"}
            (out / "latest.json").write_text(json.dumps({"sources": {"bestprice": meta}, "listings": [old]}))
            cat = SimpleNamespace(name="cpu", settle=None, rejects=False, images=True, model_key=lambda row: row["chip"])
            sources = {"skroutz": lambda _: [SimpleNamespace(to_dict=lambda: fresh)],
                       "bestprice": lambda _: self.fail("unselected source was fetched")}
            with patch.object(mn, "DATA_DIR", root), patch.object(mn, "SOURCES", sources), \
                    patch.object(mn, "finish"), patch.object(mn, "write_image_urls"), \
                    patch.object(mn, "report_sources"), patch.object(mn, "write_history", return_value={}) as history, \
                    contextlib.redirect_stdout(io.StringIO()):
                mn.scrape_category(cat, ["skroutz"], with_shipping=False)
            self.assertEqual(history.call_args.args[4], [fresh])
            data = json.loads((out / "latest.json").read_text())
            self.assertEqual(data["sources"]["bestprice"], meta)
            self.assertIn(old, data["listings"])

    def test_targeted_failure_does_not_reuse_unselected_success_for_exit_status(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            out = root / "cpu"
            out.mkdir()
            old = {"id": "bestprice:1", "source": "bestprice", "chip": "old", "price": 100}
            meta = {"count": 1, "ok": True, "updatedAt": "2026-11-03T00:00:00Z"}
            (out / "latest.json").write_text(json.dumps({"sources": {"bestprice": meta}, "listings": [old]}))
            cat = SimpleNamespace(name="cpu", settle=None, rejects=False, images=True, model_key=lambda row: row["chip"])
            sources = {"skroutz": lambda _: [],
                       "bestprice": lambda _: self.fail("unselected source was fetched")}
            with patch.object(mn, "DATA_DIR", root), patch.object(mn, "SOURCES", sources), \
                    patch.object(mn, "finish"), patch.object(mn, "write_image_urls"), \
                    patch.object(mn, "report_sources"), patch.object(mn, "write_history", return_value={}) as history, \
                    contextlib.redirect_stdout(io.StringIO()):
                self.assertFalse(mn.scrape_category(cat, ["skroutz"], with_shipping=False))
            self.assertEqual(history.call_args.args[4], [])
            data = json.loads((out / "latest.json").read_text())
            self.assertEqual(data["sources"]["bestprice"], meta)
            self.assertIn(old, data["listings"])


if __name__ == "__main__":
    unittest.main()
