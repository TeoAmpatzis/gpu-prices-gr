"""CORSAIR cases and case fans (www.corsair.com). Its CPU coolers' data states no sockets, so
coolers aren't read.

Catalogue: https://www.corsair.com/us-sitemap-products-1.xml (from us-sitemap.xml, robots.txt),
pages `/us/en/p/<pc-cases|case-fans>/<part number>/<slug>`. The page embeds its specs
as JSON pairs `{"code": "Fan Support - Front", "value": "3x 120mm, 2x 140mm, 2x 200mm"}`; the
product's own come first, then those of "works well with" products (only the first value of a code
is used). Cases: "Fan Support - <position>", "Radiator Support - <position>" ("360mm, 280mm, 240mm"
or "None"), "Case Supported", sometimes "Maximum GPU Length" / CPU cooler height. Fans: "Fan Airflow"
"16.44 – 63.1 CFM", "Fan Static Pressure" "0.17 – 3.8 mm-H2O" (ranges: the maximum is kept),
"Package Quantity", "Fan Size". Corsair's "Flow Type" is not used: the owner's rule labels
airflow/pressure only from the product name (normalize_cooling.FAN_TYPES), and iCUE LINK fans plug
into Corsair's own hub, so no connector is taken either.
Matching: the page title through our own normalizer (model key), or Corsair's part number
("CC-9011349-WW") where a shop title carries it.
"""

import re

from selectolax.parser import HTMLParser

import normalize_case
from categories import CATEGORIES

from .common import NO_FANS, alnum, fans, fetch, included_fans, model_key, radiators

NAME = "corsair"
VERSION = 2  # 2: "Included Fans" read ("None" = no fans, a count, or a series name = fans, count not stated)
BRANDS = {"case": {"Corsair"}, "fan": {"Corsair"}}
SITEMAP = "https://www.corsair.com/us-sitemap-products-1.xml"
PRODUCT = re.compile(r"https://www\.corsair\.com/us/en/p/(pc-cases|case-fans)/([a-z0-9-]+)/([a-z0-9-]+)$", re.I)
CATS = {"pc-cases": "case", "case-fans": "fan"}
PART = re.compile(r"\bC[CWOX]-\d{7}-[A-Z]{2,3}\b", re.I)
CODE = re.compile(r'\{"code":"([^"]+)","value":"((?:[^"\\]|\\.)*)"')


def catalogue(s) -> list[dict]:
    xml = fetch(s, SITEMAP)
    return [{"url": u, "cat": CATS[m.group(1).lower()], "part": m.group(2), "slug": m.group(3)}
            for u in re.findall(r"<loc>([^<]+)</loc>", xml) if (m := PRODUCT.match(u))]


def _bare(l: dict) -> str:
    return alnum(re.sub(r"^Corsair\s+|\s*\d{2,3}\s*mm(?:\s*×\s*\d+)?\s*$", "", l["chip"], flags=re.I))


def rank(product: dict, needy: dict[str, list[dict]]) -> int:
    slug = alnum(product["slug"])
    return sum(1 for l in needy.get(product["cat"], []) if len(_bare(l)) >= 4 and _bare(l) in slug)


def listing_parts(cat: str, l: dict) -> list[str]:
    return [alnum(m.group(0)) for text in (l["title"], l["url"]) for m in PART.finditer(text)]


def listing_key(cat: str, l: dict) -> str | None:
    return CATEGORIES[cat].model_key(l)


def _max(text: str | None, unit: str) -> float | None:
    """The largest number before `unit` ("16.44 – 63.1 CFM" -> 63.1)."""
    nums = [float(x) for x in re.findall(rf"(\d+(?:\.\d+)?)\s*(?=[^\d]*{unit})", text or "", re.I)]
    return max(nums) if nums else None


def _included(value: str | None) -> dict:
    """"Included Fans": "None" -> no fans; "3x 120mm …" -> the fans; a series name ("RS Series") ->
    fans, count not stated."""
    if not value:
        return {}
    if NO_FANS.match(value):
        return {"fansIncluded": []}
    found = included_fans(value)
    return {"fansIncluded": found} if found else {"hasFans": True}


def parse(url: str, html: str) -> list[dict]:
    m = PRODUCT.match(url)
    cat = CATS[m.group(1).lower()]
    codes: dict[str, str] = {}
    for c in CODE.finditer(html):
        codes.setdefault(c.group(1), c.group(2).replace('\\"', '"'))
    title = HTMLParser(html).css_first("title")
    name = re.sub(r"\s*[-|]\s*(?:Black|White|Grey|Gray)\b.*$", "", title.text().strip() if title else "")
    base = {"name": name, "parts": [alnum(m.group(2))]}
    if cat == "case":
        key = model_key("case", f"Corsair {name}")
        positions = ("Front", "Top", "Rear", "Side", "Bottom")
        fan_text = " ".join(f"{p}: {codes[f'Fan Support - {p}']}" for p in positions if codes.get(f"Fan Support - {p}"))
        rad_text = " ".join(f"{p}: {codes[f'Radiator Support - {p}']}" for p in positions
                            if codes.get(f"Radiator Support - {p}") not in (None, "None", "N/A"))
        gpu = next((v for k, v in codes.items() if "GPU" in k and ("Length" in k or "Clearance" in k)), None)
        cooler = next((v for k, v in codes.items() if "CPU Cooler" in k and "Height" in k), None)
        boards = codes.get("Case Supported")
        board = normalize_case.max_board(boards) if boards else None
        return [{
            "cat": "case", **base, **({"key": key} if key else {}),
            "gpuMaxMm": _max(gpu, "mm") if gpu and gpu != "N/A" else None,
            "coolerMaxMm": _max(cooler, "mm") if cooler and cooler != "N/A" else None,
            "fanMounts": fans(fan_text),
            **_included(codes.get("Included Fans")),
            "radiators": radiators(rad_text),
            **({"maxBoard": board} if board else {}),
        }]
    if cat == "fan":
        size = re.search(r"(\d{2,3})\s*mm", codes.get("Fan Size", ""))
        if not size or not codes.get("Fan Airflow"):
            return []
        qty = re.search(r"\d+", codes.get("Package Quantity", "1"))
        model = re.split(r"\s+\d{2,3}\s*mm\b|\s+(?:PWM\s+)?(?:PC\s+)?Fans?\b", name, maxsplit=1, flags=re.I)[0]
        key = model_key("fan", f"Corsair {model} Case Fan {size.group(1)}mm {qty.group(0) if qty else 1}τμχ")
        return [{
            "cat": "fan", **base, **({"key": key} if key else {}),
            "airflowCfm": _max(codes.get("Fan Airflow"), "CFM"),
            "pressureMm": _max(codes.get("Fan Static Pressure"), "mm"),
        }]
    return []
