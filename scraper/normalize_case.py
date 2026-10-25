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
SIZE_PHRASE = r"(?:Mid|Midi|Mini|Micro|Full|Ultra|Super|Big)[\s-]?Tower"
CUT = re.compile(
    rf"\s(?:{SIZE_PHRASE}|Κουτί|ΘΗΚΗ|Θήκη|με|with|Mesh\s+Tower|(?:Computer|PC)\s+Case|Case|Chass?is|"
    # Greek descriptors of e-shop/Shopflix ("… ATX ΠΕΡΙΠΤΩΣΗ ΥΠΟΛΟΓΙΣΤΗ ΧΩΡΙΣ ΑΝΕΜΙΣΤΗΡΕΣ", "… ΓΙΑ 2 ΣΥΣΚΕΥΕΣ") and
    # e-shop's "… EVO RGB BLACK COLUMNLESS TOWER".
    rf"Περίπτωση|ΠΕΡΙΠΤΩΣΗ|Χωρίς|ΧΩΡΙΣ|για|Columnless|"
    rf"\d+\s+(?:A?RGB\s+)?Fans)\b.*$|\s\+.*$",
    re.I,
)
# e-shop.gr sometimes puts descriptors right after the vendor: "BE QUIET MIDI TOWER SHADOW BASE 800",
# "ARMAGGEDDON GAMING PC CASE TEARAXX APEX 13", "DARKFLASH COMPUTER CASE TH285 4 FANS",
# "DARKFLASH ΚΟΥΤΙ ΥΠΟΛΟΓΙΣΤΗ C285". Those are removed instead of cut at (cutting would leave no name).
LEADING = re.compile(
    rf"^\s*(?:{SIZE_PHRASE}|(?:Gaming\s+)?(?:(?:Computer|PC)\s+)?Case(?:\s+with\s+PSU)?|Gaming|"
    rf"ΚΟΥΤΙ\s+ΥΠΟΛΟΓΙΣΤΗ|Κουτί\s+Υπολογιστή)\s+",
    re.I,
)
# Greek words that name the product's own panel version, as the other sites write it in English:
# e-shop "DARKFLASH DK431 ΓΥΑΛΙΝΗ" = Shopflix "Darkflash DK431 Glass", "AQUARIUS ΑΚΡΥΛΙΚΗ" = BestPrice
# "Aquarius Acrylic". (Panel options in English stay noise below: TG, Solid, Clear Tint…)
TRANSLATE = [
    (re.compile(r"(?<![\w-])(?:ΓΥΑΛΙΝΗ|Γυάλινη)(?![\w-])", re.I), "Glass"),
    (re.compile(r"(?<![\w-])(?:ΑΚΡΥΛΙΚΗ|Ακρυλική)(?![\w-])", re.I), "Acrylic"),
]
# Makers' own names where shops differ: Thermaltake's "The Tower 300" (one BestPrice title says "Tower 300"),
# Lian Li's "O11D" = "O11 Dynamic" (Skroutz/Shopflix/e-shop write "O11D EVO RGB", BestPrice/Snif "O11 Dynamic
# Evo RGB"). The O11 Dynamic EVO RGB is its own case (455.7 mm GPU vs the plain EVO's 426, Lian Li's pages),
# so RGB stays in that one name although NOISE removes it everywhere else.
O11D = re.compile(r"\bO11D(?=\s|$)", re.I)
EVO_RGB = re.compile(r"\bEVO\s+RGB\b", re.I)


