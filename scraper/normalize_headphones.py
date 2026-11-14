"""Headphone, earphone, earbud and headset list observations and identity. No I/O; a spec no title or spec line
states stays unknown (None), never a default. Model = brand + model name without colour and descriptor words; colours
are variants of one model. See docs/peripherals/HEADPHONES_DESIGN.md."""
import html
import math
import re
import unicodedata
from collections import defaultdict

import names
import normalize_mouse as _mouse  # read-only: the colour tables
from models import HeadphonesListing

PRICE_FLOOR = 10.0  # EUR; owner 2026-11-14. A listing below it is `below-floor` (a sale price can flip it; settle() re-decides each run).

BRAND_LIST = (
    "Sony", "JBL", "Bose", "Sennheiser", "Apple", "Samsung", "Xiaomi", "Huawei", "Honor", "Motorola", "Google", "OnePlus",
    "Oppo", "Realme", "Vivo", "Nothing", "Soundcore", "Edifier", "Marshall", "Logitech", "Razer", "HyperX", "SteelSeries",
    "Corsair", "Turtle Beach", "Beyerdynamic", "AKG", "Audio-Technica", "Shure", "Philips", "Panasonic", "JVC", "Skullcandy",
    "Jabra", "Plantronics", "Poly", "Epos", "Beats", "Bang & Olufsen", "Bowers & Wilkins", "Focal", "Sonos", "Urbanista",
    "Urbanears", "1More", "Shokz", "Earfun", "Tozo", "QCY", "Haylou", "Baseus", "Hoco", "Remax", "Ugreen", "Awei", "Foneng",
    "Usams", "Joyroom", "Borofone", "Havit", "Meetion", "Fantech", "Onikuma", "Sades", "Redragon", "Mars Gaming",
    "Cooler Master", "Roccat", "Trust", "Creative", "Genius", "Rapoo", "Asus", "MSI", "Acer", "Lenovo", "Dell", "HP",
    "Gembird", "Esperanza", "Hama", "Sbox", "NOD", "Koss", "Maxell", "Mpow", "Tronsmart", "JLab", "KZ", "FiiO", "Moondrop",
    "Final Audio", "Meze Audio", "Truthear", "Mipro", "Mackie", "Rode", "Audio Pro", "Cambridge Audio", "Klipsch", "Anker",
    "Blackview", "4Smarts", "Spigen", "Mondo", "eKids", "Keeka", "Sondell", "iFrogz", "Zagg", "Cellularline", "Forever",
    "Setty", "MediaRange", "XO", "iPRO", "Swissten", "Devia", "WiWu", "Yesido", "Nillkin", "Lamtech", "Sonora", "Energy Sistem", "Tellur", "Maxlife",
    "Allocacoc", "Leewello", "WK", "Andowl", "Nedis", "Sandberg", "Belkin", "Targus", "Verbatim", "Vivanco", "Thronmax",
    "Astro", "Monarch Gear", "Havit", "Ttec", "Cellect", "Celly", "Elbe", "iXchange", "Ngs", "Noise", "boAt", "OneOdio",
    "Superlux", "Behringer", "Samson", "Fostex", "Grado", "Hifiman", "Ultrasone", "Teufel", "Denon", "Pioneer", "Yamaha",
    "Technics", "Pulse", "Lypertek", "Soul", "House of Marley", "Libratone", "Jlab", "Raycon", "Fresh n Rebel", "Bluedio",
    "Lenco", "Muse", "Akai", "Aiwa", "Trevi", "Majority", "Defunc", "Cowin", "Anbernic", "ASUS ROG", "Glorious", "Kingston",
)
# Brands read off the 2026-11-14 trial's unidentified titles (5+ listings each, a real maker or label in the title).
# Unbranded listings ("TWS68", "P9 Pro Max", "K87") stay `no-identity`: no name, no model.
SEEN_BRANDS = (
    "OTL", "Fineblue", "Guess", "GJBY", "Ezra", "Moxom", "Komc", "Monster", "Celebrat", "Marvo", "Defender", "Sonic Gear",
    "SonicGear", "SBS", "Acefast", "Lexibook", "Nacon", "Ipipoo", "Kiddoboo", "PDP", "Grundig", "Dudao", "A4Tech", "KLGO",
    "Canyon", "X-One", "Firo", "Kruger&Matz", "HiFuture", "Riversong", "Moye", "Platinet", "T'nB", "Lazerbuilt", "Gioteck",
    "Treqa", "PowerLocus", "Ovleng", "Tracer", "Vieta", "Zeroground", "PAVAREAL", "Amaya", "Armaggeddon", "WEKOME", "HATOR",
    "Spartan Gear", "Bigben", "AGM", "LDNIO", "Techsuit", "GoGEN", "Ellietech", "AIAIAI", "Streetz", "Vention", "PowerA",
    "Audeze", "Modecom", "AKZ", "Kakusiga", "Fifine", "MCDODO", "Jellico", "Conceptronic", "Audeeo", "Puro", "Moveteck",
    "Sudio", "Noozy", "Denver", "V-Tac", "Ksix", "Elmcoei", "Lampa", "Unicorn", "Meliconi", "Yookie", "Austrian Audio",
    "Proda", "BWOO", "3mk", "Speedlink", "Jabees", "Media-Tech", "Kotion Each", "Tech-Protect", "Blavec", "Infinix", "Blow",
    "SVEN", "Arrango", "TAKEMORE", "Sencor", "Colorum", "2GO", "Timekettle", "Niceboy", "NSP", "Yenkee", "Boompods",
    "Oniverse", "Sivga", "InEar", "Reloop", "Aula", "SODO", "AvLink", "Choetech", "DKNY", "ATC", "Bugani", "Omega",
    "Xtrike Me", "Xtrike-me", "T.Bone", "Deltaco", "Yesplus", "OTU", "LogiLink", "Aukey", "Blitzwolf", "Aftershokz",
    "Subsonic", "Doqaus", "Gerlax", "ANCOSUN", "Nyko", "Hori", "Kensington", "Veho", "Suunto", "Dali", "Tazata", "Viaim",
    "Acme", "Toshiba", "Steelplay", "Yealink", "Lindy", "Naxius", "LIFEstudio", "Konix", "Weibo", "Dark Project", "Lacoste",
    "Horluchs", "Maxwell", "DeWALT", "Tradesor", "Lexip", "Proove", "Microsoft", "Yison", "ZTX", "LucidSound", "Newtop",
    "BLAUPUNKT", "Bonofone", "Inca", "PZX", "Ajazz", "Buxton", "Medion", "O-Lonnie", "iDance", "Grixx", "Bloody", "Tribit",
    "SAVIO", "Misde", "Rebel", "Lorgar", "Mibro", "EGOBOO", "Lenyes", "Fairphone", "Tonsil", "Abyss", "Kouvolsen", "Mad Catz",
    "Power Dynamics", "Manhattan", "Kaku", "BuddyPhones", "Hileo", "Intenso", "Mozos", "Lexon", "Aqirys", "Rampage",
    "Jazwares", "Somostel", "SmartSound", "KNG", "Neumann", "Onanoff", "Audio Master", "Avantone", "Spirit of Gamer",
    "Inpods", "JH Audio", "Sonic Gear", "Crystal Audio", "Volte-Tel", "Zagg",
)
_BRANDS = {v.casefold(): v for v in names.VENDORS}
_BRANDS.update({v.casefold(): v for v in BRAND_LIST + SEEN_BRANDS})
BRAND_NAMES = {**_BRANDS, **names.VENDOR_ALIASES,
               "soundcore by anker": "Soundcore", "anker soundcore": "Soundcore", "anker": "Soundcore",
               "audio technica": "Audio-Technica", "beyerdynamic": "Beyerdynamic", "bang and olufsen": "Bang & Olufsen",
               "b&o": "Bang & Olufsen", "sony ericsson": "Sony", "one plus": "OnePlus", "turtle beach": "Turtle Beach",
               "steel series": "SteelSeries", "hyper x": "HyperX", "asus rog": "Asus", "rog": "Asus", "mars gaming": "Mars Gaming",
               "marshall": "Marshall",
               "cellular line": "Cellularline", "fresh 'n rebel": "Fresh n Rebel", "sonicgear": "Sonic Gear", "big ben interactive": "Bigben",
               "bigben interactive": "Bigben", "otl technologies": "OTL", "xtrike-me": "Xtrike Me", "kotion each": "Kotion", "kruger & matz": "Kruger&Matz",
               "3mk": "3mk", "plantronics": "Poly", "hp poly": "Poly", "jabra jabra": "Jabra"}
