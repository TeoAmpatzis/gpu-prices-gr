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
    "Apple", "HyperX", "Xiaomi", "Sades", "Ajazz", "NGS", "ATK", "Spartan Gear", "Attack Shark",
    "Motospeed", "Ugreen", "Powerlogic", "R.horse", "Zeroground", "MediaRange", "Msonic", "Vakoss", "Approx", "Tracer", "ET",
)})
# Maker labels from the captured BestPrice/Skroutz mouse filters, 2026-11-11.
OBSERVED_BRANDS = ('3Dconnexion', '3GO', 'A4Tech', 'Acer', 'Acme', 'Active Key', 'ActiveJet', 'Activision', 'Aerbes', 'Ajazz',
 'Alcatroz', 'Alogic', 'Andowl', 'Anker', 'AOAS', 'Apple', 'Approx', 'Aria Trade', 'Arrango', 'Art', 'Asus',
 'ATK', 'Attack Shark', 'Aula', 'BakkerElkhuizen', 'Baseus', 'BasicXL', 'Blaupunkt', 'Blow', 'Bluestork',
 'Borofone', 'Burn Out', 'Canyon', 'Cherry', 'Conceptronic', 'Conceptum', 'Contour', 'Contour Design',
 'Corsair', 'Daffodil', 'Dahua', 'Dareu', 'Defender', 'Dell', 'DeLOCK', 'Deltaco', 'Detech', 'Devia',
 'Dicota', 'Digitus', 'EARLDOM', 'ELBE', 'Element', 'Equip', 'Esperanza', 'ESR', 'eSTUFF', 'Everest',
 'Evoluent', 'Ewent', 'Extreme', 'Ezra', 'FanTech', 'Fellowes', 'Freaks And Geeks', 'Gembird',
 'General Trade', 'Genius', 'Gigabyte', 'Hama', 'Havit', 'Hoco', 'HP', 'IBM', 'iBox', 'Iggual', 'Inca',
 'Incase', 'Indena', 'Inter-Tech', 'iTotal', 'JLab', 'Jokade', 'KAKU', 'Kakusiga', 'Kensington', 'Keychron',
 'KeySonic', 'KLGO', 'Labtec', 'Lamtech', 'Lazerbuilt', 'LC-Power', 'Leewello', 'Legami', 'Lenovo', 'LMP',
 'Logik', 'LogiLink', 'Logitech', 'Manhattan', 'Marvo', 'Matias', 'Maxlife', 'Media-Tech', 'Mediacom',
 'MediaRange', 'Meetion', 'Microsoft', 'Mobilis', 'Modecom', 'MOFII', 'Motospeed', 'Mousetrapper', 'Moye',
 'Msonic', 'MTK', 'Natec', 'Naxius', 'Nedis', 'Newtop', 'NG', 'NGS', 'Nilox', 'NOD', 'Noozy', 'Okion',
 'Omega', 'OQO', 'Pat Says Now', 'Patriot', 'Philips', 'Phoenix', 'Platinet', 'Port', 'Port Designs',
 'Powertech', 'Proove', 'Q-Tech', 'R-GO Tools', 'R-horse', 'Rapoo', 'Raspberry Pi', 'Razer', 'Rebel',
 'Rebeltec', 'Recci', 'Redragon', 'Remax', 'Rock Candy', 'Roline', 'Saitek', 'Samsung', 'Sandberg', 'Satechi',
 'SAVIO', 'SBOX', 'Serioux', 'Setty', 'Sharkoon', 'Shintek', 'Smartec', 'Spacer', 'Spark Line', 'Speedlink',
 'Subblim', 'Sunix', 'SVEN', 'Sweex', 'Swiss MoGo', 'Swissten', "T'nB", 'Tacens', 'Talius', 'Targus',
 'Techly', 'Techmade', 'Technovo', 'TeckNet', 'Tellur', 'terra', 'Titanum', 'Tracer', 'Trust', 'Tucano',
 'Turbo-X', 'Ugreen', 'Urban', 'V7', 'Vakoss', 'Vention', 'Verbatim', 'Vivanco', 'Wacom', 'Well',
 'White Shark', 'Wintech', 'WiWu', 'Wozinsky', 'Xiaomi', 'XO', 'Xtreme', 'Xtrike-me', 'Yenkee', 'Yesido',
 'Yoyoso', 'Zagg')
