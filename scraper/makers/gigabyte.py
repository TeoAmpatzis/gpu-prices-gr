"""GIGABYTE graphics cards (www.gigabyte.com).

Catalogue: the global consumer-products sitemap, `/Graphics-Card/<part number>[-rev-NN]`; the
part number encodes chip and VRAM (normalize.expand_part_numbers), so only pages of chips we list
are fetched. Spec page `<url>/sp`: `.spec-title` / next element pairs, e.g. "Card size" =
"L=290 W=120 H=50 mm", "Recommended PSU" = "750W"; the page title names the card
("GeForce RTX™ 5070 EAGLE OC SFF 12G Graphics Card Specifications - GIGABYTE Global").
robots.txt allows these paths (it disallows Products_Spec.aspx and similar, not used).

Matching: the part number (Skroutz and Snif titles/URLs carry it: "GV-N5070EAGLE-OC-12GD",
"GV-N506TEAGLEOC ICE-8GD") compared without dashes/spaces, else normalize.card_key of the name.
Gigabyte sometimes renames a card (GV-N5070EAGLE OC-12GD is now "EAGLE OC SFF"), which only the
part number catches.
"""

import re

from selectolax.parser import HTMLParser

import normalize

from .common import fetch

NAME = "gigabyte"
BRANDS = {"gpu": {"Gigabyte"}}
SITEMAP = "https://www.gigabyte.com/sitemap/consumer-products/global/sitemap.xml"
CARD_URL = re.compile(r"https://www\.gigabyte\.com/Graphics-Card/(GV-[A-Za-z0-9-]+?)(?:-rev-[\d-]+)?/?$", re.I)
CARD_SIZE = re.compile(r"L\s*=\s*(\d+(?:\.\d+)?)", re.I)


def _alnum(text: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def catalogue(s) -> list[dict]:
    xml = fetch(s, SITEMAP)
    out = []
    for url in re.findall(r"<loc>([^<]+)</loc>", xml):
        if m := CARD_URL.match(url.strip()):
            out.append({"url": url.strip().rstrip("/") + "/sp", "part": m.group(1)})
    return out


def _chip(part: str) -> tuple[str, int] | None:
    info = normalize.classify(part)
    return (info[1], info[2]) if info else None


def rank(product: dict, needy: dict[str, list[dict]]) -> int:
    chip = _chip(product["part"])
    return sum(1 for l in needy.get("gpu", []) if (l["chip"], l["vram"]) == chip) if chip else 0


def parse(url: str, html: str) -> list[dict]:
    t = HTMLParser(html)
    spec: dict[str, str] = {}
    for n in t.css(".spec-title"):
        nxt = n.next
        while nxt is not None and nxt.tag in (None, "-text"):
            nxt = nxt.next
        if nxt is not None:
            spec.setdefault(n.text(strip=True), re.sub(r"\s+", " ", nxt.text(strip=True)))
    title = t.css_first("title")
    name = re.sub(r"\s*Graphics Card Specifications.*$|™|®", "", title.text() if title else "").strip()
    length = CARD_SIZE.search(spec.get("Card size", ""))
    psu = re.search(r"(\d{3,4})\s*W", spec.get("Recommended PSU", ""))
    part = CARD_URL.match(url.removesuffix("/sp")).group(1)
    info = normalize.classify(name) or normalize.classify(part)
    if not info or not length:
        return []
    _, chip, vram = info
    return [{
        "cat": "gpu",
        "name": name,
        "parts": [_alnum(part)],
        "key": normalize.card_key({"title": name, "chip": chip, "partner": "Gigabyte", "vram": vram}),
        "lengthMm": float(length.group(1)),
        "minPsu": int(psu.group(1)) if psu else None,
    }]


def aliases(item: dict) -> list[str]:
    """Gigabyte added "SFF" (NVIDIA's small-form-factor label) to existing cards' names ("EAGLE OC
    SFF"); shops still write "Eagle OC". makers.apply uses an alias only when no other Gigabyte card
    has that name."""
    if not re.search(r"\bSFF\b", item["name"]):
        return []
    info = normalize.classify(item["name"])
    key = info and normalize.card_key({"title": re.sub(r"\bSFF\b", "", item["name"]), "chip": info[1],
                                       "partner": "Gigabyte", "vram": info[2]})
    return [key] if key else []


def listing_parts(cat: str, l: dict) -> list[str]:
    """Part-number text after each "GV-" in the title and URL, as one run of letters and digits
    ("GV-N506TEAGLEOC ICE-8GD, 8GB" -> "GVN506TEAGLEOCICE8GD8GB…"); products match by prefix."""
    out = []
    for text in (l["title"], l["url"]):
        for m in re.finditer(r"GV-", text, re.I):
            out.append(_alnum(text[m.start(): m.start() + 48]))
    return out


def listing_key(cat: str, l: dict) -> str | None:
    return normalize.card_key(l)