BRAND_PATTERN = re.compile(r"(?<![\w-])(?:" + "|".join(re.escape(k) for k in sorted(BRAND_NAMES, key=len, reverse=True)) + r")(?![\w-])", re.I)

# Colour tables: the mouse ones plus Greek plurals and the shade names audio makers use.
_COLOURS = {**_mouse.COLOURS}
for _key, _aliases in {
    "black": ("Μαύρα", "Μαύροι", "Μαύρες"), "white": ("Λευκά", "Άσπρα", "Λευκές"), "red": ("Κόκκινα",), "green": ("Πράσινα",),
    "yellow": ("Κίτρινα",), "gold": ("Χρυσά",), "transparent": ("Διάφανα", "Διάφανο", "Clear"), "fuchsia": ("Φούξια",),
    "magenta": ("Ματζέντα",), "light-blue": ("Γαλάζια",), "ivory": ("Ivory",), "navy": ("Navy", "Navy Blue"), "cream": ("Cream",),
    "titanium": ("Titanium",), "starlight": ("Starlight",), "obsidian": ("Obsidian",), "cloud-pink": ("Cloud Pink",),
    "starry-black": ("Starry Black",), "natural": ("Natural Titanium",), "pink": ("Ροζ",), "grey": ("Γκρι",),
}.items():
    _COLOURS[_key] = tuple(dict.fromkeys(_COLOURS.get(_key, ()) + _aliases))
