"""Unit tests for the per-host circuit breaker in scraper/http_client.py: after BREAKER_FAILURES requests in a
row that stayed blocked through all their retries, `get` raises at once for that host, makes no request,
and leaves other hosts alone; a usable response resets the count. A fake session, no network.
Run from the repo root: python scripts/checks/test_http_breaker.py"""
import sys

sys.path.insert(0, "scraper")
import http_client as http  # noqa: E402

ok = bad = 0


def expect(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got ", got, "\n   want", want)


class Resp:
    def __init__(self, code, text="ok"):
        self.status_code, self.text, self.headers = code, text, {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class Cookies:
    def clear(self):
        pass


class Fake:
    """Answers 403 for a host marked blocked, 200 otherwise; counts the requests it received."""

    def __init__(self, blocked):
        self.blocked, self.calls, self.cookies = set(blocked), 0, Cookies()

    def get(self, url, **kw):
        self.calls += 1
        return Resp(403 if url.split("/")[2] in self.blocked else 200)


def fails(s, url):
    try:
        http.get(s, url)
    except RuntimeError as e:
        return str(e)
    return None


http.RETRY_WAITS = (0.0, 0.0, 0.0)
http.time.sleep = lambda _s: None
BLOCKED, FINE = "https://blocked.test/a", "https://fine.test/a"

http._failed_in_a_row.clear()
s = Fake({"blocked.test"})
fails(s, BLOCKED)
expect("one request stays blocked: it used its first try and 3 retries", s.calls, 4)
fails(s, BLOCKED)
expect("the second one too: breaker now open", s.calls, 8)
msg = fails(s, BLOCKED)
expect("the third raises 'circuit open' without a request", (s.calls, "circuit open" in (msg or "")), (8, True))
expect("another host is not affected", http.get(s, FINE).status_code, 200)

http._failed_in_a_row.clear()
s = Fake({"blocked.test"})
fails(s, BLOCKED)
s.blocked = set()  # the block clears: a usable response resets the count
http.get(s, BLOCKED)
s.blocked = {"blocked.test"}
fails(s, BLOCKED)
before = s.calls
fails(s, BLOCKED)
expect("a success in between resets the count (still retried: not open)", s.calls - before, 4)

print(f"{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
