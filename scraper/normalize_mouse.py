"""Mouse list observations and identity. No I/O; absent specifications remain unknown."""
import html
import math
import re
import unicodedata
from collections import defaultdict

import names
from models import MouseListing


BRANDS = {v.casefold(): v for v in names.VENDORS}
BRANDS.update({v.casefold(): v for v in (
    "Logitech", "HP", "Microsoft", "Razer", "MARVO", "SteelSeries", "A4Tech", "Bloody", "Trust",
    "Rapoo", "LogiLink", "Genius", "Hama", "Natec", "Delux", "Pulsar", "Endgame Gear", "Zowie",
    "Glorious", "Dareu", "Keychron", "VGN", "VXE", "Lamzu", "Fantech", "Kensington", "Dell", "Lenovo",
)})
BRAND_PREFIXES = sorted({**BRANDS, **names.VENDOR_ALIASES}.items(), key=lambda pair: -len(pair[0]))

# Canonical colour keys are shared across Greek/English titles; unfamiliar colour names stay in the name.
COLOURS = {
    "black": ("Black", "Μαύρο", "Μαυρο", "Μαύρη", "Μαυρη"),
    "charcoal": ("Charcoal",),
    "white": ("White", "Λευκό", "Λευκο", "Λευκή", "Λευκη"),
    "grey": ("Grey", "Gray", "Γκρι"),
    "silver": ("Silver", "Ασημί", "Ασημι"),
    "pink": ("Pink", "Ροζ"),
    "blue": ("Blue", "Μπλε"),
    "red": ("Red", "Κόκκινο", "Κοκκινο"),
    "green": ("Green", "Πράσινο", "Πρασινο"),
    "purple": ("Purple", "Μωβ"),
    "yellow": ("Yellow", "Κίτρινο", "Κιτρινο"),
    "orange": ("Orange", "Πορτοκαλί", "Πορτοκαλι"),
}
PART_NUMBER = re.compile(r"(?<![\w-])(?:\d{3}-\d{6}|\d[A-Z]{2}\d{2}[A-Z]{2}(?:#[A-Z0-9]+)?)(?![\w-])", re.I)
DESCRIPTORS = r"(?:ποντ[ίι]κι(?:α)?|mouse|mice|gaming)"
WIRED = r"\bwired\b|\bενσυρματο\b"
WIRELESS = r"\bwireless\b|\bασυρματο\b"
FLAGS = {
    "rgb": r"\b(?:a?rgb)\b",
    "gaming": r"\bgaming\b",
    "bluetooth": r"\bbluetooth\b",
    "rf": r"\brf\b|(?<![\w.])2[.,]4\s*g(?:hz)?\b",
    "rechargeable": r"\brechargeable\b|\bεπαναφορτιζομενο\b",
    "ergonomic": r"\bergonomic\b|\bvertical\b|\bεργονομικο\b",
    "silent": r"\bsilent\b|\bαθορυβο\b",
}
DERIVED_REJECTS = {"no-identity", "identity-conflict"}
INCLUDED_ACCESSORY = re.compile(
    r"\b(?:with|includes|including|με)\s+(?:a\s+)?(?:usb\s+)?(?:receiver|dongle|charging\s+cable)\b", re.I)


def _fold(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c)).casefold()


def _flag(text: str, pattern: str) -> bool | None:
    values = [not re.search(r"(?:\bno|\bwithout|\bχωρισ|\bnon)[ -]*$", text[:m.start()])
              for m in re.finditer(pattern, text)]
    return any(values) if values else None


def _number(text: str, unit: str, prefix: bool = False) -> int | None:
    pattern = (rf"\b(?:{unit})\s*:\s*(\d+)(?![\w.]|,\d)" if prefix else
               rf"(?<![\w.,+-])(\d+)\s*(?:{unit})(?!\w)")
    values = [int(m.group(1)) for m in re.finditer(pattern, text)]
    return max((v for v in values if v > 0), default=None)


def rejection_reason(title: str) -> str | None:
    text = _fold(title)
    if re.search(r"\b(?:used|refurb\w*|open[ -]?box)\b|μεταχειρισμεν|ανακατασκευ", text):
        return "used"
    if re.search(r"\bcombo\b|\bσετ\b|keyboard\s*(?:&|and|\+)\s*mouse|"
                 r"mouse\b.*[+&].*\b(?:mouse\s*pad|mousepad|pad|headset|keyboard)\b|"
                 r"\bkeyboard\b.*[+&].*\bmouse\b|με\s+δωρο", text):
        return "bundle"
    text = INCLUDED_ACCESSORY.sub('', text)
    if re.search(r"mouse\s*pad|mousepad|μαξιλαρακι|\bbungee\b|\bfeet\b|\bskates\b|grip\s*tape|"
                 r"\breceiver\b|\bdongle\b|charging\s*dock|usb\s*hub|replacement\s*(?:mouse\s*)?(?:switch|shell)|\bcable\b|"
                 r"wrist\s*rest|\bpresenter\b|\btrackpad\b|graphics\s*tablet|game\s*controller", text):
        return "not-mouse"
    return None


