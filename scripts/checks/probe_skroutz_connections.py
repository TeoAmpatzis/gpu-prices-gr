"""Compare the released retry client and a candidate on one runner; first pages only."""
import importlib.metadata
import importlib.util
import json
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scraper"))
import http_client as candidate
from categories import CATEGORIES
from sources import skroutz

spec = importlib.util.spec_from_file_location("control_http", sys.argv[1])
control = importlib.util.module_from_spec(spec)
spec.loader.exec_module(control)
rows = []
spent = 0.0
total_wait_limit = candidate.RETRY_CAP
arm_wait_limit = total_wait_limit // 8
for index, category in enumerate(("gpu", "cpu", "case", "storage")):
    clients = [("control", control), ("fresh_connection", candidate)]
    if index % 2:
        clients.reverse()
    for label, client in clients:
        if rows:
            candidate.polite_sleep()
        client.RETRY_CAP = arm_wait_limit
        client._retry_waited = 0.0
        key = f"{label}/{category}"
        client.set_label(key)
        url = skroutz.BASE + CATEGORIES[category].skroutz_paths[0]
        row = {"category": category, "client": label, "at": datetime.now(timezone.utc).isoformat()}
        session = client.session()
        try:
            response = client.get(session, url)
            listings, _ = skroutz.parse(response.text, row["at"], CATEGORIES[category])
            row.update(result="ok" if listings else "empty", listings=len(listings), status=response.status_code)
        except Exception as error:
            response = getattr(error, "response", None)
            row.update(result="failed", error=type(error).__name__,
                       status=getattr(response, "status_code", None))
        finally:
            session.close()
            row["requests"] = client.stats().get(key, {}).get("requests", 0)
            row["blocked"] = client.stats().get(key, {}).get("blocked", 0)
            row["retry_wait_seconds"] = client._retry_waited
            spent += client._retry_waited
            rows.append(row)
            print(json.dumps(row), flush=True)
report = {"python": platform.python_version(), "platform": platform.platform(),
          "curl_cffi": importlib.metadata.version("curl_cffi"), "retry_wait_seconds": spent,
          "per_arm_wait_limit_seconds": arm_wait_limit,
          "interpretation": "Sequential balanced smoke comparison; not isolated causal proof",
          "requests": sum(row["requests"] for row in rows), "rows": rows}
assert report["requests"] <= 32 and spent <= total_wait_limit
Path("skroutz-connections.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
raise SystemExit(0 if all(row["result"] == "ok" for row in rows if row["client"] == "fresh_connection") else 1)
