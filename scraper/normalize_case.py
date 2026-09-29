"""PC case title -> vendor / model name / size / window / RGB.

Unlike RAM/PSU, a case *is* its model, so listings are grouped by vendor + model name
("Lian Li O11 Vision Compact"), with colour variants merged. Both sites write the model name
first and descriptors after, so the name is cut at the first descriptor:

BestPrice: "Lian Li O11 Vision Compact Black Gaming Midi Tower Κουτί Υπολογιστή με Πλαϊνό Παράθυρο"
Skroutz:   "Lian Li O11 Vision Compact Gaming Midi Tower με Πλαϊνό Παράθυρο" (colour only in the slug)
"""

import re

from models import CaseListing

VENDORS = [
    "Lian Li", "Be Quiet", "Fractal Design", "Cooler Master", "Corsair", "NZXT", "Phanteks", "Thermaltake",
    "Cougar", "Kolink", "Montech", "Deepcool", "Asus", "MSI", "Gigabyte", "Antec", "SilverStone", "Jonsbo",
    "HYTE", "Sharkoon", "Aerocool", "Gamemax", "1stPlayer", "Darkflash", "Thermalright", "Xigmatek", "Zalman",
    "Arctic", "Endorfy", "Chieftec", "Inter-Tech", "Raijintek", "Enermax", "Gamdias", "Alcatroz", "ProGaming",
    "Mars Gaming", "Monarch Gear", "Redragon", "Xilence", "LC-Power", "Akyga", "Spacer", "Tacens", "Nox",
    "Lancool", "Sama", "Apnx", "Ocypus", "Azza", "Genesis", "Rebeltec", "Powertech", "Supercase",
    "Power Train",  # no model names in its titles, so these get dropped (empty name)
]
VENDOR_ALIASES = {
    "bequiet": "Be Quiet", "be quiet!": "Be Quiet", "coolermaster": "Cooler Master", "cm": "Cooler Master",
    "fsp/fortron": "FSP", "fsp fortron": "FSP", "natec genesis": "Genesis",
}

# The name ends at the first real descriptor: a size phrase ("Midi Tower"), "με ..." or the
# category name. Bare "Tower"/"Gaming" are not cut at: "The Tower 600", "TUF Gaming GT502".
CUT = re.compile(
    r"\s(?:(?:Mid|Midi|Mini|Micro|Full|Ultra|Super|Big)[\s-]?Tower|Κουτί|με|with|Mesh\s+Tower)\b.*$", re.I
)
# Removed anywhere so both sites reduce to the same name. BestPrice puts the colour (often a
# marketing name) before the descriptors; Skroutz keeps it only in the slug.
COLORS = [
    "Black", "White", "Grey", "Gray", "Silver", "Pink", "Blue", "Red", "Green", "Snow", "Mint", "Beige",
    "Brown", "Wood", "Gold", "Purple", "Yellow", "Orange", "Turquoise", "Racing Green", "Matcha Green",
    "Matcha Plum", "Hydrangea Blue", "Bumblebee", "Bumble Pink", "Bubble Pink", "Peach Fuzz", "Mocha Mousse",
    "Future Dusk", "Gravel Sand", "Limestone", "Mint Strawberry", "Arctic White", "Glacier White", "Frost",
    "Μαύρο", "Λευκό", "Γκρι", "Ασημί", "Ροζ", "Μπλε", "Κόκκινο", "Πράσινο", "Χρώμα",
    "Walnut", "Chalk", "Cobalt", "Arctic", "Satin Aluminum", "Metallic",
    # Side-panel options of the same case ("Define 7 Solid" / "Define 7 TG Clear Tint").
    "TG", "Tempered Glass", "Window", "Solid", "Clear Tint", "Light Tint", "Dark Tint", "Clear", "Mirror",
    "Metal Panel", "& Fans",
]
NOISE = re.compile(
    r"\b(?:" + "|".join(sorted((re.escape(c) for c in COLORS), key=len, reverse=True)) + r"|Gaming|A?RGB|Edition)\b",
    re.I,
)

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


def split_vendor(title: str) -> tuple[str, str]:
    low = title.lower()
    for alias, v in VENDOR_ALIASES.items():
        if low.startswith(alias + " "):
            return v, title[len(alias) + 1:]
    for v in VENDORS:
        if low.startswith(v.lower() + " "):
            return v, title[len(v) + 1:]
    first, _, rest = title.partition(" ")
    return first, rest


def make_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> CaseListing | None:
    title = re.sub(r"\s+", " ", title).strip()
    text = f"{title} {url.replace('-', ' ')} {specs}"
    if price <= 0 or EXCLUDE.search(title) or not IS_CASE.search(text):
        return None
    vendor, rest = split_vendor(title)
    if rest.lower().startswith(vendor.lower() + " "):  # "Darkflash Darkflash FT418 Pro"
        rest = rest[len(vendor) + 1:]
    name = re.sub(r"\s+", " ", NOISE.sub(" ", CUT.sub("", " " + rest))).strip(" -,/&")
    if not name or not re.match(r"[A-Za-z]", vendor) or vendor.upper() == "PC":  # "PC CASE MICRO-ATX ..."
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


def model_key(chip: str) -> str:
    """Grouping key: letters and digits only, so "MC-PMAX" == "MCPMAX" and "NZXT" == "Nzxt".
    Same as `modelKey` for cases in src/lib/categories.tsx."""
    return re.sub(r"[^a-z0-9]", "", chip.lower())
