"""Read-only access experiment for Skroutz: three spaced requests to ONE category page with a chosen
curl_cffi browser profile. No retries, no product pages, no data writes.

  python probe_strategies.py --impersonate safari

Prints one JSON line per request and exits 0 only when every request returned listings."""
import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
from categories import CATEGORIES  # noqa: E402
from sources import skroutz  # noqa: E402

URL = "https://www.skroutz.gr/c/32/cpu-epeksergastes.html"
COUNT, GAP = 3, 20


def parsed(html: str, at: str) -> dict:
    if "Just a moment" in html[:3000]:
        return {"result": "challenge"}
    try:
        listings, _ = skroutz.parse(html, at, CATEGORIES["cpu"])
    except Exception as error:
        return {"result": "parser_error", "error": type(error).__name__}
    return {"result": "ok" if listings else "empty", "listings": len(listings)}


def main(profile: str) -> int:
    from curl_cffi import requests

    rows = []
    for i in range(COUNT):
        if i:
            time.sleep(GAP)
        at = datetime.now(timezone.utc).isoformat()
        row = {"profile": profile, "at": at}
        try:
            s = requests.Session(impersonate=profile, headers={"Accept-Language": "el-GR,el;q=0.9,en;q=0.8"}, timeout=30)
            r = s.get(URL)
            row.update(status=r.status_code, cf_mitigated=r.headers.get("cf-mitigated"))
            row.update(parsed(r.text, at) if r.status_code == 200 else {"result": "blocked"})
        except Exception as error:
            row.update(result="network_error", error=type(error).__name__)
        print(json.dumps(row), flush=True)
        rows.append(row)
    return 0 if all(r.get("result") == "ok" for r in rows) else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--impersonate", default="chrome")
    sys.exit(main(ap.parse_args().impersonate))
