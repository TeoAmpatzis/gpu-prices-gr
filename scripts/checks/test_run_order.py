"""run_order: PC parts before the peripherals; failed categories first inside each group. Run: python scripts/checks/test_run_order.py"""
import sys
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, "scraper")
import main as mn  # noqa: E402

names = ["gpu", "cpu", "monitor", "mouse", "ram", "headphones", "storage"]
cats = [SimpleNamespace(name=n) for n in names]
failed_before = {"ram": True}


def fake_load(path, default):
    n = path.parent.name
    return {"sources": {"skroutz": {"ok": False if failed_before.get(n) else True}}}


bad = 0
with patch.object(mn, "load_json", side_effect=fake_load):
    for slot_shift in range(6):
        with patch.object(mn.time, "time", return_value=slot_shift * 6 * 3600 + 1):
            got = [c.name for c in mn.run_order(cats)]
            core, per = got[:4], got[4:]
            ok = set(core) == {"gpu", "cpu", "ram", "storage"} and set(per) == {"monitor", "mouse", "headphones"} and core[0] == "ram"
            if not ok:
                bad += 1
                print("FAIL", slot_shift, got)
print(f"{6 - bad} passed, {bad} failed")
sys.exit(1 if bad else 0)
