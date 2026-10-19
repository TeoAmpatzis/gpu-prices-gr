"""RAM title + URL slug -> memory type / kit / speed / form factor.

Products are grouped into kits by spec ("DDR5 32GB (2×16GB) 6000MHz"), not by vendor,
so the site compares every 2×16GB DDR5-6000 kit on the market. Unparseable titles are dropped.

BestPrice: "Kingston Fury Beast 32GB (2X16GB) DDR5 RAM 6000MHz C30 SoDimm Black".
Skroutz titles are often bare ("G.Skill Aegis DDR4"); the slug has the rest:
".../G-Skill-Aegis-DDR4-32GB-RAM-me-2x16GB-Modules-kai-Tachytita-3200-gia-Desktop-F4-3200C16D-32GIS.html".
"""

import re

from models import RamListing

TYPE = re.compile(r"\bDDR([2-5])L?\b", re.I)
KIT = re.compile(r"\b(\d{1,2})\s*[x×]\s*(\d{1,3})\s*GB\b", re.I)
# Shopflix writes the kit without "GB": "Kingston Fury Beast DDR5 16GB 5200Mhz (2x8)", "… 16GB 1333MHz 2x8".
KIT_BARE = re.compile(r"(?<![\d.])([1-8])\s*[x×]\s*(\d{1,3})(?![\d.]|\s*(?:GB|MB|TB|mm|cm))", re.I)
CAPACITY = re.compile(r"\b(\d{1,3})\s*GB\b", re.I)
MODULE_SIZES = {1, 2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256}
MULTI = re.compile(r"\b[2-9][\s-]*Modules\b", re.I)
# A stated speed (MT/s, which the shops write as "MHz"): "6000MHz", "8000MT/S", "5200MT", the typo
# "6800GHz" (4 digits, so never real GHz), Skroutz slugs "Tachytita-3200", Shopflix "με Ταχύτητα 3200",
# the standard "DDR4-3200". The first one in title, URL, specs decides (see speed_of).
SPEED = re.compile(
    r"\b(\d{3,5})\s*(?:MHz|MT/s|MT)\b|\b(\d{4})\s*GHz\b|Tachytita-(\d{3,5})\b|Ταχύτητα\s*(\d{3,5})\b"
    r"|\bDDR[2-5]L?-([1-9]\d{2,3})\b",  # not CoreParts part numbers "MMHP-DDR3-0001-8GB"
    re.I,
)
# Plausible speeds per type, MT/s (DDR4/DDR5 = the owner's range table, docs/phase2/plan.md; DDR2/DDR3 = JEDEC
# and the usual overclocked kits). A stated speed outside its range is a typo or a clock value.
SPEED_RANGE = {"DDR2": (400, 1066), "DDR3": (800, 2933), "DDR4": (1600, 5333), "DDR5": (4000, 10000)}
# DDR5 shops sometimes state the clock (half the MT/s): "2400" = DDR5-4800. Doubled only onto these speeds.
DDR5_DOUBLED = {4000, 4400, 4800, 5200, 5600, 6000, 6400}
# Speeds the makers encode in part numbers (each pattern seen on 2+ real titles in latest.json, 2026-10-19):
# G.Skill F4-3200C16D / F5-6000J3040G32GX2 (not F3-: its numbers are PC ratings, "F3-12800CL10D"),
# Corsair CMK32GX5M2B6000C30 / CMSX24GX5M1A5600C48 / CMK16GX4M1A2400C16, ADATA/XPG AD5S480032G / AX5U6000C…,
# Goodram GR4800S564L40S / IR-6000D564L30S / IR-X3200D464L16SA.
PART_SPEED = re.compile(
    r"\bF[45]-(\d{4})[A-Z]"
    r"|\bCM[A-Z]{1,4}\d{1,3}GX[45]M\d[A-Z](\d{4})C\d"
    r"|\bA[DX][45][US](\d{4})"
    r"|\bGR(\d{4})[SD]\d"
    r"|\bIR-X?(\d{4})[SD]\d",
    re.I,
)
# Kingston: two digits = hundreds of MT/s (KF552C40 = 5200, KVR56U46 = 5600, KSM32ES8 = 3200), rounded for the
# odd JEDEC speeds (KF442 = 4266, KVR26 = 2666). Only the codes seen on 2+ titles in the data with a matching
# stated speed (2026-10-19; 53 = 5333 had one, so it's out); another code gives no speed. KVR800D2 (DDR2, 3
# digits) and KCP432 don't match.
KINGSTON_SPEED = re.compile(r"\b(?:KF[45]|KVR|KSM)(\d{2})[A-Z]", re.I)
KINGSTON_CODES = {16: 1600, 26: 2666, 32: 3200, 36: 3600, 40: 4000, 42: 4266, 48: 4800, 52: 5200,
                  56: 5600, 60: 6000, 64: 6400, 68: 6800, 72: 7200, 80: 8000, 84: 8400}
