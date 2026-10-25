"""Case fans and CPU coolers. Like cases, the model is the product itself (see names.py).

Fans — the pack size is part of the model, so a 3-pack never competes with a single fan:
  BestPrice: "Arctic P12 Pro Case Fan 120mm ARGB με Σύνδεση 3-Pin 4-Pin PWM 3τμχ Black"
  Skroutz:   "Arctic P12 Pro PST Case Fan 120mm" (pack only in the slug: "...-5tmch.html")

Coolers — air coolers and AIO water coolers; custom-loop parts are dropped:
  BestPrice: "Be Quiet Pure Rock 3 Black" (air, bare title)
             "Arctic Liquid Freezer III Pro 360 Black Υδρόψυξη CPU 120mm ARGB για Socket 1700 / ..."
  Skroutz:   "Be Quiet Pure Rock 3 Socket AM4/AM5/1200/115x/1700"
             "Arctic Liquid Freezer III Pro 360 A-RGB", specs "Τριπλός Ανεμιστήρας (3x120mm)"
"""

import re

import names
from models import CoolerListing, FanListing

RGB = re.compile(r"(?<![\w-])A?-?RGB(?![\w-])|Fotismo|Φωτισμό", re.I)
NO_LED = re.compile(r"Χωρίς\s*Led|CHoris[\s-]*Led", re.I)

# ---------- fans ----------

FAN_CUT = re.compile(
    r"\s(?:Case\s+Fan|Ανεμιστήρας|\d{2,3}\s*mm|\d{1,2}\s*cm|με|with|\(?\d+\s*(?:τμχ|pcs)|\d+-?Pack|"
    r"(?:Triple|Dual)\s+Pack)\b.*$",
    re.I,
)
# "Fan" is dropped everywhere (not only e-shop's "... PWM FAN 40MM"), so "Lian Li Uni Fan SL"
# becomes "Lian Li Uni SL" on every site and still matches. "Σετ" = Set (Shopflix).
FAN_NOISE = names.noise_regex(["RGB", "ARGB", "A-RGB", "LED", "Kit", "Set", "Σετ", "Bundle", "Fans", "Fan", "Gaming"])
# Shopflix puts a Greek category phrase before the vendor: "Kit LED ανεμιστήρων Aerocool MIRAGE-12PRO 120mm RGB".
FAN_PREFIX = re.compile(r"^(?:Kit\s+(?:LED\s+)?|Σετ\s+)?ανεμιστήρων\s+", re.I)
# Greek words that are part of the product name, as the other sites write them (Shopflix "Lian Li Unifan SL
# Reverse Ασύρματο LCD Οθόνη 120mm" = BestPrice "Lian Li Unifan SL Wireless LCD Reverse 120mm"): Lian Li's
# wireless fans are their own products, so the word is translated, not dropped; the order follows BestPrice.
FAN_TRANSLATE = [
    (re.compile(r"\bReverse\s+Ασύρματ[οαη]\s+LCD\s+Οθόνη\b", re.I), "Wireless LCD Reverse"),
    (re.compile(r"\bReverse\s+Ασύρματ[οαη]\b", re.I), "Wireless Reverse"),
    (re.compile(r"(?<![\w-])Ασύρματ(?:ο|α|η|ος)(?![\w-])", re.I), "Wireless"),
    (re.compile(r"\bLCD\s+Οθόνη\b|(?<![\w-])Οθόνη\s+LCD\b", re.I), "LCD"),
]
# e-shop writes the size with Greek capitals in the middle of the name: "THERMALTAKE SWAFAN EX12 120ΜΜ ARGB SYNC PC
# COOLING FAN TT PREMIUM EDITION". Made Latin, FAN_CUT would cut the name there and merge this Sync edition into
# the plain Swafan EX12, so only the Greek unit goes (the size itself is read elsewhere); the key stays the same.
GREEK_MM = re.compile(r"(?<=\d)ΜΜ(?![\w-])")
FAN_SIZE = re.compile(r"(?<!\d)(\d{2,3})\s*mm\b", re.I)
FAN_SIZE_CM = re.compile(r"(?<!\d)(\d{1,2})\s*cm\b", re.I)  # e-shop: "12CM"
# Fallback: the size in the model name ("NZXT F140Q", "Corsair RS140", "Endorfy Zephyr 120").
NAME_SIZE = re.compile(r"(?<!\d)(40|50|60|70|80|92|120|140|180|200|230)(?!\d)")
# Arctic encodes it in centimetres: P12/F12 = 120mm, P14 = 140mm, P8 = 80mm, P9 = 92mm (Shopflix titles).
ARCTIC_SIZE = re.compile(r"\bArctic\s+(?:BioniX\s+)?[PF](8|9|12|14)\b", re.I)
ARCTIC_MM = {"8": 80, "9": 92, "12": 120, "14": 140}
PACK = re.compile(r"(?<!\d)(\d{1,2})\s*(?:τμχ|tmch|pcs\b|-?Pack\b|x\s*Fans?\b)", re.I)
PACK_WORD = {"dual": 2, "triple": 3}
PACK_WORDS = re.compile(r"\b(Dual|Triple)\s+Pack\b", re.I)
FAN_EXCLUDE = re.compile(
    r"controller|hub\b|splitter|καλώδι|\bcable|adapter|grill|φίλτρο|filter|screw|βίδ|bracket|"
    r"laptop|notebook|\bvga\b|\bgpu\b",
    re.I,
)


