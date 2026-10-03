"""Helpers shared by the maker modules: reading case fan/radiator texts written per position.

Makers write them like "Top: 3 x 120mm / 2 x 140mm  Front: 3 x 120mm  Rear: 1 x 120mm" or
"Top: 120mm × 3 or 140mm × 2Side: 120mm × 3" (count before or after the size), radiators as
"Front: 360 / 280 / 240mm  Top: 360mm × 1 or 280mm × 1*Total max thickness: 87.5mm".
"""

import re

from categories import CATEGORIES

POSITIONS = [
    (re.compile(r"^(?:top|roof)", re.I), "top"),
    (re.compile(r"^front", re.I), "front"),
    (re.compile(r"^(?:rear|back)", re.I), "rear"),
    (re.compile(r"^(?:side|right|left)", re.I), "side"),  # Thermaltake: "Right (M/B side)"
    (re.compile(r"^(?:bottom|floor|psu\s*(?:cover|shroud|chamber)|power\s*cover)", re.I), "bottom"),
]
# "Top:", "PSU Cover:", "PCIe Fan Bracket:", "On Drive Cage:" … (labels not in POSITIONS are skipped,
# but still end the part before them). Only known words, since labels follow values directly
# ("… 2 x 140mm PSU Cover: …").
LABEL = re.compile(
    r"(?:(?<![A-Za-z])|(?<=mm))(Top|Roof|Front|Rear|Back|Side|Right|Left|Bottom|Floor|PSU\s*(?:Cover|Shroud|Chamber)|"
    r"Power\s*Cover|PCIe[A-Za-z ]{0,20}?|(?:On\s+)?Drive\s*Cage|Motherboard\s*Tray|Mid[A-Za-z ]{0,12}?|Internal|"
    r"Behind[A-Za-z ]{0,20}?)\s*(?:\([^)]{0,60}\))?\s*[:：]",
    re.I,
)
PAIR = re.compile(r"(\d{1,2})\s*[x×]\s*(\d{2,3})\s*mm|(\d{2,3})\s*mm\s*[x×]\s*(\d{1,2})(?!\d)", re.I)
# "2 X 120/140mm": the same count of either size.
PAIR_EITHER = re.compile(r"(\d{1,2})\s*[x×]\s*(\d{2,3})\s*/\s*(\d{2,3})\s*mm", re.I)
RADIATOR = re.compile(r"(?<!\d)(120|140|240|280|360|420|480)(?!\d)")
FAN_SIZES = {80, 92, 120, 140, 160, 180, 200}


def fetch(s, url: str) -> str:
    """A catalogue file (sitemap); an HTTP error raises, so makers.collect logs "catalogue failed"
    instead of an empty catalogue (Thermaltake's sitemap answered 404 for a while on 2026-10-02)."""
    r = s.get(url, timeout=60)
    r.raise_for_status()
    return r.text


def alnum(text: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def by_position(text: str) -> list[tuple[str, str]]:
    """[(position, text)] for each "<label>: …" part whose label is a case position."""
    out = []
    marks = list(LABEL.finditer(text))
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        body = text[m.end():end]
        body = re.sub(r"\([^)]*\)", " ", body.split("*")[0])  # notes: "(Not compatible with …)", "*Total max …"
        label = m.group(1).strip()
        pos = next((p for pattern, p in POSITIONS if pattern.search(label)), None)
        if pos:
            out.append((pos, body))
    return out


def fans(text: str) -> list[dict] | None:
    """Fan positions per size: [{pos, size, n}] (alternatives "3 x 120 / 2 x 140" are separate
    entries; the same position and size twice keeps the larger count)."""
    found: dict[tuple[str, int], int] = {}
    for pos, body in by_position(text):
        pairs = [(int(m.group(1)), int(m.group(s))) for m in PAIR_EITHER.finditer(body) for s in (2, 3)]
        body = PAIR_EITHER.sub(" ", body)
        pairs += [(int(m.group(1)), int(m.group(2))) if m.group(1) else (int(m.group(4)), int(m.group(3)))
                  for m in PAIR.finditer(body)]
        for n, size in pairs:
            if size in FAN_SIZES and n > 0:
                found[(pos, size)] = max(found.get((pos, size), 0), n)
    return [{"pos": p, "size": s, "n": n} for (p, s), n in found.items()] or None


def included_fans(text: str) -> list[dict] | None:
    """Fans in the box: [{pos, size, n}], pos null when the maker doesn't say where."""
    per_pos = fans(text)
    if per_pos:
        return per_pos
    found = [{"pos": None, "size": int(m.group(2) or m.group(3)), "n": int(m.group(1) or m.group(4))}
             for m in PAIR.finditer(text)]
    return [f for f in found if f["size"] in FAN_SIZES] or None


# A maker saying the case comes without fans ("None", "N/A", "No fans included", "-").
NO_FANS = re.compile(r"^\s*(?:none|n\s*/\s*a|no(?:\s+fans?(?:\s+included)?)?|not\s+included|without\s+fans?|[-–—]|0)\s*\.?\s*$", re.I)


def included(text: str | None) -> list[dict] | None:
    """Fans in the box from a maker's field: [] when the maker says none, None when it doesn't say."""
    if not text or not text.strip():
        return None
    if NO_FANS.match(text):
        return []
    return included_fans(text)


def radiators(text: str) -> list[dict] | None:
    """Radiator sizes per position: [{pos, sizes}]. "Supports up to 360mm" also takes the smaller
    radiators of the same fan width (240, 120)."""
    out = []
    for pos, body in by_position(text):
        sizes = {int(x) for x in RADIATOR.findall(body)}
        if re.search(r"up\s+to", body, re.I):
            for top in list(sizes):
                step = 140 if top % 140 == 0 and top % 120 else 120
                sizes |= set(range(step, top, step))
        if sizes:
            out.append({"pos": pos, "sizes": sorted(sizes)})
    return out or None


def model_key(cat: str, title: str) -> str | None:
    """The model key a maker's product title gets from our own normalizer — the same key the shops'
    listings of that product are grouped by ("Thermaltake View 380 TG ARGB Mid Tower Chassis" ->
    "thermaltakeview380"). None when the normalizer doesn't recognise it."""
    cfg = CATEGORIES[cat]
    l = cfg.make_listing(source="maker", native_id="0", title=title, url="", price=1.0, shop_count=None, scraped_at="")
    return cfg.model_key(l.to_dict()) if l else None


def mm(text: str | None) -> float | None:
    m = re.search(r"(\d+(?:\.\d+)?)\s*mm", text or "", re.I)
    return float(m.group(1)) if m else None


def number(text: str | None, unit: str) -> float | None:
    m = re.search(rf"(\d+(?:\.\d+)?)\s*{unit}", text or "", re.I)
    return float(m.group(1)) if m else None
