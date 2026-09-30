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
            # BestPrice's own price-drop badge ("-12%", vs the product's previous price).
            drop = card.css_first(".p__badge--drop")
            if drop and (m := re.search(r"-\s*(\d{1,2})\s*%", drop.text())):
                listing.drop = int(m.group(1))
            out.append(listing)
    return out


def fetch(cat: Category) -> list:
    s = http.session()
    scraped_at = now_iso()
    seen: dict = {}
    for i, path in enumerate(cat.bestprice_paths):
        if i:
            http.polite_sleep()
        label = cat.name if len(cat.bestprice_paths) == 1 else f"{cat.name}{i + 1}"
        found: dict = {}
        fetch_slice(s, BASE + path, label, cat, scraped_at, found)
        for listing in found.values():
            for k, v in (cat.bestprice_tags[i] if cat.bestprice_tags else {}).items():
                setattr(listing, k, v)
            seen.setdefault(listing.id, listing)
    return list(seen.values())


def fetch_slice(s, category: str, label: str, cat: Category, scraped_at: str, seen: dict) -> None:
    """Fetch every page of one category URL into `seen` (id -> listing)."""
    r = s.get(category)
    r.raise_for_status()
    http.dump(f"bestprice_{label}_p1.html", r.text)

    pagination = re.search(r'"pagination":(\{[^}]*\})', r.text)
    total_pages = json.loads(pagination.group(1))["totalPages"] if pagination else 1
    gid_m = re.search(r'"guestId":"([^"]+)"', r.text)
    gid = gid_m.group(1) if gid_m else ""

    listings = parse(r.text, scraped_at, cat)
    for l in listings:
        seen.setdefault(l.id, l)
    print(f"  bestprice {label} page 1/{total_pages}: {len(listings)} items")

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
        http.dump(f"bestprice_{label}_p{page}.html", r.text)
        listings = parse(r.text, scraped_at, cat)
        for l in listings:
            seen.setdefault(l.id, l)
        print(f"  bestprice {label} page {page}/{total_pages}: {len(listings)} items")