def _fold(text: str) -> str:
    """Accents off (Greek 'ώρες' = 'ωρες'); case is left to re.I so model names keep theirs."""
    return "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c))


COLOUR_NAMES = {_fold(alias).casefold(): key for key, aliases in _COLOURS.items() for alias in aliases}
_COLOUR_ALT = "|".join(re.escape(k) for k in sorted(COLOUR_NAMES, key=len, reverse=True))
COLOUR_UNIT = re.compile(rf"(?:({_mouse._SHADE})[ -])?({_COLOUR_ALT})(?!\w)", re.I)
COLOUR_PATTERN = re.compile(
    rf"(?<!\w)(?<!\w-)(?:{_mouse._SHADE}[ -])?(?:{_COLOUR_ALT})(?:\s*[-/&]\s*(?:{_mouse._SHADE}[ -])?(?:{_COLOUR_ALT}))*(?!\w)", re.I)

MAX_MODEL_WORDS = 8
# Part numbers seen in titles: Logitech 981-000593, Samsung SM-R510NZAAEUA, Apple MTJV3ZM/A, JBL JBLT520BTBLKEU,
# HP/HyperX 6L5H8AA, Razer RZ04-04370100-R3M1, Sennheiser 509145-style codes are not matched (too many false hits).
PART_NUMBER = re.compile(
    r"(?<![\w-])(?:98[01]-\d{6}|SM-[A-Z]\d{3}[A-Z0-9]*|M[A-Z0-9]{4}ZM/A|JBL[A-Z]\d{2,3}[A-Z0-9]{3,}|[0-9][0-9A-Z]{4}AA|"
    r"RZ0\d-\d{8}-\w{4}|CA-\d{7}|GLO-\w+)(?![\w-])", re.I)

# What a title or spec line says. All patterns run on accent-stripped text, case-insensitive.
NOT_HEADPHONES = re.compile(
    r"soundbar|\bspeakers?\b|ηχει[οα]|subwoofer|\bdac\b|amplifier|ενισχυτ|\bradio\b|ραδιοφων|walkman|\bmp3\b|sound\s*card|"
    r"webcam|car\s*kit|speakerphone|ανοιχτης\s*ακροασης|karaoke|\bremote\b|powerbank|smart\s*watch|smartwatch|"
    r"^(?:studio\s+)?(?:microphone|μικροφωνο)\b|\bgamepad\b|\bcontroller\b", re.I)
ACCESSORY = re.compile(
    r"ear\s*pads?|earpads?|ear\s*cushions?|cushions?|ear\s*tips?|eartips?|ear\s*hooks?\b(?!.*(?:headphone|earphone))|μαξιλαρακ|"
    r"replacement|αντικαταστασ|(?:headset|headphones?|ακουστικ\w*)\s*stand|\bstand\b|βαση\s+(?:για\s+)?ακουστικ|"
    r"\badapt(?:er|or)\b|αντ[αά]πτορα|splitter|extension|case\s*only|carrying\s*case|\bpouch\b|windscreen|foam\s*tips|"
    r"charging\s*cable|\bhanger\b|\bholder\b|\bskin\b|σιλικον|\bmod\s*kit\b|\btransmitter\b|bluetooth\s*(?:receiver|adapter)|"
    r"θηκη\s+(?:για|μεταφορας|προστασιας)|\bcover\b|screen\s*protector|\bcharger\b|φορτιστ", re.I)
