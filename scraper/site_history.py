"""Import Skroutz's own price history into history.json, so charts and sale detection have a past
from day one instead of only the days this project has been collecting.

Skroutz product pages load `/s/<sku>/<slug>/price_graph?currency=EUR&shipping_country=GR` — JSON with
the product's daily lowest price in consecutive segments (`min_price.graphData` "1_months",
"3_months", "6_months", "all"; ~2 years), each value `{timestamp, value, shop_name}`; a timestamp
is midnight Athens time.

A model is imported once (remembered in public/data/<cat>/history_imported.json); after that our own
daily points continue it. Models that group several products by spec (GPU chip + VRAM, RAM kit, PSU
wattage) take the daily minimum over their few cheapest Skroutz products, so the imported past isn't
higher than the real market minimum (which would make ordinary prices look like sales).
Skroutz throttles quick bursts (see specs.py), so this runs slowly, from its own daily workflow:
`main.py --history-only --history-budget N`.
"""

import json
import random
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import http_client as http
from normalize import now_iso

BUDGET = 60  # price_graph requests per category per run
PAUSE = (5.0, 8.0)
MAX_FAILURES = 3
KEEP_DAYS = 365
# Categories whose model groups several different products (see categories.py model_key).
SPEC_GROUPED = {"gpu": 3, "ram": 3, "psu": 3}


def price_graph(s, url: str) -> dict[str, float]:
    """{'YYYY-MM-DD': lowest price} for one Skroutz product."""
    m = re.search(r"(https://www\.skroutz\.gr/s/\d+/[^?#]+?)(?:\.html)?(?:[?#].*)?$", url)
    if not m:
        return {}
    r = s.get(f"{m.group(1)}/price_graph?currency=EUR&shipping_country=GR", headers={"Accept": "application/json"})
    r.raise_for_status()
    out: dict[str, float] = {}
    for segment in (r.json().get("min_price") or {}).get("graphData", {}).values():
        for v in segment.get("values", []):
            if not isinstance(v.get("value"), (int, float)) or v["value"] <= 0:
                continue
            # Midnight Athens = 21:00/22:00 UTC the day before; +12h lands inside the right day
            # without needing a time-zone database.
            day = (datetime.fromtimestamp(v["timestamp"], timezone.utc) + timedelta(hours=12)).strftime("%Y-%m-%d")
            out[day] = min(out.get(day, v["value"]), v["value"])
    return out


def merge(points: list[dict], imported: dict[str, float], today: str) -> list[dict]:
    """Our points win on days we have (lower of the two); imported days fill the rest; 365 days kept.
    Imported points carry `"i": 1`: they are Skroutz-only, so sale detection ignores them."""
    by_day = {p["d"]: p for p in points}
    for day, price in imported.items():
        if day >= today:
            continue  # today belongs to our own run
        if day in by_day:
            if price < by_day[day]["min"]:
                by_day[day] = {"d": day, "min": round(price, 2), "source": "skroutz", "i": 1}
        else:
            by_day[day] = {"d": day, "min": round(price, 2), "source": "skroutz", "i": 1}
    days = sorted(by_day)[-KEEP_DAYS:]
    return [by_day[d] for d in days]


def enrich(cat: str, out_dir: Path, listings: list[dict], model_key, budget: int = BUDGET) -> None:
    history_path, done_path = out_dir / "history.json", out_dir / "history_imported.json"
    try:
        history = json.loads(history_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        history = {}
    try:
        done = json.loads(done_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        done = {}

    models: dict[str, list[dict]] = {}
    for l in listings:
        models.setdefault(model_key(l), []).append(l)
    todo = [
        (key, sorted((l for l in ls if l["source"] == "skroutz"), key=lambda l: l["price"])[: SPEC_GROUPED.get(cat, 1)])
        for key, ls in sorted(models.items(), key=lambda kv: len(kv[1]), reverse=True)  # most-listed first
        if key not in done and any(l["source"] == "skroutz" for l in ls)
    ]

    def save() -> None:
        history_path.write_text(json.dumps(dict(sorted(history.items())), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        done_path.write_text(json.dumps(done, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    s = http.session()
    today = now_iso()[:10]
    requests = failures = imported = 0
    for key, products in todo:
        # A model is only fetched when its whole product list fits in the remaining budget.
        if requests + len(products) > budget or failures >= MAX_FAILURES:
            break
        daily: dict[str, float] = {}
        ok = 0
        for l in products:
            if requests:
                time.sleep(random.uniform(*PAUSE))
            requests += 1
            try:
                for day, price in price_graph(s, l["url"]).items():
                    daily[day] = min(daily.get(day, price), price)
                ok += 1
                failures = 0
            except Exception as e:
                failures += 1
                print(f"  history {cat}: {type(e).__name__}: {str(e)[:120]}")
        if ok < len(products):
            continue  # retried next run
        if daily:
            history[key] = merge(history.get(key, []), daily, today)
        done[key] = today
        imported += 1
        if imported % 20 == 0:
            save()
    if failures >= MAX_FAILURES:
        print(f"  history {cat}: {failures} failures in a row, Skroutz is throttling; stopping for this run")
    save()
    left = sum(1 for key, _ in todo if key not in done)
    print(f"  history {cat}: imported {imported} models ({requests} requests), {left} left")