# Makers that open at least three otherwise unidentified titles of the full trial collection, 2026-11-11.
TRIAL_BRANDS = ('ABKONCORE', 'Accura', 'Adata', 'ADX', 'Akashi', 'AOC', 'Aqirys', 'Armaggeddon', 'Barracuda', 'C-TECH',
 'Cliptec', 'Connect IT', 'Coteci', 'Cudy', 'Dark Project', 'Darmoshark', 'Disney', 'Dux Ducis', 'E-Blue', 'Edman',
 'Ellietech', 'Energy Sistem', 'Evolveo', 'Fnatic', 'Forev', 'FroggieX', 'Fude', 'Fury', 'HATOR', 'Hiro', 'HXSJ',
 'iClever', 'iMice', 'Inphic', 'Izoxis', 'Jeqang', 'Jiexin', 'Krux', 'Lexip', 'LinQ', 'Liocat', 'Logic', 'Lorgar',
 'Machenike', 'Mad Catz', 'Makki', 'MCHOSE', 'Medigenic', 'Miniso', 'MKESPN', 'Moveteck', 'Mustard', 'Nacon',
 'Onikuma', 'Pantone', 'Perixx', 'Piranha', 'Preyon', 'Q-Connect', 'Qova', 'Rampage', 'Riotoro', 'Rixus', 'Roar',
 'Roccat', 'Roger', 'Royal Kludge', 'Secret Gear', 'SGL', 'Somostel', 'Sony', 'Sound Friend', 'Sparco',
 'Spirit of Gamer', 'Strado', 'SureFire', 'T-Dagger', 'T-Wolf', 'Thunderobot', 'Total Gift', 'Turtle Beach',
 'Vertux', 'Weibo', 'Wesdar', 'WLmouse', 'Xtrfy', 'Yelandar', 'Yilima', 'Zenwire', 'Zornwee')
for _brand in OBSERVED_BRANDS + TRIAL_BRANDS:
    BRANDS.setdefault(_brand.casefold(), _brand)
BRAND_NAMES = {**BRANDS, **names.VENDOR_ALIASES, "glorious pc gaming race": "Glorious",
               "xtrike me": "Xtrike Me", "xtrike-me": "Xtrike Me",
               "r-horse": "R.horse", "bakker elkhuizen": "BakkerElkhuizen",
               # One maker under two spellings in the trial titles (the same model codes under both).
               "3d connexion": "3Dconnexion", "active jet": "ActiveJet", "i-total": "iTotal",
               "contour design": "Contour", "baracuda": "Barracuda", "yilma": "Yilima"}
BRAND_PATTERN = re.compile(r"(?<![\w-])(?:" + '|'.join(re.escape(k) for k in sorted(BRAND_NAMES, key=len, reverse=True)) + r")(?![\w-])", re.I)

# Canonical colour keys are shared across Greek/English titles; unfamiliar colour names stay in the name.
COLOURS = {
    "space-grey": ("Space Grey", "Space Gray"),
    "pale-grey": ("Pale Grey", "Pale Gray"),
    "dark-grey": ("Dark Grey", "Dark Gray"),
    "titan-grey": ("Titan Grey", "Titan Gray"),
    "space-black": ("Space Black",),
    "white-mist": ("White Mist",),
    "graphite": ("Graphite",),
    "anthracite": ("Anthracite",),
    "lime-green": ("Lime Green",),
    "black-grey": ("Black Grey", "Black Gray", "Black-Grey", "Black-Gray"),
    "black-silver": ("Black/Silver",),
    "black-red": ("Black / Red", "Black/Red", "Black-Red"),
    "blue-grey": ("Μπλε/Γκρι",),
    "black": ("Black", "Μαύρο", "Μαυρο", "Μαύρη", "Μαυρη"),
    "charcoal": ("Charcoal",),
    "white": ("White", "Λευκό", "Λευκο", "Λευκή", "Λευκη", "Άσπρο", "Ασπρο"),
    "grey": ("Grey", "Gray", "Γκρι"),
    "silver": ("Silver", "Ασημί", "Ασημι"),
    "pink": ("Pink", "Ροζ"),
    "blue": ("Blue", "Μπλε", "Μπλέ"),
    "red": ("Red", "Κόκκινο", "Κοκκινο"),
    "green": ("Green", "Πράσινο", "Πρασινο"),
    "purple": ("Purple", "Μωβ"),
    "yellow": ("Yellow", "Κίτρινο", "Κιτρινο"),
    "orange": ("Orange", "Πορτοκαλί", "Πορτοκαλι"),
    # Left in model names by the full trial collection, 2026-11-11.
    "rose-gold": ("Rose Gold",),
    "silk-gold": ("Silk Gold",),
    "pike-silver": ("Pike Silver",),
    "lumiere-blue": ("Lumiere Blue",),
    "light-blue": ("Γαλάζιο", "Γαλαζιο"),
    "beige": ("Beige", "Μπεζ"),
    "gold": ("Gold", "Golden", "Χρυσό", "Χρυσο"),
    "brown": ("Brown", "Καφέ", "Καφε"),
    "multicolour": ("Multicolor", "Multicolour", "Πολύχρωμο", "Πολυχρωμο"),
    "transparent": ("Transparent",),
    "turquoise": ("Turquoise", "Τιρκουάζ", "Τιρκουαζ"),
    **{name.casefold(): (name,) for name in (
        "Rose", "Lilac", "Lavender", "Mint", "Cyan", "Teal", "Petrol", "Sand", "Violet", "Magenta", "Coral",
        "Bordeaux", "Burgundy", "Fuchsia", "Platinum", "Bronze", "Olive", "Peach", "Midnight")},
}
COLOUR_NAMES = {alias.casefold(): key for key, aliases in COLOURS.items() for alias in aliases}
# "Light Grey", "Off-White", "Matte Black": the shade word belongs to the colour, not to the model.
_SHADE = r"(?:light|dark|matte|matt|glossy|off|pale|deep|midnight|tidal)"
_COLOUR = '|'.join(re.escape(k) for k in sorted(COLOUR_NAMES, key=len, reverse=True))
COLOUR_UNIT = re.compile(rf"(?:({_SHADE})[ -])?({_COLOUR})(?!\w)", re.I)
# Not inside a hyphenated code ("GD-BLACK", "MUSW-4B-06-BG"); "Black/Red" and "Black-Red" are one phrase.
COLOUR_PATTERN = re.compile(
    rf"(?<!\w)(?<!\w-)(?:{_SHADE}[ -])?(?:{_COLOUR})(?:\s*[-/]\s*(?:{_SHADE}[ -])?(?:{_COLOUR}))*(?!\w)", re.I)
