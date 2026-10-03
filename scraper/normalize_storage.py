"""SSD / HDD title -> vendor, series, capacity, type (NVMe / SATA / SAS / HDD), form factor, tier.

A model is one drive at one capacity ("Samsung 990 Pro 1TB"), grouped across sites like cases. The
sites write the same drive very differently, so the series name is what is left of the title after
the vendor once category words, specs and part numbers are taken out, up to the capacity:

Skroutz:   "Samsung 990 PRO 1TB M.2 MZ-V9P1T0BW"; family cards "Kingston Nv3 M.2" (the capacity of
           the variant the card links to is only in the URL: ".../Kingston-Nv3-SSD-2TB-typou-M-2-…");
           HDDs "Western Digital Red Plus 4TB 3.5" 5400rpm WD40EFPX", URL "…-HDD-…-gia-NAS-…"
BestPrice: "Samsung 990 Pro SSD 1TB M.2 NVMe PCI Express 4.0",
           "Western Digital Red Plus NAS 4TB HDD Σκληρός Δίσκος 3.5" Sata 3 5400rpm με 512MB Cache WD40EFPX"
Shopflix:  "HDD Σκληρός Δίσκος Western Digital Red Plus WD60EFPX 6TB 3.5" SATA III 5400rpm με 256MB Cache για NAS"
Snif:      "Δίσκος SSD Samsung 870 Evo 2.5" 500GB Sata III MZ-77E500B/EU", "WD σκληρός δίσκος 3.5" Purple Surveillance 2TB, 64MB"
e-shop:    "SSD SAMSUNG MZ-V9P1T0BW 990 PRO 1TB M.2 NVME …", "HDD SEAGATE ST8000DM004 BARRACUDA 8TB 3.5" SATA 3"

Tier (owner's rules, 2026-10-03): Server = Exos, Ultrastar, U.2/U.3, SAS, "Enterprise" and the data-
centre series (WD Gold, Toshiba MG, Kingston DC, Samsung PM/SM, Micron 5xxx/7xxx, Solidigm D, Intel
D3/D5/D7, Seagate Nytro) plus server-brand OEM drives; NAS = NAS and surveillance (24/7) series (WD
Red / Purple, IronWolf, SkyHawk, Toshiba N300 / S300, Synology, QNAP) or a "για NAS" title/URL;
Consumer = everything else.
"""

import re

import names
from models import StorageListing

VENDORS = [
    "Western Digital", "Silicon Power", "Samsung", "Kingston", "Crucial", "Seagate", "Toshiba", "Kioxia",
    "Lexar", "Adata", "Corsair", "Patriot", "TeamGroup", "Intenso", "Goodram", "PNY", "SanDisk", "MSI",
    "Gigabyte", "Transcend", "Verbatim", "Netac", "Hikvision", "Hiksemi", "Apacer", "Micron", "Solidigm",
    "Intel", "Synology", "QNAP", "HPE", "HP", "Dell", "Lenovo", "Fujitsu", "Supermicro", "IBM", "Cisco",
    "Sabrent", "KingSpec", "Fanxiang", "Biwin", "Acer", "Mushkin", "Integral", "Emtec", "Afox", "MediaRange",
    "Dahua", "Hitachi", "Asus", "Thermaltake", "Kingmax", "Lite-On", "Plextor", "Addlink", "Zotac", "Fikwot",
    "Maxtor", "Inno3D", "Gamdias", "Axagon", "Kodak", "Philips", "Ortial", "Dato", "Leven", "Orico",
]
ALIASES = {"wd": "Western Digital", "hgst": "Western Digital", "team group": "TeamGroup", "team": "TeamGroup",
           "xpg": "Adata", "sandisk": "SanDisk", "hikvision": "Hikvision", "lenovo": "Lenovo"}