# Airflow vs static pressure, only where the maker's own series name says it (owner's rule): Corsair
# SP = Static Pressure / AF = AirFlow, Arctic P = Pressure-optimised / F, Noctua NF-P = Pressure,
# Fractal Venturi HP = High Pressure. Noctua's NF-A (their all-round A-series) says neither.
FAN_TYPES = [
    (re.compile(r"\bCorsair\b.*\bSP\s?(?:120|140)\b", re.I), "pressure"),
    (re.compile(r"\bCorsair\b.*\bAF\s?(?:120|140)\b", re.I), "airflow"),
    (re.compile(r"\bArctic\b.*\bP(?:8|9|12|14)\b", re.I), "pressure"),
    (re.compile(r"\bArctic\b.*\bF(?:8|9|12|14)\b", re.I), "airflow"),
    (re.compile(r"\bNoctua\b.*\bNF-?P\d", re.I), "pressure"),
    (re.compile(r"\bFractal\b.*\bHP-?(?:12|14)\b", re.I), "pressure"),
]


def fan_type(title: str) -> str | None:
    return next((t for pattern, t in FAN_TYPES if pattern.search(title)), None)


# BestPrice titles end with the connector from its spec table: "… με Σύνδεση 4-Pin PWM", "… 3-Pin".
TITLE_CONNECTOR = re.compile(r"Σύνδεση\s+(.{0,30})", re.I)


def title_connector(title: str) -> str | None:
    """"με Σύνδεση 3-Pin 4-Pin" -> "4-pin PWM" (4-pin fans are PWM; adapters listed too); "3-Pin" -> "3-pin"."""
    m = TITLE_CONNECTOR.search(title)
    said = m.group(1).lower() if m else ""
    if "4-pin" in said or "pwm" in said:
        return "4-pin PWM"
    return "3-pin" if "3-pin" in said else None


def make_fan_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> FanListing | None:
    title = re.sub(r"\s+", " ", title).strip()
    slug = url.replace("-", " ")
    if price <= 0:
        return None
    if size_m := FAN_SIZE.search(title) or FAN_SIZE.search(slug):
        size = int(size_m.group(1))
    elif size_m := FAN_SIZE_CM.search(title):
        size = int(size_m.group(1)) * 10
    elif size_m := NAME_SIZE.search(title):
        size = int(size_m.group(1))
    elif size_m := ARCTIC_SIZE.search(title):
        size = ARCTIC_MM[size_m.group(1)]
    else:
        return None
    pack_m = PACK.search(title) or PACK.search(slug)
    words_m = PACK_WORDS.search(title)
    pack = int(pack_m.group(1)) if pack_m else PACK_WORD[words_m.group(1).lower()] if words_m else 1
    # The name is read from the title with look-alike capitals made Latin ("Uni Ιnfinity", "Duο", "120ΜΜ").
    vendor, rest = names.split_vendor(FAN_PREFIX.sub("", names.prepare(GREEK_MM.sub("", title))))
    for pattern, english in FAN_TRANSLATE:
        rest = pattern.sub(english, rest)
    name = names.clean_name(FAN_CUT.sub("", " " + FAN_LEADING.sub("", rest)), FAN_NOISE)
    # Checked on the model name only: "... PWM W. SPLITTER" is still a fan, "FAN HUB" is not.
    if not name or not names.valid_vendor(vendor) or FAN_EXCLUDE.search(name):
        return None
    text = f"{title} {slug} {specs}"
    return FanListing(
        id=f"{source}:{native_id}",
        source=source,
        title=title,
        url=url,
        price=round(price, 2),
        shopCount=shop_count,
        brand=vendor,
        chip=f"{vendor} {name} {size}mm" + (f" ×{pack}" if pack > 1 else ""),
        size=size,
        pack=pack,
        rgb=bool(RGB.search(text)) and not NO_LED.search(text),
        pwm=bool(re.search(r"PWM", text, re.I)),
        scrapedAt=scraped_at,
        fanType=fan_type(title),
        connector=title_connector(title),
    )


