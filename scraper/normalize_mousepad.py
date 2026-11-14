"""Mousepad list observations and identity. No I/O; a specification no title states stays None.

Identity = maker + model + size. A Medium and an XXL of one series are two models; colours are offers of one model.
Dimensions: widthMm is the longer stated side, heightMm the shorter (a pad rotated is the same pad); a lone length
("XXL 900mm") is the long side only. normalize_mouse.py rejects mousepads as `not-mouse` and stays untouched.
"""
import html
import math
import re
from collections import defaultdict

import names
from models import MousepadListing
from normalize_mouse import BRAND_NAMES as MOUSE_BRANDS, COLOUR_NAMES, COLOUR_PATTERN, COLOUR_UNIT, _flag, _fold

# A copy: normalize_mouse's own table must not learn pad makers. "cm" is its abbreviation of Cooler Master and a unit here.
BRAND_NAMES = {key: name for key, name in MOUSE_BRANDS.items() if key != "cm"}

# Makers on the mousepad lists that the mouse table does not know, and licensors that print a model code on every pad:
# every maker that opens at least three otherwise unidentified titles of the 2026-11-14 trial collection.
# Print-on-demand sellers (POD_SELLERS) are brands too, so that custom_print() sees them.
EXTRA_BRANDS = (
    "Koupakoupa", "Tstudio", "OEM", "Artisan", "Lethal Gaming Gear", "Wicked", "Mars Gaming", "Hiro", "Snakebyte", "Elgato",
    "Cooler Master", "Endorfy", "Genesis", "Tt eSports", "Thermaltake", "BenQ", "Zowie", "Xtrfy", "Pulsar", "Gigabyte", "Aorus",
    "MSI", "Asus", "ROG", "Roccat", "Turtle Beach", "Savio", "Natec", "Esperanza", "Gembird", "Hama", "Targus", "Fellowes",
    "Kensington", "Allsop", "3M", "Esselte", "Vivanco", "Leitz", "Ugreen", "Baseus", "Satechi", "Orico", "Xiaomi", "Lenovo",
    "Dell", "HP", "Havit", "Redragon", "Aula", "Fantech", "Dareu", "Ajazz", "Motospeed", "Rapoo", "Sades", "Speedlink",
    "Sharkoon", "Trust", "Konix", "Spartan Gear", "White Shark", "Rebeltec", "Genius", "A4Tech", "Bloody", "Marvo", "Logitech",
    "Razer", "SteelSeries", "Corsair", "HyperX", "Glorious", "Cherry", "Verbatim", "Eureka", "Eureka Ergonomic",
    "Grupo Erik", "Paladone", "Abysse", "AbyStyle", "Powerton", "VenCore", "Durable", "Miquelrius", "ERT Group", "BagCity",
    "FS Holding", "Onlan", "Ango", "FaNaTtik", "Verk", "Kikkerland", "Arozzi", "Carmani", "Spigen", "Muitomas", "Equip",
    "Tucano", "LGP", "Numskull", "HYTE", "Strado", "Derform", "Subsonic", "Sakami", "Tech-Protect", "Osco", "Kruger&Matz",
    "Krugermatz", "Kruger Matz", "Reekin", "Hator", "Rampage", "Komputronik", "Lexip", "Ebest", "Knodel", "Edman", "Olympus",
    "Delphi", "Deltahub", "Pyramid", "Aoksunova", "VNC", "Babaco", "Kukuxumusu", "Cinereplicas", "Ducky", "Spacer", "Enhance",
    "Aukey", "Sandberg", "Zeller", "Biurfol", "Digital Place", "Anda Seat", "Nitro Concepts", "Skullkiller", "Gamesir",
    "Spirit of Gamer", "CSL", "Artglob", "Itemlab", "Hurtel", "Balloon", "Aqirys", "Serioux", "Floston", "G-Cube", "Gearlab",
    "Agifty", "StarTech", "JT", "Dunmoon", "Baracuda", "Barracuda", "Zykon", "FR-TEC", "Defender", "Fury", "Mecharite", "Judex",
    "XTracGear", "ForHome", "Keep Out", "Keep-Out", "Urage", "Proove", "Darkflash", "Lorgar", "SPM", "Cabletime", "Madlions",
    "Yenkee", "Hoco", "Cliptech", "Herma", "InnovaGoods", "Celly", "NOD", "Junya", "Hanipol", "Optima", "Baaske", "Jobmate",
    "KROM", "ADX", "Lamzu", "Tracer", "Gaya", "Mozos", "Nitro", "Sparco",
)
for _brand in EXTRA_BRANDS:
    BRAND_NAMES.setdefault(_brand.casefold(), _brand)
