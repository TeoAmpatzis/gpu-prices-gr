"""Offline normalizer replay: <cat> <module> [REF=HEAD].
Monitor options: --snapshot PATH --evidence-dir DIR --list-specs PATH --report PATH.
List specs: JSON object mapping source IDs to original list-card text. Missing text
prevents proof of original ingestion and exact grouping equivalence.
Other categories keep the existing title/URL comparison.
"""
import argparse
import importlib.util
import json
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scraper"))
FIELDS = ["chip", "type", "capacity", "modules", "speed", "formFactor", "socket", "chipset", "memory",
          "radiator", "size", "pack", "media", "iface", "tier"]  # media / iface / tier: storage
MONITOR_FIELDS = ["reject", "chip", "brand", "code", "size", "width", "height", "hz", "panel", "colour", "revision",
                  "pgSize", "pgWidth", "pgHeight", "pgHz", "pgPanel", "gtin"]
OBSERVATIONS = ("size", "width", "height", "hz", "panel")


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod  # dataclasses resolves its defining module during exec_module.
    spec.loader.exec_module(mod)
    return mod


def git_show(ref, path):
    return subprocess.run(["git", "show", f"{ref}:{path}"], capture_output=True, text=True,
                          encoding="utf-8", check=True).stdout


def replay_monitor(mod, stored, evidence_dir, *, baseline, list_specs=None):
    """Replay equal inputs and cached pages before settlement; never change stored rows.

    Missing original list-spec text is a limitation. Preserve stored observations only where the
    baseline title parser could not supply them. Never restore removed title-derived false positives.
    This fallback preserves observations but cannot prove original ingestion equivalence.
    """
    import specs

    list_specs = list_specs or {}
    rows = []
    for item in stored:
        source, native = item["id"].split(":", 1)
        out = mod.make_listing(source=source, native_id=native, title=item["title"], url=item["url"],
                               price=item["price"], shop_count=item.get("shopCount"),
                               scraped_at=item.get("scrapedAt", ""), specs=list_specs.get(item["id"], ""))
        if out is None:
            continue
        row = out.to_dict()
        row.update({k: v for k, v in item.items() if k.startswith("pg") or k == "gtin"})
        if item["id"] not in list_specs:
            parsed = baseline.parse(item["title"])
            for field in OBSERVATIONS:
                if row.get(field) is None and getattr(parsed, field) is None:
                    row[field] = item.get(field)
        rows.append(row)
    specs.apply("monitor", evidence_dir, rows)
    mod.settle(rows)
    return rows


def monitor_changes(old_rows, new_rows):
    """Match source IDs, including added/dropped rows; never zip filtered rows."""
    old = {r["id"]: r for r in old_rows}
    new = {r["id"]: r for r in new_rows}
    changes = []
    for lid in sorted(old.keys() | new.keys()):
        a = {f: old[lid].get(f) for f in MONITOR_FIELDS} if lid in old else None
        b = {f: new[lid].get(f) for f in MONITOR_FIELDS} if lid in new else None
        if a != b:
            fields = [f for f in MONITOR_FIELDS if a and b and a[f] != b[f]]
            changes.append({"id": lid, "title": (new.get(lid) or old[lid])["title"],
                            "fields": fields, "old": a, "new": b})
    return changes


