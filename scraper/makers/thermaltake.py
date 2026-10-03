"""THERMALTAKE cases, CPU coolers and fans (www.thermaltake.com, Magento).

Catalogue: https://www.thermaltake.com/pub/pub/sitemaps/sitemap.xml (robots.txt names it), one
`/<slug>.html` page per variant ("view-380-tg-argb-mid-tower-chassis.html"). Spec table rows are
"label | value":
  case:   Model | View 380 TG ARGB;  FAN SUPPORT | Top: 3 x 120mm, … Right: 3 x 120mm … 2 x 140mm …;
          RADIATOR SUPPORT | Top: 1 x 360mm, 1 x 240mm …;  CLEARANCE | CPU cooler max height: 160mm
          VGA max length: 415mm …;  COOLING SYSTEM | Right(intake): 120 x 120 x 25 mm … fan (…) x 3 …
  cooler: COMPATIBILITY | Intel: LGA 1851/1700/… AMD: AM5/AM4/…;  Dimensions | 123.6 x 98.8 x 159.5 mm ( L x W x H)
  fan:    Fan Dimension | 120 x 120 x 25 mm;  Max Air Flow | 57.05 CFM;  Max. Air Pressure | 2.23 mm-H2O;
          Connector | 4 PIN PWM
Matching: the page title ("View 380 TG ARGB Mid Tower Chassis", "CT120 PC Cooling Fan (2-Fan
Pack)") goes through our own normalizer, so it gets the model key the shops' listings have.
"""

import re

from selectolax.parser import HTMLParser

import specs
from categories import CATEGORIES

from .common import NO_FANS, alnum, fans, fetch, model_key, number, radiators

NAME = "thermaltake"
VERSION = 2  # 2: a cooling-system field saying "None"/"N/A" is stored as no fans ([])
BRANDS = {"case": {"Thermaltake"}, "cooler": {"Thermaltake"}, "fan": {"Thermaltake"}}
SITEMAP = "https://www.thermaltake.com/pub/pub/sitemaps/sitemap.xml"
PRODUCT = re.compile(r"https://www\.thermaltake\.com/([a-z0-9-]+)\.html$", re.I)


def catalogue(s) -> list[dict]:
    xml = fetch(s, SITEMAP)
    return [{"url": u, "slug": m.group(1)} for u in re.findall(r"<loc>([^<]+)</loc>", xml) if (m := PRODUCT.match(u))]


def _bare(l: dict) -> str:
    return alnum(re.sub(r"^Thermaltake\s+", "", l["chip"], flags=re.I))


def rank(product: dict, needy: dict[str, list[dict]]) -> int:
    """Pages whose slug starts with an unmeasured model's name ("view380…" for "View 380")."""
    slug = alnum(product["slug"])
    return sum(1 for ls in needy.values() for l in ls if len(_bare(l)) >= 4 and slug.startswith(_bare(l)))


def listing_parts(cat: str, l: dict) -> list[str]:
    return []


def listing_key(cat: str, l: dict) -> str | None:
    return CATEGORIES[cat].model_key(l)