USED = re.compile(r"\b(?:used|refurb\w*|open[ -]?box)\b|μεταχειρισμεν|ανακατασκευ", re.I)
BUNDLE = re.compile(r"\bcombo\b|\bbundle\b|\bσετ\b|headset\s*[+&]\s*(?:mouse|keyboard|webcam)|(?:mouse|keyboard)\s*[+&].*\bheadset\b|με\s+δωρο", re.I)
INCLUDED_ACCESSORY = re.compile(
    r"\b(?:with|includes|including|με)\s+(?:a\s+)?(?:usb\s+)?(?:nano\s+)?(?:receiver|dongle|δεκτη|charging\s+cable|καλωδιο)\b", re.I)
HEADPHONE_WORD = re.compile(r"headphones?|headset|earphones?|earbuds?|ακουστικ|ψειρ|handsfree|hands[- ]free|\bbuds\b|\btws\b", re.I)
CABLE_ONLY = re.compile(r"(?:^|\s)(?:cable|καλωδιο)\b", re.I)

WIRED_WORD = r"\bwired\b|\bενσυρματ\w*"
WIRELESS_WORD = r"\bwireless\b|\bασυρματ\w*"
WIRELESS_SIGNAL = re.compile(WIRELESS_WORD + r"|\bbluetooth\b|\btws\b|true[- ]wireless|truly[- ]wireless|lightspeed|hyperspeed|"
                             r"(?<![\w.])2[.,]4\s*g(?:hz)?\b|\bdongle\b|\bnfc\b|\bbt\s*\d(?:\.\d)?\b", re.I)
WIRED_SIGNAL = re.compile(WIRED_WORD + r"|(?<![\w.])(?:2\.5|3\.5|3,5|6\.3)\s*mm\b|\bjack\b|\baux\b", re.I)
USB_SIGNAL = re.compile(r"\busb\b|\btype[- ]?c\b|\blightning\b", re.I)

FORM_FACTORS = (  # first match wins
    ("bone-conduction", re.compile(r"bone\s*conduction|οστικη", re.I)),
    ("open-ear", re.compile(r"open[- ]?ear|semi[- ]?(?:in[- ]?)?ear|air\s*conduction", re.I)),
    ("over-ear", re.compile(r"over[- ]?ear|circumaural|around[- ]?ear", re.I)),
    ("on-ear", re.compile(r"on[- ]?ear|supra[- ]?aural", re.I)),
    ("over-ear", re.compile(r"airpods\s*max", re.I)),
    ("in-ear", re.compile(r"in[- ]?ear|earbuds?|ear\s*buds|ψειρ|earphones?|neckband|ear-?hook|\btws\b|\b(?!ear)\w*buds\d*\b|\bairpods\b", re.I)),
)
FLAGS = {
    "bluetooth": r"\bbluetooth\b|\btws\b|true[- ]wireless|truly[- ]wireless|\bbt\s*\d\.\d\b",
    "rf": r"(?<![\w.])2[.,]4\s*g(?:hz)?\b|lightspeed|hyperspeed|\bdongle\b|usb\s*receiver",
    "anc": r"\banc\b|active\s*noise\s*cancel\w*|(?<!mic\s)noise\s*cancel(?:l)?ing(?!\s*(?:mic|microphone|μικροφων))|"
           r"noise\s*cancell?ation|noise\s*canceling(?!\s*(?:mic|microphone|μικροφων))|ενεργη\s*απαλοιφη",
    "transparency": r"transparency|ambient\s*(?:sound|mode|aware\w*)|hear[- ]through|aware\s*mode|διαφανεια",
    "microphone": r"microphone|\bmic\b|μικροφων\w*|\bheadset\b|hands[- ]?free|\bboom\b",
    "multipoint": r"multi[- ]?point|dual\s*connection",
    "spatialAudio": r"spatial\s*audio|dolby\s*atmos|3d\s*audio|dts[: ]?(?:x|headphone)|360\s*audio",
    "chargingCase": r"charging\s*(?:case|dock|box)|charge\s*case|θηκη\s*φορτισης",
    "foldable": r"foldable|πτυσσομεν\w*|collapsible",
    "gaming": r"\bgaming\b|\bgamer\b",
}
DERIVED_REJECTS = {"no-identity", "identity-conflict", "below-floor"}

