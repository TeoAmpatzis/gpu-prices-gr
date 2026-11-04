"""Skroutz: plain GET listing pages (60 cards each), `?page=N`.

Some cards stand for a product family ("G.Skill Aegis DDR4", capacities 8-64GB) and show a
price range across all variants; the page's JSON-LD has the price of the variant the card
links to, so that is preferred over the card text."""

import json
import math
import re
from dataclasses import dataclass
from urllib.parse import parse_qs, urlencode, urljoin, urlsplit, urlunsplit

from selectolax.parser import HTMLParser

import http_client as http
from categories import Category
from normalize import now_iso

BASE = "https://www.skroutz.gr"
MAX_PAGES = 80


def _documents(data):
    """JSON-LD may be a document, an array or a graph of documents."""
    if isinstance(data, list):
        for item in data:
            yield from _documents(item)
    elif isinstance(data, dict):
        yield data
        yield from _documents(data.get("@graph"))


def _offer_prices(offers):
    for offer in offers if isinstance(offers, list) else [offers]:
        if not isinstance(offer, dict) or offer.get("priceCurrency", "EUR") != "EUR":
            continue
        value = offer.get("price")
        if isinstance(value, bool):
            continue
        try:
            price = float(value)
        except (TypeError, ValueError):
            continue
        if math.isfinite(price) and price > 0:
            yield price


def jsonld_prices(tree: HTMLParser) -> dict[str, float]:
    """skuid -> price of the exact product each card links to."""
    out: dict[str, float] = {}
    for script in tree.css('script[type="application/ld+json"]'):
        try:
            data = json.loads(script.text())
        except ValueError:
            continue
        for document in _documents(data):
            elements = document.get("itemListElement", [])
            for el in elements if isinstance(elements, list) else []:
                item = el.get("item") if isinstance(el, dict) else None
                if not isinstance(item, dict) or not isinstance(item.get("url"), str):
                    continue
                m = re.search(r"/s/(\d+)/", item["url"])
                prices = list(_offer_prices(item.get("offers")))
                if m and prices:
                    out[m.group(1)] = min(prices)
    return out


@dataclass
class _Page:
    listings: list
    ids: set[str]
    usable_cards: int
    next_hrefs: set[str]


def _product_url(href: str, skuid: str) -> str | None:
    try:
        url = urlsplit(urljoin(BASE, href))
    except ValueError:
        return None
    if url.scheme != "https" or url.netloc != urlsplit(BASE).netloc:
        return None
    if not re.match(rf"^/s/{re.escape(skuid)}(?:/|$)", url.path):
        return None
    return urlunsplit((url.scheme, url.netloc, url.path, "", ""))


def _parse_page(html: str, scraped_at: str, cat: Category) -> _Page:
    tree = HTMLParser(html)
    exact = jsonld_prices(tree)
    out = []
    ids = set()
    usable = 0
    for card in tree.css("li.card[data-skuid]"):
        skuid = card.attributes["data-skuid"] or ""
        if not skuid.isdigit():
            continue
        ids.add(skuid)
        title_el = card.css_first("a.sku-card-title-link")
        price_el = card.css_first("a.sku-link")
        specs_el = card.css_first("p.specs")
        if not title_el or not price_el:
            continue
        text = price_el.text()
        # A range without a JSON-LD price can't be pinned to the linked variant.
        price = exact.get(skuid) or (None if " - " in text else http.parse_price(text))
        if price is None or not math.isfinite(price) or price <= 0:
            continue
        url = _product_url(title_el.attributes.get("href") or "", skuid)
        if url is None:
            continue
        usable += 1
        listing = cat.make_listing(
            source="skroutz",
            native_id=skuid,
            title=title_el.attributes.get("title") or title_el.text(),
            url=url,
            price=price,
            shop_count=None,  # not shown on listing cards
            specs=specs_el.text() if specs_el else "",  # e.g. "Τύπος:ATX / SFX"
            scraped_at=scraped_at,
        )
        if listing:
            # Skroutz's own price-drop badge: "-11%πτώση τιμής".
            drop = card.css_first(".badge-price_drop_bottom_badge")
            if drop and (m := re.search(r"-\s*(\d{1,2})\s*%", drop.text())):
                listing.drop = int(m.group(1))
            # Product photo on Skroutz's image host (scdn.gr), for the images workflow (main.image_urls).
            img = card.css_first('img[src*="sku_main_images"]')
            if img:
                listing.image = img.attributes["src"]
            out.append(listing)
    links = {node.attributes.get("href", "") for node in tree.css("link[rel], a[rel]")
             if "next" in node.attributes.get("rel", "").lower().split()}
    return _Page(out, ids, usable, links)