BRAND_NAMES.update({"kruger&matz": "Kruger&Matz", "krugermatz": "Kruger&Matz", "kruger matz": "Kruger&Matz",
                    "keep-out": "Keep Out", "baracuda": "Barracuda", "erik": "Grupo Erik"})
BRAND_PATTERN = re.compile(r"(?<![\w-])(?:" + "|".join(re.escape(k) for k in sorted(BRAND_NAMES, key=len, reverse=True)) + r")(?![\w-])", re.I)

# Word edges that do not split a hyphenated code: "MP-GAME-XL" keeps its XL, so a stated "Medium" is not overruled by it.
B0, B1 = r"(?<![\w-])", r"(?![\w-])"
SIZES = (  # (pattern, label); longest forms first
    (B0 + r"(?:4xl|xxxxl|4x-?large)" + B1, "4XL"),
    (B0 + r"(?:3xl|xxxl|xxx-?large|3x-?large)" + B1, "XXXL"),
    (B0 + r"(?:2xl|xxl|xx-?large|extra\s+extra\s+large)" + B1, "XXL"),
    (B0 + r"(?:xl|x-?large|extra[\s-]+large)" + B1, "XL"),
    (B0 + r"large" + B1, "Large"),
    (B0 + r"medium" + B1, "Medium"),
    (B0 + r"small" + B1, "Small"),
)
SIZE_LETTER = re.compile(r"(?<![\w-])([SML])(?![\w-])")  # a lone capital ending the title: "... Black L"
NUMBER = r"\d{1,4}(?:[.,]\d+)?"
PAIR = re.compile(rf"(?<![\w.,])({NUMBER})\s*(?:x|×|\*|χ)\s*({NUMBER})(?:\s*(?:x|×|\*|χ)\s*({NUMBER}))?\s*(mm|cm|εκ\.?)?(?![\w])", re.I)
LONE_MM = re.compile(r"(?<![\w.,x×*-])(\d{3,4})\s*mm\b", re.I)
THICK_MM = re.compile(r"(?<![\w.,])(\d(?:[.,]\d)?)\s*mm\b", re.I)
THICK_WORD = re.compile(r"(?:thick(?:ness)?|πάχος|παχος)\s*[:=]?\s*(\d(?:[.,]\d)?)\s*mm", re.I)
ANY_MM = re.compile(r"(?<![\w.,x×*-])\d{3,4}\s*mm\b|(?<![\w.,])\d(?:[.,]\d)?\s*mm\b", re.I)
# Observed part numbers: Razer RZ02-05491000-R3M1, Logitech 943-000792, Corsair CH-9xxxxx-WW, HyperX 4Z7X5AA.
PART_NUMBER = re.compile(r"(?<![\w-])(?:RZ\d{2}-\d{5,8}-\w{4}|943-\d{6}|CH-9\w{6}-\w{2}|4Z7X\d[A-Z]{2}|HX-MPFS[\w-]*)(?![\w-])", re.I)
# "Pad" words, English and Greek; _FOLDED is for folded text (no accents), _ORIGINAL for the title as written.
PAD_EN = r"mouse\s*-?\s*(?:pad|mat)s?|mousepads?|desk\s*-?\s*(?:mat|pad)s?|deskmats?|gaming\s*(?:mat|pad)s?"
PAD_FOLDED = rf"(?:{PAD_EN}|(?:βαση|βασεις|μαξιλαρακι|μαξιλαρια|επιφανεια|πατακι)\s+(?:για\s+(?:το\s+)?)?ποντικι\w*)"
PAD_ORIGINAL = (rf"(?:{PAD_EN}|(?:β[άα]ση|β[άα]σεις|μαξιλαρ[άα]κι|μαξιλ[άα]ρια|επιφ[άα]νεια|πατ[άα]κι)\s+(?:για\s+(?:το\s+)?)?"
                r"ποντ[ίι]κι\w*)")
