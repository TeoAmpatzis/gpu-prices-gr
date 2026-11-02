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
    "Noiseblocker", "Upsiren", "Valkyrie", "Coolermaster", "White Shark", "Pro Gamersware",
    "Power Train",  # no model names in its case titles, so those get dropped (empty name)
]
VENDOR_ALIASES = {
    "bequiet": "Be Quiet", "be quiet!": "Be Quiet", "coolermaster": "Cooler Master", "cm": "Cooler Master",
    "fsp/fortron": "FSP", "fsp fortron": "FSP", "natec genesis": "Genesis", "id cooling": "ID-Cooling",
    "ek-quantum": "EKWB", "ek": "EKWB", "deep cool": "Deepcool", "lian-li": "Lian Li",
}

# BestPrice often has marketing colour names; Skroutz keeps the colour only in the slug.
COLORS = [
    "Black", "White", "Grey", "Gray", "Silver", "Pink", "Blue", "Red", "Green", "Snow", "Mint", "Beige",
    "Brown", "Wood", "Gold", "Purple", "Yellow", "Orange", "Turquoise", "Racing Green", "Matcha Green",
    "Matcha Plum", "Hydrangea Blue", "Bumblebee", "Bumble Pink", "Bubble Pink", "Peach Fuzz", "Mocha Mousse",
    "Future Dusk", "Gravel Sand", "Limestone", "Mint Strawberry", "Arctic White", "Glacier White", "Frost",
    "Walnut", "Chalk", "Cobalt", "Satin Aluminum", "Metallic", "Charcoal",
    "Μαύρο", "Λευκό", "Λευκή", "Μαύρη", "Γκρι", "Ασημί", "Ροζ", "Μπλε", "Κόκκινο", "Πράσινο", "Χρώμα",
    # e-shop.gr writes Greek in capitals without accents.
    "ΜΑΥΡΟ", "ΛΕΥΚΟ", "ΜΑΥΡΗ", "ΛΕΥΚΗ", "ΑΣΗΜΙ", "ΚΟΚΚΙΝΟ", "ΠΡΑΣΙΝΟ", "ΧΡΩΜΑ",
]


# Greek capitals typed for Latin ones in model names ("Antec ΑΧ61", "120ΜΜ", mobo "Χ870", "WiFi ΙΙ", "(ΜΤΧ)"): a
# token of only such letters (+ Latin capitals/digits) is converted when it has a digit or Latin letter, or is a
# roman numeral / size code (Greek words like "ΜΕ" or "ΜΑΥΡΟ" stay Greek).
LOOKALIKE = str.maketrans("ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ", "ABEZHIKMNOPTYX")
LOOKALIKE_TOKEN = re.compile(r"(?<![\w-])[ΑΒΕΖΗΙΚΜΝΟΡΤΥΧA-Z0-9-]*[ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ][ΑΒΕΖΗΙΚΜΝΟΡΤΥΧA-Z0-9-]*(?![\w-])")
# A word mixing Latin and Greek letters is a typo ("Uni Ιnfinity", "NZXT F120 Duο"): its Greek look-alikes
# (capital or small) become Latin when nothing Greek is left after that; otherwise it stays as it is
# ("Towerμε" is two words glued, see GLUED).
LOOKALIKE_SMALL = str.maketrans("ΑΒΕΖΗΙΚΜΝΟΡΤΥΧοιακντυρχ", "ABEZHIKMNOPTYXoiakvtupx")
GREEK = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]")
MIXED_WORD = re.compile(r"(?<![\w-])(?=[\w-]*[A-Za-z])(?=[\w-]*[\u0370-\u03ff])[\w-]+")
ROMAN_GREEK = re.compile(r"(?<![\w-])(?=[Ιι]*Ι)[Ιι]{2,3}(?![\w-])")  # "Hydroshift Ιι" = II
# A Latin letter glued to a Greek word: "Midi Towerμε Πλαϊνό" (Shopflix).
GLUED = re.compile(r"(?<=[A-Za-z])(?=[\u0370-\u03ff\u1f00-\u1fff]{2})")


def latin(title: str, mixed: bool = True) -> str:
    """Greek look-alike capitals in Latin-looking tokens -> Latin. Shared by the board, case, fan and cooler
    normalizers (moved from normalize_mobo in Q6). mixed=False runs only the capitals pass (boards: the
    mixed-word pass would move one Snif board, "Asus Τuf B650E-PLUS", to another model; left for a board batch)."""
    def fix(m: re.Match) -> str:
        tok = m.group()
        is_latin = re.search(r"[A-Z0-9]", tok) or re.fullmatch(r"Ι+|[ΜΑΙ]ΤΧ", tok)
        return tok.translate(LOOKALIKE) if is_latin else tok

    def fix_mixed(m: re.Match) -> str:
        word = m.group().translate(LOOKALIKE_SMALL)
        return m.group() if GREEK.search(word) else word

    title = LOOKALIKE_TOKEN.sub(fix, title)
    if not mixed:
        return title
    title = MIXED_WORD.sub(fix_mixed, title)
    return ROMAN_GREEK.sub(lambda m: "I" * len(m.group()), title)


def prepare(title: str) -> str:
    """Case / fan / cooler titles before parsing: whitespace collapsed, look-alike capitals made Latin and a
    Latin word glued to a Greek one split ("Towerμε" -> "Tower με")."""
    return GLUED.sub(" ", latin(re.sub(r"\s+", " ", title).strip()))


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
    name = re.sub(r"\(\s*\)", " ", noise.sub(" ", name))  # "(WHITE)" -> "( )" -> gone
    return re.sub(r"\s+", " ", name).strip(" -,/&+")


def model_key(chip: str) -> str:
    """Grouping key: letters and digits only, so "MC-PMAX" == "MCPMAX" and "NZXT" == "Nzxt".
    Same as `productKey` in src/lib/categories.tsx."""
    return re.sub(r"[^a-z0-9]", "", chip.lower())


# First words that are descriptors, not vendors ("Case Fan 120mm", "PC CASE MICRO-ATX ...").
NOT_VENDORS = {"pc", "case", "pwm", "fan", "cpu", "argb", "rgb", "led"}


def valid_vendor(vendor: str) -> bool:
    return bool(re.search(r"[A-Za-z]", vendor)) and vendor.lower() not in NOT_VENDORS