def monitor_report(stored, old_rows, new_rows, list_specs):
    changes = monitor_changes(old_rows, new_rows)
    before = {r["id"]: r for r in old_rows}
    after = {r["id"]: r for r in new_rows}
    accepted = lambda r: bool(r and not r.get("reject") and r.get("chip"))
    renames = [{"id": lid, "old": before[lid]["chip"], "new": r["chip"]}
               for lid, r in sorted(after.items()) if accepted(r) and accepted(before.get(lid))
               and before[lid]["chip"] != r["chip"]]
    targets = defaultdict(set)
    for lid, row in before.items():
        if accepted(row) and accepted(after.get(lid)):
            targets[row["chip"]].add(after[lid]["chip"])
    return {
        "inputRows": len(stored), "sources": dict(Counter(r["id"].split(":", 1)[0] for r in stored)),
        "missingOriginalListSpecs": sorted(r["id"] for r in stored if r["id"] not in list_specs),
        "limitation": "Absent original list-spec text falls back to stored observations only where the baseline "
                      "title parse was unknown. This cannot prove original ingestion, retained observation changes, "
                      "or exact grouping equivalence.",
        "oldAccepted": sum(accepted(r) for r in old_rows), "newAccepted": sum(accepted(r) for r in new_rows),
        "oldModels": len({r["chip"] for r in old_rows if accepted(r)}),
        "newModels": len({r["chip"] for r in new_rows if accepted(r)}),
        "oldAcceptedSources": dict(Counter(r["id"].split(":", 1)[0] for r in old_rows if accepted(r))),
        "newAcceptedSources": dict(Counter(r["id"].split(":", 1)[0] for r in new_rows if accepted(r))),
        "newRejectReasons": dict(Counter(r["reject"] for r in new_rows if r.get("reject"))),
        "newlyRejected": [{"id": lid, "title": r["title"], "reason": r["reject"], "oldKey": before[lid]["chip"]}
                          for lid, r in sorted(after.items()) if r.get("reject") and accepted(before.get(lid))],
        "acceptedKeyChanges": renames,
        "conflicts": {key: sorted(values) for key, values in sorted(targets.items()) if len(values) > 1},
        "affectedHistoryKeys": sorted({c["old"]["chip"] for c in changes if c["old"] and c["old"]["chip"]}),
        "changes": changes,
    }


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cat")
    parser.add_argument("module")
    parser.add_argument("ref", nargs="?", default="HEAD")
    for name in ("snapshot", "evidence-dir", "list-specs", "report"):
        parser.add_argument("--" + name, type=Path)
    args = parser.parse_args(argv)
    src = f"scraper/normalize_{args.module}.py"
    with tempfile.TemporaryDirectory() as temp:
        old_path = Path(temp) / f"old_normalize_{args.module}.py"
        old_path.write_text(git_show(args.ref, src), encoding="utf-8")
        names_path = Path(temp) / "old_names.py"
        names_path.write_text(git_show(args.ref, "scraper/names.py"), encoding="utf-8")
        sys.modules["names"] = load("names", names_path)
        old = load(f"old_{args.module}", old_path)
        sys.modules["names"] = load("names", ROOT / "scraper/names.py")
        new = load(f"new_{args.module}", ROOT / src)
        snapshot = args.snapshot or ROOT / f"public/data/{args.cat}/latest.json"
        listings = json.loads(snapshot.read_text(encoding="utf-8"))["listings"]
        if args.cat == "monitor":
            evidence = args.evidence_dir or snapshot.parent
            list_specs = json.loads(args.list_specs.read_text(encoding="utf-8")) if args.list_specs else {}
            a = replay_monitor(old, listings, evidence, baseline=old, list_specs=list_specs)
            b = replay_monitor(new, listings, evidence, baseline=old, list_specs=list_specs)
            report = monitor_report(listings, a, b, list_specs)
            print(f"monitor: {len(listings)} listings; accepted {report['oldAccepted']} -> {report['newAccepted']}; "
                  f"models {report['oldModels']} -> {report['newModels']}; {len(report['changes'])} changed")
            print(f"Missing original list-spec text: {len(report['missingOriginalListSpecs'])}. {report['limitation']}")
            print(f"Sources: {report['sources']}; accepted key changes: {len(report['acceptedKeyChanges'])}; "
                  f"conflicts: {len(report['conflicts'])}")
            for change in report["changes"]:
                print(json.dumps(change, ensure_ascii=False))
            if args.report:
                args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            return 0

        make = {"fan": "make_fan_listing", "cooler": "make_cooler_listing"}.get(args.cat, "make_listing")

        def run(mod, item):
            source, native = item["id"].split(":", 1)
            out = getattr(mod, make)(source=source, native_id=native, title=item["title"], url=item["url"],
                                    price=item["price"], shop_count=item.get("shopCount"),
                                    scraped_at=item.get("scrapedAt", ""))
            return None if out is None else {f: getattr(out, f, None) for f in FIELDS}

        changed, examples = Counter(), []
        for item in listings:
            a, b = run(old, item), run(new, item)
            if a == b:
                continue
            what = "dropped" if b is None else "added" if a is None else ",".join(f for f in FIELDS if a.get(f) != b.get(f))
            changed[what] += 1
            if len(examples) < 25:
                examples.append(f"  {item['id']} | {item['title'][:80]}\n      {a and a['chip']} "
                                f"[{a and a.get('formFactor')}] -> {b and b['chip']} [{b and b.get('formFactor')}]")
        print(f"{args.cat}: {len(listings)} listings, {sum(changed.values())} change ({args.ref} -> working copy)")
        for key, count in changed.most_common():
            print(f"  {count:5}  {key}")
        print("\n".join(examples))
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