NOISE = re.compile(
    r"(?<![\w-])(?:gaming|gamer|rgb|argb|led|extended|edition|πολ[υύ]χρωμο|(?:gel\s+)?(?:with|με)\s+wrist\s*(?:support|rest)|"
    r"wrist\s*(?:support|rest)|στ[ήη]ριγμα\s+καρπο[ύυ]|στ[ήη]ριξη\s+καρπο[ύυ]|σε|χρ[ωώ]μα|με|φωτισμ[όο]ς?|φωτιζ[όο]μεν\w*|\+)(?![\w-])", re.I)
DERIVED_REJECTS = {"no-identity", "identity-conflict"}
# Things that are not a mousepad: a pad for a notebook, mouse skates, a wrist rest on its own (checked without a pad word).
ACCESSORY = re.compile(
    r"notebook\s*(?:pad|stand)|laptop\s*(?:pad|stand)|lap\s*desk|cooling\s*pad|\bskates?\b|\bfeet\b|mouse\s*glides?|"
    r"\b(?:cleaner|cleaning|trackpad|touchpad)\b|graphics?\s*tablet|\barmrest\b|\bsleeve\b")
WRIST_ONLY = re.compile(r"wrist\s*(?:rest|support|pad)|palm\s*rest|στηριγμα\s+καρπου|στηριξη\s+καρπου")
MOUSE_WORD = r"(?:mouse|mice|ποντικι\w*|keyboard|πληκτρολογι\w*|headset|ακουστικ\w*)"
# The print-on-demand sellers' pads: fixed shapes (round 20 cm, 23x19, heart 23x20, 22x18), designs from a catalogue.
POD_SELLERS = {"Koupakoupa", "Tstudio", "OEM"}
POD_SHAPES = {(200, 200), (230, 190), (230, 200), (220, 180)}
POD_MARKERS = re.compile(r"kp_\d+_mousepad|διαμετρος\s+20|diameter\s+20|δωρο\s+για|προσθηκης\s+ονοματος|με\s+σχεδιο\b|"
                         r"(?:mouse\s*pad|mousepad)\s+-\s")


def _num(text: str) -> float:
    return float(text.replace(",", "."))


def _mm(value: float, unit: str | None) -> int:
    return round(value * (10 if unit and unit.casefold().startswith(("cm", "ε")) else 1))


def _dimensions(text: str) -> tuple[int | None, int | None, float | None]:
    """(width = longer side, height = shorter side, thickness) in mm, only as the title states them."""
    width = height = thickness = None
    for m in PAIR.finditer(text):
        a, b, c, unit = _num(m.group(1)), _num(m.group(2)), m.group(3) and _num(m.group(3)), m.group(4)
        if not unit:  # unitless pairs: 90x40 are cm, 220x250 are mm; anything between is ambiguous and stays unknown
            unit = "cm" if max(a, b) <= 100 else "mm" if min(a, b) >= 200 else None
            if unit is None:
                continue
        long_, short = sorted((_mm(a, unit), _mm(b, unit)), reverse=True)
        if not (150 <= long_ <= 2500 and 100 <= short <= long_):
            continue
        width, height = long_, short
        if c is not None and 0.5 <= c <= 20 and unit:
            thickness = c
        break
    if thickness is None:
        word = THICK_WORD.search(text)
        for m in ([word] if word else []) + list(THICK_MM.finditer(text)):
            if 1 <= _num(m.group(1)) <= 9:
                thickness = _num(m.group(1))
                break
    if width is None:
        lone = {int(m.group(1)) for m in LONE_MM.finditer(text) if 150 <= int(m.group(1)) <= 2500}
        width = lone.pop() if len(lone) == 1 else None
    return width, height, thickness


def _size(folded: str, original: str) -> str | None:
    for pattern, label in SIZES:
        if re.search(pattern, folded):
            return label
    last = list(SIZE_LETTER.finditer(original))
    if last and last[-1].end() >= len(original.rstrip()) - 1:
        return {"S": "Small", "M": "Medium", "L": "Large"}[last[-1].group(1)]
    return None


