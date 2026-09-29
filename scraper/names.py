"""Shared helpers for categories whose model *is* the product (cases, fans, coolers):
vendor splitting, colour/noise removal and the grouping key.

Both sites write "<vendor> <model name> <descriptors...>"; each normalizer cuts the
descriptors with its own regex, then `clean_name` strips colours and other words that
only one site includes, so "Arctic Liquid Freezer III Pro 360 Black" (BestPrice) and
"Arctic Liquid Freezer III Pro 360 A-RGB" (Skroutz) reduce to the same name.
"""

import re

VENDORS = [
    "Lian Li", "Be Quiet", "Fractal Design", "Cooler Master", "Corsair", "NZXT", "Phanteks", "Thermaltake",
    "Cougar", "Kolink", "Montech", "Deepcool", "Asus", "MSI", "Gigabyte", "Antec", "SilverStone", "Jonsbo",
    "HYTE", "Sharkoon", "Aerocool", "Gamemax", "1stPlayer", "Darkflash", "Thermalright", "Xigmatek", "Zalman",
    "Arctic", "Endorfy", "Chieftec", "Inter-Tech", "Raijintek", "Enermax", "Gamdias", "Alcatroz", "ProGaming",
    "Mars Gaming", "Monarch Gear", "Redragon", "Xilence", "LC-Power", "Akyga", "Spacer", "Tacens", "Nox",
    "Lancool", "Sama", "Apnx", "Ocypus", "Azza", "Genesis", "Rebeltec", "Powertech", "Supercase",
    "Noctua", "ID-Cooling", "Scythe", "Alphacool", "EKWB", "EK", "Cryorig", "PCCooler", "Gelid", "Akasa",
    "Noiseblocker", "Upsiren", "Valkyrie", "Coolermaster",
    "Power Train",  # no model names in its case titles, so those get dropped (empty name)
]
VENDOR_ALIASES = {
    "bequiet": "Be Quiet", "be quiet!": "Be Quiet", "coolermaster": "Cooler Master", "cm": "Cooler Master",
    "fsp/fortron": "FSP", "fsp fortron": "FSP", "natec genesis": "Genesis", "id cooling": "ID-Cooling",
    "ek-quantum": "EKWB", "ek": "EKWB", "deep cool": "Deepcool",
}

# BestPrice often has marketing colour names; Skroutz keeps the colour only in the slug.
COLORS = [
    "Black", "White", "Grey", "Gray", "Silver", "Pink", "Blue", "Red", "Green", "Snow", "Mint", "Beige",
    "Brown", "Wood", "Gold", "Purple", "Yellow", "Orange", "Turquoise", "Racing Green", "Matcha Green",
    "Matcha Plum", "Hydrangea Blue", "Bumblebee", "Bumble Pink", "Bubble Pink", "Peach Fuzz", "Mocha Mousse",
    "Future Dusk", "Gravel Sand", "Limestone", "Mint Strawberry", "Arctic White", "Glacier White", "Frost",
    "Walnut", "Chalk", "Cobalt", "Satin Aluminum", "Metallic", "Charcoal",
    "Μαύρο", "Λευκό", "Λευκή", "Μαύρη", "Γκρι", "Ασημί", "Ροζ", "Μπλε", "Κόκκινο", "Πράσινο", "Χρώμα",
]


def noise_regex(extra: list[str]) -> re.Pattern:
    words = sorted((re.escape(w) for w in COLORS + extra), key=len, reverse=True)
    return re.compile(r"(?<![\w-])(?:" + "|".join(words) + r")(?![\w-])", re.I)


def split_vendor(title: str) -> tuple[str, str]:
    """("Lian Li", "O11 Vision ...") — known vendors (multi-word too) first, else the first word."""
    low = title.lower()
    vendor, rest = None, ""
    for alias, v in VENDOR_ALIASES.items():
        if low.startswith(alias + " "):
            vendor, rest = v, title[len(alias) + 1:]
            break
    if vendor is None:
        for v in VENDORS:
            if low.startswith(v.lower() + " "):
                vendor, rest = v, title[len(v) + 1:]
                break
    if vendor is None:
        vendor, _, rest = title.partition(" ")
    if rest.lower().startswith(vendor.lower() + " "):  # "Darkflash Darkflash FT418 Pro"
        rest = rest[len(vendor) + 1:]
    return vendor, rest


def clean_name(name: str, noise: re.Pattern) -> str:
    return re.sub(r"\s+", " ", noise.sub(" ", name)).strip(" -,/&+")


def model_key(chip: str) -> str:
    """Grouping key: letters and digits only, so "MC-PMAX" == "MCPMAX" and "NZXT" == "Nzxt".
    Same as `productKey` in src/lib/categories.tsx."""
    return re.sub(r"[^a-z0-9]", "", chip.lower())


# First words that are descriptors, not vendors ("Case Fan 120mm", "PC CASE MICRO-ATX ...").
NOT_VENDORS = {"pc", "case", "pwm", "fan", "cpu", "argb", "rgb", "led"}


def valid_vendor(vendor: str) -> bool:
    return bool(re.search(r"[A-Za-z]", vendor)) and vendor.lower() not in NOT_VENDORS
