"""LIAN LI cases, AIO coolers and fans (lian-li.com, WordPress).

Catalogue: https://lian-li.com/product-sitemap.xml (`<loc><![CDATA[…/product/<slug>/]]></loc>`).
A product page has spec tables, one per product line, with a column per variant:
  MODEL NAME | LANCOOL 216 | LANCOOL 216 RGB …
  FAN SUPPORT | Top: 3 x 120mm / 2 x 140mm PSU Cover: … Front: 3 x 120mm / 2 x 140mm / 2 x 160mm …
  RADIATOR SUPPORT | Front: 360 / 280 / 240mm Top: 360 / 280 / 240mm Bottom: 240mm
  GPU LENGTH CLEARANCE | 392mm (max)      CPU COOLER HEIGHT CLEARANCE | 180.5mm (max)
  INCLUDED FANS | Front: 2 x 160mm PWM Fans Rear: 1 x 140mm PWM Fan
  (AIO)  MODEL NAME | GA II Trinity 360 | GA II Trinity 240;  TYPE | 360mm | 240mm;
         COMPATIBLE CPU SOCKETS | Intel: LGA 1851 / 1700 / 1200 / 115x AMD: AM5 / AM4
  (fan)  MODEL NAME | UNI FAN TL 120 | UNI FAN TL 140;  MAX. AIRFLOW | 90.1 CFM | 103.9 CFM;
         MAX. AIR PRESSURE | 3.97 mmH2O | 2.34 mmH2O
A cell that covers several variants is written once, so a row may have fewer cells than variants.

Matching: a listing's name without the brand ("O11 Dynamic EVO", "Uni Fan TL 120mm ×3",
"Galahad II Trinity 360") must start with the product's slug or model name (+ size for fans and
AIOs), letters and digits only; the longest match wins ("uni-fan-tl-wireless" before "uni-fan-tl").
robots.txt allows product pages.
"""

import re

from selectolax.parser import HTMLParser

import normalize_case
import specs

from .common import alnum, fans, fetch, included, mm, number, radiators

NAME = "lianli"
VERSION = 2  # 2: an included-fans field saying "None"/"N/A" is stored as no fans ([])
BRANDS = {"case": {"Lian Li", "Lancool"}, "cooler": {"Lian Li"}, "fan": {"Lian Li"}}
SITEMAP = "https://lian-li.com/product-sitemap.xml"
PRODUCT = re.compile(r"https://lian-li\.com/product/([a-z0-9-]+)/?$", re.I)


def catalogue(s) -> list[dict]:
    xml = fetch(s, SITEMAP)
    out = []
    for url in re.findall(r"<loc>(?:<!\[CDATA\[)?\s*([^<\]\s]+)", xml):
        if m := PRODUCT.match(url):
            out.append({"url": url, "slug": m.group(1)})
    return out


def norm(text: str) -> str:
    """Letters and digits, with the spellings shops mix normalised: "UNI FAN"/"UNIFAN"/"UNI" fans,
    "SL-INF"/"SL INFINITY", "Reverse Blade"/"Reverse", and Lian Li's own "GA II" = "Galahad II"."""
    a = alnum(text).replace("UNIFAN", "UNI").replace("INFINITY", "INF").replace("REVERSEBLADE", "REVERSE")
    return re.sub(r"^GA(?=II)", "GALAHAD", a)


def listing_parts(cat: str, l: dict) -> list[str]:
    chip = l["chip"]
    bare = re.sub(r"^(?:Lian[\s-]?Li|Lancool)\s+", "", chip, flags=re.I)
    return list(dict.fromkeys([norm(bare), norm(chip)]))


def listing_key(cat: str, l: dict) -> str | None:
    return None


def rank(product: dict, needy: dict[str, list[dict]]) -> int:
    slug = norm(product["slug"])
    if len(slug) < 3:
        return 0
    return sum(1 for ls in needy.values() for l in ls if any(p.startswith(slug) for p in listing_parts("", l)))


def _tables(html: str) -> list[dict[str, list[str]]]:
    """Each spec table as {LABEL: [cells…]} (label upper-case, cells after the label)."""
    out = []
    for table in HTMLParser(html).css("table"):
        rows: dict[str, list[str]] = {}
        for r in table.css("tr"):
            cells = [re.sub(r"\s+", " ", c.text(separator=" ", strip=True)) for c in r.css("th, td")]
            if len(cells) >= 2 and cells[0]:
                rows.setdefault(cells[0].upper().rstrip(":"), cells[1:])
        name = next((rows[k] for k in NAME_ROWS if k in rows), None)
        if name:
            rows["_NAME"] = name
            out.append(rows)
    return out