# ---------- coolers ----------

WATER = re.compile(r"Υδρόψυξη|ΥΔΡΟΨΥΞΗ|Ydropsyxi|\bAIO\b|Liquid|Water|Hydro", re.I)
# Shopflix and Snif write "Υδρόψυξη Επεξεργαστή" only at the start of their AIO titles (cut off by
# sources.snif.PREFIX), so the marks left are the URL, transliterated three ways ("/p/SF-…/udropsuxe-epexergaste-…",
# "ydropsuxi-epexergasth-", Snif "/showproduct/…/ydropsuxi-epexergasti-…"), and Shopflix's fan count with a size
# ("… Διπλού Ανεμιστήρα 120mm"; its air towers say "Deepcool AK620 Διπλού Ανεμιστήρα" without a size).
URL_WATER = re.compile(r"(?<![a-z])[uy]drops(?:ux|yk|yx)", re.I)
# The air-cooler category in the URL ("Ψύκτρα": Shopflix "/p/SF-…/psuktra-epexergaste-…", Skroutz "…-PSyktra-
# Epexergasti-…", e-shop "psyktra-epexergasti-…"): there the Greek fan count describes an air tower's fans, so it
# never makes the listing an AIO ("Peerless Assassin 120 SE Διπλού Ανεμιστήρα 120mm" is not a 240 AIO).
URL_AIR = re.compile(r"(?<![a-z])ps[uy]k?tra", re.I)
# An AIO name that still ends in its fan size (Snif "Corsair Nautilus 240 RS 120mm - Μαύρο", Shopflix "Deepcool
# LD240 120mm για Socket …"): the size goes, the radiator is added below when the name lacks it.
AIO_FAN_SIZE = re.compile(r"\s(?:120|140)\s*mm$", re.I)
COOLER_CUT = re.compile(
    r"\s(?:Socket|Υδρόψυξη|Ψύκτρα|για|με|with|CPU\s+(?:Air\s+)?Cooler|Cooler\s+CPU|Air\s+Cooler|"
    r"(?:\d{3}\s*mm\s+)?(?:AIO\s+)?Liquid\s+(?:CPU\s+)?Cooler|AIO|Low[\s-]Profile|Cooling\s+Fan)\b.*$",
    re.I,
)
# Shopflix descriptors after the model name: "Asus ROG Ryujin III 240 Διπλού Ανεμιστήρα 120mm …" (dual fan),
# "Arctic Liquid Freezer II 420 A-RGB Επεξεργαστή 120mm", "Noctua NH-P1 Παθητική" (passive), "Noctua NH-U12S
# Ενεργητική" (active). Never the first word: "SM Παθητική Ψύκτρα Επεξεργαστή" has no other name and keeps it.
GREEK_CUT = re.compile(
    r"(?<=\S)\s+(?:(?:Μονού|Διπλού|Τριπλού|Τετραπλού)\s+Ανεμιστήρα|Επεξεργαστή|Παθητική|Ενεργητική)(?![\w-]).*$",
    re.I,
)
# The fans those words count, for an AIO whose name and URL give no radiator size: "Be Quiet Light Loop
# Διπλού Ανεμιστήρα 120mm" = 2 × 120 = 240 (like Skroutz's "(2x120mm)" spec, FANS_SPEC).
GREEK_FANS = re.compile(r"(Μονού|Διπλού|Τριπλού|Τετραπλού)\s+Ανεμιστήρα\s+(120|140)\s*mm", re.I)
GREEK_COUNT = {"μονού": 1, "διπλού": 2, "τριπλού": 3, "τετραπλού": 4}
# Descriptors right after the vendor (e-shop.gr): "FORCE CPU COOLER G6", "… CPU AIR COOLER …",
# "DARKFLASH ΣΥΣΤΗΜΑ ΥΔΡΟΨΥΞΗΣ DN360".
COOLER_LEADING = re.compile(r"^\s*(?:(?:CPU\s+)?(?:Air\s+)?Cooler|ΣΥΣΤΗΜΑ\s+ΥΔΡΟΨΥΞΗΣ)\s+", re.I)
FAN_LEADING = re.compile(r"^\s*(?:PC\s+)?(?:Case\s+|Cooling\s+)?Fan\s+", re.I)
COOLER_NOISE = names.noise_regex([
    "RGB", "ARGB", "A-RGB", "chromax.black", "chromax", "Chromax Black", "Edition", "Gaming",
])
# 120/140 followed by "mm" is the fan size ("Υδρόψυξη CPU 120mm"), not the radiator; bigger sizes
# are always radiators ("PURE LOOP 3 240MM AIO").
RADIATOR = re.compile(r"(?<!\d)(?:(240|280|360|420|480)|(120|140)(?!\s*mm))(?!\d)", re.I)
FANS_SPEC = re.compile(r"\((\d)x(120|140)mm\)", re.I)  # Skroutz: "Τριπλός Ανεμιστήρας (3x120mm)"
COOLER_EXCLUDE = re.compile(
    r"pump|αντλία|fitting|reservoir|δεξαμεν|tube|tubing|σωλήν|coolant|υγρό|\bblock\b|radiator\b|ψυγείο|"
    r"backplate|mounting|bracket|\bkit\b|\bthermal\s+(?:paste|pad|grease|compound)|πάστα|\bpad\b|\bvga\b|\bgpu\b|\bm\.2\b|\bssd\b|memory|\bram\b|"
    r"laptop|notebook|fan\s+controller|καλώδι|\bcable|frame\b|heat\s*sink|cover\b|valve|\bring\b|clamp|"
    r"adapter|\bdie\b|shroud|flow\s+meter",
    re.I,
)


