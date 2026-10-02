"""ASUS graphics cards (www.asus.com).

Catalogue: the global sitemaps https://www.asus.com/sitemap/global<N>.xml (robots.txt names the
index), pages `/motherboards-components/graphics-cards/<series>/<model code>/`; the spec page is
`<that>/techspec/`, rendered in the HTML: "Dimensions" then "304 x 126 x 50 mm", "Recommended PSU"
then "750W"; the title names the card ("ASUS Prime GeForce RTX™ 5070 OC Edition 12GB GDDR7 - Tech
Specs"). The model code ("prime-rtx5070-o12g") is ASUS's part number, which Skroutz titles often
carry ("PRIME-RTX5070-O12G"); other titles match by normalize.card_key of the name.
"""

import re

from selectolax.parser import HTMLParser

import normalize

from .common import alnum

NAME = "asus"
BRANDS = {"gpu": {"Asus"}}
SITEMAPS = [f"https://www.asus.com/sitemap/global{i}.xml" for i in range(1, 21)]
CARD = re.compile(r"https://www\.asus\.com/motherboards-components/graphics-cards/[a-z0-9-]+/([a-z0-9-]+)/$", re.I)
# ASUS model codes in shop titles: "PRIME-RTX5070-O12G", "TUF-RTX5070TI-O16G-GAMING", "DUAL-RX9060XT-O16G".
CODE = re.compile(r"\b(?:ROG-STRIX|ROG-ASTRAL|ROG|TUF|DUAL|PRIME|PROART|ASTRAL|KO|PH|TURBO)-(?:RTX|RX|GTX|GT|ARC)[A-Z0-9-]+", re.I)


def catalogue(s) -> list[dict]:
    out, seen = [], set()
    for sitemap in SITEMAPS:
        r = s.get(sitemap, timeout=60)
        if r.status_code != 200:
            break
        for url in re.findall(r"<loc>([^<]+)</loc>", r.text):
            if (m := CARD.match(url)) and m.group(1) not in seen:
                seen.add(m.group(1))
                out.append({"url": url + "techspec/", "code": m.group(1)})
    return out


def rank(product: dict, needy: dict[str, list[dict]]) -> int:
    code = alnum(product["code"])
    return sum(1 for l in needy.get("gpu", []) if alnum(l["chip"]) in code)


def _after(html: str, label: str, pattern: str) -> re.Match | None:
    i = html.find(f">{label}<")
    return re.search(pattern, re.sub(r"<[^>]+>", " ", html[i:i + 1500])) if i >= 0 else None


def parse(url: str, html: str) -> list[dict]:
    title = HTMLParser(html).css_first("title")
    # "ASUS Prime GeForce RTX™ 5070 OC Edition 12GB GDDR7 - Tech Specs"; older pages:
    # "Dual GeForce RTX 3050 V2 8GB GDDR6 | Graphics Card | ASUS Global".
    name = re.sub(r"\s*(?:-\s*Tech Specs|\|).*$|™|®|^ASUS\s+", "", title.text() if title else "").strip()
    info = normalize.classify(name)
    dims = _after(html, "Dimensions", r"(\d+(?:\.\d+)?)\s*x\s*\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?\s*mm")
    psu = _after(html, "Recommended PSU", r"(\d{3,4})\s*W")
    if not info or not dims:
        return []
    _, chip, vram = info
    code = CARD.match(url.removesuffix("techspec/")).group(1)
    return [{
        "cat": "gpu",
        "name": name,
        "parts": [alnum(code)],
        "key": normalize.card_key({"title": name, "chip": chip, "partner": "Asus", "vram": vram}),
        "lengthMm": float(dims.group(1)),
        "minPsu": int(psu.group(1)) if psu else None,
    }]


def listing_parts(cat: str, l: dict) -> list[str]:
    return [alnum(m.group(0)) for text in (l["title"], l["url"]) for m in CODE.finditer(text)]


def listing_key(cat: str, l: dict) -> str | None:
    return normalize.card_key(l)
