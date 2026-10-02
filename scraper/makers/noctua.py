"""NOCTUA fans and CPU coolers (www.noctua.at).

Catalogue: https://www.noctua.at/sitemap.xml (robots.txt names it), products at
`/en/products/<slug>` ("nf-a12x25-pwm", "nh-d15-g2"); the spec page `<that>/specifications` is a
label | value table:
  fan:    "Size (Form factor)" 120 x 120 x 25 mm (square), "Airflow (max.)" 102.1 m³/h (60.09 CFM),
          "Static pressure (max.)" 2.34 mm H₂O, "Connector" 4-pin
  cooler: "Socket compatibility" AM5, AM4, LGA1700, …, "Height with fan(s)" 168 mm
Matching is exact (no prefixes: NH-D15 / NH-D15S differ in height, NF-A14 PWM / FLX / ULN in
airflow): the shop's name without "Noctua", size and pack must equal the slug, letters and digits
only ("Noctua NF-A14 FLX 140mm" = "nf-a14-flx").
"""

import re

from selectolax.parser import HTMLParser

import specs

from .common import alnum, fetch, mm, number

NAME = "noctua"
BRANDS = {"cooler": {"Noctua"}, "fan": {"Noctua"}}
SITEMAP = "https://www.noctua.at/sitemap.xml"
PRODUCT = re.compile(r"https://www\.noctua\.at/en/products/([a-z0-9-]+)/?$", re.I)


def catalogue(s) -> list[dict]:
    xml = fetch(s, SITEMAP)
    return [{"url": u.rstrip("/") + "/specifications", "slug": m.group(1)}
            for u in re.findall(r"<loc>([^<]+)</loc>", xml) if (m := PRODUCT.match(u))]


def listing_key(cat: str, l: dict) -> str | None:
    bare = re.sub(r"^Noctua\s+", "", l["chip"], flags=re.I)
    return alnum(re.sub(r"\s*\d{2,3}\s*mm(?:\s*×\s*\d+)?\s*$", "", bare)) or None


def listing_parts(cat: str, l: dict) -> list[str]:
    return []


def rank(product: dict, needy: dict[str, list[dict]]) -> int:
    slug = alnum(product["slug"])
    return sum(1 for cat, ls in needy.items() for l in ls if listing_key(cat, l) == slug)


def parse(url: str, html: str) -> list[dict]:
    rows: dict[str, str] = {}
    for r in HTMLParser(html).css("tr"):
        cells = [re.sub(r"\s+", " ", c.text(separator=" ", strip=True)) for c in r.css("th, td")]
        if len(cells) >= 2 and cells[0]:
            rows.setdefault(cells[0], cells[1])
    slug = alnum(PRODUCT.match(url.removesuffix("/specifications")).group(1))
    sockets = specs._sockets(rows.get("Socket compatibility"))
    if sockets:
        height = mm(rows.get("Height with fan(s)") or rows.get("Height (with fan)") or rows.get("Height (without fan)"))
        return [{"cat": "cooler", "name": slug, "key": slug, "sockets": sockets, "heightMm": height}]
    airflow = rows.get("Airflow (max.)") or rows.get("Airflow")
    if airflow and rows.get("Size (Form factor)"):
        connector = specs._connector(rows.get("Connector") or "")
        return [{
            "cat": "fan",
            "name": slug,
            "key": slug,
            "airflowCfm": number(airflow, "CFM"),  # "102.1 m³/h (60.09 CFM)"
            "pressureMm": number(rows.get("Static pressure (max.)") or rows.get("Static pressure"), "mm"),
            "connector": connector if connector in ("3-pin", "4-pin PWM") else None,
        }]
    return []