def maker_name(vendor: str, name: str, title: str) -> str:
    if vendor == "Thermaltake":
        name = re.sub(r"^Tower(?=\s+\d)", "The Tower", name, flags=re.I)
    if vendor == "Lian Li":
        name = O11D.sub("O11 Dynamic", name)
        if EVO_RGB.search(title):
            name = re.sub(r"\b(O11 Dynamic EVO)\b(?!\s+(?:RGB|XL)\b)", r"\1 RGB", name, flags=re.I)
    return name


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
IS_CASE = re.compile(r"Tower|Cube|SFF|HTPC|Κουτί|ΚΟΥΤΙ|Kouti|ΘΗΚΗ|Θήκη|Chass?is|Cases?\b", re.I)
EXCLUDE = re.compile(
    r"riser|dust\s*filter|φίλτρο|\bstand\b|handle|bracket|\bmount\b|καλώδι|\bcable|adapter|\bkit\b|"
    r"side\s*panel|πάνελ|\bfan\b|ανεμιστήρ",
    re.I,
)
WINDOW = re.compile(r"Παράθυρο|Parathyro|Window|Tempered\s*Glass|\bTG\b|Glass", re.I)
# Fans in the box when a title says so: "with 7 Fans", "WITH 3X ARGB FANS", "3XARGB FANS", "4 FANS",
# "με 3 ανεμιστήρες", "3x 120mm ARGB fans". A count with another word before "fans" is something else
# ("4 Θέσεις Ανεμιστήρων" = 4 fan positions), so only lighting/PWM words may come between.
TITLE_FANS = re.compile(
    r"(?<![\w.])(\d{1,2})\s*x?\s*(?:(\d{3})\s*mm\s*)?(?:(?:A-?RGB|RGB|PWM|LED|Lite)\s*)*(?:fans?|ανεμιστ[ήη]ρ(?:ες|α|ας))\b",
    re.I,
)


def title_fans(title: str) -> list[dict] | None:
    """[{pos: None, size: mm or None, n}] from the title, None when it names no count."""
    m = TITLE_FANS.search(title)
    if not m or not 1 <= int(m.group(1)) <= 12:
        return None
    # "supports up to 6 fans", "έως 6 ανεμιστήρες": positions, not fans in the box.
    if re.search(r"support|up\s+to|έως|μέχρι|max", title[max(0, m.start() - 25): m.start()], re.I):
        return None
    return [{"pos": None, "size": int(m.group(2)) if m.group(2) else None, "n": int(m.group(1))}]
RGB = re.compile(r"\bA?RGB\b|Fotismo|Φωτισμό", re.I)
# Board sizes, largest first. Skroutz lists them ("Μέγεθος Μητρικής: Extended ATX / ATX / Mini ITX"),
# e-shop sometimes names one ("PC CASE MICRO-ATX"). Bigger names are blanked out once matched, so
# the "ATX" inside "Micro ATX" doesn't count as full ATX.
BOARDS = [
    (re.compile(r"\b(?:Extended[\s-]?ATX|E-?ATX|SSI[\s-]?EEB|EEB)\b", re.I), "E-ATX"),
    (re.compile(r"\b(?:Micro[\s-]?ATX|m-?ATX|uATX)\b", re.I), "Micro ATX"),
    (re.compile(r"\b(?:Mini[\s-]?(?:ITX|DTX)|ITX)\b", re.I), "Mini ITX"),
    (re.compile(r"\bATX\b", re.I), "ATX"),
]
BOARD_RANK = ["Mini ITX", "Micro ATX", "ATX", "E-ATX"]


def max_board(text: str) -> str | None:
    found = []
    for pattern, board in BOARDS:
        if pattern.search(text):
            found.append(board)
            text = pattern.sub(" ", text)
    return max(found, key=BOARD_RANK.index) if found else None


def make_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> CaseListing | None:
    # Snif starts every case title with "Desktop" ("Desktop Aerocool Cylon Midi-Tower - Μαύρο"), which
    # would otherwise be taken for the vendor.
    title = re.sub(r"^Desktop\s+", "", re.sub(r"\s+", " ", title).strip(), flags=re.I)
    parsed = names.prepare(title)  # "Antec ΑΧ61" -> AX61, "Towerμε" -> "Tower με"; the stored title stays
    text = f"{parsed} {url.replace('-', ' ')} {specs}"
    if price <= 0 or not IS_CASE.search(text):
        return None
    vendor, rest = names.split_vendor(parsed)
    rest = LEADING.sub("", LEADING.sub("", rest))  # "GAMING PC CASE …": two passes
    rest = CUT.sub("", " " + rest)
    for pattern, english in TRANSLATE:
        rest = pattern.sub(english, rest)
    name = maker_name(vendor, names.clean_name(rest, NOISE), parsed)
    # Accessories are checked on the model name only: a case "… WITH 3X ARGB FAN" is still a case.
    if not name or not names.valid_vendor(vendor) or EXCLUDE.search(name):
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
        maxBoard=max_board(f"{title} {specs}"),
        scrapedAt=scraped_at,
        fansIncluded=title_fans(title),
    )

