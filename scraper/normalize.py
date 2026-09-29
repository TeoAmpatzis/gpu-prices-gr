"""Title -> brand / chip / vram / partner. Titles we can't classify are dropped."""

import re
from datetime import datetime, timezone

from models import Listing

# Accessories that live in the GPU category but aren't cards.
EXCLUDE = re.compile(
    r"water\s*block|waterblock|backplate|riser|καλώδιο|\bcable\b|"
    r"\bdock\b|enclosure|thermal\s*pad|adapter|αντάπτορ",
    re.I,
)

NVIDIA = re.compile(
    r"\b(RTX|GTX|GT)\s*-?\s*(\d{3,4})\s*(Ti\s*Super|Ti|Super)?\b",
    re.I,
)
AMD = re.compile(r"\bRX\s*-?\s*(\d{3,4})\s*(XTX|XT|GRE)?\b", re.I)
# Workstation cards, checked before the consumer NVIDIA pattern.
NVIDIA_PRO = [
    (re.compile(r"\bRTX\s*PRO\s*(\d{4})", re.I), "RTX PRO {}"),
    (re.compile(r"\bRTX\s*A(\d{3,4})\b", re.I), "RTX A{}"),
    (re.compile(r"\bRTX\s*(\d{4})\s*Ada\b", re.I), "RTX {} Ada"),
    (re.compile(r"\b(?:Quadro\s*)?T(400|600|1000)\b", re.I), "T{}"),
]
WORKSTATION_NUMBERS = {2000, 4000, 4500, 5000, 6000}
INTEL = re.compile(r"\bArc\s*(?:Pro\s*)?([AB]\d{3})\b", re.I)
VRAM = re.compile(r"\b(\d{1,2})(?:[.,]0)?\s*GB\b", re.I)  # "8GB", "2.0GB"

# Checked in order against the start of the title, then anywhere.
PARTNERS = [
    "Asus", "MSI", "Gigabyte", "ASRock", "Sapphire", "PowerColor", "XFX", "Zotac",
    "Palit", "Gainward", "PNY", "Inno3D", "KFA2", "Galax", "EVGA", "AFOX", "Biostar",
    "Sparkle", "Acer", "Colorful", "Manli", "Maxsun", "Yeston", "Leadtek", "Emtek", "Matrox",
    "Dell", "HP", "Lenovo", "Fujitsu",
]
PARTNER_ALIASES = {"inno 3d": "Inno3D", "aorus": "Gigabyte", "rog": "Asus", "tuf": "Asus", "powercolour": "PowerColor"}
REFERENCE = {"NVIDIA": "NVIDIA FE", "AMD": "AMD Reference", "Intel": "Intel LE"}


def classify(title: str, hint: str = "") -> tuple[str, str, int] | None:
    """Return (brand, chip, vram) or None if the title isn't a recognisable GPU.
    `hint` (e.g. the URL slug) is only used to find VRAM when the title omits it."""
    if EXCLUDE.search(title):
        return None
    vram_m = VRAM.search(title) or re.search(r"[-_](\d{1,2})GB[-_.]", hint, re.I)
    if not vram_m:
        return None
    vram = int(vram_m.group(1))

    if m := INTEL.search(title):
        return "Intel", f"Arc {m.group(1).upper()}", vram
    if m := AMD.search(title):
        suffix = (m.group(2) or "").upper()
        return "AMD", f"RX {m.group(1)}{' ' + suffix if suffix else ''}", vram
    for pattern, fmt in NVIDIA_PRO:
        if m := pattern.search(title):
            return "NVIDIA", fmt.format(m.group(1)), vram
    if m := NVIDIA.search(title):
        prefix, num = m.group(1).upper(), int(m.group(2))
        if prefix == "RTX" and num in WORKSTATION_NUMBERS:
            # "RTX 4000 20GB Ada", "RTX 5000 72GB Blackwell": generation can be anywhere.
            if re.search(r"\bBlackwell\b", title, re.I):
                return "NVIDIA", f"RTX PRO {num}", vram
            if re.search(r"\bAda\b", title, re.I):
                return "NVIDIA", f"RTX {num} Ada", vram
            return "NVIDIA", f"RTX {num} (Pro)", vram
        suffix = (m.group(3) or "").lower()
        suffix = {"ti super": "Ti Super", "ti": "Ti", "super": "Super"}.get(re.sub(r"\s+", " ", suffix), "")
        return "NVIDIA", f"{prefix} {m.group(2)}{' ' + suffix if suffix else ''}", vram
    return None


def partner_of(title: str, brand: str) -> str:
    low = title.lower()
    for p in PARTNERS:
        if low.startswith(p.lower() + " "):
            return p
    for p in PARTNERS:
        if re.search(rf"\b{re.escape(p.lower())}\b", low):
            return p
    for alias, p in PARTNER_ALIASES.items():
        if re.search(rf"\b{alias}\b", low):
            return p
    first = low.split(" ", 1)[0]
    if first in {"nvidia", "amd", "intel"}:
        return REFERENCE[brand]
    return "Other"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def make_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str,
) -> Listing | None:
    title = re.sub(r"\s+", " ", title).strip()
    # BestPrice appends the category name to titles.
    title = re.sub(r"\s*Κάρτα Γραφικών.*$", "", title, flags=re.I)
    info = classify(title, url)
    if not info or price <= 0:
        return None
    brand, chip, vram = info
    return Listing(
        id=f"{source}:{native_id}",
        source=source,
        title=title,
        url=url,
        price=round(price, 2),
        shopCount=shop_count,
        brand=brand,
        chip=chip,
        vram=vram,
        partner=partner_of(title, brand),
        scrapedAt=scraped_at,
    )
