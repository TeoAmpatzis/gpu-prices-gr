"""Unit tests for the request counting in scraper/http_client.py (speed plan step 0: measurement only, no
behaviour change). A local HTTP server answers 200, 403, 429, 503 and a Cloudflare challenge page.
Run from the repo root: venv/Scripts/python scripts/checks/test_http_stats.py"""
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

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


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        code = {"/403": 403, "/429": 429, "/503": 503}.get(self.path, 200)
        body = b"<title>Just a moment...</title>" if self.path == "/challenge" else b"ok"
        self.send_response(code)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        self.do_GET()

    def log_message(self, *a):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_port}"

http.reset_stats()
http.set_label("case/bestprice")
s = http.session()
for path in ("/ok", "/ok", "/403", "/challenge"):
    s.get(base + path)
s.post(base + "/ok", data={"pg": "2"})  # BestPrice pages 2+ are POSTs
expect("requests, blocked (403 + challenge) and POSTs are counted under the caller's label",
       http.stats()["case/bestprice"], {"requests": 5, "blocked": 2, "errors": 0})


def other_thread():
    http.set_label("case/snif")
    t = http.session()
    t.get(base + "/429")
    t.get(base + "/503")


th = threading.Thread(target=other_thread)
th.start()
th.join()
expect("the label belongs to the thread that set it", http.stats()["case/snif"], {"requests": 2, "blocked": 2, "errors": 0})
expect("the first thread's counts are unchanged", http.stats()["case/bestprice"]["requests"], 5)

try:
    s.get("http://127.0.0.1:1/nothing-listens-here", timeout=2)
except Exception:
    pass
expect("a request that never got an answer counts as an error", http.stats()["case/bestprice"]["errors"], 1)

http.set_label(None)
s.get(base + "/ok")
expect("requests without a label go to 'other'", http.stats()["other"]["requests"], 1)

r = s.get(base + "/403")
expect("responses are returned unchanged (status and body)", (r.status_code, r.text), (403, "ok"))

line = http.summary("case", {"case/skroutz": 312.4, "case/bestprice": 280.0})
expect("summary: per label seconds, requests, blocked; slowest first; 'max' and 'sum' of the sources",
       line, "[timing] case: max 312s, sum 592s | case/skroutz 312s 0 req 0 blocked 0 err"
             " | case/bestprice 280s 6 req 2 blocked 1 err")

http.reset_stats()
expect("reset clears the counts", http.stats(), {})
server.shutdown()

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
