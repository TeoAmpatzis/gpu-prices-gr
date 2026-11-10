"""Monitor title (+ list spec line) -> brand / model code / size / resolution / refresh / panel / colour,
and the strict rule that decides whether two listings are the same monitor.

Not wired into the scrapers yet (no Category("monitor") until the staging report exists). Pure functions,
no I/O. Rules come from docs/peripherals/PHASE2_EXPERIMENT.md (measured on 3,110 real listings and checked
against 206 BestPrice barcodes):

* A model is brand + code. A code alone is not enough for short series codes (G50F is a 27" and a 32"),
  so size, resolution height, refresh, panel and revision must not disagree.
* Unknown never bridges: a listing missing size or resolution joins only when exactly one candidate fits.
* A longer or shorter code is a different product (P2425 vs P2425E: different barcodes), never merged by prefix.
* Colour (Black/White/Silver/ICE) is a variant of one model, not a different model.
"""

import html
import re
import unicodedata
from dataclasses import dataclass, replace

# Brand -> display name. Order matters only for multi-word names.
BRANDS = {
    "samsung": "Samsung", "lg": "LG", "dell": "Dell", "alienware": "Dell", "asus": "Asus", "acer": "Acer",
    "aoc": "AOC", "msi": "MSI", "philips": "Philips", "lenovo": "Lenovo", "hp": "HP", "benq": "BenQ",
    "gigabyte": "Gigabyte", "xiaomi": "Xiaomi", "viewsonic": "ViewSonic", "dahua": "Dahua", "iiyama": "iiyama",
    "hisense": "Hisense", "tcl": "TCL", "koorui": "Koorui", "corsair": "Corsair", "nzxt": "NZXT", "eizo": "Eizo",
    "huawei": "Huawei", "innocn": "Innocn", "arzopa": "Arzopa", "blackview": "Blackview", "sony": "Sony",
    "cooler master": "Cooler Master", "teamgroup": "TeamGroup", "nec": "NEC", "verbatim": "Verbatim",
}

# Words that mean the listing is not a new, complete monitor. The reason goes to the rejection report.
REJECT = (
    ("not-monitor", r"ΡΑΦΑΚΙ|ΒΑΣΗ ΣΤΗΡΙΞΗΣ|ΒΑΣΗ ΟΘΟΝΗΣ|ΚΑΛΩΔΙΟ|ΤΗΛΕΟΡΑΣΗ|\bTV\b|PROJECTOR|ΠΡΟΒΟΛΕΑΣ|ΔΙΑΔΡΑΣΤΙΚΟΣ ΠΙΝΑΚΑΣ|CLASSBOARD|ΜΟΝΙΤΟΡ ΤΡΟΦΟΔΟΣΙΑΣ"
                    r"|ΦΟΡΤΙΣΤ|CHARGER|ΑΝΤΑΠΤΟΡ|POWER ADAPTER|AC ADAPTER"  # chargers and power adapters for monitors
                    r"|ΠΡΟΣΤΑΤΕΥΤΙΚ|PROTECTOR|ΦΙΛΜ|\bFILM\b|ΦΙΛΤΡΟ|SCREEN FILTER"  # screen protectors, films and filters
                    r"|SIGNAGE|\bLFD\b|BRAVIA|\bOM\d{2}[A-Z]{1,2}\b|ALL-?IN-?ONE|ΒΡΑΧΙΟΝ|\bBRACKET\b|MONITOR ARM"  # signage, all-in-one PCs, arms and mounts
                    r"|\bVIDEO[ -]?WALL\b|\bCCTV\b|\bOPEN[ -]?FRAME\b|\bKIOSK\b|\bBROADCAST\b"
                    r"|REPLACEMENT (?:LAPTOP |LED |LCD |SCREEN )*(?:PANEL|SCREEN)|ΑΝΤΑΛΛΑΚΤΙΚ[ΗΟ] (?:ΟΘΟΝΗ|ΠΑΝΕΛ)"
                    r"|\b(?:HDMI|DISPLAYPORT|MONITOR) CABLE\b|\b(?:SINGLE|DUAL) MONITOR STAND\b"),
    ("used", r"ΑΝΑΚΑΤΑΣΚΕΥ|REFURB|REBURB|\bGRADE\s*[ABC]\b|ΜΕΤΑΧΕΙΡΙΣΜΕΝ|\bREF\b|ΕΠΙΔΙΟΡΘΩΜΕΝ"),  # (REBURB: a shop's typo)
    ("bundle", r"ΣΕ ΣΕΤ|\bKIT\b"),
)
LOOKALIKE = str.maketrans("ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ", "ABEZHIKMNOPTYX")  # Greek capitals that look Latin