def rejection_reason(title: str) -> str | None:
    text = _fold(title)
    if re.search(r"\b(?:used|refurb\w*|open[ -]?box)\b|μεταχειρισμεν|ανακατασκευ", text):
        return "used"
    bare = re.sub(PAD_FOLDED, " ", text)
    # Another product in the title: a mouse or keyboard offered together with the pad. "Minnie Mouse" is a design, not a mouse.
    if re.search(rf"(?<![\w-]){MOUSE_WORD}(?![\w-])", bare) and not re.search(r"minnie|mickey|μικι\s*μαους", bare) and \
            re.search(r"\s[+&]\s|\b(?:combo|bundle|kit|set|σετ|two\s*pack|με\s+ποντικι\w*|και\s+(?:mouse|ποντικι\w*))\b", bare):
        return "bundle"
    # "Razer Viper V3 Pro + Gigantus V2": two products. "Rubber Foam + Fabric" is one pad made of two materials.
    if re.search(r"\s\+\s(?!(?:fabric|cloth|rubber|foam|leather|gel|plastic|silicone|υφασμα\w*|καουτσουκ\w*|δερμα\w*|αφρος)\b)", text):
        return "bundle"
    if ACCESSORY.search(text) or (WRIST_ONLY.search(text) and not re.search(PAD_FOLDED, text)):
        return "not-mousepad"
    # A mouse that Snif lists beside the pads: the nominative "ποντικι" (a pad says "ποντικιου"/"ποντικιων") with a cable or sensor word.
    if re.search(r"(?<!\w)ποντικι(?!\w)|\b(?:wireless|optical|wired|bluetooth)\s+mouse\b|\bmouse\s+(?:wireless|yoga|bungee|holder|rest)\b", text) \
            and not re.search(PAD_FOLDED, text) or re.search(r"\b\d{3,5}\s*dpi\b", text):
        return "not-mousepad"
    return None


def _identity(title: str) -> tuple[str, str, str | None, str | None, str | None]:
    """(brand, model without size, colour, part number, size)."""
    text = names.prepare(html.unescape(title))
    size = _size(_fold(text), text)
    makers = list(BRAND_PATTERN.finditer(text))
    brands = {BRAND_NAMES[m.group().casefold()] for m in makers}
    if not makers or (len(brands) > 1 and makers[0].start() > 12 and not re.match(PAD_ORIGINAL, text, re.I)):
        brand, rest = "Other", text
    else:
        brand = BRAND_NAMES[makers[0].group().casefold()]
        before, rest = text[:makers[0].start()], text[makers[0].end():]
        if re.search(r"(?<![\w.])(?=[A-Za-z0-9-]*[A-Za-z])(?=[A-Za-z0-9-]*\d)[A-Za-z0-9-]+(?![\w.])", before):
            rest = before + " " + rest  # a model code before the maker (Snif)
        rest = BRAND_PATTERN.sub(lambda m: " " if BRAND_NAMES[m.group().casefold()] == brand else m.group(), rest)
    part = PART_NUMBER.search(rest)
    part_number = part.group().upper() if part else None
    rest = PART_NUMBER.sub(" ", rest)
    colours = set()
    for phrase in COLOUR_PATTERN.finditer(rest):
        for shade, name in COLOUR_UNIT.findall(phrase.group()):
            shade = "matte" if shade.casefold() == "matt" else shade.casefold()
            colours.add((shade + "-" if shade else "") + COLOUR_NAMES[name.casefold()])
    rest = COLOUR_PATTERN.sub(" ", rest)
    # Dimensions and size words are not part of the model name; the size comes back in the chip.
    rest = ANY_MM.sub(" ", THICK_WORD.sub(" ", PAIR.sub(" ", rest)))
    for pattern, _ in SIZES:
        rest = re.sub(pattern, " ", rest, flags=re.I)
    rest = NOISE.sub(" ", re.sub(PAD_ORIGINAL, " ", rest, flags=re.I))
    rest = re.sub(r"\(\s*\)|(?<!\S)[-/&,+|:]+(?!\S)", " ", rest)
    model = re.sub(r"\s+", " ", rest).strip(" ,;-/&:")
    if len(model.split()) > 8:
        model = ""
    elif not names.model_key(model):
        model = part_number or ""
    # "Gembird Mouse Pad Blue 220x250mm", "Trust Mouse Pad Large": the pad itself is the model; size or dimensions tell them apart.
    if brand != "Other" and not model and (size or PAIR.search(text)):
        model = "Mouse Pad"
    return brand, model, "-".join(sorted(colours)) or None, part_number, size


