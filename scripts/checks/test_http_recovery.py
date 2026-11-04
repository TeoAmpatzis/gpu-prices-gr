"""A blocked keep-alive connection must not poison every retry."""
import contextlib
import io
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
import http_client as http


class RecoveryTests(unittest.TestCase):
    def test_retry_replaces_blocked_connection_then_reuses_healthy_connection(self):
        clients = []
        first_client = None

        class Handler(BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def do_GET(self):
                nonlocal first_client
                if first_client is None:
                    first_client = self.client_address
                clients.append(self.client_address)
                self.send_response(403 if self.client_address == first_client else 200)
                self.send_header("Content-Length", "2")
                self.end_headers()
                self.wfile.write(b"ok")

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with http.session() as session, patch.object(http.time, "sleep") as sleep, \
                    patch.object(http, "_retry_waited", 0.0), contextlib.redirect_stdout(io.StringIO()):
                options = dict(session.curl_options)
                url = f"http://127.0.0.1:{server.server_port}/"
                self.assertEqual(http.get(session, url).status_code, 200)
                self.assertEqual(http.get(session, url).status_code, 200)
                self.assertEqual(session.curl_options, options)
                self.assertEqual(http._retry_waited, 20)
                sleep.assert_called_once_with(20)
            self.assertEqual(len(clients), 3)
            self.assertNotEqual(clients[0], clients[1])
            self.assertEqual(clients[1], clients[2])
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