# Tokens that are specs or marketing, never the model code.
NOISE = re.compile(
    r"^(\d{3,4}X\d{3,4}|\d+(\.\d+)?(HZ|MS|K|\"|''|IN(?:CH(?:ES)?)?|NITS?|CD)|\d[KP]\d?[KP]?|DISPLAYHDR\d*|HDR\d*|HDMI[\d.]*|DP[\d.]*|"
    r"USB-?C?\d*|VGA|DVI|IPS|VA|TN|OLED|QD-?OLED|WQHD\+?|QHD|FHD|UHD|WUXGA|ULTRAWIDE|CURVED|FLAT|GAMING|MONITOR|LED|LCD|"
    r"FREESYNC|G-?SYNC|VESA|BLACK|WHITE|PORTABLE|PRO|PLUS|ESSENTIAL|ODYSSEY|ULTRAGEAR|ZENSCREEN|ULTRASHARP|PROART|"
    r"THINKVISION|MAG|MPG|MAB|24/7|16:9|2026|2025|2024|\d{3,4}R)$"
)
SHOP_SKU = re.compile(r"^\d{3}-[A-Z]{4}$")  # Dell "210-BMJC" appended by Snif
COLOURS = {"BLACK": "black", "WHITE": "white", "SILVER": "silver", "GREY": "grey", "GRAY": "grey", "ICE": "white",
           "ΜΑΥΡΟ": "black", "ΜΑΥΡΗ": "black", "ΛΕΥΚΟ": "white", "ΛΕΥΚΗ": "white", "ΑΣΗΜΙ": "silver", "PLATINUM": "silver"}
# Resolution words -> pixel height. A width is only known from "2560x1440".
HEIGHT_WORDS = (("WUXGA", 1200), ("FHD", 1080), ("FULL HD", 1080), ("QHD", 1440), ("QUAD HD", 1440), ("WQHD", 1440),
                ("4K", 2160), ("UHD", 2160), ("5K2K", 2160))
SIZE_TOLERANCE = 0.6  # inches: 31.5 / 32, 26.5 / 27 and 31.6 / 32 are one product
MAX_PC_SIZE = 57.5  # inches: the biggest PC monitors are 57" (Odyssey Neo G9); 65" and up are large-format signage displays


@dataclass(frozen=True)
class Parsed:
    brand: str | None
    code: str | None  # model code, hyphens/slashes removed ("27U421A-B" -> "27U421AB")
    size: float | None  # diagonal, inches
    height: int | None  # pixel height (1080, 1440, 2160 ...)
    width: int | None
    hz: int | None
    panel: str | None  # IPS | VA | TN | OLED (QD-OLED counts as OLED)
    colour: str | None
    revision: str | None  # model-year token ("2026"); a different year is a different product
    reject: str | None  # reason the listing is not a launchable monitor, else None
    gtin: str | None = None  # EAN from a BestPrice product page (specs.parse_monitor); places or tie-breaks, never bridges


def plain(text: str) -> str:
    """Upper case without accents ("μεταχειρισμένη" -> "ΜΕΤΑΧΕΙΡΙΣΜΕΝΗ"), Greek letters kept."""
    return "".join(c for c in unicodedata.normalize("NFD", text.upper()) if not unicodedata.combining(c))


def fold(text: str) -> str:
    return plain(text).translate(LOOKALIKE)


def clean(title: str) -> str:
    """Snif double-escapes quotes (27&amp;apos;&amp;apos;): unescape until stable."""
    for _ in range(3):
        un = html.unescape(title)
        if un == title:
            break
        title = un
    return re.sub(r"\s+", " ", title).strip()


