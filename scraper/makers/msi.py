"""MSI graphics cards (www.msi.com).

Catalogue: https://www.msi.com/sitemap-products-001.xml (from the sitemap index robots.txt names),
cards at `/Graphics-Card/<name>` ("GeForce-RTX-5070-12G-VENTUS-2X-OC"; chip and VRAM in the name, so
only pages of chips we list are fetched). Spec page `<that>/Specification`: each row is a `div.td`
with the label in `li.specName` and the value after it ("Card Dimension (mm)" -> "236 x 126 x 50 mm",
"Recommended PSU" -> "650 W"); the title names the card ("MSI GeForce RTX™ 5070 12G VENTUS 2X OC").
Matching: normalize.card_key of that name (shops write "MSI GeForce RTX 5070 12GB GDDR7 Ventus 2X OC").
"""

import re

from selectolax.parser import HTMLParser

import normalize

from .common import fetch

NAME = "msi"
BRANDS = {"gpu": {"MSI"}}
SITEMAP = "https://www.msi.com/sitemap-products-001.xml"
CARD = re.compile(r"https://www\.msi\.com/Graphics-Card/([A-Za-z0-9-]+)/?$")


def catalogue(s) -> list[dict]:
    xml = fetch(s, SITEMAP)
    return [{"url": u.rstrip("/") + "/Specification", "name": m.group(1)}
            for u in re.findall(r"<loc>([^<]+)</loc>", xml) if (m := CARD.match(u))]


def rank(product: dict, needy: dict[str, list[dict]]) -> int:
    """Unmeasured shop cards of the page's chip whose product-line words are all in the page name
    ("GeForce-RTX-5060-8G-GAMING-OC-V1" serves "MSI GeForce RTX 5060 8GB Gaming OC"), so the budget
    isn't spent on MSI cards no Greek shop sells."""
    info = normalize.classify(product["name"].replace("-", " "))
    words = set(product["name"].lower().split("-"))
    n = 0
    for l in needy.get("gpu", []):
        key = normalize.card_key(l)
        if info and (l["chip"], l["vram"]) == (info[1], info[2]) and key and set(key.split("|")[3].split()) <= words:
            n += 1
    return n


def parse(url: str, html: str) -> list[dict]:
    t = HTMLParser(html)
    spec: dict[str, str] = {}
    for td in t.css("div.td"):
        label = td.css_first("li.specName")
        if label:
            name = label.text(strip=True)
            spec.setdefault(name, re.sub(r"\s+", " ", td.text(separator=" ", strip=True)).replace(name, "", 1).strip())
    title = t.css_first("title")
    name = re.sub(r"™|®|^MSI\s+|\s*\|.*$", "", title.text() if title else "").strip()
    info = normalize.classify(name)
    dims = re.search(r"(\d+(?:\.\d+)?)\s*x\s*\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?\s*mm", spec.get("Card Dimension (mm)", ""))
    psu = re.search(r"(\d{3,4})\s*W", spec.get("Recommended PSU", ""))
    if not info or not dims:
        return []
    _, chip, vram = info
    return [{
        "cat": "gpu",
        "name": name,
        "key": normalize.card_key({"title": name, "chip": chip, "partner": "MSI", "vram": vram}),
        "lengthMm": float(dims.group(1)),
        "minPsu": int(psu.group(1)) if psu else None,
    }]


def aliases(item: dict) -> list[str]:
    """MSI's newer pages add a revision ("GAMING V1") that shops leave out; makers.apply uses the
    name without it only when no other MSI card has that name."""
    if not re.search(r"\bV\d\b", item["name"]):
        return []
    info = normalize.classify(item["name"])
    key = info and normalize.card_key({"title": re.sub(r"\bV\d\b", "", item["name"]), "chip": info[1],
                                       "partner": "MSI", "vram": info[2]})
    return [key] if key else []


def listing_parts(cat: str, l: dict) -> list[str]:
    return []


def listing_key(cat: str, l: dict) -> str | None:
    return normalize.card_key(l)
