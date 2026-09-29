"""Skroutz: plain GET listing pages (60 cards each), `?page=N`."""

import re

from selectolax.parser import HTMLParser

import http_client as http
from categories import Category
from normalize import now_iso

BASE = "https://www.skroutz.gr"
MAX_PAGES = 80


def parse(html: str, scraped_at: str, cat: Category) -> tuple[list, bool]:
    """Return (listings, has_next_page)."""
    tree = HTMLParser(html)
    out = []
    for card in tree.css("li.card[data-skuid]"):
        title_el = card.css_first("a.sku-card-title-link")
        price_el = card.css_first("a.sku-link")
        if not title_el or not price_el:
            continue
        price = http.parse_price(price_el.text())
        if price is None:
            continue
        href = (title_el.attributes.get("href") or "").split("?", 1)[0]
        listing = cat.make_listing(
            source="skroutz",
            native_id=card.attributes["data-skuid"] or "",
            title=title_el.attributes.get("title") or title_el.text(),
            url=BASE + href,
            price=price,
            shop_count=None,  # not shown on listing cards
            scraped_at=scraped_at,
        )
        if listing:
            out.append(listing)
    has_next = re.search(r'<link rel="next"', html) is not None
    return out, has_next


def fetch(cat: Category) -> list:
    category = BASE + cat.skroutz_path
    s = http.session()
    scraped_at = now_iso()
    seen: dict = {}
    for page in range(1, MAX_PAGES + 1):
        url = category if page == 1 else f"{category}?page={page}"
        r = s.get(url)
        r.raise_for_status()
        if "Just a moment" in r.text[:2000]:
            raise RuntimeError("Cloudflare challenge")
        http.dump(f"skroutz_{cat.name}_p{page}.html", r.text)
        listings, has_next = parse(r.text, scraped_at, cat)
        before = len(seen)
        for l in listings:  # sponsored cards repeat products; keep the cheapest
            if l.id not in seen or l.price < seen[l.id].price:
                seen[l.id] = l
        print(f"  skroutz {cat.name} page {page}: {len(listings)} items")
        # Out-of-range pages are served as the last page again, so also stop
        # when a page adds nothing new.
        if not has_next or (page > 1 and len(seen) == before):
            break
        http.polite_sleep()
    return list(seen.values())
