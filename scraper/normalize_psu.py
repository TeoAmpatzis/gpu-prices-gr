"""PSU title + URL slug (+ Skroutz spec line) -> wattage / efficiency / modularity / form factor.

Like RAM, models are specs across vendors ("850W Gold" ATX), so the site answers
"cheapest 850W Gold PSU". Titles without a wattage are dropped.

BestPrice: "Corsair RM850x 2024 850W Τροφοδοτικό Υπολογιστή ATX 3.1 80 PLUS Gold" (no modularity).
Skroutz:   "Corsair SF750 750W Full Modular 80 Plus Platinum", specs "Τύπος:ATX / SFX, ...";
family cards omit the wattage from the title but the slug has it ("...-850W-Mayro-Trofodotiko-...").
"""

import re

from models import PsuListing

# No leading \b: the wattage can be glued to a model prefix ("Aorus P850W").
WATTS = re.compile(r"(?<![\d.])(\d{3,4})\s*W\b", re.I)
SLUG_WATTS = re.compile(r"-(\d{3,4})W-", re.I)
# 80 PLUS and Cybenetics tiers are folded into one scale; "Standard"/"White" = base 80 PLUS.
EFFICIENCY = re.compile(r"\b(?:80\s*\+|80\s*Plus|Cybenetics)\s*(Titanium|Platinum|Gold|Silver|Bronze|Diamond|Standard|White)?", re.I)
MODULAR = [
    (re.compile(r"\bFull[\s-]*Modular\b", re.I), "Full"),
    (re.compile(r"\bSemi[\s-]*Modular\b", re.I), "Semi"),
    (re.compile(r"\b(Full[\s-]*Wired|Non[\s-]*Modular)\b", re.I), "Non"),
]
FORM = [
    (re.compile(r"\bSFX(-L)?\b", re.I), "SFX"),
    (re.compile(r"\bTFX\b", re.I), "TFX"),
    (re.compile(r"\bFlex\b", re.I), "Flex"),
]
EXCLUDE = re.compile(r"καλώδι|\bcable|extension|adapter|αντάπτορ|tester|bracket|βάση|sleeved", re.I)
MIN_WATTS, MAX_WATTS = 150, 3000

VENDORS = [
    "Be Quiet", "Corsair", "Seasonic", "Cooler Master", "Thermaltake", "MSI", "Asus", "Gigabyte", "NZXT",
    "Lian Li", "Fractal Design", "FSP Fortron", "FSP", "Super Flower", "SilverStone", "Montech", "Deepcool",
    "Chieftec", "Enermax", "Cougar", "Sharkoon", "Xilence", "Aerocool", "Endorfy", "Kolink", "LC-Power",
    "Mars Gaming", "Turbo-X", "White Shark", "Thermalright", "Adata", "XPG", "Powertech", "Gamemax",
    "1stPlayer", "Antec", "EVGA", "Phanteks", "Arctic", "Inter-Tech", "Zalman", "Nox", "Tacens", "Akyga",
]
VENDOR_ALIASES = {
    "bequiet": "Be Quiet", "be quiet!": "Be Quiet", "fsp fortron": "FSP", "fsp/fortron": "FSP",
    "coolermaster": "Cooler Master", "cm": "Cooler Master", "asrock": "ASRock", "pccooler": "PCCooler",
}


def vendor_of(title: str) -> str:
    low = title.lower()
    for alias, v in VENDOR_ALIASES.items():
        if low.startswith(alias + " "):
            return v
    for v in VENDORS:
        if low.startswith(v.lower() + " "):
            return v
    first = title.split(" ", 1)[0]
    return first if re.match(r"[A-Za-z]", first) else "Other"


def make_listing(
    *, source: str, native_id: str, title: str, url: str, price: float,
    shop_count: int | None, scraped_at: str, specs: str = "",
) -> PsuListing | None:
    title = re.sub(r"\s+", " ", title).strip()
    if EXCLUDE.search(title) or price <= 0:
        return None
    w = WATTS.search(title) or SLUG_WATTS.search(url)
    if not w or not MIN_WATTS <= int(w.group(1)) <= MAX_WATTS:
        return None
    watts = int(w.group(1))

    text = f"{title} {url.replace('-', ' ')} {specs}"
    eff_m = EFFICIENCY.search(text)
    tier = (eff_m.group(1) or "Standard").capitalize() if eff_m else None
    efficiency = "Standard" if tier == "White" else tier  # None = no certification
    modular = next((v for pattern, v in MODULAR if pattern.search(text)), None)
    form = next((v for pattern, v in FORM if pattern.search(text)), "ATX")

    # BestPrice appends the category name ("Τροφοδοτικό Υπολογιστή ATX 3.1 80 PLUS Gold").
    title = re.sub(r"\s*Τροφοδοτικό Υπολογιστή.*$", "", title, flags=re.I)
    return PsuListing(
        id=f"{source}:{native_id}",
        source=source,
        title=title,
        url=url,
        price=round(price, 2),
        shopCount=shop_count,
        brand=vendor_of(title),
        chip=f"{watts}W" + (f" {efficiency}" if efficiency else ""),
        watts=watts,
        efficiency=efficiency,
        modular=modular,
        formFactor=form,
        scrapedAt=scraped_at,
    )
