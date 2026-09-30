"""Motherboard title + URL slug (+ Skroutz spec line) -> vendor / board name / chipset / socket /
form factor / memory type / WiFi.

Like cases, a board *is* its model: listings are grouped by vendor + board name, so
"Asus TUF Gaming B850-Plus WiFi" (BestPrice) and "Asus TUF GAMING B850-PLUS WIFI" (Skroutz) meet.

BestPrice: "Asus TUF Gaming B850-Plus WiFi Motherboard ATX με AMD AM5 Socket" (spec after "Motherboard").
Skroutz:   "Gigabyte B650 GAMING X AX V2 rev. 1.x", specs "ATX, Socket: AMD AM5, Τύπος Μνήμης: DDR5";
           the slug repeats the BestPrice-style tail ("...-Motherboard-Micro-ATX-me-AMD-AM5-Socket").
e-shop.gr: "ASROCK B650M-H/M.2+ D5 RETAIL" (after the "ΜΗΤΡΙΚΗ" prefix), no socket or form factor
           most of the time, so those fall back to the chipset.
Shopflix/Snif: the BestPrice tail without "Motherboard" ("… Pro4 ATX με AMD AM4 Socket", "… Micro ATX
           sAM5", "… AMD A520 Mini ITX με Socket AMD AM4", "…, AMD AM5 Socket, 90-MXBT50-A0UAYZ").
"""

import re

import names
from models import MoboListing

VENDORS = {
    "asus": "Asus", "msi": "MSI", "gigabyte": "Gigabyte", "asrock": "ASRock", "biostar": "Biostar",
    "supermicro": "Supermicro", "nzxt": "NZXT", "maxsun": "Maxsun", "sapphire": "Sapphire",
    "colorful": "Colorful", "tyan": "Tyan", "intel": "Intel", "fujitsu": "Fujitsu", "evga": "EVGA",
}

# Everything from "Motherboard" on is the spec tail (BestPrice); e-shop adds "RETAIL"/"BOX" and a size.
TAIL = re.compile(r"\s(?:Motherboard|Mainboard|Μητρική)\b.*$", re.I)
# Greek capitals typed for Latin ones in model names ("Χ870", "Ζ890", "WiFi ΙΙ", "(ΜΤΧ)"): a token of only
# such letters (+ Latin/digits) is converted when it has a digit or Latin letter, or is a roman numeral /
# size code (Greek words like "ΜΕ" stay Greek).
LOOKALIKE = str.maketrans("ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ", "ABEZHIKMNOPTYX")
LOOKALIKE_TOKEN = re.compile(r"(?<![\w-])[ΑΒΕΖΗΙΚΜΝΟΡΤΥΧA-Z0-9-]*[ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ][ΑΒΕΖΗΙΚΜΝΟΡΤΥΧA-Z0-9-]*(?![\w-])")


def _latin(title: str) -> str:
    def fix(m: re.Match) -> str:
        tok = m.group()
        latin = re.search(r"[A-Z0-9]", tok) or re.fullmatch(r"Ι+|[ΜΑΙ]ΤΧ", tok)
        return tok.translate(LOOKALIKE) if latin else tok
    return LOOKALIKE_TOKEN.sub(fix, title)


# The same spec tail without "Motherboard" (Shopflix, Snif, e-shop): from the first size word, "με",
# platform + chipset/socket ("AMD A520", "Intel 1700"), "sAM5"/"s1700", "Socket" or a part number on.
# Needs a space/comma before it, so "A520M-ITX" and "B650I" stay whole.
SPEC_TAIL = re.compile(
    r"(?:\s|,)\s*(?:(?:Extended[\s-])?E-?ATX|Micro(?:[\s-]?ATX)?|Mini(?:[\s-]?(?:ITX|DTX|ATX|STX))?|m-?ATX|uATX|"
    r"ATX|ITX|με|Socket|(?:AMD|Intel)\s+(?:[ABHQXZWC]\d{3}E?|AM[2-5]|LGA\s?\d{3,4}|\d{4})|"
    r"s(?:AM[2-5]|\d{4})|\d{2}-?[A-Z0-9]{4,}-[A-Z0-9]{4,})(?![\w-]).*$",
    re.I,
)
NOISE = re.compile(
    r"(?<![\w-])(?:(?:rev|ver)\.?\s*\d+(?:\.[\dx]+)?|v\d+\.[\dx]+|retail|box|bulk|soc|(?:micro|mini|m|e)?-?atx|"
    r"mini-?itx|itx|mtx|lga\s?\d{3,4}|socket\s+\w+|(?:amd\s+)?am[45]|amd|intel|asro)(?![\w-])",
    re.I,
)
# Same board, spelled differently: "Wi-Fi"/"WIFI" -> "WiFi", "DDR5" -> "D5" (e-shop and the MSI/ASRock
# "…-P D5" / "…DDR4" variants), "WIFI7" -> "WiFi 7".
SPELLING = [
    (re.compile(r"\bWi-?Fi\s?(\d[E]?)\b", re.I), r"WiFi \1"),
    (re.compile(r"\bWi-?Fi\b", re.I), "WiFi"),
    (re.compile(r"\bDDR4\b", re.I), "D4"),
    (re.compile(r"(?<![\w-])(?:DDR5|D5)(?![\w-])", re.I), " "),
]