def rejection_reason(title: str, specs: str = "", size: float | None = None) -> str | None:
    """Admission policy for fresh parses and retained observations; unknown specs remain eligible."""
    text = plain(clean(title + " " + specs))
    reason = next((reason for reason, pat in REJECT if re.search(pat, text)), None)
    if reason:
        return reason
    # Internal USB status screens, despite monitor/portable shop titles:
    # https://www.advice.co.th/nescen-n070/product/productdetail/A0185203
    # https://lian-li.com/product/8-8inch-universal-screen/
    # Open-frame touchscreens: https://www.elotouch.com/open-frame-touchscreens-2295l.html
    # https://www.elotouch.com/open-frame-touchscreens-2495l.html
    # https://www.elotouch.com/open-frame-touchscreens-1093l.html
    # https://iiyama.com/gl_en/products/prolite-tf1015mc-b3/
    # On-camera display: https://www.benq.com/en-us/monitor/creative-pro/pvs7.html
    for maker, models in ((r"\bOCYPUS\b", "ES916"), (r"\bLIAN[ -]+LI\b", "US88V1"),
                          (r"\bELO\b", "1093L|2295L|2495L"), (r"\bIIYAMA\b", "TF1015MC-B3"),
                          (r"\bBENQ\b", "PVS7")):
        if re.search(maker, text) and re.search(rf"(?<![A-Z0-9-])(?:{models})(?![A-Z0-9-])", text):
            return "not-monitor"
    return "not-monitor" if size and size > MAX_PC_SIZE else None


# First words of a title that are not a brand (used when no known brand is found).
GENERIC = {"MONITOR", "GAMING", "PORTABLE", "CURVED", "ULTRAWIDE", "TOUCH", "LED", "LCD", "IPS", "VA", "TN", "OLED",
           "FULL", "HD", "FHD", "QHD", "UHD", "SMART", "PRO", "THE", "NEW", "USB", "DISPLAY", "SERIES"}


def _brand(title: str) -> str | None:
    low = title.lower()
    for key, name in BRANDS.items():
        if re.search(r"(?<![a-zα-ω])" + re.escape(key) + r"(?![a-zα-ω])", low):
            return name
    # Unknown maker (AG Neovo, LC-Power, Zeuslap ...): the first Latin word is its name. The model code still has to
    # match, so a wrong guess here costs a missed join, never a false merge.
    for raw in re.split(r"[\s,()/]+", title):
        w = raw.strip("-.\"'+")
        if re.fullmatch(r"[A-Za-z][A-Za-z-]+", w) and w.upper() not in GENERIC and not NOISE.match(w.upper()):
            return w.upper() if len(w) <= 3 else w[0].upper() + w[1:].lower()
    return None


def _code(folded: str) -> str | None:
    best = None
    for raw in re.split(r"[\s,()/]+", folded):
        tok = raw.strip("-.\"'+")
        if len(tok) < 3 or NOISE.match(tok) or SHOP_SKU.match(tok) or tok in COLOURS:
            continue
        if not (re.search(r"[A-Z]", tok) and re.search(r"\d", tok)) and not re.fullmatch(r"\d{2}-\d{2}", tok):
            continue  # (a model number written like "Legion 24-15" has no letters)
        if re.fullmatch(r"\d{2,4}(HZ|MS|K|P)|\d+(\.\d+)?|\d{3,4}X\d{3,4}|\d{2,3}(QHD|FHD|UHD|WQHD)", tok):
            continue
        tok = re.sub(r"[^A-Z0-9]", "", tok)
        if best is None or len(tok) > len(best):  # longest wins, the first wins a tie
            best = tok
    return best


def _size(folded: str) -> float | None:
    m = re.search(r"(?<![\w.,/+-])(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:\"|''|'|[“”″]|IN(?:CH(?:ES)?)?\b|INT[ΣS])", folded) or re.search(
        r"(?<![\w.,/+-])(\d{1,2}(?:[.,]\d{1,2})?)(?=\s+(?:IPS|VA|OLED|QD|FHD|WQHD|QHD|4K|UHD|CURVED|FLAT|ULTRAWIDE|WUXGA|FULL))", folded)
    return float(m.group(1).replace(",", ".")) if m else None