MAX_MODEL_WORDS = 8  # longer "names" in the trial are marketing sentences, not models
# Makers' part-number shapes seen in titles: Logitech 910-004424, HP 6VY96AA / A1KY5AA / 4E407UT, Razer
# RZ01-04650700-R3M1, Corsair CH-931G100-WW, Asus 90XB0900-BMU0C0, Lenovo GY51P14335, Glorious GLO-MS-…, Endgame EGG-….
PART_NUMBER = re.compile(
    r"(?<![\w-])(?:\d{3}-\d{6}|(?=[0-9A-Z]*\d)(?=[0-9A-Z]*[A-Z])[0-9A-Z]{5}(?:AA|UT)(?:#[A-Z0-9]+)?|RZ\d{2}-\d{8}-\w{4}|"
    r"CH-\d{3}\w{4}-\w{2}|90X[A-Z]\w{4}-\w{6}|G[XY]\d{2}\w{6}|(?:GLO-MS|EGG)-[\w-]+)(?![\w-])", re.I)
DESCRIPTORS = r"(?:ποντ[ίι]κι(?:α)?|mouse|mice|gaming)"
WIRED = r"\bwired\b|\bενσυρματο\b"
WIRELESS = r"\bwireless\b|\bασυρματο\b"
FLAGS = {
    "rgb": r"\b(?:a?rgb)\b",
    "gaming": r"\bgaming\b",
    "bluetooth": r"\bbluetooth\b",
    "rf": r"\brf\b(?![-\d])|(?<![\w.])2[.,]4\s*g(?:hz)?\b",  # not the model code "RF-6300"
    "rechargeable": r"\brechargeable\b|\bεπαναφορτιζομεν[οη]\b",
    "ergonomic": r"\bergonomic\b|\bvertical\b|\bεργονομικο\b",
    "silent": r"\bsilent\b|\bαθορυβο\b",
}
DERIVED_REJECTS = {"no-identity", "identity-conflict"}
INCLUDED_ACCESSORY = re.compile(
    r"\b(?:with|includes|including|με)\s+(?:a\s+)?(?:usb\s+)?(?:nano\s+)?(?:receiver|dongle|δ[έε]κτη|charging\s+cable)\b", re.I)


def _fold(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c)).casefold()


def _flag(text: str, pattern: str) -> bool | None:
    values = [not re.search(r"(?:\bno|\bwithout|\bχωρισ|\bnon)[ -]*$", text[:m.start()])
              for m in re.finditer(pattern, text)]
    return any(values) if values else None