_CANON = {v.lower(): v for v in VENDORS} | ALIASES
VENDOR = re.compile(
    r"(?<![\w-])(" + "|".join(sorted((re.escape(v) for v in _CANON), key=len, reverse=True)) + r")(?![\w-])", re.I
)
# Server makers whose drives here are server parts (their part numbers, hot-plug trays).
OEM_SERVER = {"HPE", "Dell", "Lenovo", "Fujitsu", "Supermicro", "IBM", "Cisco"}

# Not internal drives: external/portable drives, enclosures, adapters, kits, used drives.
EXCLUDE = re.compile(
    r"Εξωτερικ|Eksoterik|External|Portable|\bUSB\b|Enclosure|Θήκ|Docking|Adapter|Αντάπτορ|Mounting|Caddy|"
    r"Bracket|Converter|Μετατροπ|\bCable|Καλώδι|Flash\s*Drive|Memory\s*Card|micro\s*SD|\bSD\s*Card|Refurb|"
    r"Renewed|Recertified|\bUsed\b|Μεταχειρισμ|,\s*FR\b|\sFR$|DiskStation|\bDS\d{3,4}\+?(?!\w)|Duplicator|"
    r"Cloner|Tester|Backplane|Riser|\bHub\b|Heatsink\s+(?:for|για)|Ψύκτρα\s+(?:για|SSD|M\.2)|Raspberry|\bRPi\b|"
    # Apple-connector upgrades (OWC Aura Pro for iMac / Mac Pro / MacBook) don't fit a PC.
    r"\bi?Mac(?:Book)?\b|Mac\s*(?:Pro|mini)\b|Aura\s+Pro",
    re.I,
)

# Capacity: "1TB", "1.92TB", "500 GB", Snif's "4T"; not "6Gb/s" / "6GB/S" (interface speed) or "256G"
# (part numbers).
CAPACITY = re.compile(r"(?<![\w.])(\d+(?:[.,]\d+)?)\s?(TB|GB|T(?=[\s,]))(?!\s*/\s*s|ps|[a-z])", re.I)
# Skroutz URLs: SSD "…-SSD-2TB-typou-…" ("4-1TB" = 4.1TB), HDD "…-14tb-hdd-…".
SLUG_CAPACITY = re.compile(r"ssd-(\d+(?:-\d{1,2})?)(tb|gb)-|-(\d+)(tb|gb)-hdd", re.I)

SSD_WORDS = re.compile(
    r"\bSSD\b|NVMe|\bM[.\s]2\b|mSATA|\bU\.[23]\b|PCI\s*-?\s*Express|PCI-?e|PCle|Solid\s+State", re.I
)
HDD_WORDS = re.compile(r"\bHDD\b|\d\s*rpm|\bSSHD\b|Σκληρ|Hard\s+(?:Disk|Drive)|Skliros", re.I)
SAS = re.compile(r"\bSAS(?:[-\s]?\d(?:\.0)?)?\b", re.I)
NVME = re.compile(r"NVMe|PCI\s*-?\s*Express|PCI-?e|PCle|\bU\.[23]\b", re.I)
PCIE_GEN = re.compile(r"(?:PCI\s*-?\s*Express|PCI-?E|PCle|\bGen)\.?\s*(?:Gen\.?\s*)?([345])(?:[.\s]\d)?\b", re.I)
M2_LENGTH = re.compile(r"(?<!\d)22(30|42|60|80|110)(?!\d)")

