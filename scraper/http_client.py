"""Shared HTTP session. curl_cffi impersonates Chrome's TLS fingerprint, which is
what gets us past Cloudflare (Skroutz) and the TLS reset (BestPrice).

From GitHub Actions runners Skroutz answers single requests with 403 now and then (the next
request often passes), so Skroutz requests go through `get`, which waits and retries them."""

import random
import re
import threading
import time
from pathlib import Path

from curl_cffi import requests

DEBUG_DIR = Path(__file__).parent / "debug"
debug = False

RETRY_STATUS = {403, 429, 502, 503, 504}
RETRY_WAITS = (20.0, 60.0, 120.0)  # seconds before the 1st, 2nd and 3rd retry
# Total retry waiting per run (all threads). Blocks cleared within 80 s in practice (14 in one run,
# 460 s in all); 12 min still fits the slowest run seen (80 min) inside the 90 min timeout.
RETRY_CAP = 12 * 60.0
_retry_waited = 0.0
_retry_lock = threading.Lock()


def _reserve_wait(seconds: float) -> bool:
    """Take `seconds` from the run's retry allowance; False once it would go over the cap."""
    global _retry_waited
    with _retry_lock:
        if _retry_waited + seconds > RETRY_CAP:
            return False
        _retry_waited += seconds
        return True


def session() -> requests.Session:
    return requests.Session(
        impersonate="chrome",
        headers={"Accept-Language": "el-GR,el;q=0.9,en;q=0.8"},
        timeout=30,
    )


def _block(r) -> str | None:
    """Why a response counts as blocked (worth retrying), or None if it is usable."""
    if r.status_code in RETRY_STATUS:
        return f"HTTP {r.status_code}"
    if "Just a moment" in r.text[:2000]:
        return "Cloudflare challenge"
    return None


def get(s: requests.Session, url: str, **kwargs) -> requests.Response:
    """GET that waits and retries a blocked response (403/429/5xx, Cloudflare challenge).

    Cookies are cleared before a retry, so it starts fresh. Raises like `raise_for_status` (or
    RuntimeError for a challenge page) once the retries or the run's retry allowance run out.
    """
    for attempt in range(len(RETRY_WAITS) + 1):
        r = s.get(url, **kwargs)
        why = _block(r)
        if why is None:
            r.raise_for_status()
            return r
        detail = f"{why} cf-mitigated={r.headers.get('cf-mitigated', '-')} server={r.headers.get('server', '-')}"
        if attempt == len(RETRY_WAITS) or not _reserve_wait(RETRY_WAITS[attempt]):
            print(f"  blocked: {detail} {url[:90]} — giving up (retry wait used: {_retry_waited:.0f}s)")
            break
        wait = RETRY_WAITS[attempt]
        print(f"  blocked: {detail} {url[:90]} — retry {attempt + 1} in {wait:.0f}s")
        s.cookies.clear()
        time.sleep(wait)
    if r.status_code >= 400:
        r.raise_for_status()
    raise RuntimeError("Cloudflare challenge")


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