def _number(text: str, unit: str, prefix: bool = False) -> int | None:
    pattern = (rf"\b(?:{unit})\s*:\s*(\d+)(?![\w.]|,\d)" if prefix else
               rf"(?<![\w.,+-])(\d+)\s*(?:{unit})(?!\w|\s*:)")  # "555 Κουμπιά:8": the label of the next value
    values = [int(m.group(1)) for m in re.finditer(pattern, text)]
    return max((v for v in values if v > 0), default=None)


def _connection(text: str) -> str | None:
    wired, wireless = bool(re.search(WIRED, _fold(text))), bool(re.search(WIRELESS, _fold(text)))
    return 'both' if wired and wireless else 'wired' if wired else 'wireless' if wireless else None


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
    makers = list(BRAND_PATTERN.finditer(text))
    brands = {BRAND_NAMES[m.group().casefold()] for m in makers}
    # Several makers: only the one that opens the title is the maker ("A4Tech Bloody R72",
    # "Esperanza Titanum TM108"); the other name stays a word of the model.
    if not makers or (len(brands) > 1 and makers[0].start()):
        return 'Other', '', None, None
    brand = BRAND_NAMES[makers[0].group().casefold()]
    before = text[:makers[0].start()]
    text = text[makers[0].end():].strip()
    # Snif sometimes puts a model code before the maker; preceding prose is not a model.
    if re.search(r'(?<![\w.])(?=[A-Za-z0-9-]*[A-Za-z])(?=[A-Za-z0-9-]*\d)[A-Za-z0-9-]+(?![\w.])', before):
        text = before + ' ' + text
    text = BRAND_PATTERN.sub(lambda m: ' ' if BRAND_NAMES[m.group().casefold()] == brand else m.group(), text)
    text = re.sub(r"^G\s+(?=G(?:\d|\s))", "", text)  # Snif: "Logitech G G102", "Logitech G G PRO X"
    # Identity marks that the letters+digits model key would lose: "Yvi+", "Model O-", left-handed versions.
    text = re.sub(r"(?<=[A-Za-z0-9])\+(?![\w+])", " Plus ", text)
    text = re.sub(r"\b(Plus)(?:\s+Plus)+\b", r"\1", text, flags=re.I)
    text = re.sub(r"(?<=[A-Za-z0-9])-(?=\s|$)", " Minus ", text)
    text = re.sub(r"\bγια\s+αριστερ[όο]χειρ\w*|\bleft[ -]?handed\b", " Left-Handed ", text, flags=re.I)
    part = PART_NUMBER.search(text)
    part_number = part.group().upper() if part else None
    text = PART_NUMBER.sub(" ", text)
    connection_word = r"(?:wireless|wired|ασ[ύυ]ρματο|ενσ[ύυ]ρματο)"
    text = re.sub(rf"\b{connection_word}\s*[+&/]\s*{connection_word}\b", " ", text, flags=re.I)
    text = INCLUDED_ACCESSORY.sub(' ', text)
    colours = set()
    for phrase in COLOUR_PATTERN.finditer(text):
        for shade, name in COLOUR_UNIT.findall(phrase.group()):
            shade = 'matte' if shade.casefold() == 'matt' else shade.casefold()
            colours.add((shade + '-' if shade else '') + COLOUR_NAMES[name.casefold()])
    text = COLOUR_PATTERN.sub(' ', text)
    # Keep edition/identity words such as Mini, Lightspeed, for Mac and Bluetooth Edition.
    noise = (rf"\b{DESCRIPTORS}\b|\b(?:wireless|wired|ασ[ύυ]ρματο|ενσ[ύυ]ρματο)\b|"
             r"\bbluetooth\b(?!\s+edition\b)|\b(?:a?rgb|rechargeable|optical|οπτικ[όο]|usb(?!-c\b)(?:\s*[23](?:\.0)?)?|led|gamer)\b|"
             r"\bμε\s+επαναφορτιζ[όο]μενη\s+μπαταρ[ίι]α\b|\bμε\s+επιλογ[έε]ς\s+χρωμ[άα]των\s+rgb\b|"
             r"\b(?:επαναφορτιζ[όο]μενο|εργονομικ[όο]|αθ[όο]ρυβο)\b|\b(?:no|without|χωρ[ίι]ς)\b|"
             r"(?<![\w.,+-])\d+\s*(?:dpi|hz|buttons|κουμπι[άα])(?!\w)|"
             r"\b(?:polling\s*rate|buttons|κουμπι[άα])\s*:\s*\d+\s*(?:hz)?|"
             r"(?<![\w.])2[.,]4\s*g(?:hz)?\b|\brf\b(?![-\d])")
    text = re.sub(noise, " ", text, flags=re.I)
    text = re.sub(r"\(\s*\)", " ", text)
    text = re.sub(r"(?<!\S)[-/&,+|]+(?!\S)", " ", text)  # separators the removed words left alone
    model = re.sub(r"\s+", " ", text).strip(" ,;-/&")
    if len(model.split()) > MAX_MODEL_WORDS:
        model = ''
    elif not names.model_key(model):
        model = part_number or ''  # "HP G1K28AA": the part number is the only name the shops give
    colour = '-'.join(sorted(colours)) if colours else None
    return brand, model, colour, part_number