# Tier signals, checked in this order.
SERVER_NAMES = re.compile(
    r"\bExos\b|Ultrastar|\bU\.[23]\b|\bSAS\b|Enterprise|Data\s*Cent(?:er|re)|\bNytro\b|"
    r"(?:WD|Western\s+Digital)\s+(?:\S+\s+)?Gold\b|\bMG\d{2}|\bAL1\d[A-Z]{2}|"
    r"\bDC\s?\d{3,4}[A-Z]{0,3}\b|\bDC\s?(?:HC|SN|SA|ME)\d|"
    r"\bP?M(?:8[89]\d|9[68]3|9A3|9D3|1[67]\d\d)\b|\bSM8\d3\b|Micron\s+[57]\d00|Solidigm\s+D\d|\bD[357]-[PS]\d{4}|"
    r"Kioxia\s+(?:C[DM]\d|PM\d|XD\d)",
    re.I,
)
# (Not the shops' "για Καταγραφικό" / "gia-Katagrafiko": Skroutz puts it on desktop drives too, e.g. WD Blue.)
NAS_NAMES = re.compile(
    r"IronWolf|(?:WD|Western\s+Digital)\s+(?:Red|Purple)\b|SkyHawk|Toshiba\s+[NS]300\b|\bN300\b|Synology|QNAP|"
    r"Surveillance",
    re.I,
)
SERVER_WORD = re.compile(r"\bServer\b", re.I)
NAS_WORD = re.compile(r"\bNAS\b", re.I)
HP_SERVER = re.compile(r"-B2\d\b|Hot[\s-]?Plug|\b[LS]FF\b|Midline|\bMDL\b|\bSAS\b", re.I)

HEATSINK = re.compile(r"\b(?:with|w/)\s*Heatsink\b|\bHeatsink\b|με\s+Ψύκτρα|kai\s+PSyktra", re.I)
NO_HEATSINK = re.compile(r"\b(?:w/o|without|no)\s*Heatsink\b|χωρίς\s+Ψύκτρα", re.I)
RPM = re.compile(r"(\d[.,]?\d{3,4})\s*-?\s*rpm", re.I)
CACHE = re.compile(r"(?<![\w.])(\d{1,4})\s?(MB|GB)(?:\s+Cache|\s*,|\s*$)|(?<![\w.])(\d{1,4})\s?(MB|GB)\s*Cache", re.I)
SPEEDS = re.compile(r"(\d[.,]?\d{2,3})\s*[-/]\s*(\d[.,]?\d{2,3})\s*MB/?s", re.I)
DRAM = re.compile(r"DRAM[\s-]?less|\bHMB\b|\bDRAM\b", re.I)
TBW = re.compile(r"(\d[\d.,]*)\s*TBW\b", re.I)

# Words that describe the drive rather than name it ("SSD", "Sata", "Internal", "NAS"…).
NOISE = {
    "ssd", "hdd", "sshd", "nvme", "m.2", "m2", "msata", "sata", "sata3", "sataiii", "sata-iii", "sata-3", "iii",
    "pci", "pcie", "pcle", "pci-e", "express", "gen", "gen3", "gen4", "gen5", "x2", "x4", "nand", "3d", "tlc",
    "qlc", "mlc", "slc", "v-nand", "internal", "interno", "drive", "solid", "state", "hard", "disk", "desktop",
    "laptop", "notebook", "pc", "gaming", "compatible", "ps5", "playstation", "playstation5", "nas", "bulk", "retail", "box", "series", "cache", "rpm", "for", "and", "&", "+", "-", "/", "with",
    "w/", "xpg", "7mm", "9.5mm", "6gb/s", "12gb/s", "6gbps", "card", "add-in", "aic", "heatsink", "sas", "u.2",
    "u.3", "hdd/ssd", "type", "class",
    # Words only some sites put in a series name: Adata "Ultimate SU650" = "SU650", Corsair "Force MP600",
    # Patriot "Viper P400", Kingston "SSDNow A400", Silicon Power "Ace A55", TeamGroup "T-Force Vulcan Z",
    # Intenso "Top Performance" / "Top Perform" / "Top", Seagate "SkyHawk +Rescue", Synology "Gb/s 24/7".
    "ultimate", "force", "rev", "rev.", "viper", "ssdnow", "ace", "t-force", "performance", "perform",
    "+rescue", "mixed", "use", "gb/s", "24/7", "fastformat", "optimus", "cras",
}
# Left out only when other words name the drive: "Exos 7E10 Enterprise" = "Exos 7E10", but "Toshiba
# Enterprise 8TB" (and "Hikvision Surveillance 2TB") keeps its one word.
SOFT = {"enterprise", "professional", "surveillance"}
SPEC = re.compile(
    r'[123][.,][58]("|”|″)?|\d\.\d|\d{4,5}rpm|\d+mb|[\d.,]+(?:[-/][\d.,]+)?mb/?s|22(?:30|42|60|80|110)|x\d|gen\.?\d|'
    r"(?:gen)?\d[x×]\d|"
    r"\d+(?:\.\d+)?(?:tb|gb|t)"
)
PART_SHAPE = re.compile(r"^[A-Z]{1,3}\d{3,4}[A-Z]{0,3}$", re.I)  # series names like SN850X, DC600M, NM1090