def make_cooler_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> CoolerListing | None:
    title = re.sub(r"\s+", " ", title).strip()
    slug = url.replace("-", " ")
    text = f"{title} {slug} {specs}"
    if price <= 0:
        return None
    parsed = names.prepare(title)  # "Hydroshift Ιι" -> II; the stored title stays
    vendor, rest = names.split_vendor(parsed)
    rest = GREEK_CUT.sub("", COOLER_LEADING.sub("", rest))
    name = names.clean_name(COOLER_CUT.sub("", " " + rest), COOLER_NOISE)
    # Parts are checked on the model name only: "… AIO GPU LIQUID COOLER" is still a CPU AIO.
    if not name or not names.valid_vendor(vendor) or COOLER_EXCLUDE.search(name):
        return None

    radiator = None
    water = WATER.search(text)
    url_water = URL_WATER.search(url)
    greek_m = None if URL_AIR.search(url) else GREEK_FANS.search(parsed)
    if water or greek_m or url_water:
        fans_m = FANS_SPEC.search(specs)
        # The URL's last segment (not the numeric id) can have it: ".../be-quiet-light-loop-360.html".
        rad_m = RADIATOR.search(name) or RADIATOR.search(url.rsplit("/", 1)[-1].replace("-", " "))
        if fans_m:
            radiator = int(fans_m.group(1)) * int(fans_m.group(2))
        elif rad_m and (water or url_water or rad_m.group(1)):
            # A bare 120/140 counts only with a water mark: "Mars Gaming ML-ONE120" (water URL) is a
            # 120 AIO, "Peerless Assassin 120" (air tower, Shopflix "Διπλού Ανεμιστήρα") is not.
            radiator = int(rad_m.group(1) or rad_m.group(2))
        elif greek_m:
            radiator = GREEK_COUNT[greek_m.group(1).lower()] * int(greek_m.group(2))
        elif water:
            return None  # water-cooling parts (blocks, pumps…) or an AIO we can't size
        # Only the URL says water and nothing gives a size: kept as before (air, no radiator) — that
        # category also lists air towers ("MSI MAG CoreFrozr AA13 120mm").
        if radiator:
            name = AIO_FAN_SIZE.sub("", name)
            if str(radiator) not in name:  # "Silent Loop 3" comes in 240/280/360: keep them apart
                name = f"{name} {radiator}"
    return CoolerListing(
        id=f"{source}:{native_id}",
        source=source,
        title=re.sub(r"\s*Υδρόψυξη CPU", "", title),
        url=url,
        price=round(price, 2),
        shopCount=shop_count,
        brand=vendor,
        chip=f"{vendor} {name}",
        type="AIO" if radiator else "Air",
        radiator=radiator,
        rgb=bool(RGB.search(text)) and not NO_LED.search(text),
        scrapedAt=scraped_at,
    )