def _panel(folded: str) -> str | None:
    if re.search(r"\bQD-?\s?OLED\b|\bOLED\b", folded):
        return "OLED"
    for p in ("IPS", "VA", "TN"):
        if re.search(rf"\b{p}\b", folded):
            return p
    return None


# A listing with no model number ("Arozzi NoVa IPS Monitor 27") is named by the words that tell it apart, as case, fan and
# cooler models are: brand + the first distinctive words. Such a "code" has no digit (every real code has one), which is
# how `group` knows to ask for size and resolution before it may start or join a model.
NAME_WORDS = 3
NAME_SKIP = GENERIC | {"INCH", "GEN", "LINE", "SERIES", "MONITOR", "MONITORS", "DISPLAY", "SCREEN", "FLAT", "FULL", "ULTRA",
                       "QUAD", "WIDE", "SLIM", "EXTENSION", "LAPTOP", "COMPUTER", "OFFICE", "HDR", "SMART", "TOUCH"}


def _name_code(title: str, brand: str | None) -> str | None:
    brand_words = {re.sub(r"[^A-Z]", "", w) for w in (brand or "").upper().split()}
    words = []
    for raw in re.split(r"[\s,()/]+", title):
        w = raw.strip("-.\"'+")
        up = w.upper()
        if (re.fullmatch(r"[A-Za-z][A-Za-z-]{2,}", w) and up not in NAME_SKIP and up not in brand_words
                and not NOISE.match(up) and up not in COLOURS):
            words.append(up)
    return " ".join(words[:NAME_WORDS]) if words else None


def parse(title: str, specs: str = "") -> Parsed:
    title = clean(title)
    folded = fold(title)
    greek = plain(title)  # accents off, Greek kept: the reject and colour words are Greek, and folding would turn some letters Latin
    text = fold(title + " " + specs)
    # A resolution has both sides plausible: "VESA 100x100" is a mount, not a screen.
    res = next((m for m in re.finditer(r"(\d{3,4})\s*X\s*(\d{3,4})", text) if int(m.group(1)) >= 640 and int(m.group(2)) >= 480), None)
    width, height = (int(res.group(1)), int(res.group(2))) if res else (None, None)
    if height is None:
        height = next((h for word, h in HEIGHT_WORDS if re.search(rf"\b{re.escape(word)}\b", text)), None)
    hz = re.search(r"(\d{2,3})\s*HZ", fold(specs)) or re.search(r"(\d{2,3})\s*HZ", folded)
    year = re.search(r"(?<![A-Z0-9.])(20[2-3]\d)(?![A-Z0-9.])", folded)  # on its own: "E2020H" is a code
    colour = next((COLOURS[w] for w in re.findall(r"[A-ZΑ-Ω]+", greek) if w in COLOURS), None)
    brand = _brand(title)
    code = _code(folded) or (_name_code(title, brand) if brand else None)
    size = _size(text)
    return Parsed(brand, code, size, height, width, int(hz.group(1)) if hz else None,
                  _panel(text), colour, year.group(1) if year else None,
                  rejection_reason(title, specs, size))


def has_identity(p: Parsed) -> bool:
    return p.reject is None and bool(p.brand and p.code)


def compatible(a: Parsed, b: Parsed) -> bool:
    """True when nothing the two listings both state disagrees. Unknown on either side is not a disagreement
    here; `group` decides separately whether an unknown may join."""
    if a.size and b.size and abs(a.size - b.size) > SIZE_TOLERANCE:
        return False
    if a.height and b.height and a.height != b.height:
        return False
    if a.hz and b.hz and a.hz != b.hz:
        return False
    if a.panel and b.panel and a.panel != b.panel:
        return False
    if a.revision and b.revision and a.revision != b.revision:
        return False
    return True