# CAS latency: "CL30"/"C30" in titles, or inside the part number ("F4-3200C16D-32GIS", "CMK32GX5M2B6000C30").
CAS = re.compile(r"(?:\bCL?\s?|\d{3}C)(\d{1,2})(?![\d.])", re.I)
SLUG_FORM = re.compile(r"-gia-(Desktop|Laptop|Server)\b", re.I)
SERVER = re.compile(r"\b(ECC|Registered|RDIMM|LRDIMM|Reg)\b", re.I)
# Part numbers that state the generation, trusted over a title or slug that says another one (shops
# write "DDR4" for "F5-6000J3636F32GX2"): G.Skill F4-/F5-, ADATA XPG AX4/AX5, Lexar LD4/LD5.
PART_DDR = re.compile(r"\b(?:F([45])-\d{4}|AX([45])[US]\d|LD([45])[A-Z]{1,2}\d)", re.I)
# Registered (server) DIMMs by part number: Micron MTA…72P, Kingston KSM…R, Samsung M393, SK Hynix HMA…R.
RDIMM = re.compile(r"\b(?:MTA\d+ASF\d+G72P|KSM\d+R|M393[A-Z0-9]|HMA\d+[A-Z]?R\d)", re.I)
LAPTOP = re.compile(r"\bSO-?DIMM\b", re.I)
# RAM coolers/fans; "Heatsink" alone is not excluded (e.g. "Afox Black Heatsink 32GB DDR4").
EXCLUDE = re.compile(r"ψύκτρα|cooler|\bfan\b|ανεμιστήρ", re.I)

VENDORS = [
    "Kingston", "G.Skill", "Corsair", "Crucial", "Patriot", "TeamGroup", "Team Group", "ADATA", "XPG",
    "Lexar", "Samsung", "SK Hynix", "Hynix", "Micron", "Silicon Power", "Goodram", "PNY", "Afox",
    "Apacer", "Transcend", "Mushkin", "Thermaltake", "Netac", "Kingmax", "Biostar", "Integral",
    "HP", "Dell", "Lenovo", "Fujitsu", "Supermicro", "Asus", "Gigabyte", "MSI", "Acer", "Fanxiang",
    "CoreParts", "Synology", "QNAP", "Klevv", "V-Color", "Hiksemi", "Hikvision", "OWC", "Nanya",
]
VENDOR_ALIASES = {"team group": "TeamGroup", "hynix": "SK Hynix", "fury": "Kingston", "g skill": "G.Skill"}


def vendor_of(title: str) -> str:
    low = title.lower()
    for v in VENDORS:
        if low.startswith(v.lower() + " "):
            return VENDOR_ALIASES.get(v.lower(), v)
    for alias, v in VENDOR_ALIASES.items():
        if low.startswith(alias + " "):
            return v
    first = title.split(" ", 1)[0]
    # Titles like "8GB DDR4 ..." or "2 Power ..." start with a spec, not a vendor.
    return first if re.match(r"[A-Za-z]", first) and not first.upper().startswith("DDR") else "Other"


def bare_kit(title: str, total: int) -> tuple[int, int] | None:
    """A kit written without "GB" ("(2x16)"), trusted only when it makes the total the title states."""
    for m in KIT_BARE.finditer(title):
        modules, size = int(m.group(1)), int(m.group(2))
        if modules * size == total:
            return modules, size
    return None


def part_speed(text: str) -> int | None:
    """The speed a maker's part number encodes (MT/s), or None."""
    if m := PART_SPEED.search(text):
        return int(next(g for g in m.groups() if g))
    if m := KINGSTON_SPEED.search(text):
        return KINGSTON_CODES.get(int(m.group(1)))
    return None


def speed_of(mem: str, specs: str, part_text: str) -> int | None:
    """MT/s: the stated speed when it is plausible for the type; else the part number's (if plausible);
    else, for DDR5, a stated clock value doubled (2400 -> 4800); else unknown. Never a guess."""
    lo, hi = SPEED_RANGE[mem]
    m = SPEED.search(specs)
    stated = int(next(g for g in m.groups() if g)) if m else None
    if stated is not None and lo <= stated <= hi:
        return stated
    part = part_speed(part_text)
    if part is not None and lo <= part <= hi:
        return part
    if mem == "DDR5" and stated is not None and 2000 <= stated <= 3999 and stated * 2 in DDR5_DOUBLED:
        return stated * 2
    return None


def make_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> RamListing | None:
    title = re.sub(r"\s+", " ", title).strip()
    if EXCLUDE.search(title) or price <= 0:
        return None
    specs = f"{title} {url} {specs}"
    type_m = TYPE.search(title) or TYPE.search(url.replace("-", " "))
    if not type_m:
        return None
    cap_m = CAPACITY.search(title)
    if kit_m := KIT.search(specs):
        modules, size = int(kit_m.group(1)), int(kit_m.group(2))
    elif cap_m and (kit := bare_kit(title, int(cap_m.group(1)))):
        modules, size = kit
    elif cap_m and not MULTI.search(specs):
        modules, size = 1, int(cap_m.group(1))  # "Kingston 32GB DDR5 ..." = one stick
    else:
        return None
    if size not in MODULE_SIZES:  # typos like "4x61GB", placeholders like "1x0GB"
        return None
    if RDIMM.search(f"{title} {url}"):
        form = "Server"
    elif form_m := SLUG_FORM.search(url):
        form = form_m.group(1).capitalize()
    elif SERVER.search(title):
        form = "Server"
    elif LAPTOP.search(title):
        form = "Laptop"
    else:
        form = "Desktop"

    part_m = PART_DDR.search(title) or PART_DDR.search(url)
    mem = f"DDR{next(g for g in part_m.groups() if g) if part_m else type_m.group(1)}"
    speed = speed_of(mem, specs, f"{title} {url}")
    capacity = modules * size
    chip = f"{mem} {capacity}GB ({modules}×{size}GB)" + (f" {speed}MHz" if speed else "")
    return RamListing(
        id=f"{source}:{native_id}",
        source=source,
        title=title,
        url=url,
        price=round(price, 2),
        shopCount=shop_count,
        brand=vendor_of(title),
        chip=chip,
        type=mem,
        capacity=capacity,
        modules=modules,
        speed=speed,
        cas=next((int(c) for c in CAS.findall(specs) if 9 <= int(c) <= 60), None),
        formFactor=form,
        scrapedAt=scraped_at,
    )
