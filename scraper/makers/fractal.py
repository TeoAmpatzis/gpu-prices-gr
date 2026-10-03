"""FRACTAL DESIGN cases (www.fractal-design.com).

Catalogue: https://www.fractal-design.com/sitemap.xml, English pages
`/products/cases/<series>/<model>/<variant>/` (robots.txt allows them; it only shuts out AI crawlers).
The page's own specifications are label / value lines:
  Motherboard compatibility   Mini ITX, Mini DTX, Micro ATX, ATX, E-ATX
  Top fan mounts              3x 120 mm or 2x 140 mm      (also Front / Side / Bottom / Rear; "3x 120/140 mm")
  Fans included               4x Aspect 12X Reverse  /  3x Aspect 14 PWM (front)    ("14" = 140 mm)
  GPU max length 412 mm,  CPU cooler max height 172 mm,  Top radiator compatibility 120, 140, 240, 280, 360
Some pages first show a comparison table of the family with the same labels; the product's own block
comes last, so the last occurrence of each label is used. Matching: "Fractal Design <model>"
through our own normalizer.
"""

import re

from selectolax.parser import HTMLParser

import normalize_case

from .common import NO_FANS, alnum, fetch, mm, model_key

NAME = "fractal"
VERSION = 2  # 2: "Fans included: None" is stored as no fans ([])
BRANDS = {"case": {"Fractal Design"}}
SITEMAP = "https://www.fractal-design.com/sitemap.xml"
PRODUCT = re.compile(r"https://www\.fractal-design\.com/products/cases/[a-z0-9-]+/([a-z0-9-]+)/[a-z0-9-]+/$")
POSITIONS = ("front", "top", "rear", "bottom", "side")


def catalogue(s) -> list[dict]:
    xml = fetch(s, SITEMAP)
    seen, out = set(), []
    for u in re.findall(r"<loc>([^<]+)</loc>", xml):
        if (m := PRODUCT.match(u)) and m.group(1) not in seen:  # one variant page per model
            seen.add(m.group(1))
            out.append({"url": u, "model": m.group(1)})
    return out


def _model(slug: str) -> str:
    return slug.replace("-", " ").title()


def listing_key(cat: str, l: dict) -> str | None:
    return normalize_case.names.model_key(l["chip"])


def listing_parts(cat: str, l: dict) -> list[str]:
    return []


def rank(product: dict, needy: dict[str, list[dict]]) -> int:
    key = model_key("case", f"Fractal Design {_model(product['model'])} Case")
    return sum(1 for l in needy.get("case", []) if listing_key("case", l) == key)


def _counts(text: str) -> list[tuple[int, int]]:
    """"3x 120 or 2x 140 mm" -> [(3, 120), (2, 140)]; "3x 120/140 mm" -> [(3, 120), (3, 140)]."""
    out = []
    for n, sizes in re.findall(r"(\d+)\s*x\s*((?:\d{2,3}\s*/\s*)*\d{2,3})", text):
        out += [(int(n), int(s)) for s in re.split(r"\s*/\s*", sizes)]
    return out


def _specs(html: str) -> dict[str, str]:
    """{label (lower case): the line after it}, the last occurrence winning (the product's own block)."""
    t = HTMLParser(html)
    for n in t.css("script, style, svg"):
        n.decompose()
    lines = [l.strip() for l in (t.body.text(separator="\n") if t.body else "").splitlines() if l.strip()]
    labels = {f"{p} {w}" for p in POSITIONS for w in ("fan mounts", "radiator compatibility")} | {
        "fans included", "motherboard compatibility", "gpu max length", "cpu cooler max height"}
    return {l.lower(): lines[i + 1] for i, l in enumerate(lines[:-1]) if l.lower() in labels}


def parse(url: str, html: str) -> list[dict]:
    model = PRODUCT.match(url).group(1)
    spec = _specs(html)
    mounts: dict[tuple[str, int], int] = {}
    radiators = []
    for pos in POSITIONS:
        for n, size in _counts(spec.get(f"{pos} fan mounts", "")):
            mounts[(pos, size)] = max(mounts.get((pos, size), 0), n)
        sizes = sorted({int(x) for x in re.findall(r"\b\d{3}\b", spec.get(f"{pos} radiator compatibility", ""))})
        if sizes:
            radiators.append({"pos": pos, "sizes": sizes})
    # "3x Aspect 14 PWM (front)", "4x Aspect 12X Reverse" (no position); "None" = no fans ([])
    said = spec.get("fans included", "")
    included = [{"pos": pos.lower() or None, "size": int(size) * 10, "n": int(n)} for n, size, pos in re.findall(
        r"(\d+)\s*x\s+[A-Za-z ]*?\b(12|14|18|20)X?\b[^(,]*(?:\((front|rear|top|bottom|side)\))?", said, re.I)]
    fans_in = included or ([] if said and NO_FANS.match(said) else None)
    boards = spec.get("motherboard compatibility", "")
    board = normalize_case.max_board(boards) if boards else None
    key = model_key("case", f"Fractal Design {_model(model)} Case")
    if not key:
        return []
    return [{
        "cat": "case",
        "name": _model(model),
        "key": key,
        "gpuMaxMm": mm(spec.get("gpu max length")),
        "coolerMaxMm": mm(spec.get("cpu cooler max height")),
        "fanMounts": [{"pos": p, "size": s, "n": n} for (p, s), n in mounts.items()] or None,
        "fansIncluded": fans_in,
        "radiators": radiators or None,
        **({"maxBoard": board} if board else {}),
    }]
