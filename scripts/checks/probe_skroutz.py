"""One read-only category request, with no retries, product reads, or data writes."""
import importlib.metadata
import json
import platform
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
import http_client as http  # noqa: E402
from categories import CATEGORIES  # noqa: E402
from sources import skroutz  # noqa: E402

URL = "https://www.skroutz.gr/c/32/cpu-epeksergastes.html"


def probe() -> dict:
    result = {
        "at": datetime.now(timezone.utc).isoformat(),
        "python": platform.python_version(), "platform": platform.platform(),
        "curl_cffi": importlib.metadata.version("curl_cffi"),
        "selectolax": importlib.metadata.version("selectolax"),
        "url": URL, "status": None, "listings": 0, "has_next": False,
    }
    start = time.monotonic()
    session = http.session()
    try:
        try:
            response = session.get(URL)
        except Exception as error:
            result.update(result="network_error", error=type(error).__name__)
            return result
        result["status"] = response.status_code
        result["headers"] = {name: response.headers.get(name) for name in
                             ("server", "cf-mitigated", "cf-ray")}
        reason = http._block(response)
        if reason:
            result.update(result="blocked", reason=reason)
        elif response.status_code != 200:
            result["result"] = "http_error"
        else:
            try:
                listings, has_next = skroutz.parse(response.text, result["at"], CATEGORIES["cpu"])
                result.update(result="ok" if listings else "empty", listings=len(listings), has_next=has_next)
            except Exception as error:
                result.update(result="parser_error", error=type(error).__name__)
        return result
    finally:
        result["seconds"] = round(time.monotonic() - start, 3)
        session.close()


if __name__ == "__main__":
    result = probe()
    print(json.dumps(result, ensure_ascii=True))
    sys.exit(0 if result["result"] == "ok" else 1)
