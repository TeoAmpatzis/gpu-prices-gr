"""Shared HTTP session. curl_cffi impersonates Chrome's TLS fingerprint, which is
what gets us past Cloudflare (Skroutz) and the TLS reset (BestPrice)."""

import random
import re
import time
from pathlib import Path

from curl_cffi import requests

DEBUG_DIR = Path(__file__).parent / "debug"
debug = False


def session() -> requests.Session:
    return requests.Session(
        impersonate="chrome",
        headers={"Accept-Language": "el-GR,el;q=0.9,en;q=0.8"},
        timeout=30,
    )


def polite_sleep() -> None:
    time.sleep(random.uniform(1.2, 2.5))


def dump(name: str, html: str) -> None:
    if debug:
        DEBUG_DIR.mkdir(exist_ok=True)
        (DEBUG_DIR / name).write_text(html, encoding="utf-8")


def parse_price(text: str) -> float | None:
    """'1.234,56 €' -> 1234.56. For ranges ('740,10 € - 757,90 €') returns the first (lowest)."""
    m = re.search(r"\d[\d.]*(?:,\d+)?", text)
    if not m:
        return None
    return float(m.group().replace(".", "").replace(",", "."))
