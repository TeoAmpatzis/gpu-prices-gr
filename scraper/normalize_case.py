"""PC case title -> vendor / model name / size / window / RGB.

Unlike RAM/PSU, a case *is* its model, so listings are grouped by vendor + model name
("Lian Li O11 Vision Compact"), with colour variants merged. Both sites write the model name
first and descriptors after, so the name is cut at the first descriptor:

BestPrice: "Lian Li O11 Vision Compact Black Gaming Midi Tower Κουτί Υπολογιστή με Πλαϊνό Παράθυρο"
Skroutz:   "Lian Li O11 Vision Compact Gaming Midi Tower με Πλαϊνό Παράθυρο" (colour only in the slug)
"""

import re

import names
from models import CaseListing

# The name ends at the first real descriptor: a size phrase ("Midi Tower"), "με ..." or the
# category name. Bare "Tower"/"Gaming" are not cut at: "The Tower 600", "TUF Gaming GT502".
CUT = re.compile(
    r"\s(?:(?:Mid|Midi|Mini|Micro|Full|Ultra|Super|Big)[\s-]?Tower|Κουτί|με|with|Mesh\s+Tower)\b.*$", re.I
)
# Side-panel options of the same case ("Define 7 Solid" / "Define 7 TG Clear Tint") and words only
# one site uses; colours come from names.COLORS.
NOISE = names.noise_regex([
    "Arctic", "TG", "Tempered Glass", "Window", "Solid", "Clear Tint", "Light Tint", "Dark Tint", "Clear",
    "Mirror", "Metal Panel", "& Fans", "Gaming", "RGB", "ARGB", "Edition",
])

SIZES = [
    (re.compile(r"\b(Full|Ultra|Super|Big)[\s-]?Tower\b", re.I), "Full Tower"),
    (re.compile(r"\bMidi?[\s-]?Tower\b", re.I), "Midi Tower"),
    (re.compile(r"\b(Mini|Micro)[\s-]?Tower\b", re.I), "Mini Tower"),
    (re.compile(r"\b(Cube|SFF|Small Form Factor|HTPC|Mini[\s-]?ITX)\b", re.I), "SFF / Cube"),
]
IS_CASE = re.compile(r"Tower|Cube|SFF|HTPC|Κουτί|Kouti|Chassis|Case\b", re.I)
EXCLUDE = re.compile(
    r"riser|dust\s*filter|φίλτρο|\bstand\b|handle|bracket|\bmount\b|καλώδι|\bcable|adapter|\bkit\b|"
    r"side\s*panel|πάνελ|\bfan\b|ανεμιστήρ",
    re.I,
)
WINDOW = re.compile(r"Παράθυρο|Parathyro|Window|Tempered\s*Glass|\bTG\b|Glass", re.I)
RGB = re.compile(r"\bA?RGB\b|Fotismo|Φωτισμό", re.I)


def make_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> CaseListing | None:
    title = re.sub(r"\s+", " ", title).strip()
    text = f"{title} {url.replace('-', ' ')} {specs}"
    if price <= 0 or EXCLUDE.search(title) or not IS_CASE.search(text):
        return None
    vendor, rest = names.split_vendor(title)
    name = names.clean_name(CUT.sub("", " " + rest), NOISE)
    if not name or not names.valid_vendor(vendor):
        return None
    size = next((v for pattern, v in SIZES if pattern.search(text)), "Άλλο")
    # BestPrice appends the category name ("... Κουτί Υπολογιστή με Πλαϊνό Παράθυρο").
    title = re.sub(r"\s*Κουτί Υπολογιστή", "", title)
    return CaseListing(
        id=f"{source}:{native_id}",
        source=source,
        title=title,
        url=url,
        price=round(price, 2),
        shopCount=shop_count,
        brand=vendor,
        chip=f"{vendor} {name}",
        size=size,
        window=bool(WINDOW.search(text)),
        rgb=bool(RGB.search(text)),
        scrapedAt=scraped_at,
    )