def _snap(gb: float) -> int:
    """1024 -> 1000, 2048 -> 2000, 4.1TB -> 4000 (binary sizes written as decimal); 960 stays 960."""
    for tb in (1, 2, 4, 8, 16):
        if tb * 1000 < gb <= tb * 1000 * 1.05:
            return tb * 1000
    return round(gb)


def _capacity(text: str) -> int | None:
    m = CAPACITY.search(text)
    if not m:
        return None
    value = float(m.group(1).replace(",", "."))
    return _snap(value * 1000 if m.group(2).upper() in ("TB", "T") else value)


def _slug_capacity(url: str) -> int | None:
    m = SLUG_CAPACITY.search(url)
    if not m:
        return None
    num, unit = (m.group(1), m.group(2)) if m.group(1) else (m.group(3), m.group(4))
    value = float(num.replace("-", "."))
    return _snap(value * 1000 if unit.lower() == "tb" else value)


def capacity_label(gb: int) -> str:
    return f"{gb}GB" if gb < 1000 else f"{gb / 1000:g}TB"


def _is_part_number(tok: str) -> bool:
    """Shop part numbers (WD40EFPX, ST4000VN006, MZ-V9P1T0BW, SA400S37/960G, P19913-B21, 3813430), not
    series names (990, SN850X, DC600M, HC550)."""
    t = tok.strip("()[],;:")
    if SPEC.fullmatch(t.lower()):
        return False
    if re.fullmatch(r"\d{5,}", t):
        return True
    if not (re.search(r"\d", t) and re.search(r"[A-Za-z]", t)):
        return False
    if PART_SHAPE.fullmatch(t):
        return False
    return len(t) >= 7 or bool(re.search(r"[-/]", t) and len(t) >= 6)


def _drop(tok: str) -> bool:
    t = tok.strip("()[],;:").lower()
    return (
        not t
        or bool(re.fullmatch(r"\d", t))  # "SATA 3", "Gen 4": never a series name on its own
        or bool(re.search(r"[α-ωά-ώ]", t))
        or t in NOISE
        or bool(SPEC.fullmatch(t))
        or _is_part_number(tok)
    )


def _series(rest: str, vendor: str) -> str:
    """Name tokens before the capacity (or after it when the title puts the capacity first), without
    descriptors and part numbers; "soft" words when nothing else is left; the first part number as
    the last resort (OEM server drives)."""
    rest = re.sub(r"[”“″]|''|΄΄", '"', rest)
    rest = NO_HEATSINK.sub(" ", rest)
    rest = HEATSINK.sub(" ", rest)
    rest = re.sub(r"\s(?:με|για|with)\s.*$", "", rest, flags=re.I)
    m = CAPACITY.search(rest)
    before, after = (rest[: m.start()], rest[m.end():]) if m else (rest, "")
    for part in (before, after):
        toks = [t.strip("()[],;:") for t in re.split(r"[\s,]+", part) if t.strip("()[],;:")]
        # "Western Digital WD Black": the vendor's short name again.
        while toks and _CANON.get(toks[0].lower()) == vendor:
            toks = toks[1:]
        kept = [t for t in toks if not _drop(t)]
        kept = [t for i, t in enumerate(kept) if t.lower() not in {x.lower() for x in kept[:i]}]  # "X150 X150"
        named = [t for t in kept if t.lower() not in SOFT]
        if named or kept:
            return " ".join(named or kept)
    parts = [t.strip("()[],;:") for t in re.split(r"[\s,]+", rest) if _is_part_number(t)]
    if not parts:
        return ""
    # "SD250-128GN": the series before the capacity code, when it looks like one.
    head = parts[0].split("-", 1)[0]
    return head.upper() if PART_SHAPE.fullmatch(head) else parts[0].upper()