def parse(html: str, scraped_at: str, cat: Category) -> tuple[list, bool]:
    """Return (listings, has_next_page), preserving the existing parser interface."""
    page = _parse_page(html, scraped_at, cat)
    return page.listings, bool(page.next_hrefs)


def snapshot_errors(listings: list[dict], previous_count: int) -> list[str]:
    """Validate a staged Skroutz snapshot before replacing the last successful one."""
    errors = []
    ids = [row.get("id") for row in listings]
    if not listings:
        errors.append("empty Skroutz snapshot")
    valid_ids = all(isinstance(value, str) and re.fullmatch(r"skroutz:\d+", value) for value in ids)
    if not valid_ids or any(row.get("source") != "skroutz" for row in listings):
        errors.append("invalid Skroutz listing identity")
    elif len(set(ids)) != len(ids):
        errors.append("duplicate Skroutz listing IDs")
    if len(listings) * 10 < previous_count * 7:
        errors.append(f"more than 30% fewer listings ({previous_count} -> {len(listings)})")
    return errors


def _next_url(category: str, current: str, href: str, page: int) -> str:
    try:
        base = urlsplit(category)
        target = urlsplit(urljoin(current, href))
        query = parse_qs(target.query, keep_blank_values=True)
        expected = parse_qs(base.query, keep_blank_values=True)
        expected["page"] = [str(page + 1)]
        if (target.scheme != base.scheme or target.netloc != base.netloc
                or target.path != base.path or query != expected):
            raise ValueError("Unexpected destination or page sequence")
    except ValueError as error:
        raise RuntimeError("Invalid Skroutz pagination") from error
    return urlunsplit((base.scheme, base.netloc, base.path, urlencode(expected, doseq=True), ""))


def fetch(cat: Category) -> list:
    s = http.session()
    try:
        scraped_at = now_iso()
        seen: dict = {}
        for i, path in enumerate(cat.skroutz_paths):
            if i:
                http.polite_sleep()
            label = cat.name if len(cat.skroutz_paths) == 1 else f"{cat.name}{i + 1}"
            fetch_category(s, BASE + path, label, cat, scraped_at, seen)
        return list(seen.values())
    finally:
        s.close()


def fetch_category(s, category: str, label: str, cat: Category, scraped_at: str, seen: dict) -> None:
    """Fetch every page of one category URL into `seen` (id -> listing)."""
    url = category
    raw_seen: set[str] = set()
    for page in range(1, MAX_PAGES + 1):
        r = http.get(s, url)  # waits and retries a blocked page
        http.dump(f"skroutz_{label}_p{page}.html", r.text)
        parsed = _parse_page(r.text, scraped_at, cat)
        if not parsed.ids or not parsed.usable_cards:
            raise RuntimeError(f"Skroutz {label} page {page}: no usable product cards")
        for l in parsed.listings:  # sponsored cards repeat products; keep the cheapest
            if l.id not in seen or l.price < seen[l.id].price:
                seen[l.id] = l
        print(f"  skroutz {label} page {page}: {len(parsed.listings)} items")
        # Out-of-range pages can repeat the last page. Only a terminal page proves completion;
        # a repeated page that still advertises another page is an incomplete traversal.
        if not parsed.next_hrefs:
            return
        if parsed.ids <= raw_seen:
            raise RuntimeError(f"Skroutz {label}: repeated page with more pages advertised")
        raw_seen.update(parsed.ids)
        if page == MAX_PAGES:
            raise RuntimeError(f"Skroutz {label}: page limit reached before completion")
        targets = {_next_url(category, url, href, page) for href in parsed.next_hrefs}
        if len(targets) != 1:
            raise RuntimeError("Ambiguous Skroutz pagination links")
        url = targets.pop()
        http.polite_sleep()