# Words that describe the product rather than name it (accent-stripped, case-insensitive). NOISE goes anywhere in the
# title; FORM words (headphones, in-ear ...) only at the start or end of the name, because "Cloud Earbuds II" is a
# different product from "Cloud II".
_CONNECTORS = r"(?<![\w-])(?:(?:2[.,]5|3[.,]5|6[.,]3)\s*mm(?:\s*jack)?|usb[- ]?[ca]|type[- ]?c|lightning|usb(?:\s*2\.0)?|jack|βυσμα)(?![\w-])"
NOISE = re.compile("|".join((
    r"\b(?:ακουστικ(?:α|ο|ων)|ψειρ(?:ες|α)|στερεοφωνικ(?:α|ο)|κεφαλης|υπολογιστη|τηλεορασης|παιδικ(?:α|ο)|για\s+παιδια|kids?)\b",
    r"\b(?:wireless|wired|ασυρματ(?:α|ο|ες|η)|ενσυρματ(?:α|ο|ες|η)|bluetooth|bt\s*\d(?:\.\d)?|bt(?![-\w])|hybrid)\b",
    r"\b(?:earphones?|headset|hands[- ]?free|handsfree|stereo)\b|\bheadphones?\b(?!\s*\()",  # generic type words are never a name
    r"\bcall\s*cent(?:er|re)\b",
    r"\bquick\s+charge\b|\b(?:με\s+)?αντοχη\s+στον\s+ιδρωτα\b|\bεξουδετερωσης\s+θορυβου\b",
    r"\b(?:με\s+)?συνδεση\b",
    r"\b(?:(?:με|with)\s+)?(?:μικροφων(?:ο|ου)|microphone|mic)\s+(?:and|και)\s+volume\s+control\b",
    _CONNECTORS,
    r"\bstudio\s+(?=(?:over|on)[- ]?ear)",
    r"\bμε\s+\d+(?:[.,]\d+)?\s*ωρ(?:ες|ων)\s*λειτουργιας\b",
    r"\b(?:με|with)\s+(?:μαλακη\s+)?θηκη(?:\s+φορτισης)?\b",
    r"\bwith\s+(?:[\w-]+\s+){0,2}charging\s+(?:case|dock|box)\b",
    r"\b(?:(?:με|with)\s+)?(?:active\s+noise\s+cancel\w*|noise\s+cancel\w*|anc|enc|ενεργη\s+απαλοιφη\s+θορυβου)\b",
    r"\b(?:(?:με|with)\s+)?(?:μικροφων(?:ο|ου)|mic|microphone|mics|\d+\s*mics?)\b",
    r"\bανθεκτικ(?:α|ο)\s+στο\s+νερο\b|\bwaterproof\b|\bwater[- ]resistant\b|\bipx?\d{1,2}\b",
    r"\b(?:charging\s+(?:case|dock|box)|θηκη\s+φορτισης|hi-?res(?:\s*audio)?|ldac|licensed)\b",
    r"\b\d+\s*mm\s*(?:dynamic\s*)?drivers?\b|\bvolume\s+control\b|\bvolume\s+limiter\b|\bπροστασια\s+εντασης\b",
    r"\b(?:bulk|retail|oem|oob|model|μοντελο|χρωμα|color|colour)\s*:?(?=\s|\)|$)",
    r"\bμηκους\s+\d+(?:[.,]\d+)?\s*m\b|\bρυθμιση\s+ηχου\b",
    r"\b(?:για|for)\s+(?:ps\s?\d|playstation\s*\d|xbox|pc|nintendo|switch|mac|tablet|κινητο)\b[\w\s/&+,.-]*$",
    r"(?<![\w.])\d{8,14}(?![\w.])",  # a barcode
)), re.I)
FORM = (r"(?:headphones?|headset|earphones?|ear\s*buds?|earbuds?|in[- ]?ear|on[- ]?ear|over[- ]?ear|ear-?hooks?|neckband|"
        r"semi[- ]?(?:in[- ]?)?ear|open[- ]?ear|bone\s*conduction|hands[- ]?free|handsfree|stereo|gaming|gamer|dynamic|tws|"
        r"true[- ]wireless|truly[- ]wireless|sports?)")
_TRAIL = re.compile(rf"[\s,;/&|:-]+(?:{FORM}|με|with|and|και|ear)\s*$", re.I)
_LEAD = re.compile(rf"^[\s,;/&|:-]*(?:{FORM}|με|with|and|και)[\s,;/&|:-]+", re.I)
_MODEL_CODE = re.compile(r"(?<![\w-])(?=[\w-]*[A-Za-z])(?=[\w-]*\d)[\w-]{2,}")


def _tidy(text: str) -> str:
    text = re.sub(r"\(\s*\)", " ", text)
    text = re.sub(r"(?<!\S)[-/&,+|:.]+(?!\S)", " ", text)  # separators the removed words left alone
    return re.sub(r"\s+", " ", text).strip(" ,;-/&|:")