def _form_factor(text: str, slug: str, media: str, iface: str | None) -> str | None:
    if media == "HDD":
        size = re.search(r"(?<![\d.])(1\.8|2\.5|3\.5)", text) or re.search(r"(?:typou|diskos) ([123]) ([58])\b", slug, re.I)
        if not size:
            return '3.5"'
        return f'{size.group(1)}"' if size.lastindex == 1 else f'{size.group(1)}.{size.group(2)}"'
    if re.search(r"\bU\.[23]\b", text):
        return "U.2"
    # "PCle" (lower-case L) is how Skroutz writes it.
    if re.search(r"PC[Il][el]?\s*-?\s*(?:Express\s+)?Card|Add[\s-]?in|\bAIC\b|\bHHHL\b", text, re.I):
        return "PCIe card"
    if re.search(r"mSATA", text, re.I):
        return "mSATA"
    length = M2_LENGTH.search(text)
    if re.search(r"\bM[.\s]?2\b", text, re.I) or re.search(r"\bM 2\b", slug) or (iface == "NVMe" and length):
        return f"M.2 22{length.group(1)}" if length else "M.2 2280"
    size = re.search(r"(?<![\d.])(1\.8|2\.5|3\.5)\s*(?:\"|inch|in\b|ίντσ)?(?!\s*(?:GB|Gb|TB|MB|W|mm)|\d)", text)
    if not size:
        size = re.search(r"(?:typou|diskos) ([123]) ([58])\b", slug, re.I)
    if size:
        return f'{size.group(1)}"' if size.lastindex == 1 else f'{size.group(1)}.{size.group(2)}"'
    if media == "HDD":
        return '3.5"'
    if iface == "NVMe":
        return "M.2 2280"
    if iface == "SATA":
        return '2.5"'
    return None


def _tier(text: str, vendor: str, media: str, iface: str | None, form: str | None) -> str:
    if SERVER_NAMES.search(text) or vendor in OEM_SERVER or (vendor == "HP" and HP_SERVER.search(text)):
        return "Server"
    if iface == "NVMe" and form in ('2.5"', "U.2"):
        return "Server"  # a 2.5" NVMe drive is a U.2/U.3 data-centre drive
    if NAS_NAMES.search(text) or (media == "HDD" and vendor in {"Hikvision", "Dahua"}):
        return "NAS"
    if SERVER_WORD.search(text):
        return "Server"
    if NAS_WORD.search(text):
        return "NAS"
    return "Consumer"


