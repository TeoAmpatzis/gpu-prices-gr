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
CAPACITY = re.compile(r"\b(\d{1,3})\s*GB\b", re.I)
MODULE_SIZES = {1, 2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256}
MULTI = re.compile(r"\b[2-9][\s-]*Modules\b", re.I)
SPEED = re.compile(r"\b(\d{3,5})\s*(?:MHz|MT/s)\b|Tachytita-(\d{3,5})\b", re.I)
SLUG_FORM = re.compile(r"-gia-(Desktop|Laptop|Server)\b", re.I)
SERVER = re.compile(r"\b(ECC|Registered|RDIMM|LRDIMM|Reg)\b", re.I)
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
    if kit_m := KIT.search(specs):
        modules, size = int(kit_m.group(1)), int(kit_m.group(2))
    elif (cap_m := CAPACITY.search(title)) and not MULTI.search(specs):
        modules, size = 1, int(cap_m.group(1))  # "Kingston 32GB DDR5 ..." = one stick
    else:
        return None
    if size not in MODULE_SIZES:  # typos like "4x61GB", placeholders like "1x0GB"
        return None
    speed_m = SPEED.search(specs)
    speed = int(speed_m.group(1) or speed_m.group(2)) if speed_m else None

    if form_m := SLUG_FORM.search(url):
        form = form_m.group(1).capitalize()
    elif SERVER.search(title):
        form = "Server"
    elif LAPTOP.search(title):
        form = "Laptop"
    else:
        form = "Desktop"

    mem = f"DDR{type_m.group(1)}"
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
        formFactor=form,
        scrapedAt=scraped_at,
    )