def _shape(folded: str) -> str | None:
    if re.search(r"στρογγυλ|\bround\b|circular", folded):
        return "round"
    if re.search(r"καρδι|\bheart\b", folded):
        return "heart"
    if re.search(r"ορθογων|rectang", folded):
        return "rectangular"
    return None


def _surface(folded: str) -> str | None:
    found = [label for pattern, label in (
        (r"\bglass\b|γυαλιν|γυαλι\b", "glass"), (r"\bleather(?:ette)?\b|δερματιν", "leatherette"),
        (r"\bplastic\b|πλαστικ", "plastic"), (r"\bsilicone\b|σιλικον", "silicone"),
        (r"\b(?:cloth|fabric|textile)\b|υφασμα", "cloth")) if re.search(pattern, folded)]
    return found[0] if len(found) == 1 else None


FLAGS = {
    "gaming": r"\bgaming\b|\bgamer\b",
    "rgb": r"\b(?:a?rgb)\b|\bled\b|φωτισμ|φωτιζομεν",
    "wristRest": r"wrist\s*(?:rest|support)|στηριγμα\s+καρπου|στηριξη\s+καρπου",
    "usbPort": r"\busb\s*(?:hub|port|3|2|charg)|\bhub\b|θυρα\s+usb|με\s+usb",
    "wirelessCharging": r"wireless\s*charg|\bqi\b|ασυρματη\s+φορτιση",
    "antiSlip": r"\b(?:non|anti)[- ]?slip\b|αντιολισθ",
    "stitchedEdges": r"\bstitch\w*|ραμμεν",
    "extended": r"\bdesk\s*-?\s*mat\b|\bdeskmat\b|\bextended\b|\bεπεκτ",
}


def custom_print(brand: str, title: str, width: int | None, height: int | None) -> str | None:
    """Print-on-demand pads: designs from a seller's catalogue (kpop, football clubs, ...) in a few fixed shapes."""
    text = _fold(title)
    if brand in POD_SELLERS or (brand == "Other" and POD_MARKERS.search(text)):  # a maker's own "Mouse Pad - Large" is no marker
        return "custom-print"
    if brand == "Other" and ((width, height) in POD_SHAPES or width in (200, 230)
                             or re.match(r"(?:βαση|μαξιλαρακι)\s+για\s+το\s+ποντικι", text)
                             or re.search(r"στρογγυλο\s+20\s*cm|ορθογωνιο\s+23\s*x\s*19|καρδια\s+23\s*x\s*20", text)):
        return "custom-print"
    return None


def make_listing(*, source: str, native_id: str, title: str, url: str, price: float,
                 shop_count: int | None, scraped_at: str, specs: str = "", identity_title: str | None = None) -> MousepadListing | None:
    if isinstance(price, bool) or not isinstance(price, (int, float)) or not math.isfinite(price) or price <= 0:
        return None
    price = round(price, 2)
    if price <= 0:
        return None
    title = names.prepare(html.unescape(title))
    # identity_title: the linked Product.name from the same list page, when the reader passes one (as for mice).
    observed = names.prepare(html.unescape(identity_title)) if identity_title else title
    brand, model, colour, part, size = _identity(observed)
    folded = _fold(title + " " + specs)
    width, height, thickness = _dimensions(title)
    if width is None:
        width, height, thickness = _dimensions(observed)
    flags = {field: _flag(folded, pattern) for field, pattern in FLAGS.items()}
    reason = rejection_reason(observed) or custom_print(brand, observed, width, height)
    reason = reason or ("no-identity" if brand == "Other" or not model else None)
    return MousepadListing(
        id=f"{source}:{native_id}", source=source, title=title, url=url, price=price, shopCount=shop_count, brand=brand,
        chip="", scrapedAt=scraped_at, size=size, shape=_shape(folded), widthMm=width, heightMm=height, thicknessMm=thickness,
        surface=_surface(folded), colour=colour, partNumber=part, reject=reason, identityTitle=identity_title, **flags)