def _identity(title: str) -> tuple[str, str, str | None, str | None]:
    text = names.prepare(html.unescape(title))
    text = re.sub(rf"^(?:(?:{DESCRIPTORS})\s+)+", "", text, flags=re.I)
    prefix, brand = next(((k, v) for k, v in BRAND_PREFIXES
                          if text.casefold().startswith(k + " ")), ('', 'Other'))
    if brand == "Other":
        return brand, "", None, None
    text = text[len(prefix):].strip()
    part = PART_NUMBER.search(text)
    part_number = part.group().upper() if part else None
    text = PART_NUMBER.sub(" ", text)
    connection_word = r"(?:wireless|wired|ασ[ύυ]ρματο|ενσ[ύυ]ρματο)"
    text = re.sub(rf"\b{connection_word}\s*[+&/]\s*{connection_word}\b", " ", text, flags=re.I)
    text = INCLUDED_ACCESSORY.sub(' ', text)
    colours = []
    for colour, aliases in COLOURS.items():
        for alias in aliases:
            pattern = rf"(?<![\w-]){re.escape(alias)}(?![\w-])"
            if re.search(pattern, text, re.I):
                colours.append(colour)
                text = re.sub(pattern, " ", text, flags=re.I)
    # Keep edition/identity words such as Mini, Lightspeed, for Mac and Bluetooth Edition.
    noise = (rf"\b{DESCRIPTORS}\b|\b(?:wireless|wired|ασ[ύυ]ρματο|ενσ[ύυ]ρματο)\b|"
             r"\bbluetooth\b(?!\s+edition\b)|\b(?:a?rgb|rechargeable|silent|ergonomic|vertical)\b|"
             r"\b(?:επαναφορτιζ[όο]μενο|εργονομικ[όο]|αθ[όο]ρυβο)\b|\b(?:no|without|χωρ[ίι]ς)\b|"
             r"(?<![\w.,+-])\d+\s*(?:dpi|hz|buttons|κουμπι[άα])(?!\w)|"
             r"\b(?:polling\s*rate|buttons|κουμπι[άα])\s*:\s*\d+\s*(?:hz)?|"
             r"(?<![\w.])2[.,]4\s*g(?:hz)?\b|\brf\b")
    text = re.sub(noise, " ", text, flags=re.I)
    text = re.sub(r"\(\s*\)", " ", text)
    model = re.sub(r"\s+", " ", text).strip(" ,;")
    colour = colours[0] if len(set(colours)) == 1 else None
    return brand, model, colour, part_number


def make_listing(*, source: str, native_id: str, title: str, url: str, price: float,
                 shop_count: int | None, scraped_at: str, specs: str = "") -> MouseListing | None:
    if isinstance(price, bool) or not isinstance(price, (int, float)) or not math.isfinite(price) or price <= 0:
        return None
    price = round(price, 2)
    if price <= 0:
        return None
    title = names.prepare(html.unescape(title))
    brand, model, colour, part = _identity(title)
    # A maker such as Mars Gaming does not state a gaming feature by its name alone.
    body = re.sub(re.escape(brand), '', title, count=1, flags=re.I) if brand != 'Other' else title
    text = _fold(body + " " + specs)
    wired, wireless = bool(re.search(WIRED, text)), bool(re.search(WIRELESS, text))
    connection = "both" if wired and wireless else "wired" if wired else "wireless" if wireless else None
    reason = rejection_reason(title) or ("no-identity" if brand == "Other" or not model else None)
    return MouseListing(
        id=f"{source}:{native_id}", source=source, title=title, url=url, price=price,
        shopCount=shop_count, brand=brand, chip="", scrapedAt=scraped_at,
        connection=connection, colour=colour, partNumber=part,
        dpi=_number(text, "dpi"), pollingHz=_number(text, "hz"),
        buttons=_number(text, "buttons|κουμπια") or _number(text, "buttons|κουμπια", prefix=True),
        **{field: _flag(text, pattern) for field, pattern in FLAGS.items()}, reject=reason,
    )


def settle(listings: list[dict]) -> None:
    """Rebuild identities from original titles, before sharing, history and photo keys; repeat safely."""
    buckets: dict[tuple[str, str], list[dict]] = defaultdict(list)
    parts: dict[tuple[str, str], set[str]] = defaultdict(set)
    parsed = {}
    for row in listings:
        ident = _identity(row["title"])
        parsed[row["id"]] = ident
        brand, model, _, part = ident
        row["chip"] = ""
        if row.get("reject") in DERIVED_REJECTS:
            row["reject"] = None
        row["reject"] = row.get("reject") or rejection_reason(row["title"])
        if row["reject"]:
            continue
        if brand == "Other" or not model:
            row["reject"] = "no-identity"
            continue
        name = _fold(model)
        if part:
            parts[(brand, part)].add(name)
        buckets[(brand, name)].append(row)

    groups = []
    for (brand, name), rows in sorted(buckets.items()):
        valid = []
        for row in rows:
            part = parsed[row["id"]][3]
            if part and len(parts[(brand, part)]) > 1:
                row["reject"] = "identity-conflict"
            else:
                valid.append(row)
        known = {r.get("connection") for r in valid if r.get("connection") is not None}
        families = defaultdict(list)
        for row in valid:
            connection = row.get("connection")
            if connection is None and len(known) > 1:
                row["reject"] = "identity-conflict"
                continue
            families[connection or next(iter(known), None)].append(row)
        for connection, family in sorted(families.items(), key=lambda pair: pair[0] or ""):
            model = min((parsed[r["id"]][1] for r in family), key=lambda s: (s.casefold(), s))
            qualifier = {"wired": " Wired", "wireless": " Wireless", "both": " Wired + Wireless", None: ""}[connection]
            groups.append((f"{brand} {model}{qualifier}", family))

    taken = set()
    for name, family in sorted(groups, key=lambda pair: pair[0]):
        final, suffix = name, 1
        while names.model_key(final) in taken:
            suffix += 1
            final = f"{name} #{suffix}"
        taken.add(names.model_key(final))
        for row in family:
            row["chip"] = final