# Chipsets from the name: "B850M" -> B850, "X870E" -> X870E, "Z890I" -> Z890, "TRX50", "W790", "C741".
CHIPSET = re.compile(
    r"(?<![A-Za-z0-9])([ABHQXZ][1-9]\d{2}E?|TRX[45]0|WRX[89]0|W[4-8]\d0|C[2-7]\d{2}|X[3-9]99)(?!\d)",
    re.I,
)
CHIPSET_SOCKET = [
    (re.compile(r"^(A620|B650E?|X670E?|B840|B850|X870E?)$"), "AM5"),
    (re.compile(r"^(A320|B350|X370|B450|X470|A520|B550|X570)$"), "AM4"),
    (re.compile(r"^(H810|B860|Z890|W880|W890|Q870)$"), "LGA1851"),
    (re.compile(r"^(H610|B660|H670|Z690|Q670|W680|B760|H770|Z790)$"), "LGA1700"),
    (re.compile(r"^(H410|B460|H470|Z490|W480|H510|B560|H570|Z590|W580)$"), "LGA1200"),
    (re.compile(r"^(H310|B360|B365|H370|Z370|Z390|Q370|C246)$"), "LGA1151"),
    (re.compile(r"^(X299)$"), "LGA2066"),
    (re.compile(r"^(W790|C741)$"), "LGA4677"),
    (re.compile(r"^(TRX50|WRX90)$"), "sTR5"),
]
# Socket as the sites write it: "Socket: AMD AM5", "με Intel 1851 Socket", "intel-lga4677-socket".
SOCKET = re.compile(
    r"\b(?:AMD|Intel)[\s-]+(?:LGA[\s-]?)?(AM[2-5]\+?|\d{3,4}|s?TRX?\d|sWRX\d|SP\d|TR\d|LGA\d{3,4})\b"
    r"|\bLGA[\s-]?(\d{3,4})\b",
    re.I,
)
FORM = [
    (re.compile(r"\b(?:Extended[\s-]ATX|E-?ATX|EEB|CEB|SSI)\b", re.I), "E-ATX"),
    (re.compile(r"\b(?:Micro[\s-]?ATX|m-?ATX|uATX)\b", re.I), "Micro ATX"),
    (re.compile(r"\b(?:Mini[\s-]?ITX|Thin[\s-]?ITX|ITX)\b", re.I), "Mini ITX"),
    (re.compile(r"\b(?:Mini[\s-]?DTX|Mini[\s-]?ATX|Mini[\s-]?STX)\b", re.I), "Άλλο"),
    (re.compile(r"\bATX\b", re.I), "ATX"),
]
MEMORY = re.compile(r"\b(?:DDR|D)([45])\b", re.I)
WIFI = re.compile(r"Wi-?Fi|\bAX\b", re.I)
EXCLUDE = re.compile(
    r"\bbundle\b|\bcombo\b|\+\s*(?:AMD|Intel|Ryzen|Core|CPU)|\bI/?O\s*shield|\briser\b|\bbracket\b|"
    r"\bkit\b|καλώδι|\bcable\b|adapter|αντάπτορ|\bTPM\b|\bmodule\b|μεταχειρισμέν|\bused\b|refurbished",
    re.I,
)


