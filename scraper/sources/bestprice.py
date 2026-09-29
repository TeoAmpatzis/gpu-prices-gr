"""BestPrice: page 1 is a GET; later pages are loaded the way the site's own JS
does it — a multipart POST to the category URL with `fromPagination=1, pg=N` and
the `X-PAGINATION` / `X-GID` headers. A plain `?pg=N` GET just returns page 1."""

import json
import re

from curl_cffi import CurlMime
from selectolax.parser import HTMLParser

import http_client as http
from categories import Category
from normalize import now_iso

BASE = "https://www.bestprice.gr"
MAX_PAGES = 80


def parse(html: str, scraped_at: str, cat: Category) -> list:
    tree = HTMLParser(html)
    out = []
    for card in tree.css("div.p[data-id]"):
        title_el = card.css_first(".p__title a")
        cents = card.attributes.get("data-price")
        if not title_el or not cents or not cents.isdigit():
            continue
        merchants = card.css_first(".p__merchants")
        shops = re.search(r"\d+", merchants.text()) if merchants else None
        listing = cat.make_listing(
            source="bestprice",
            native_id=card.attributes["data-id"] or "",
            title=title_el.attributes.get("title") or title_el.text(),
            url=BASE + (title_el.attributes.get("href") or ""),
            price=int(cents) / 100,
            shop_count=int(shops.group()) if shops else None,
            scraped_at=scraped_at,
        )
        if listing:
            out.append(listing)
    return out


def fetch(cat: Category) -> list:
    category = BASE + cat.bestprice_path
    s = http.session()
    scraped_at = now_iso()
    r = s.get(category)
    r.raise_for_status()
    http.dump(f"bestprice_{cat.name}_p1.html", r.text)

    pagination = re.search(r'"pagination":(\{[^}]*\})', r.text)
    total_pages = json.loads(pagination.group(1))["totalPages"] if pagination else 1
    gid_m = re.search(r'"guestId":"([^"]+)"', r.text)
    gid = gid_m.group(1) if gid_m else ""

    seen: dict = {l.id: l for l in parse(r.text, scraped_at, cat)}
    print(f"  bestprice {cat.name} page 1/{total_pages}: {len(seen)} items")

    for page in range(2, min(total_pages, MAX_PAGES) + 1):
        http.polite_sleep()
        mp = CurlMime()
        mp.addpart(name="fromPagination", data=b"1")
        mp.addpart(name="pg", data=str(page).encode())
        r = s.post(
            category,
            multipart=mp,
            headers={"X-GID": gid, "X-PAGINATION": "true", "X-BP-PAGE": "1", "Referer": category},
        )
        r.raise_for_status()
        http.dump(f"bestprice_{cat.name}_p{page}.html", r.text)
        listings = parse(r.text, scraped_at, cat)
        for l in listings:
            seen.setdefault(l.id, l)
        print(f"  bestprice {cat.name} page {page}/{total_pages}: {len(listings)} items")
    return list(seen.values())