# Older pages label rows differently ("PRODUCT NAME", "VGA Length", "CPU Clearance", "Incl Fans").
NAME_ROWS = ("MODEL NAME", "PRODUCT NAME", "MODEL NO.", "MODEL")
BOARD_ROWS = ("MOTHERBOARD SUPPORT", "MOTHERBOARD")
FAN_ROWS = ("FAN SUPPORT",)
RADIATOR_ROWS = ("RADIATOR SUPPORT", "RADIATOR")
INCLUDED_ROWS = ("INCLUDED FANS", "PRE-INSTALLED FANS", "INCL FANS", "FANS INCLUDED", "INCLUDED FAN")


def _cell(rows: dict[str, list[str]], i: int, *labels: str) -> str | None:
    for label in labels:
        cells = rows.get(label)
        if cells:
            return cells[min(i, len(cells) - 1)]
    return None


def _cell_with(rows: dict[str, list[str]], *needles: tuple[str, ...]) -> str | None:
    """The first row whose label has one word of each group: ("GPU", "VGA"), ("LENGTH", "CLEARANCE")
    finds "GPU LENGTH CLEARANCE", "VGA Length", "MAXIMUM GPU LENGTH"."""
    for label, cells in rows.items():
        if cells and all(any(w in label for w in group) for group in needles):
            return cells[0]
    return None


def parse(url: str, html: str) -> list[dict]:
    slug = norm(PRODUCT.match(url).group(1))
    items = []
    for t_index, rows in enumerate(_tables(html)):
        names = rows["_NAME"]
        gpu = _cell_with(rows, ("GPU", "VGA"), ("LENGTH", "CLEARANCE"))
        if (gpu or any(k in rows for k in BOARD_ROWS)) and "PUMP SPEED" not in rows:
            # A "MODEL NO." cell is a code ("LANCOOL II – X"); the slug names the case then.
            coded = not any(k in rows for k in ("MODEL NAME", "PRODUCT NAME"))
            name = PRODUCT.match(url).group(1) if coded else names[0]
            boards = _cell(rows, 0, *BOARD_ROWS)
            items.append({
                "cat": "case",
                "name": name,
                "parts": list(dict.fromkeys([slug, norm(name)])),
                "gpuMaxMm": mm(gpu),
                "coolerMaxMm": mm(_cell_with(rows, ("CPU",), ("HEIGHT", "CLEARANCE"))),
                "fanMounts": fans(_cell(rows, 0, *FAN_ROWS) or ""),
                "fansIncluded": included(_cell(rows, 0, *INCLUDED_ROWS)),
                "radiators": radiators(_cell(rows, 0, *RADIATOR_ROWS) or ""),
                **({"maxBoard": normalize_case.max_board(boards)} if boards and normalize_case.max_board(boards) else {}),
            })
            break  # one case per page (the other tables are colour/lighting variants)
        sockets = specs._sockets(_cell(rows, 0, "COMPATIBLE CPU SOCKETS", "SOCKET", "CPU SOCKET"))
        if sockets and ("PUMP SPEED" in rows or "RADIATOR SIZE" in rows or "TYPE" in rows):
            for i, name in enumerate(names):
                size = re.search(r"(120|240|280|360|420)", f"{name} {_cell(rows, i, 'TYPE') or ''}")
                parts = [norm(name)] + ([slug + size.group(1)] if size and t_index == 0 else [])
                items.append({"cat": "cooler", "name": name, "parts": parts, "sockets": sockets})
            continue
        if any(k in rows for k in ("MAX. AIRFLOW", "AIRFLOW")) and "PUMP SPEED" not in rows:
            for i, name in enumerate(names):
                # "UNI FAN TL 120", "UNI FAN TL120 LCD Wireless" (size inside a word too)
                size = re.search(r"(?<!\d)(120|140|160)(?!\d)", name) or re.search(
                    r"(?<!\d)(120|140|160)(?!\d)", _cell(rows, i, "FAN DIMENSION") or "")
                if not size:
                    continue
                # Names only: a page's slug can fit several of its fans ("uni-fan-tl-wireless" covers
                # the TL Wireless and the TL LCD Wireless).
                bare = re.sub(rf"(?<!\d){size.group(1)}(?!\d)", " ", name).strip()
                parts = [norm(name), norm(bare) + size.group(1)]
                connector = specs._connector(_cell(rows, i, "CONNECTOR TYPE", "CONNECTOR") or "")
                items.append({
                    "cat": "fan",
                    "name": name,
                    "parts": list(dict.fromkeys(parts)),
                    "airflowCfm": number(_cell(rows, i, "MAX. AIRFLOW", "AIRFLOW"), "CFM"),
                    "pressureMm": number(_cell(rows, i, "MAX. AIR PRESSURE", "STATIC PRESSURE", "AIR PRESSURE"), "mmH"),
                    "connector": connector if connector in ("3-pin", "4-pin PWM") else None,
                })
    return items
