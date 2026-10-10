"""Phase 2 planning probe: which spec labels do Skroutz / BestPrice product pages state?

Reads a few of the most-listed products per category from public/data, fetches their product pages
politely (one site after the other, ~8 s apart per site) and writes every dt/dd label + value.
No selectolax (blocked locally): a regex over dl/dt/dd, enough to read labels.
"""
import html
import json
import random
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

from curl_cffi import requests

ROOT = Path(sys.argv[1])
OUT = Path(sys.argv[2])
PICK = {"mobo": 5, "psu": 3, "case": 3, "gpu": 2, "cpu": 1, "ram": 1}

def strip(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()

def labels(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for dl in re.findall(r"<dl[^>]*>(.*?)</dl>", text, re.S):
        for dt, dd in re.findall(r"<dt[^>]*>(.*?)</dt>\s*<dd[^>]*>(.*?)</dd>", dl, re.S):
            out.setdefault(strip(dt), strip(dd))
    return out

jobs = []
for cat, n in PICK.items():
    ls = json.loads((ROOT / cat / "latest.json").read_text(encoding="utf-8"))["listings"]
    by = defaultdict(list)
    for l in ls:
        by[l["chip"]].append(l)
    ranked = sorted(by.items(), key=lambda kv: -len(kv[1]))
    taken = 0
    for chip, group in ranked:
        sk = next((l for l in group if l["source"] == "skroutz"), None)
        bp = next((l for l in group if l["source"] == "bestprice"), None)
        if not (sk and bp):
            continue
        jobs.append((cat, chip, sk))
        jobs.append((cat, chip, bp))
        taken += 1
        if taken == n:
            break

s = requests.Session(impersonate="chrome", headers={"Accept-Language": "el-GR,el;q=0.9,en;q=0.8"})
results = []
for i, (cat, chip, l) in enumerate(jobs):
    try:
        r = s.get(l["url"], timeout=30)
        lab = labels(r.text) if r.status_code == 200 else {}
        results.append({"cat": cat, "chip": chip, "source": l["source"], "url": l["url"], "status": r.status_code, "labels": lab})
        print(f"{i+1}/{len(jobs)} {cat} {l['source']} {r.status_code} {len(lab)} labels  {chip}", flush=True)
    except Exception as e:  # noqa: BLE001
        results.append({"cat": cat, "chip": chip, "source": l["source"], "url": l["url"], "error": str(e)})
        print(f"{i+1}/{len(jobs)} {cat} {l['source']} ERROR {e}", flush=True)
    OUT.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    time.sleep(random.uniform(3.5, 4.5))  # sites alternate, so each site waits ~8 s
