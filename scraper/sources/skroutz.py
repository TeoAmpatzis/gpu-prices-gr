"""Skroutz: plain GET listing pages (60 cards each), `?page=N`.

Some cards stand for a product family ("G.Skill Aegis DDR4", capacities 8-64GB) and show a
price range across all variants; the page's JSON-LD has the price of the variant the card
links to, so that is preferred over the card text."""

import json
import re

from selectolax.parser import HTMLParser

import http_client as http
from categories import Category
from normalize import now_iso

BASE = "https://www.skroutz.gr"
MAX_PAGES = 80


def jsonld_prices(tree: HTMLParser) -> dict[str, float]:
    """skuid -> price of the exact product each card links to."""
    out: dict[str, float] = {}
    for script in tree.css('script[type="application/ld+json"]'):
        try:
            data = json.loads(script.text())
        except ValueError:
            continue
        for el in data.get("itemListElement", []) if isinstance(data, dict) else []:
            item = el.get("item") if isinstance(el, dict) else None
            if not isinstance(item, dict):
                continue
            m = re.search(r"/s/(\d+)/", item.get("url", ""))
            price = (item.get("offers") or {}).get("price")
            if m and isinstance(price, (int, float)):
                out[m.group(1)] = float(price)
    return out


def parse(html: str, scraped_at: str, cat: Category) -> tuple[list, bool]:
    """Return (listings, has_next_page)."""
    tree = HTMLParser(html)
    exact = jsonld_prices(tree)
    out = []
    for card in tree.css("li.card[data-skuid]"):
        title_el = card.css_first("a.sku-card-title-link")
        price_el = card.css_first("a.sku-link")
        specs_el = card.css_first("p.specs")
        if not title_el or not price_el:
            continue
        skuid = card.attributes["data-skuid"] or ""
        text = price_el.text()
        # A range without a JSON-LD price can't be pinned to the linked variant.
        price = exact.get(skuid) or (None if " - " in text else http.parse_price(text))
        if price is None:
            continue
        href = (title_el.attributes.get("href") or "").split("?", 1)[0]
        listing = cat.make_listing(
            source="skroutz",
            native_id=skuid,
            title=title_el.attributes.get("title") or title_el.text(),
            url=BASE + href,
            price=price,
            shop_count=None,  # not shown on listing cards
            specs=specs_el.text() if specs_el else "",  # e.g. "Τύπος:ATX / SFX"
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