def _strip_form_words(text: str) -> str:
    """Drop type words from both ends; a name made only of them is no name. Repeats to a fixed point."""
    while True:
        text = _tidy(text)
        if re.fullmatch(rf"(?:{FORM}|ear|in|on|over|with|and|με|και|[\s,;/&|:-])*", text, re.I):
            return ""
        trail = _TRAIL.sub("", text)
        if trail != text and trail.strip():
            text = trail
            continue
        lead = _LEAD.sub("", text, count=1)
        if lead != text and len(names.model_key(lead)) >= 2:  # "Headphone (a)" keeps its name
            text = lead
            continue
        return text


def _flag(text: str, pattern: str) -> bool | None:
    values = [not re.search(r"(?:\bno|\bwithout|\bχωρις|\bnon)[ -]*$", text[:m.start()], re.I)
              for m in re.finditer(pattern, text, re.I)]
    return any(values) if values else None


def _connection(text: str) -> str | None:
    wireless, wired, usb = (bool(WIRELESS_SIGNAL.search(text)), bool(WIRED_SIGNAL.search(text)), bool(USB_SIGNAL.search(text)))
    if wireless:
        return "both" if wired else "wireless"
    return "wired" if wired or usb else None


def _explicit_connection(text: str) -> str | None:
    """Only the words 'wired' / 'wireless' (and Greek): what splits two versions of one model name."""
    wired, wireless = bool(re.search(WIRED_WORD, text, re.I)), bool(re.search(WIRELESS_WORD, text, re.I))
    return "both" if wired and wireless else "wired" if wired else "wireless" if wireless else None


def _form_factor(text: str) -> str | None:
    for name, pattern in FORM_FACTORS:
        if pattern.search(text):
            return name
    return None


def _battery(text: str) -> float | None:
    hours = r"(?:ωρες|ωρων|hours?|hrs?|h)\b"
    values = [float(m.group(1).replace(",", ".")) for pattern in (
        rf"(?<![\w.,-])(\d{{1,3}}(?:[.,]\d)?)\s*{hours}\s*(?:χρησης|λειτουργιας|μπαταριας|αναπαραγωγης|battery|playtime|playback|usage|listening)",
        rf"(?:battery|playtime|playback|μπαταρια|αυτονομια)[^\d]{{0,12}}(\d{{1,3}}(?:[.,]\d)?)\s*{hours}",
        r"(?<![\w.,-])(\d{1,3})\s*h\s+battery",
    ) for m in re.finditer(pattern, text, re.I)]
    values = [v for v in values if 1 <= v <= 200]
    return (int(max(values)) if max(values).is_integer() else max(values)) if values else None


def _driver(text: str) -> int | None:
    values = [int(m.group(1)) for pattern in (r"(?<![\w.,-])(\d{1,2})\s*mm\s*(?:dynamic\s*|neodymium\s*)?drivers?", r"drivers?\s*(?:size)?[: ]\s*(\d{1,2})\s*mm")
              for m in re.finditer(pattern, text, re.I)]
    values = [v for v in values if 5 <= v <= 60]
    return max(values) if values else None


def _connectors(text: str) -> str | None:
    found = []
    for label, pattern in (("3.5mm", r"3[.,]5\s*mm"), ("2.5mm", r"2[.,]5\s*mm"), ("6.3mm", r"6[.,]3\s*mm"),
                           ("USB-C", r"usb[- ]?c\b|type[- ]?c\b"), ("USB-A", r"usb[- ]?a\b"), ("Lightning", r"lightning")):
        if re.search(pattern, text, re.I):
            found.append(label)
    if not any(v.startswith("USB-") for v in found) and re.search(r"\busb\b(?![- ]?[ac]\b)", text, re.I):
        found.append("USB")
    return ", ".join(found) or None


def rejection_reason(title: str) -> str | None:
    text = _fold(title)
    if USED.search(text):
        return "used"
    if BUNDLE.search(text):
        return "bundle"
    text = INCLUDED_ACCESSORY.sub("", text)
    if NOT_HEADPHONES.search(text):
        return "not-headphones"
    if ACCESSORY.search(text) or (CABLE_ONLY.search(text) and not HEADPHONE_WORD.search(text)):
        return "accessory"
    return None


