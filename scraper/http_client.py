"""Shared HTTP session. curl_cffi impersonates Chrome's TLS fingerprint, which is
what gets us past Cloudflare (Skroutz) and the TLS reset (BestPrice).

From GitHub Actions runners Skroutz answers single requests with 403 now and then (the next
request often passes), so Skroutz requests go through `get`, which waits and retries them."""

import os
import random
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit

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

# Circuit breaker, per host: after this many requests in a row that stayed blocked even after all their
# retries, `get` raises at once for that host. A challenged IP is not hammered; the run fails loudly
# (the nine-category check) and the previous data stays. Any usable response resets the count.
BREAKER_FAILURES = 2
_failed_in_a_row: dict[str, int] = {}
_breaker_lock = threading.Lock()


# The proxy tunnel (Cloudflare WARP, scrape.yml) is opened once per run and used to die half-way
# (2026-11-14: "cannot complete SOCKS5 connection", every later request failed at once). A proxy error
# now reconnects it and tries the request again; at most WARP_RESETS_MAX reconnects per run.
WARP_RESETS_MAX = 5
_warp_resets = 0
_warp_last = 0.0
_warp_lock = threading.Lock()


def _warp(*args: str, timeout: float = 30.0) -> str:
    r = subprocess.run(["warp-cli", "--accept-tos", *args], capture_output=True, text=True, timeout=timeout)
    return r.stdout + r.stderr


def reconnect_proxy() -> bool:
    """Reconnect the WARP tunnel; True when it is connected again (also when another thread just did it)."""
    global _warp_resets, _warp_last
    if not os.environ.get("SCRAPER_PROXY") or shutil.which("warp-cli") is None:
        return False
    with _warp_lock:
        if _warp_last and time.time() - _warp_last < 30:
            return True
        if _warp_resets >= WARP_RESETS_MAX:
            return False
        _warp_resets += 1
        print(f"  proxy error: reconnecting WARP ({_warp_resets}/{WARP_RESETS_MAX})")
        try:
            _warp("disconnect")
            time.sleep(2)
            _warp("connect")
            for _ in range(30):
                if "Connected" in _warp("status"):  # "Disconnected" has a small c
                    _warp_last = time.time()
                    return True
                time.sleep(2)
        except Exception as e:  # warp-cli missing or hanging: the request fails like before
            print(f"  WARP reconnect failed: {e}")
        return False


def _is_proxy_error(e: Exception) -> bool:
    return isinstance(e, requests.exceptions.ProxyError) or "SOCKS5" in str(e)


def _fetch(s: requests.Session, url: str, **kwargs) -> requests.Response:
    """s.get, with one reconnect of the proxy tunnel and a second try when the tunnel itself failed."""
    try:
        return s.get(url, **kwargs)
    except Exception as e:
        if not _is_proxy_error(e) or not reconnect_proxy():
            raise
    return s.get(url, **kwargs)


def _reserve_wait(seconds: float) -> bool:
    """Take `seconds` from the run's retry allowance; False once it would go over the cap."""
    global _retry_waited
    with _retry_lock:
        if _retry_waited + seconds > RETRY_CAP:
            return False
        _retry_waited += seconds
        return True


# Request counts per label ("case/bestprice", "specs/skroutz"…), for the run log (speed plan step 0:
# measurement only). The label belongs to the calling thread; requests themselves are unchanged.
_stats: dict[str, dict[str, int]] = {}
_stats_lock = threading.Lock()
_local = threading.local()


def set_label(label: str | None) -> None:
    _local.label = label


def stats() -> dict[str, dict[str, int]]:
    with _stats_lock:
        return {k: dict(v) for k, v in _stats.items()}


def reset_stats() -> None:
    with _stats_lock:
        _stats.clear()


def _count(key: str) -> None:
    label = getattr(_local, "label", None) or "other"
    with _stats_lock:
        row = _stats.setdefault(label, {"requests": 0, "blocked": 0, "errors": 0})
        row["requests"] += 1
        if key:
            row[key] += 1


class _CountingSession(requests.Session):
    def request(self, method, url, *args, **kwargs):
        try:
            r = super().request(method, url, *args, **kwargs)
        except Exception:
            _count("errors")  # no answer (timeout, connection reset…)
            raise
        _count("blocked" if _block(r) else "")
        return r


def session() -> requests.Session:
    proxy = os.environ.get("SCRAPER_PROXY")  # opt-in, e.g. socks5h://127.0.0.1:40000; unset = direct
    return _CountingSession(
        impersonate="chrome",
        headers={"Accept-Language": "el-GR,el;q=0.9,en;q=0.8"},
        timeout=30,
        proxies={"https": proxy, "http": proxy} if proxy else None,
    )


def summary(prefix: str, seconds: dict[str, float]) -> str:
    """"[timing] case: max 312s, sum 592s | case/skroutz 312s 41 req 12 blocked 0 err | …" (slowest first)."""
    counts = stats()
    parts = []
    for label, sec in sorted(seconds.items(), key=lambda kv: -kv[1]):
        c = counts.get(label, {"requests": 0, "blocked": 0, "errors": 0})
        parts.append(f"{label} {sec:.0f}s {c['requests']} req {c['blocked']} blocked {c['errors']} err")
    total = f"max {max(seconds.values(), default=0):.0f}s, sum {sum(seconds.values()):.0f}s"
    return f"[timing] {prefix}: {total} | " + " | ".join(parts)


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
    host = urlsplit(url).netloc
    with _breaker_lock:
        if _failed_in_a_row.get(host, 0) >= BREAKER_FAILURES:
            raise RuntimeError(f"circuit open for {host}: {BREAKER_FAILURES} requests in a row stayed blocked")
    for attempt in range(len(RETRY_WAITS) + 1):
        r = _fetch(s, url, **kwargs)
        why = _block(r)
        if why is None:
            with _breaker_lock:
                _failed_in_a_row[host] = 0
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
    with _breaker_lock:  # the retries ran out: one more failure in a row for this host
        _failed_in_a_row[host] = _failed_in_a_row.get(host, 0) + 1
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