def _codes(model: str) -> set[str]:
    """Model codes inside a name ("EGP103G", "MP-GAME-XL"): 5+ characters with letters and digits."""
    return {names.model_key(t) for t in re.findall(r"[A-Za-z0-9][A-Za-z0-9-]*", model)
            if len(names.model_key(t)) >= 5 and re.search(r"\d", t) and re.search(r"[A-Za-z]", t)}


def settle(listings: list[dict]) -> None:
    """Rebuild identities from the original titles before sharing, history and photo keys; repeat safely."""
    buckets: dict[tuple[str, str], list[dict]] = defaultdict(list)
    parts: dict[tuple[str, str], set[str]] = defaultdict(set)
    parsed: dict[str, tuple] = {}
    eshop = []
    for row in listings:
        seen = row.get("identityTitle") or row["title"]
        brand, model, colour, part, size = parsed[row["id"]] = _identity(seen)
        row["chip"] = ""
        if row.get("reject") in DERIVED_REJECTS:
            row["reject"] = None
        row["reject"] = (row.get("reject") or rejection_reason(seen) or
                         custom_print(brand, seen, row.get("widthMm"), row.get("heightMm")))
        if row["reject"]:
            continue
        if brand == "Other" or not model:
            row["reject"] = "no-identity"
            continue
        name = names.model_key(model + ("" if size is None else " " + size))
        if row["source"] == "eshop":
            eshop.append((row, brand, name, part, model, size))
            continue
        if part:
            parts[(brand, part)].add(name)
        buckets[(brand, name)].append(row)
    # A title that gives nothing but the part number ("Razer RZ02-05490900-R3M1 Large") joins the one named model that carries it.
    for (brand, part), found in parts.items():
        bare = {n for n in found if n.startswith(names.model_key(part))}
        if bare and len(found - bare) == 1:
            target = next(iter(found - bare))
            for n in bare:
                buckets[(brand, target)] += buckets.pop((brand, n))
            parts[(brand, part)] = {target}
    # e-shop.gr titles are upper-case prose ("ESPERANZA EGP103G GAMING MOUSE PAD GRUNGE MAXI"): a listing joins the one model the
    # other sources give its part number or its model code (same maker, same size), and never makes a conflict.
    by_code: dict[tuple[str, str, str | None], set[str]] = defaultdict(set)
    for (brand, name), rows in buckets.items():
        for row in rows:
            _, model, _, _, size = parsed[row["id"]]
            for code in _codes(model):
                by_code[(brand, code, size)].add(name)
    for row, brand, name, part, model, size in eshop:
        known = parts.get((brand, part), set()) if part else set()
        if not known:
            for code in _codes(model):
                known |= by_code.get((brand, code, size), set())
        if len(known) == 1:
            name = next(iter(known))
        buckets[(brand, name)].append(row)

    groups = []
    for (brand, name), rows in sorted(buckets.items()):
        valid = []
        for row in rows:
            part = parsed[row["id"]][3]
            if part and len(parts.get((brand, part), ())) > 1:
                row["reject"] = "identity-conflict"
            else:
                valid.append(row)
        if not valid:
            continue
        # e-shop.gr's spelling names the model only when no other source has it.
        model = min(((r["source"] == "eshop", parsed[r["id"]][1]) for r in valid), key=lambda p: (p[0], len(p[1]), p[1].casefold(), p[1]))[1]
        size = next((parsed[r["id"]][4] for r in valid if parsed[r["id"]][4]), None)
        label = f"{brand} {model}"
        if size and not names.model_key(model).endswith(names.model_key(size)):
            label += f" {size}"
        groups.append((label, valid))
    taken = set()
    for label, family in sorted(groups, key=lambda pair: pair[0]):
        final, suffix = label, 1
        while names.model_key(final) in taken:
            suffix += 1
            final = f"{label} #{suffix}"
        taken.add(names.model_key(final))
        for row in family:
            row["chip"] = final
