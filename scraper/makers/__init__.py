"""Specs from the makers' own product pages, for what the shops' pages (specs.py) don't state or
don't cover: graphics cards only sold on sites without spec pages, case fan and radiator details.

Each maker module reads that maker's catalogue (its sitemap) and its product pages, each page once,
into public/data/makers/<maker>.json ({page url: {items: [{cat, name, parts?, key?, fields…}],
checked}} or {failed: date}); one page can describe several products (a fan in 120 and 140 mm, an
AIO in 240 and 360). Pages are fetched during the scrape's spec step, in parallel with the shops (other
hosts), PAUSE apart, products that the most unmeasured listings could use first; a failed page is
tried again after RETRY_DAYS.

`apply` matches a category's listings to the makers' products — by part number when the listing's
title or URL carries one, else by the product key the shops are grouped by — and fills the fields a
listing lacks; for measurements both values go through specs.SAFER (the safer one wins).

A maker module defines:
  NAME                                  file name of its cache
  BRANDS: {cat: {brand names}}          listings it can measure (GPU: partner, others: brand)
  catalogue(s) -> [{url, ...}]          its product pages
  rank(product, needy) -> int           how many unmeasured listings the page could serve (0 = skip)
  parse(url, html) -> [item]            {"cat", "name", "parts"?: [str], "key"?: str, fields…}
  listing_parts(cat, listing) -> [str]  strings a product's `parts` must start (longest part wins)
  listing_key(cat, listing) -> str|None compared with a product's "key" when no part matches
"""

import json
import random
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

import http_client as http
import specs
from normalize import now_iso

from . import asus, corsair, fractal, gigabyte, lianli, msi, noctua, thermaltake

# In the owner's order (most unmeasured models first).
MAKERS = [gigabyte, lianli, thermaltake, asus, noctua, msi, corsair, fractal]
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "data" / "makers"
BUDGET = 150  # product pages per maker per run
PAUSE = (2.0, 4.0)
MAX_FAILURES = 3
RETRY_DAYS = 30


def _path(maker) -> Path:
    return DATA_DIR / f"{maker.NAME}.json"


def _load(maker) -> dict:
    try:
        return json.loads(_path(maker).read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _needy(maker, listings: dict[str, list[dict]]) -> dict[str, list[dict]]:
    """Per category, this maker's listings that still lack a field the builder needs."""
    out = {}
    for cat, brands in maker.BRANDS.items():
        field = "partner" if cat == "gpu" else "brand"
        out[cat] = [
            l for l in listings.get(cat, [])
            if l.get(field) in brands and any(l.get(f) is None for f in specs.NEEDED.get(cat, ()))
        ]
    return out


def collect(listings: dict[str, list[dict]], budget: int = BUDGET) -> None:
    """Fetch new product pages from every maker (one thread each)."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    def work(maker) -> None:
        cache = _load(maker)
        lock = threading.Lock()

        def save() -> None:
            with lock:
                _path(maker).write_text(json.dumps(cache, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")

        s = http.session()
        try:
            products = maker.catalogue(s)
        except Exception as e:
            print(f"  makers {maker.NAME}: catalogue failed: {type(e).__name__}: {str(e)[:120]}")
            return
        needy = _needy(maker, listings)
        retry_before = (date.today() - timedelta(days=RETRY_DAYS)).isoformat()
        todo = []
        for p in products:
            entry = cache.get(p["url"])
            if entry and not (entry.get("failed") and entry["failed"] < retry_before):
                continue
            if (n := maker.rank(p, needy)) > 0:
                todo.append((n, p))
        todo.sort(key=lambda x: -x[0])
        print(f"  makers {maker.NAME}: {len(products)} products, {len(todo)} worth fetching; budget {budget}")
        done = failures = 0
        for i, (_, p) in enumerate(todo[:budget]):
            if i:
                time.sleep(random.uniform(*PAUSE))
            try:
                items = maker.parse(p["url"], http.get(s, p["url"]).text)
            except Exception as e:
                failures += 1
                print(f"  makers {maker.NAME}: {type(e).__name__}: {str(e)[:120]} ({p['url']})")
                cache[p["url"]] = {"failed": date.today().isoformat()}
                if failures >= MAX_FAILURES:
                    print(f"  makers {maker.NAME}: {failures} failures in a row, stopping for this run")
                    break
                continue
            failures = 0
            # A page without the specs we need (an accessory, a different product) isn't asked again soon.
            cache[p["url"]] = {"items": items, "checked": now_iso()} if items else {"failed": date.today().isoformat()}
            done += 1
            if done % 25 == 0:
                save()
        save()
        print(f"  makers {maker.NAME}: fetched {done}")

    with ThreadPoolExecutor(max_workers=len(MAKERS)) as pool:
        list(pool.map(work, MAKERS))


def apply(cat: str, listings: list[dict]) -> None:
    """Fill the listings' missing fields (and join measurements, the safer value winning) from the
    makers' products they match."""
    for maker in MAKERS:
        brands = maker.BRANDS.get(cat)
        if not brands:
            continue
        entries = [i for page in _load(maker).values() for i in page.get("items", []) if i.get("cat") == cat]
        if not entries:
            continue
        parts = [(p, e) for e in entries for p in e.get("parts", [])]
        by_key: dict[str, list[dict]] = {}
        for e in entries:
            if e.get("key"):
                by_key.setdefault(e["key"], []).append(e)
        # Other names a maker gives a product (maker.aliases), only where exactly one product has the
        # alias and none has it as its own name, so an alias can never pick another product.
        alias_of: dict[str, list[dict]] = {}
        for e in entries:
            for a in getattr(maker, "aliases", lambda _: [])(e):
                alias_of.setdefault(a, []).append(e)
        for a, es in alias_of.items():
            if len(es) == 1 and a not in by_key:
                by_key[a] = es
        field = "partner" if cat == "gpu" else "brand"
        for l in listings:
            if l.get(field) not in brands:
                continue
            # The longest part number that starts the listing's part text (revisions share one).
            hits = [(p, e) for s in maker.listing_parts(cat, l) for p, e in parts if s.startswith(p)]
            longest = max((len(p) for p, _ in hits), default=0)
            found = [e for p, e in hits if len(p) == longest]
            if not found:
                found = by_key.get(maker.listing_key(cat, l) or "", [])
            for f in {f for e in found for f in e} - {"cat", "name", "parts", "key"}:
                values = [e[f] for e in found if e.get(f) is not None]
                if not values:
                    continue
                safer = specs.SAFER.get(f)
                value = safer(values) if safer else values[0]
                if l.get(f) is None:
                    l[f] = value
                elif safer:
                    l[f] = safer([l[f], value])