def group(items: list[tuple[str, Parsed]]):
    """items: (listing id, Parsed). Returns (models, ambiguous, unidentified):
    models = list of (brand, code, [ids]); ambiguous = ids that fit more than one model or none of the
    complete ones; unidentified = ids without a usable brand + code (rejects included)."""
    # A barcode places a listing that has no usable brand + code on the one brand + code whose listings carry the
    # same barcode (same maker only). A missing barcode never matches another missing one.
    owners: dict[str, set[tuple[str, str]]] = {}
    for _, p in items:
        if p.gtin and has_identity(p):
            owners.setdefault(p.gtin, set()).add((p.brand, p.code))
    placed = []
    for lid, p in items:
        owner = owners.get(p.gtin) if p.gtin else None
        if owner and len(owner) == 1 and p.reject is None and not has_identity(p):
            brand, code = next(iter(owner))
            if p.brand is None or re.sub(r"[^a-z0-9]", "", p.brand.lower()) == re.sub(r"[^a-z0-9]", "", brand.lower()):
                p = replace(p, brand=brand, code=code)
        placed.append((lid, p))
    items = placed
    by: dict[tuple[str, str], list[tuple[str, Parsed]]] = {}
    unidentified = []
    # Clustering is first-fit and `compatible` is not transitive (144 Hz ~ unknown ~ 165 Hz), so the order decides
    # which models form. Sorting by id makes it the same on every run, whatever order the sources delivered.
    for lid, p in sorted(items, key=lambda item: item[0]):
        if has_identity(p) and (re.search(r"\d", p.code) or (p.size and p.height)):
            # "Cooler Master" / "Coolermaster" / "COOLER-MASTER" are one maker; the site files a model under its
            # letters and digits only, so two spellings would otherwise be two models with one address.
            by.setdefault((re.sub(r"[^a-z0-9]", "", p.brand.lower()), p.code), []).append((lid, p))
        else:
            unidentified.append(lid)
    models, ambiguous = [], []
    for (_, code), members in by.items():
        brand = min(p.brand for _, p in members)  # one display spelling, the same on every run
        clusters: list[list[tuple[str, Parsed]]] = []
        complete = [m for m in members if m[1].size and m[1].height]
        partial = [m for m in members if not (m[1].size and m[1].height)]
        for m in complete:  # only listings that state size AND resolution start or extend a model
            for c in clusters:
                if all(compatible(m[1], o[1]) for o in c):
                    c.append(m)
                    break
            else:
                clusters.append([m])
        for m in partial:
            fits = [c for c in clusters if all(compatible(m[1], o[1]) for o in c)]
            if len(fits) > 1 and m[1].gtin:  # the one model that holds this barcode, if exactly one does
                fits = [c for c in fits if any(o[1].gtin == m[1].gtin for o in c)] or fits
            if len(fits) == 1:
                fits[0].append(m)
            elif not clusters:
                clusters.append([m])  # nothing to anchor on: the listing is its own (incomplete) model
            else:
                ambiguous.append(m[0])
        models += [(brand, code, [lid for lid, _ in c]) for c in clusters]
    return models, ambiguous, unidentified


SETTLE_REJECTS = ("no-identity", "ambiguous")  # reasons settle() decides; the others come from parse()


# ---- scraper interface (categories.py) -------------------------------------------------------------------

def make_listing(*, source: str, native_id: str, title: str, url: str, price: float,
                 shop_count: int | None, scraped_at: str, specs: str = ""):
    from models import MonitorListing

    title = clean(title)
    if price <= 0:
        return None
    p = parse(title, specs)
    return MonitorListing(
        id=f"{source}:{native_id}", source=source, title=title, url=url, price=round(price, 2),
        shopCount=shop_count, brand=p.brand or "Other", chip="", code=p.code, size=p.size, height=p.height,
        width=p.width, hz=p.hz, panel=p.panel, colour=p.colour, revision=p.revision, scrapedAt=scraped_at,
        reject=p.reject,
    )


def _of(l: dict) -> Parsed:
    page_panel = _panel(fold(l["pgPanel"])) if l.get("pgPanel") else None
    return Parsed(None if l["brand"] == "Other" else l["brand"], l["code"], l["size"] or l.get("pgSize"),
                  l["height"] or l.get("pgHeight"), l["width"] or l.get("pgWidth"), l["hz"] or l.get("pgHz"),
                  l["panel"] or page_panel, l["colour"], l["revision"], l.get("reject"), l.get("gtin"))