def _socket(text: str) -> str | None:
    m = SOCKET.search(text)
    if not m:
        return None
    raw = (m.group(1) or m.group(2)).upper().replace(" ", "").replace("-", "")
    if raw.startswith("LGA"):
        return raw
    if raw.isdigit():
        return f"LGA{raw}"
    return {"STR5": "sTR5", "TR5": "sTR5", "STRX5": "sTR5", "STRX4": "sTRX4", "TRX4": "sTRX4", "SWRX8": "sWRX8"}.get(raw, raw)


def make_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> MoboListing | None:
    title = _latin(re.sub(r"\s+", " ", title).strip())
    if price <= 0 or EXCLUDE.search(title):
        return None
    slug = url.rsplit("/", 1)[-1].replace("-", " ")
    spec_text = f"{title} {slug} {specs}"

    vendor_raw, rest = names.split_vendor(TAIL.sub("", title))
    vendor = VENDORS.get(vendor_raw.lower())
    if vendor is None:
        return None  # not a board maker ("Κάρτα", accessories, unknown brands)
    spec_tail = SPEC_TAIL.search(f" {rest}")
    name = NOISE.sub(" ", SPEC_TAIL.sub("", f" {rest}"))
    for pattern, repl in SPELLING:
        name = pattern.sub(repl, name)
    if re.search(r"\bAX\b", name):  # Skroutz: "Gigabyte B650 Eagle AX Wi-Fi", BestPrice: "… Eagle AX"
        name = re.sub(r"\bWiFi\b(?!\s\d)", " ", name)
    name = re.sub(r"\s\+.*$", "", name)  # e-shop: "A68N-2100K +ONBOARD CPU AMD E1-6010 …"
    name = re.sub(r"\(\s*\)", " ", name)  # "(ΜΤΧ)" once the size word is gone
    name = re.sub(r"\s+", " ", name).strip(" -,/+")
    # Broken titles ("ASRock Wi-Fi" on Skroutz, "Asus Desktop ATX με LGA 1700 Socket" on Snif): every
    # real board name has a number in it (digits or a roman numeral: "ROG Crosshair VIII Impact").
    if not name or re.fullmatch(r"WiFi(?: \d)?", name) or not re.search(r"\d|\b[IVX]{2,}\b", name):
        return None

    chip_m = CHIPSET.search(name)
    chipset = chip_m.group(1).upper() if chip_m else None
    socket = _socket(f"{specs} {title} {slug}")
    if socket is None and chipset:
        socket = next((s for pattern, s in CHIPSET_SOCKET if pattern.match(chipset)), None)

    # Skroutz spec line and BestPrice's "Motherboard <form> με" tail are reliable; e-shop's size word
    # is not ("H610M K V2 D5 ATX" is a micro-ATX board), so the model's own M/I suffix comes first.
    tail = TAIL.search(title)
    stated = f"{specs} {tail.group() if tail else ''} {slug if 'motherboard' in slug.lower() else ''}"
    form = next((v for pattern, v in FORM if pattern.search(stated)), None)
    if form is None and chip_m:
        suffix = name[chip_m.end(): chip_m.end() + 1].upper()
        form = {"M": "Micro ATX", "I": "Mini ITX", "N": "Mini ITX"}.get(suffix)
    if form is None and spec_tail and source != "eshop":  # Shopflix/Snif size word (e-shop's is unreliable)
        form = next((v for pattern, v in FORM if pattern.search(spec_tail.group())), None)
    if form is None:
        form = next((v for pattern, v in FORM if pattern.search(title)), "ATX")

    mem_m = re.search(r"Τύπος Μνήμης:\s*DDR([45])", specs) or MEMORY.search(title)
    if mem_m:
        memory = f"DDR{mem_m.group(1)}"
    elif socket in ("AM5", "LGA1851", "sTR5"):
        memory = "DDR5"
    elif socket in ("AM4", "LGA1200", "LGA1151"):
        memory = "DDR4"
    else:
        memory = None  # LGA1700 boards come in both

    title = TAIL.sub("", title) if source == "bestprice" else title
    return MoboListing(
        id=f"{source}:{native_id}",
        source=source,
        title=title,
        url=url,
        price=round(price, 2),
        shopCount=shop_count,
        brand=vendor,
        chip=f"{vendor} {name}",
        chipset=chipset,
        socket=socket,
        formFactor=form,
        memory=memory,
        wifi=bool(WIFI.search(name)),
        ramSlots=2 if form == "Mini ITX" else None,  # the rest comes from BestPrice's slot slices
        scrapedAt=scraped_at,
    )