def _identity(title: str) -> tuple[str, str, str | None, str | None]:
    """(brand, model, colour, part number); brand 'Other' and an empty model when the title gives no identity."""
    text = _fold(names.prepare(html.unescape(title)))
    makers = list(BRAND_PATTERN.finditer(text))
    brands = {BRAND_NAMES[m.group().casefold()] for m in makers}
    # Several makers: only the one that opens the title is the maker ("Soundcore by Anker ...", "Logitech G Pro X");
    # a title that opens with a non-maker prefix ("Ακουστικά Sony MDRE9LP", "Headset H111 Logitech 981-000593") still
    # takes its first maker when only one maker is named.
    if not makers or (len(brands) > 1 and makers[0].start() > 12):
        return "Other", "", None, None
    brand = BRAND_NAMES[makers[0].group().casefold()]
    before, text = text[:makers[0].start()], text[makers[0].start():]
    text = BRAND_PATTERN.sub(lambda m: " " if BRAND_NAMES[m.group().casefold()] == brand else m.group(), text)
    # Words before the maker ("Headset H111 Logitech 981-000593", "Ακουστικά Sony MDRE9LP") are not a model, unless
    # a model code is among them.
    before = _strip_form_words(NOISE.sub(" ", before))
    if _MODEL_CODE.search(before):
        text = before + " " + text
    part = PART_NUMBER.search(text)
    part_number = part.group().upper() if part else None
    text = PART_NUMBER.sub(" ", text)
    text = INCLUDED_ACCESSORY.sub(" ", text)
    # Identity marks the model key (letters and digits only) would lose.
    text = re.sub(r"(?<=[A-Za-z0-9])\+(?![\w+])", " Plus ", text)
    text = re.sub(r"\b(Plus)(?:\s+Plus)+\b", r"\1", text, flags=re.I)
    # A colour code after a slash is not part of the name: "WH-CH720N/B", "WH-1000XM5/S".
    text = re.sub(r"(?<=\d[A-Za-z])/[A-Za-z]{1,2}\b|(?<=\d)/[A-Za-z]{1,2}\b", " ", text)
    colours = set()
    for phrase in COLOUR_PATTERN.finditer(text):
        for shade, name in COLOUR_UNIT.findall(phrase.group()):
            shade = "matte" if shade.casefold() == "matt" else shade.casefold()
            colours.add((shade + "-" if shade else "") + COLOUR_NAMES[name.casefold()])
    text = COLOUR_PATTERN.sub(" ", text)
    # Apple names the version that has noise cancelling as its own product ("AirPods 4" and "AirPods 4 with Active
    # Noise Cancellation"); for it the feature is part of the model. EarPods differ by their plug.
    apple_anc = bool(re.search(r"airpods\s*(?:4|5)\b", text, re.I) and re.search(r"noise\s*cancel|\banc\b", text, re.I))
    plug = None
    if re.search(r"earpods", text, re.I):
        found = re.search(r"usb[- ]?c|lightning|3[.,]5\s*mm", text, re.I)
        plug = ("USB-C" if found and found.group().lower().startswith("usb") else "Lightning" if found and found.group().lower() == "lightning"
                else "3.5mm") if found else None
    text = NOISE.sub(" ", text)
    # A year in brackets is not a name when the name has a number already ("AirPods 4 (2024)").
    without_year = re.sub(r"\(\s*20\d\d\s*\)", "", text)
    if re.search(r"\d", without_year):
        text = without_year
    # A code the title repeats ("EH200K ... EH200K") is one code.
    seen, kept = set(), []
    for word in _tidy(text).split():
        key = word.casefold()
        if key in seen and _MODEL_CODE.fullmatch(word):
            continue
        seen.add(key)
        kept.append(word)
    model = " ".join(kept)
    # A single unnamed word after the ear phrase is a colour or finish the colour table lacks ("Bose QuietComfort Over
    # Ear Moonstone"); the name is what comes before the phrase. Longer tails stay: they may be an edition.
    model = re.sub(r"^(\S.*?\S)\s+(?:over|on|in)[- ]?ear\s+[A-Za-z\u0370-\u03ff']+$", r"\1", model, flags=re.I)
    model = _strip_form_words(model)
    if re.search(r"\bearpods\b", model, re.I):
        model = "EarPods"  # one product per plug; the part number (MTJY3, MYQY3) and year only repeat it
    if len(model.split()) > MAX_MODEL_WORDS:
        model = ""
    elif not names.model_key(model):
        model = part_number or ""
    if model and apple_anc:
        model += " ANC"
    if model and plug:
        model += f" {plug}"
    colour = "-".join(sorted(colours)) if colours else None
    return brand, model, colour, part_number