def _rows(html: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for r in HTMLParser(html).css("table tr"):
        cells = [re.sub(r"\s+", " ", c.text(separator=" ", strip=True)) for c in r.css("th, td")]
        if len(cells) == 2 and cells[0]:
            out.setdefault(cells[0].upper(), cells[1])
    return out


def _included(text: str) -> list[dict] | None:
    """"Right(intake): 120 x 120 x 25 mm ARGB Lite fan (1000rpm, 22.3 dBA) x 3 Rear(exhaust): …";
    [] when the page says none, None when it doesn't say."""
    if not text.strip():
        return None
    if NO_FANS.match(text):
        return []
    out = []
    for part in re.split(r"(?=\b(?:Front|Rear|Top|Right|Left|Side|Bottom)\b\s*(?:\([^)]*\))?\s*:)", text, flags=re.I):
        size = re.search(r"(\d{2,3})\s*x\s*\1\s*x\s*\d+\s*mm", part)
        if not size:
            continue
        n = re.findall(r"\)\s*x\s*(\d{1,2})\b|\bfans?\s*x\s*(\d{1,2})\b", part, re.I)
        count = next((int(a or b) for a, b in reversed(n)), 1)
        pos = re.match(r"\s*(Front|Rear|Top|Right|Left|Side|Bottom)", part, re.I)
        side = {"right": "side", "left": "side"}.get(pos.group(1).lower(), pos.group(1).lower()) if pos else None
        out.append({"pos": side, "size": int(size.group(1)), "n": count})
    return out or None


# Descriptors in Thermaltake's titles that the shops leave out ("CT120 PC Cooling Fan (2-Fan Pack)" is
# "Thermaltake CT120 120mm ×2" in the shops, "TOUGHLIQUID 360 ARGB Sync All-In-One Liquid Cooler" is
# "Thermaltake ToughLiquid 360").
TITLE_NOISE = re.compile(
    r"\s*\([^)]*\)|\b(?:PC\s+Cooling|High\s+Static\s+Pressure|ARGB\s+Sync|All[- ]In[- ]One|Liquid\s+Cooler)\b", re.I
)


def _clean(title: str) -> str:
    return re.sub(r"\s+", " ", TITLE_NOISE.sub(" ", title)).strip()


def _clearance(text: str, what: str) -> float | None:
    """"CPU cooler max height: 160mm VGA max length: 415mm …" -> the number after `what`."""
    m = re.search(rf"{what}[^:]*:\s*(\d+(?:\.\d+)?)\s*mm", text, re.I)
    return float(m.group(1)) if m else None


def parse(url: str, html: str) -> list[dict]:
    rows = _rows(html)
    t = HTMLParser(html).css_first("h1")
    title = t.text(strip=True) if t else ""
    if not title:
        return []
    if "CASE TYPE" in rows or "CLEARANCE" in rows:
        clearance = rows.get("CLEARANCE", "")
        key = model_key("case", f"Thermaltake {title}")
        if not key:
            return []
        return [{
            "cat": "case",
            "name": title,
            "key": key,
            "gpuMaxMm": _clearance(clearance, "VGA"),
            "coolerMaxMm": _clearance(clearance, "CPU"),
            "fanMounts": fans(rows.get("FAN SUPPORT", "")),
            "fansIncluded": _included(rows.get("COOLING SYSTEM", "")),
            "radiators": radiators(rows.get("RADIATOR SUPPORT", "")),
        }]
    sockets = specs._sockets(rows.get("COMPATIBILITY"))
    if sockets:
        key = model_key("cooler", f"Thermaltake {_clean(title)}")
        if not key:
            return []
        dims = re.findall(r"(\d+(?:\.\d+)?)", rows.get("DIMENSIONS", "").split("(")[0])
        air = "RADIATOR DIMENSION" not in rows and "PUMP SPEED" not in rows and len(dims) == 3
        return [{"cat": "cooler", "name": title, "key": key, "sockets": sockets,
                 "heightMm": float(dims[2]) if air else None}]
    size = re.search(r"(\d{2,3})\s*x\s*\1", rows.get("FAN DIMENSION", ""))
    if size and any(k in rows for k in ("MAX AIR FLOW", "MAX. AIR FLOW", "AIR FLOW")):
        pack = re.search(r"\((\d+)-Fan Pack\)|(\d+)-Pack|(Single)", title, re.I)
        n = int(pack.group(1) or pack.group(2)) if pack and not pack.group(3) else 1
        name = re.sub(r"\s+(?:Radiator\s+)?Fan\b.*$", "", _clean(title), flags=re.I)
        key = model_key("fan", f"Thermaltake {name} Case Fan {size.group(1)}mm {n}τμχ")
        if not key:
            return []
        connector = specs._connector(rows.get("CONNECTOR") or rows.get("PIN CONNECT") or "")
        return [{
            "cat": "fan",
            "name": title,
            "key": key,
            "airflowCfm": number(rows.get("MAX AIR FLOW") or rows.get("MAX. AIR FLOW") or rows.get("AIR FLOW"), "CFM"),
            "pressureMm": number(rows.get("MAX. AIR PRESSURE") or rows.get("STATIC PRESSURE"), "mm"),
            "connector": connector if connector in ("3-pin", "4-pin PWM") else None,
        }]
    return []