def make_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> StorageListing | None:
    # e-shop writes "3,5''": decimal commas (between digits, no space) become points for parsing.
    title = re.sub(r"(?<=\d),(?=\d)", ".", re.sub(r"\s+", " ", title).strip())
    slug = re.sub(r"[-_/]+", " ", url.rsplit("/", 1)[-1].removesuffix(".html"))
    text = f"{title} {slug}"
    if price <= 0 or EXCLUDE.search(title):
        return None

    # The words themselves first: "Toshiba S300 AI 8TB HDD … 3.5" / M.2" is a hard drive.
    if re.search(r"\bSSHD\b", text, re.I):
        media = "HDD"
    elif re.search(r"\bSSD\b", title, re.I):
        media = "SSD"
    elif re.search(r"\bHDD\b", title, re.I):
        media = "HDD"
    elif SSD_WORDS.search(title):
        media = "SSD"
    elif HDD_WORDS.search(title):
        media = "HDD"
    elif SSD_WORDS.search(slug):
        media = "SSD"
    elif HDD_WORDS.search(slug):
        media = "HDD"
    elif re.search(r"(?<![\d.])3[.,]5\s*(?:\"|''|”|″)", title):
        media = "HDD"  # Snif: "SEAGATE IronWolf 8TB ST8000VN004 SATA III, 3.5''" (no 3.5" SSDs say nothing)
    else:
        return None

    capacity = _capacity(title) or _slug_capacity(url)
    if not capacity or not 16 <= capacity <= 40000:
        return None

    m = VENDOR.search(title)
    if m:
        vendor, rest = _CANON[m.group(1).lower()], title[m.end():]
    else:
        toks = [t for t in title.split() if re.fullmatch(r"[A-Za-z][\w.-]*", t) and t.lower() not in NOISE]
        if not toks or not names.valid_vendor(toks[0]):
            return None
        vendor, rest = toks[0].capitalize() if toks[0].isupper() else toks[0], title.split(toks[0], 1)[1]
    series = _series(rest, vendor)
    if not series:
        return None

    if media == "HDD":
        iface = "SAS" if SAS.search(text) else "SATA"
    elif SAS.search(text):
        iface = "SAS"
    elif NVME.search(text):
        iface = "NVMe"
    elif re.search(r"SATA", text, re.I) or re.search(r'(?<![\d.])2[.,]5\s*"', title):
        iface = "SATA"
    else:
        iface = None
    gen = (PCIE_GEN.search(title) or PCIE_GEN.search(slug)) if iface == "NVMe" else None
    form = _form_factor(title, slug, media, iface)

    # The model name shows the variant when a drive comes in more than one shape: 2.5" HDDs (3.5" is
    # the default), M.2 / mSATA SATA SSDs (2.5" is), NVMe drives shorter or longer than M.2 2280.
    suffix = ""
    if media == "HDD" and form == '2.5"':
        suffix = ' 2.5"'
    elif iface == "SATA" and form == "mSATA":
        suffix = " mSATA"
    elif iface == "SATA" and form and form.startswith("M.2"):
        suffix = " M.2"
    elif iface == "NVMe" and form and form.startswith("M.2") and form != "M.2 2280":
        suffix = f" {form[4:]}"
    # From the title only: a Skroutz family card's URL can be the heatsink variant of a plain name.
    has_heatsink = bool(HEATSINK.search(title)) and not NO_HEATSINK.search(title)
    if has_heatsink and not re.search(r"heatsink", series, re.I):
        series += " Heatsink"

    rpm = RPM.search(text) if media == "HDD" else None
    if rpm and not 4000 <= int(re.sub(r"[.,]", "", rpm.group(1))) <= 15000:
        rpm = None
    cache = None
    if media == "HDD":
        for c in [*CACHE.finditer(title), *CACHE.finditer(slug)]:
            n, unit = (c.group(1), c.group(2)) if c.group(1) else (c.group(3), c.group(4))
            mb = int(n) * (1024 if unit.upper() == "GB" else 1)
            if mb in (8, 16, 32, 64, 128, 256, 512, 1024, 2048):
                cache = mb
                break
    speeds = SPEEDS.search(title) if media == "SSD" else None
    dram = DRAM.search(title) if media == "SSD" else None
    tbw = TBW.search(title) if media == "SSD" else None

    def num(s: str) -> int:
        return int(re.sub(r"[.,]", "", s))

    return StorageListing(
        id=f"{source}:{native_id}",
        source=source,
        title=title,
        url=url,
        price=round(price, 2),
        shopCount=shop_count,
        brand=vendor,
        chip=f"{vendor} {series} {capacity_label(capacity)}{suffix}",
        media=media,
        iface=iface,
        pcie=int(gen.group(1)) if gen else None,
        formFactor=form,
        capacity=capacity,
        tier=_tier(text, vendor, media, iface, form),
        scrapedAt=scraped_at,
        dram=None if not dram else not re.search(r"less|HMB", dram.group(0), re.I),
        readMBs=num(speeds.group(1)) if speeds else None,
        writeMBs=num(speeds.group(2)) if speeds else None,
        tbw=num(tbw.group(1)) if tbw else None,
        heatsink=True if has_heatsink else (False if NO_HEATSINK.search(title) else None),
        rpm=num(rpm.group(1)) if rpm else None,
        cacheMB=cache,
    )
