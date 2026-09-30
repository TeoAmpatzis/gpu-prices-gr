"""CPU title -> brand / chip / cores / socket. Titles we can't classify are dropped."""

import re

from models import CpuListing

# (pattern, brand, formatter). First match wins, so specific families come first.
CHIPS: list[tuple[re.Pattern, str, callable]] = [
    (re.compile(r"\bRyzen\s+Threadripper\s+(PRO\s+)?(\d{4}[A-Z0-9]*)", re.I), "AMD",
     lambda m: f"Threadripper {'PRO ' if m[1] else ''}{m[2].upper()}"),
    (re.compile(r"\bRyzen\s+(\d)\s+(PRO\s+)?(\d{3,4}[A-Z0-9]*)", re.I), "AMD",
     lambda m: f"Ryzen {m[1]} {'PRO ' if m[2] else ''}{m[3].upper()}"),
    (re.compile(r"\bAthlon\s+(?:Gold\s+|Silver\s+|PRO\s+)?(\d{3,4}[A-Z0-9]*)", re.I), "AMD",
     lambda m: f"Athlon {m[1].upper()}"),
    # Some titles repeat words: "Epyc AMD 9124", "Epyc EPYC GENOA 9275F".
    (re.compile(r"\bEPYC\s+(?:(?:AMD|EPYC|Genoa|Turin|Milan|Rome|Siena|Bergamo)\s+)*(\d{3,4}[A-Z0-9]*)", re.I), "AMD",
     lambda m: f"EPYC {m[1].upper()}"),
    # Skroutz drops "Core" from Core Ultra titles ("Intel Ultra 7 265K").
    (re.compile(r"\b(?:Core\s+)?Ultra\s+(\d)\s+(\d{3}[A-Z0-9]*)(\s+Plus\b)?", re.I), "Intel",
     lambda m: f"Core Ultra {m[1]} {m[2].upper()}{' Plus' if m[3] else ''}"),
    (re.compile(r"\bCore\s+i(\d)[\s-]*(\d{4,5}[A-Z0-9]*)", re.I), "Intel",
     lambda m: f"Core i{m[1]}-{m[2].upper()}"),
    (re.compile(r"\bCore\s+(\d)\s+(\d{3}[A-Z0-9]*)", re.I), "Intel", lambda m: f"Core {m[1]} {m[2].upper()}"),
    (re.compile(r"\bXeon\s+(Platinum|Gold|Silver|Bronze)\s+(\d{4}[A-Z0-9]*)", re.I), "Intel",
     lambda m: f"Xeon {m[1].capitalize()} {m[2].upper()}"),
    (re.compile(r"\bXeon\s+(W[3579])-(\d{4}[A-Z0-9]*)", re.I), "Intel", lambda m: f"Xeon {m[1].lower()}-{m[2].upper()}"),
    (re.compile(r"\bXeon\s+(W|E|E3|E5|E7|D)[\s-]+(\d{4,5}[A-Z0-9]*)(?:\s+(v\d))?", re.I), "Intel",
     lambda m: f"Xeon {m[1].upper()}-{m[2].upper()}{' ' + m[3].lower() if m[3] else ''}"),
    (re.compile(r"\bXeon\s+(\d{4,5}[A-Z0-9]*)", re.I), "Intel", lambda m: f"Xeon {m[1].upper()}"),
    (re.compile(r"\bPentium\s+(?:Dual\s+Core\s+)?(?:Gold\s+|Silver\s+)?(G?\d{4}[A-Z0-9]*)", re.I), "Intel",
     lambda m: f"Pentium {m[1].upper()}"),
    (re.compile(r"\bCeleron\s+(?:Dual\s+Core\s+)?(G?\d{4}[A-Z0-9]*)", re.I), "Intel",
     lambda m: f"Celeron {m[1].upper()}"),
    (re.compile(r"^Intel\s+(?:Processor\s+)?(300T?)\b", re.I), "Intel", lambda m: f"Processor {m[1].upper()}"),
]

