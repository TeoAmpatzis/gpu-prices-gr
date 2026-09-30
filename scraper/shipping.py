"""Best total price per listing: item price + cheapest shipping, VAT included (Greek retail
prices always include 24% VAT, so nothing is added for VAT).

Listing cards only show the lowest item price, so for aggregators the total needs one extra
request per product:
  Skroutz:   /s/<sku>/shops_list?order_by=final_price — every shop's price and cheapest delivery
             fee ("Δωρεάν" / "2,50 € σε Skroutz Point"), shop name in `.merchant-logo img[alt]`.
  BestPrice: the product page — every offer has `data-price` and `data-shipping-cost` (cents) and a
             merchant id resolved through the page's embedded `"merchantsHash"`.
  e-shop.gr: its own shop; free delivery from 90€, below that the fee isn't published (unknown).

That is thousands of requests, so results are cached in public/data/<cat>/offers.json and each run
refreshes a budget per site: the cheapest listing per model and site, most-listed models first,
missing/stale/price-changed entries before fresh ones. Everything else keeps its cached total.
"""

import json
import re
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

from selectolax.parser import HTMLParser

import http_client as http
from normalize import now_iso

# Product pages per site, per category, per run: 8 categories × 60 ≈ 480 per site (~20 min, both
# sites in parallel), which keeps a whole run under the workflow's 60-minute limit. Four runs a day
# refresh the most-listed models daily; the long tail of cases/fans/coolers/boards fills in over days.
BUDGET = {"skroutz": 60, "bestprice": 60}
MAX_AGE = timedelta(hours=36)
PRICE_DRIFT = 0.01  # a cached total is reused while the listing price has moved less than 1%
ESHOP_FREE_FROM = 90.0


def skroutz_offer(s, url: str) -> dict | None:
    sku = re.search(r"/s/(\d+)/", url)
    if not sku:
        return None
    r = s.get(
        f"https://www.skroutz.gr/s/{sku.group(1)}/shops_list?order_by=final_price",
        headers={"Turbo-Frame": "shops-list-frame"},
    )
    r.raise_for_status()
    best = None
    for card in HTMLParser(r.text).css("li.product-card-redesigned"):
        fee_el = card.css_first(".product-card-fee-value")
        try:
            price = float(card.attributes.get("data-raw-price") or 0)
        except ValueError:
            continue
        if not price or not fee_el:
            continue
        fee_text = fee_el.text()
        fee = 0.0 if "Δωρεάν" in fee_text else http.parse_price(fee_text)
        if fee is None:
            continue
        logo = card.css_first(".merchant-logo img")
        offer = {"price": price, "shipping": fee, "total": round(price + fee, 2),
                 "merchant": logo.attributes.get("alt") if logo else None}
        if best is None or offer["total"] < best["total"]:
            best = offer
    return best


def bestprice_offer(s, url: str) -> dict | None:
    r = s.get(url)
    r.raise_for_status()
    hash_m = re.search(r'"merchantsHash":(\{[^}]*\})', r.text)
    merchants = json.loads(hash_m.group(1)) if hash_m else {}
    best = None
    for p in HTMLParser(r.text).css(".prices__product"):
        price, ship = p.attributes.get("data-price"), p.attributes.get("data-shipping-cost")
        if not (price and ship and price.isdigit() and ship.isdigit()):
            continue  # shipping not stated for this offer
        offer = {"price": int(price) / 100, "shipping": int(ship) / 100,
                 "total": round((int(price) + int(ship)) / 100, 2),
                 "merchant": merchants.get(p.attributes.get("data-mid") or "")}
        if best is None or offer["total"] < best["total"]:
            best = offer
    return best


FETCHERS = {"skroutz": skroutz_offer, "bestprice": bestprice_offer}


def _fresh(entry: dict | None, listing: dict, now: datetime) -> bool:
    if not entry:
        return False
    checked = datetime.fromisoformat(entry["checked"])
    moved = abs(listing["price"] - entry["listingPrice"]) > PRICE_DRIFT * entry["listingPrice"]
    return now - checked < MAX_AGE and not moved


def _usable(entry: dict | None, listing: dict) -> bool:
    """A cached total still describes this listing (price hasn't moved)."""
    return bool(entry) and abs(listing["price"] - entry["listingPrice"]) <= PRICE_DRIFT * entry["listingPrice"]


def _refresh(source: str, todo: list[dict], cache: dict) -> int:
    s = http.session()
    done = 0
    for i, l in enumerate(todo):
        if i:
            http.polite_sleep()
        try:
            offer = FETCHERS[source](s, l["url"])
        except Exception:
            traceback.print_exc()
            continue
        cache[l["id"]] = {**(offer or {"total": None}), "listingPrice": l["price"], "checked": now_iso()}
        done += 1
    return done


def enrich(out_dir: Path, listings: list[dict], model_key) -> None:
    """Refresh a budget of best-total offers, then set `shipping`, `total`, `merchant` on every listing."""
    path = out_dir / "offers.json"
    try:
        cache = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        cache = {}
    now = datetime.now(timezone.utc)

    models: dict[str, list[dict]] = {}
    for l in listings:
        models.setdefault(model_key(l), []).append(l)
    todo: dict[str, list[dict]] = {src: [] for src in FETCHERS}
    stale: dict[str, list[dict]] = {src: [] for src in FETCHERS}
    for ls in sorted(models.values(), key=len, reverse=True):  # most-listed models first
        for src in FETCHERS:
            mine = [l for l in ls if l["source"] == src]
            if not mine:
                continue
            cheapest = min(mine, key=lambda l: l["price"])
            entry = cache.get(cheapest["id"])
            if not entry:
                todo[src].append(cheapest)
            elif not _fresh(entry, cheapest, now):
                stale[src].append(cheapest)
    stale = {src: sorted(v, key=lambda l: cache[l["id"]]["checked"]) for src, v in stale.items()}
    batches = {src: (todo[src] + stale[src])[: BUDGET[src]] for src in FETCHERS}
    with ThreadPoolExecutor(max_workers=len(FETCHERS)) as pool:
        futures = {src: pool.submit(_refresh, src, batch, cache) for src, batch in batches.items() if batch}
        for src, f in futures.items():
            print(f"  shipping {src}: refreshed {f.result()}/{len(batches[src])} "
                  f"(missing {len(todo[src])}, stale {len(stale[src])})")

    live = {l["id"] for l in listings}
    cache = {k: v for k, v in cache.items() if k in live}  # forget delisted products
    path.write_text(json.dumps(cache, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    for l in listings:
        l["shipping"] = l["total"] = l["merchant"] = None
        if l["source"] == "eshop":
            l["merchant"] = "e-shop.gr"
            if l["price"] >= ESHOP_FREE_FROM:
                l["shipping"], l["total"] = 0.0, l["price"]
            continue
        entry = cache.get(l["id"])
        if _usable(entry, l) and entry.get("total") is not None:
            l["shipping"], l["total"], l["merchant"] = entry["shipping"], entry["total"], entry["merchant"]