def _mode(values):
    """Most common non-empty value; a tie takes the smallest, so a model's name never flips between runs."""
    counts: dict = {}
    for v in values:
        if v is not None:
            counts[v] = counts.get(v, 0) + 1
    return min(counts, key=lambda v: (-counts[v], v)) if counts else None


def _size_label(size: float | None) -> str | None:
    return None if size is None else f'{int(size + 0.5)}"'  # 26.5 -> 27, 31.5 -> 32 whatever the shop rounds to


def settle(listings: list[dict]) -> None:
    """After all sources, before any model key is used: group the listings (`group`), give each model its name
    in `chip` and put what cannot be placed in `reject` ("no-identity" without brand + code, "ambiguous" when
    an unknown size or resolution fits more than one model). Idempotent: it rebuilds from the stored fields."""
    by_id = {l["id"]: l for l in listings}
    for l in listings:  # what an earlier settle decided is decided again below
        if l.get("reject") in SETTLE_REJECTS:
            l["reject"] = None
        l["reject"] = l.get("reject") or rejection_reason(l["title"], size=l.get("size") or l.get("pgSize"))
    parsed = {l["id"]: _of(l) for l in listings}
    models, ambiguous, unidentified = group(list(parsed.items()))
    for lid in unidentified:
        l = by_id[lid]
        l["chip"] = ""
        l["reject"] = l.get("reject") or "no-identity"
    for lid in ambiguous:
        by_id[lid]["chip"] = ""
        by_id[lid]["reject"] = "ambiguous"
    same_code: dict[tuple[str, str], list[tuple[str, str, list[str]]]] = {}
    for m in models:
        same_code.setdefault((m[0], m[1]), []).append(m)
    for (brand, code), ms in same_code.items():
        ms.sort(key=lambda m: min(m[2]))  # a stable order, so numbered names do not swap between runs
        info = []
        for _, _, ids in ms:
            rows = [parsed[i] for i in ids]
            info.append({"size": _size_label(_mode(r.size for r in rows)), "panel": _mode(r.panel for r in rows),
                         "hz": _mode(r.hz for r in rows), "revision": _mode(r.revision for r in rows)})
        names = [f"{brand} {code}"] * len(ms)
        if len(ms) > 1:
            # Only the fields that tell this code's models apart go into the name, in a fixed order.
            fields = [f for f in ("size", "panel", "hz", "revision") if len({i[f] for i in info}) > 1]
            names = []
            for i in info:
                parts = [f"{i[f]}Hz" if f == "hz" and i[f] else i[f] for f in fields if i[f]]
                names.append(" ".join([f"{brand} {code}", *map(str, parts)]))
            total = {n: names.count(n) for n in names}  # counted before any name is changed
            seen: dict[str, int] = {}
            for k, n in enumerate(names):  # still equal after all fields: number them, stable by listing id
                seen[n] = seen.get(n, 0) + 1
                if total[n] > 1:
                    names[k] = f"{n} #{seen[n]}"
        for name, (brand_, code_, ids) in zip(names, ms):
            for i in ids:
                by_id[i]["chip"] = name
                if by_id[i]["brand"] == "Other" or not by_id[i]["code"]:  # placed by its barcode
                    by_id[i]["brand"], by_id[i]["code"] = brand_, code_
    # The site files a model under its letters and digits only (src/lib/slug.ts slugLookup): two different names with
    # one such form would share an address and the build refuses to publish. Number the later one.
    form = lambda name: re.sub(r"[^a-z0-9]", "", name.lower())
    taken: dict[str, str] = {}
    rename: dict[str, str] = {}
    for l in sorted((l for l in listings if l.get("chip")), key=lambda l: l["id"]):
        name = l["chip"]
        if name in rename:
            continue
        final, n = name, 1
        while taken.get(form(final), name) != name:
            n += 1
            final = f"{name} #{n}"
        taken[form(final)] = name
        rename[name] = final
    for l in listings:
        if l.get("chip"):
            l["chip"] = rename[l["chip"]]