def make_listing(*, source: str, native_id: str, title: str, url: str, price: float, shop_count: int | None,
                 scraped_at: str, specs: str = "") -> HeadphonesListing | None:
    if isinstance(price, bool) or not isinstance(price, (int, float)) or not math.isfinite(price) or price <= 0:
        return None
    price = round(price, 2)
    if price <= 0:
        return None
    title = names.prepare(html.unescape(title))
    brand, model, colour, part = _identity(title)
    text = _fold(BRAND_PATTERN.sub(" ", title) + " " + specs)
    form = _form_factor(text)
    true_wireless = (True if re.search(r"\btws\b|true[- ]wireless|truly[- ]wireless|\b(?!ear)\w*buds\d*\b|\bairpods(?!\s*max)\b", text, re.I)
                     or (re.search(r"earbuds?", text, re.I) and re.search(r"bluetooth|wireless|ασυρματ", text, re.I)
                         and not re.search(r"neckband|cable|καλωδι", text, re.I)) else None)
    connection = _connection(re.sub(r"(?:with\s+(?:[\w-]+\s+){0,2})?charging\s+(?:case|dock|box)", " ", text, flags=re.I))
    if connection == "wired":
        true_wireless = False
    reason = (rejection_reason(title) or ("below-floor" if price < PRICE_FLOOR else None)
              or ("no-identity" if brand == "Other" or not model else None))
    return HeadphonesListing(
        id=f"{source}:{native_id}", source=source, title=title, url=url, price=price, shopCount=shop_count,
        brand=brand, chip="", scrapedAt=scraped_at, formFactor=form,
        productType=("headset" if re.search(r"\bheadset\b", text, re.I) else "earbuds" if true_wireless
                     else "earphones" if form in ("in-ear", "open-ear", "bone-conduction") else "headphones" if form else None),
        trueWireless=true_wireless, connection=connection, connector=_connectors(text),
        batteryHours=_battery(text), driverMm=_driver(text),
        waterResistance=(m.group().upper() if (m := re.search(r"\bipx?\d{1,2}\b", text, re.I)) else None),
        colour=colour, partNumber=part, reject=reason,
        **{field: _flag(text, pattern) for field, pattern in FLAGS.items()},
    )


def _sniff_connection(row: dict) -> str | None:
    return _explicit_connection(_fold(row["title"]))


def settle(listings: list[dict]) -> None:
    """Rebuild identities from the original titles, before sharing, history and photo keys; safe to repeat."""
    buckets: dict[tuple[str, str], list[dict]] = defaultdict(list)
    parts: dict[tuple[str, str], set[str]] = defaultdict(set)
    parsed = {}
    for row in listings:
        brand, model, _, part = ident = _identity(row["title"])
        parsed[row["id"]] = ident
        row["chip"] = ""
        if row.get("reject") in DERIVED_REJECTS:
            row["reject"] = None
        row["reject"] = (row.get("reject") or rejection_reason(row["title"])
                         or ("below-floor" if (row.get("price") or 0) < PRICE_FLOOR else None))
        if row.get("connection") is None and row.get("bluetooth"):  # a category that is Bluetooth by definition (tags)
            row["connection"] = "wireless"
        if row["reject"]:
            continue
        if brand == "Other" or not model:
            row["reject"] = "no-identity"
            continue
        if part:
            parts[(brand, part)].add(names.model_key(model))
        buckets[(brand, names.model_key(model))].append(row)

    groups = []
    for (brand, name), rows in sorted(buckets.items()):
        valid = []
        for row in rows:
            part = parsed[row["id"]][3]
            if part and len(parts.get((brand, part), ())) > 1:
                row["reject"] = "identity-conflict"
            else:
                valid.append(row)
        # A pair stated as "both" fits a wired and a wireless title alike; only wired-only against wireless-only splits a name.
        known = {c for c in (_sniff_connection(r) for r in valid) if c in ("wired", "wireless")}
        families = defaultdict(list)
        for row in valid:
            connection = _sniff_connection(row)
            if connection not in known and len(known) > 1:
                row["reject"] = "identity-conflict"
                continue
            # One stated family: unstated listings are the same product. Two (wired and wireless): the name says which.
            families[connection if len(known) > 1 else None].append(row)
        for connection, family in sorted(families.items(), key=lambda pair: pair[0] or ""):
            # e-shop.gr titles are upper-case: its spelling names the model only when no other source has it.
            model = min(((r["source"] == "eshop", parsed[r["id"]][1]) for r in family),
                        key=lambda p: (p[0], len(p[1]), p[1].casefold(), p[1]))[1]
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
            row["brand"] = parsed[row["id"]][0]  # the brand list can change between runs; the row follows the title
