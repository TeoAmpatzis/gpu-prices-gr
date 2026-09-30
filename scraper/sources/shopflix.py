"""shopflix.gr: a marketplace; one product has offers from many sellers.

Category pages (`/c/<id>/<slug>`) render their product list in the browser from Algolia (index
`prod_GR_spryker`) with a public search-only key that is in the site's own JavaScript; this does the
same requests a visitor's browser does. (robots.txt disallows the `/search` page, which isn't used.)
- Credentials: app id + key are read from the category page's `_next/static/chunks/*.js` each run.
- Category filter: facet `string-facet.facet-map.categoryLinks` = "Κάρτες Γραφικών*:::*/c/3215/kartes-grafikon"
  (`Category.shopflix_categories`; the facet list only returns the 1000 biggest categories, so the
  values are configured, not looked up); plus `locale:el_GR`.
- Algolia returns at most 1000 hits per query, so big categories are split into price ranges
  (`search-result-data.price`) until each range fits, then fetched with hitsPerPage=1000.
- A hit's `search-result-data` has `name`, `sku` ("SF-105988448"), `slug`, `price` (the featured
  offer) and `vendorOfferPrices` (every seller); the lowest offer is used. URL: /p/<sku>/<slug>.
"""

import json
import re
import urllib.parse

import http_client as http
from categories import Category
from normalize import now_iso
from sources.snif import PREFIX

BASE = "https://shopflix.gr"
INDEX = "prod_GR_spryker"
FACET = "string-facet.facet-map.categoryLinks"
MAX_HITS = 1000  # Algolia's pagination limit
FIELDS = ["search-result-data.name", "search-result-data.sku", "search-result-data.slug",
          "search-result-data.price", "search-result-data.vendorOfferPrices", "search-result-data.vendorIds",
          "search-result-data.discount"]

_credentials: tuple[str, str] | None = None


def credentials(s, category_path: str) -> tuple[str, str]:
    """(app id, search key) from the chunk that configures Algolia for the category page."""
    global _credentials
    if _credentials:
        return _credentials
    html = s.get(BASE + category_path).text
    for chunk in sorted(set(re.findall(r'(/_next/static/chunks/[^"]+\.js)', html))):
        js = s.get(BASE + chunk).text
        if INDEX not in js:
            continue
        app = re.search(r'["\']([A-Z0-9]{10})["\']', js)
        key = re.search(r'["\']([a-f0-9]{32})["\']', js)
        if app and key:
            _credentials = (app.group(1), key.group(1))
            return _credentials
    raise RuntimeError("shopflix: Algolia credentials not found")


def fetch(cat: Category) -> list:
    if not cat.shopflix_categories:
        return []
    s = http.session()
    app, key = credentials(s, cat.shopflix_categories[0].split("*:::*")[1])
    url = f"https://{app}-dsn.algolia.net/1/indexes/{INDEX}/query"
    headers = {"X-Algolia-Application-Id": app, "X-Algolia-API-Key": key, "Referer": BASE + "/", "Origin": BASE}

    def query(**params) -> dict:
        http.polite_sleep()
        body = {"params": urllib.parse.urlencode({"filters": "locale:el_GR", **params})}
        r = s.post(url, headers=headers, json=body)
        r.raise_for_status()
        return r.json()

    scraped_at = now_iso()
    seen: dict = {}
    for value in cat.shopflix_categories:
        path = value.split("*:::*")[1]
        base = {"query": "", "facetFilters": json.dumps([[f"{FACET}:{value}"]])}

        def ranges(lo: float, hi: float) -> list[tuple[float, float]]:
            """Price ranges [lo, hi) with at most MAX_HITS products each."""
            n = query(**base, hitsPerPage=0, numericFilters=json.dumps(
                [f"search-result-data.price>={lo}", f"search-result-data.price<{hi}"]))["nbHits"]
            if n <= MAX_HITS or hi - lo < 1:
                return [(lo, hi)] if n else []
            mid = round((lo + hi) / 2, 2)
            return ranges(lo, mid) + ranges(mid, hi)

        for lo, hi in ranges(0, 100000):
            d = query(**base, hitsPerPage=MAX_HITS, attributesToRetrieve=json.dumps(FIELDS),
                      numericFilters=json.dumps([f"search-result-data.price>={lo}", f"search-result-data.price<{hi}"]))
            kept = 0
            for hit in d.get("hits", []):
                p = hit.get("search-result-data") or {}
                offers = [v for v in (p.get("vendorOfferPrices") or {}).values() if isinstance(v, (int, float)) and v > 0]
                price = min(offers) if offers else p.get("price")
                if not p.get("sku") or not p.get("name") or not price:
                    continue
                listing = cat.make_listing(
                    source="shopflix",
                    native_id=p["sku"],
                    title=PREFIX.sub("", re.sub(r"\s+", " ", p["name"]).strip()),
                    url=f"{BASE}/p/{p['sku']}/{p.get('slug') or ''}",
                    price=float(price),
                    shop_count=len(p.get("vendorIds") or []) or None,
                    scraped_at=scraped_at,
                )
                if listing:
                    # Shopflix's "Προσφορά" label: `discount` (%) of the featured offer vs its list price,
                    # used when that offer is the lowest one.
                    if (p.get("discount") or 0) >= 1 and price >= (p.get("price") or 0) - 0.01:
                        listing.drop = int(p["discount"])
                    seen.setdefault(listing.id, listing)
                    kept += 1
            print(f"  shopflix {cat.name} {path} €{lo:g}–{hi:g}: {len(d.get('hits', []))} products, {kept} kept")
    return list(seen.values())
