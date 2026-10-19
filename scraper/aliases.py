"""Renamed model keys (scraper/model_aliases.json) and moving their price history to the new key.

When a normalizer change renames models (e.g. RAM kits that gain their speed), the history kept under
the old key would be orphaned. model_aliases.json, code-owned like overrides.json, names the renames:
  {"<cat>": {"<old history key>": "<new history key>", …}, …}
Keys are the category's history keys (categories.py `model_key`; RAM: "<chip> <formFactor>"). An alias is
written only when every listing of the old key moves to that one new key. v2's build reads the same file
to redirect old product addresses.

- Chains collapse (A->B, B->C = A->C); a self-alias or a cycle of any length is an error naming the keys.
- fold_history moves an old key's points into its target once (per day: our own scraped point beats an
  imported `"i": 1` one, between two of the same kind the lower price; merge_history._pick), deletes the
  old key and keeps the newest KEEP points. Running it again changes nothing, so a scrape that fails
  half-way leaves history consistent.
- active() leaves out an alias whose old key has listings again (callers pass every current model key),
  so a recreated model keeps its own history instead of being folded into another one on every run.
- fold_imported moves history_imported.json markers the same way (merge_history._imported_rank).
- merge_history.check counts a point moved to its alias target as present.
"""

import json
from pathlib import Path

import merge_history

PATH = Path(__file__).with_name("model_aliases.json")


class AliasError(ValueError):
    pass


def resolve(raw: dict[str, str]) -> dict[str, str]:
    """{old: final key}, following chains; rejects self-aliases and cycles."""
    out = {}
    for start, target in raw.items():
        path = [start]
        key = target
        while True:
            if key in path:
                kind = "points to itself" if key == start and len(path) == 1 else "cycle"
                raise AliasError(f"model alias {kind}: {' -> '.join(repr(k) for k in path + [key])}")
            if key not in raw:
                break
            path.append(key)
            key = raw[key]
        out[start] = key
    return out


def load(path: Path = PATH) -> dict[str, dict[str, str]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    out = {}
    for cat, raw in data.items():
        try:
            out[cat] = resolve(raw)
        except AliasError as e:
            raise AliasError(f"{path.name} [{cat}]: {e}") from None
    return out


def for_cat(cat: str, path: Path = PATH) -> dict[str, str]:
    return load(path).get(cat, {})


def active(cat: str, model_aliases: dict[str, str], live_keys: set[str]) -> dict[str, str]:
    """The aliases to fold now: an old key that has listings again (a new title recreated it — a speed-less
    RAM kit, say) is a live model of its own, so its history and import marker stay where they are."""
    out = {}
    for old, new in model_aliases.items():
        if old in live_keys:
            print(f"[{cat}] alias {old} -> {new} skipped: {old} has listings again")
        else:
            out[old] = new
    return out


def fold_history(history: dict, aliases: dict[str, str]) -> dict:
    """Moves each aliased key's points into its target (in place; also returned)."""
    for old, new in aliases.items():
        points = history.pop(old, None)
        if not points:
            continue
        days = {p["d"]: p for p in history.get(new, [])}
        for p in points:
            days[p["d"]] = merge_history._pick(days[p["d"]], p) if p["d"] in days else p
        history[new] = [days[d] for d in sorted(days)][-merge_history.KEEP:]
    return history


def fold_imported(done: dict, aliases: dict[str, str]) -> dict:
    """history_imported.json markers follow the alias; the better entry wins (in place; also returned)."""
    for old, new in aliases.items():
        if old not in done:
            continue
        v = done.pop(old)
        done[new] = v if new not in done else max(done[new], v, key=merge_history._imported_rank)
    return done