def make_listing(*, source: str, native_id: str, title: str, url: str, price: float,
                 shop_count: int | None, scraped_at: str, specs: str = "", identity_title: str | None = None) -> MouseListing | None:
    if isinstance(price, bool) or not isinstance(price, (int, float)) or not math.isfinite(price) or price <= 0:
        return None
    price = round(price, 2)
    if price <= 0:
        return None
    title = names.prepare(html.unescape(title))
    observed = names.prepare(html.unescape(identity_title)) if identity_title else title
    brand, model, colour, part = _identity(observed)
    card_brand, _, card_colour, card_part = _identity(title)
    # A maker such as Mars Gaming does not state a gaming feature by its name alone.
    body = BRAND_PATTERN.sub(' ', title + ' ' + observed)
    text = _fold(body + " " + specs)
    card_connection, extra_connection = _connection(title + ' ' + specs), _connection(observed)
    conflict = bool(identity_title) and (card_brand != brand
        or (card_colour is not None and colour is not None and card_colour != colour)
        or (card_part is not None and part is not None and card_part != part)
        or (card_connection is not None and extra_connection is not None and card_connection != extra_connection))
    connection = card_connection or extra_connection
    colour, part = card_colour or colour, card_part or part
    reason = (rejection_reason(title) or rejection_reason(observed) or ('identity-conflict' if conflict else None)
              or ("no-identity" if brand == "Other" or not model else None))
    return MouseListing(
        id=f"{source}:{native_id}", source=source, title=title, url=url, price=price,
        shopCount=shop_count, brand=brand, chip="", scrapedAt=scraped_at,
        connection=connection, colour=colour, partNumber=part,
        dpi=_number(text, "dpi"), pollingHz=_number(text, "hz"),
        buttons=_number(text, "buttons|κουμπια", prefix=True) or _number(text, "buttons|κουμπια"),
        **{field: _flag(text, pattern) for field, pattern in FLAGS.items()}, reject=reason, identityTitle=identity_title,
    )


def settle(listings: list[dict]) -> None:
    """Rebuild identities from original titles, before sharing, history and photo keys; repeat safely."""
    buckets: dict[tuple[str, str], list[dict]] = defaultdict(list)
    parts: dict[tuple[str, str], set[str]] = defaultdict(set)
    parsed = {}
    for row in listings:
        ident = _identity(row.get('identityTitle') or row["title"])
        brand, model, _, part = ident
        row["chip"] = ""
        if row.get("reject") in DERIVED_REJECTS:
            row["reject"] = None
        row["reject"] = row.get("reject") or rejection_reason(row["title"]) or rejection_reason(row.get('identityTitle') or '')
        if row.get('identityTitle'):
            card_brand, _, card_colour, card_part = _identity(row['title'])
            extra_connection, card_connection = _connection(row['identityTitle']), _connection(row['title'])
            if (card_brand != brand or (card_colour and ident[2] and card_colour != ident[2])
                    or (card_part and part and card_part != part)
                    or (card_connection and extra_connection and card_connection != extra_connection)):
                row['reject'] = row.get('reject') or 'identity-conflict'
            part = card_part or part
            ident = (brand, model, card_colour or ident[2], part)
        parsed[row['id']] = ident
        if row["reject"]:
            continue
        if brand == "Other" or not model:
            row["reject"] = "no-identity"
            continue
        # Letters and digits only, as the model key: "MW 2400" = "MW2400", "M815 Pro" = "M815-PRO".
        name = names.model_key(model)
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
            # A title that states no connection joins the wired model only. In the trial such titles
            # beside a wireless model were mostly its cheaper wired version ("SteelSeries Prime" 20 €
            # against "Prime Wireless" 80 €), so there they stay a model of their own.
            families[connection or ('wired' if known == {'wired'} else None)].append(row)
        for connection, family in sorted(families.items(), key=lambda pair: pair[0] or ""):
            model = min((parsed[r["id"]][1] for r in family), key=lambda s: (len(s), s.casefold(), s))
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
