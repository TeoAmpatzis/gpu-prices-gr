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

FAN_CUT = re.compile(r"\s(?:Case\s+Fan|Ανεμιστήρας|\d{2,3}\s*mm|με|with|\d+\s*τμχ|\d+-?Pack)\b.*$", re.I)
FAN_NOISE = names.noise_regex(["RGB", "ARGB", "A-RGB", "LED", "Kit", "Set", "Bundle", "Fans", "Gaming"])
FAN_SIZE = re.compile(r"(?<!\d)(\d{2,3})\s*mm\b", re.I)
# Fallback: the size in the model name ("NZXT F140Q", "Corsair RS140", "Endorfy Zephyr 120").
NAME_SIZE = re.compile(r"(?<!\d)(40|50|60|70|80|92|120|140|180|200|230)(?!\d)")
PACK = re.compile(r"(?<!\d)(\d{1,2})\s*(?:τμχ|tmch|-?Pack\b|x\s*Fans?\b)", re.I)
FAN_EXCLUDE = re.compile(
    r"controller|hub\b|splitter|καλώδι|\bcable|adapter|grill|φίλτρο|filter|screw|βίδ|bracket|"
    r"laptop|notebook|\bvga\b|\bgpu\b",
    re.I,
)


def make_fan_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> FanListing | None:
    title = re.sub(r"\s+", " ", title).strip()
    slug = url.replace("-", " ")
    if price <= 0 or FAN_EXCLUDE.search(title):
        return None
    size_m = FAN_SIZE.search(title) or FAN_SIZE.search(slug) or NAME_SIZE.search(title)
    if not size_m:
        return None
    size = int(size_m.group(1))
    pack_m = PACK.search(title) or PACK.search(slug)
    pack = int(pack_m.group(1)) if pack_m else 1
    vendor, rest = names.split_vendor(title)
    name = names.clean_name(FAN_CUT.sub("", " " + rest), FAN_NOISE)
    if not name or not names.valid_vendor(vendor):
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
        scrapedAt=scraped_at,
    )


# ---------- coolers ----------

WATER = re.compile(r"Υδρόψυξη|Ydropsyxi|\bAIO\b|Liquid|Water|Hydro", re.I)
COOLER_CUT = re.compile(r"\s(?:Socket|Υδρόψυξη|Ψύκτρα|για|με|with|CPU\s+Cooler|Cooler\s+CPU)\b.*$", re.I)
COOLER_NOISE = names.noise_regex([
    "RGB", "ARGB", "A-RGB", "chromax.black", "chromax", "Chromax Black", "Edition", "Gaming",
])
# Not followed by "mm": "Υδρόψυξη CPU 120mm" is the fan size, not the radiator.
RADIATOR = re.compile(r"(?<!\d)(120|140|240|280|360|420|480)(?!\d|\s*mm)", re.I)
FANS_SPEC = re.compile(r"\((\d)x(120|140)mm\)", re.I)  # Skroutz: "Τριπλός Ανεμιστήρας (3x120mm)"
COOLER_EXCLUDE = re.compile(
    r"pump|αντλία|fitting|reservoir|δεξαμεν|tube|tubing|σωλήν|coolant|υγρό|\bblock\b|radiator\b|ψυγείο|"
    r"backplate|mounting|bracket|\bkit\b|\bthermal\s+(?:paste|pad|grease|compound)|πάστα|\bpad\b|\bvga\b|\bgpu\b|\bm\.2\b|\bssd\b|memory|\bram\b|"
    r"laptop|notebook|fan\s+controller|καλώδι|\bcable",
    re.I,
)


def make_cooler_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> CoolerListing | None:
    title = re.sub(r"\s+", " ", title).strip()
    slug = url.replace("-", " ")
    text = f"{title} {slug} {specs}"
    if price <= 0 or COOLER_EXCLUDE.search(title):
        return None
    vendor, rest = names.split_vendor(title)
    name = names.clean_name(COOLER_CUT.sub("", " " + rest), COOLER_NOISE)
    if not name or not names.valid_vendor(vendor):
        return None

    radiator = None
    if WATER.search(text):
        fans_m = FANS_SPEC.search(specs)
        # The URL's last segment (not the numeric id) can have it: ".../be-quiet-light-loop-360.html".
        rad_m = RADIATOR.search(name) or RADIATOR.search(url.rsplit("/", 1)[-1].replace("-", " "))
        if fans_m:
            radiator = int(fans_m.group(1)) * int(fans_m.group(2))
        elif rad_m:
            radiator = int(rad_m.group(1))
        else:
            return None  # water-cooling parts (blocks, pumps…) or an AIO we can't size
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