# BestPrice: "... Επεξεργαστής 8 Πυρήνων για Socket AM4"; Skroutz slug: "...-8-Pyrinon-gia-Socket-AM5".
# Skroutz spec line: "AM5 Socket, 8 Cores, 16 Threads"; e-shop: "… LGA1851 14 CORE BOX".
CORES = re.compile(r"(\d{1,3})[\s-]*(?:Πυρήν|Pyrinon|Cores?\b)", re.I)
BOX = re.compile(r"\bBox(?:ed)?\b", re.I)
TRAY = re.compile(r"\b(?:Tray|OEM|MPK)\b", re.I)


def has_igpu(chip: str) -> bool:
    """Integrated graphics from the model number: Intel F/KF have none, Ryzen 7000+ and G models do."""
    m = re.search(r"\d([A-Z0-9]*)(?: Plus| v\d)?$", chip)  # "14600KF" -> "4600KF"; only its letters matter
    suffix = m.group(1) if m else ""
    if chip.startswith(("Core", "Pentium", "Celeron", "Processor")):
        return "F" not in suffix
    if chip.startswith("Xeon"):
        return "G" in suffix  # Xeon E-2xxxG
    if chip.startswith("Athlon"):
        return True
    if m := re.match(r"Ryzen \d (?:PRO )?(\d)\d{3}", chip):
        return "G" in suffix or (int(m.group(1)) >= 7 and "F" not in suffix)
    return False  # Threadripper, EPYC
SOCKET = re.compile(r"Socket[\s-]+(?:LGA[\s-]*)?([A-Za-z]*\d+[A-Za-z0-9]*)", re.I)


def normalize_socket(raw: str) -> str:
    s = re.sub(r"^(FC)?LGA", "", raw.upper())
    if s.isdigit():
        return f"LGA{s}"
    if s.startswith(("STR", "SWRX")):  # sTR5, sTRX4, sWRX8
        return "s" + s[1:]
    return s


# Fallback when neither the title nor the URL names the socket.
SOCKET_BY_CHIP: list[tuple[re.Pattern, str]] = [
    (re.compile(r"^Ryzen \d (PRO )?[1-5]\d{3}"), "AM4"),
    (re.compile(r"^Ryzen \d (PRO )?[7-9]\d{3}"), "AM5"),
    (re.compile(r"^Core Ultra \d 2\d\d"), "LGA1851"),
    (re.compile(r"^Core i\d-1[234]\d{3}"), "LGA1700"),
    (re.compile(r"^Core i\d-1[01]\d{3}"), "LGA1200"),
    (re.compile(r"^Core i\d-[89]\d{3}"), "LGA1151"),
]


def infer_socket(chip: str) -> str | None:
    return next((sock for pattern, sock in SOCKET_BY_CHIP if pattern.search(chip)), None)


def classify(title: str) -> tuple[str, str] | None:
    for pattern, brand, fmt in CHIPS:
        if m := pattern.search(title):
            return brand, fmt(m)
    return None


def make_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> CpuListing | None:
    title = re.sub(r"\s+", " ", title.replace("®", "").replace("™", "")).strip()
    specs = f"{title} {url} {specs}"
    cores = CORES.search(specs)
    socket = SOCKET.search(specs)
    # BestPrice appends the category name + specs to titles.
    title = re.sub(r"\s*Επεξεργαστής.*$", "", title, flags=re.I)
    info = classify(title)
    if not info or price <= 0:
        return None
    brand, chip = info
    return CpuListing(
        id=f"{source}:{native_id}",
        source=source,
        title=title,
        url=url,
        price=round(price, 2),
        shopCount=shop_count,
        brand=brand,
        chip=chip,
        cores=int(cores.group(1)) if cores else None,
        socket=normalize_socket(socket.group(1)) if socket else infer_socket(chip),
        packaging="Box" if BOX.search(specs) else "Tray" if TRAY.search(specs) else None,
        igpu=has_igpu(chip),
        scrapedAt=scraped_at,
    )
