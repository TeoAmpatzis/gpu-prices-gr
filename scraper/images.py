"""Product photos: one per model, downloaded once, stored as WebP in the images repo.

Runs in the images repo's own workflow (github.com/TeoAmpatzis/builddraft-images,
.github/workflows/images.yml), never inside the price scrape, with the main repo checked out:

  python <main>/scraper/images.py --data <main>/public/data --out <images repo> [--budget 3000]

- Candidates: public/data/<cat>/image_urls.json (written by main.write_image_urls from the pages
  the scrape already fetched; best first: BestPrice 500px, Shopflix 530px, Skroutz, Snif).
- Each model without a photo gets the first candidate that downloads and opens (http_client.get, with
  its own retry allowance), as img/<cat>/<id>-96.webp and -320.webp: contained in a white square.
  <id> = model_id(): the first 12 hex digits of sha1("<cat>\\0<model key>"), the same in
  src/lib/images.ts. index.json records {id: {"c": cat, "s": source, "d": date}}.
- blocklist.json (removal requests): a listed model is never downloaded, and its files and index
  entry are deleted on the next run. Entries: {"cat": "gpu", "model": "<model key>", "reason": ...}
  or {"id": "<id>"}.
- A model whose candidates all fail is retried after RETRY_FAILED_DAYS (failed.json).
"""

import argparse
import hashlib
import io
import json
import random
import sys
import time
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image

import http_client as http
from categories import CATEGORIES

SIZES = (96, 320)
QUALITY = 80
PAUSE = (0.3, 0.7)  # seconds between downloads (image CDNs, not the shops' pages)
RETRY_FAILED_DAYS = 7


def model_id(cat: str, key: str) -> str:
    return hashlib.sha1(f"{cat}\0{key}".encode("utf-8")).hexdigest()[:12]


def source_of(url: str) -> str:
    host = urlparse(url).netloc
    for name, part in (("bestprice", "pstatic.gr"), ("skroutz", "scdn.gr"), ("shopflix", "shopflix.gr")):
        if part in host:
            return name
    return "snif"  # the selling shop's own server, via Snif


def square_webp(raw: bytes, size: int) -> bytes:
    """Contained in a white square (shop photos are on white), WebP, no metadata."""
    img = Image.open(io.BytesIO(raw))
    img.load()
    img = img.convert("RGBA")
    img.thumbnail((size, size), Image.LANCZOS)
    bg = Image.new("RGB", (size, size), "white")
    bg.paste(img, ((size - img.width) // 2, (size - img.height) // 2), img)
    out = io.BytesIO()
    bg.save(out, "WEBP", quality=QUALITY, method=6)
    return out.getvalue()


def write_sizes(raw: bytes, out_dir: Path, name: str) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    files = {size: square_webp(raw, size) for size in SIZES}  # convert both before writing either
    for size, data in files.items():
        (out_dir / f"{name}-{size}.webp").write_bytes(data)


def load(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")


def blocked_ids(blocklist: list[dict]) -> set[str]:
    out = set()
    for e in blocklist:
        if e.get("id"):
            out.add(e["id"])
        elif e.get("cat") and e.get("model"):
            out.add(model_id(e["cat"], e["model"]))
    return out


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) == 4 and sys.argv[1] == "--id":  # images.py --id gpu "RTX 5060 8GB" -> its photo id
        print(model_id(sys.argv[2], sys.argv[3]))
        return 0
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, type=Path, help="the main repo's public/data")
    ap.add_argument("--out", required=True, type=Path, help="the images repo")
    ap.add_argument("--budget", type=int, default=3000, help="new photos per run")
    args = ap.parse_args()
    out: Path = args.out
    index = load(out / "index.json", {})
    failed = load(out / "failed.json", {})
    blocked = blocked_ids(load(out / "blocklist.json", []))
    today = date.today().isoformat()
    s = http.session()

    # Removal requests first: delete any blocked model's files and index entry.
    for mid in sorted(blocked & set(index)):
        cat = index.pop(mid)["c"]
        for size in SIZES:
            (out / "img" / cat / f"{mid}-{size}.webp").unlink(missing_ok=True)
        print(f"removed {cat}/{mid} (blocklist)")

    todo = []
    for cat in CATEGORIES:
        urls = load(args.data / cat / "image_urls.json", {})
        for key, candidates in urls.items():
            mid = model_id(cat, key)
            if mid in index or mid in blocked:
                continue
            if mid in failed and failed[mid] > (date.today() - timedelta(days=RETRY_FAILED_DAYS)).isoformat():
                continue
            todo.append((cat, key, mid, candidates))
    print(f"{len(index)} photos stored, {len(todo)} models without one, {len(blocked)} blocked; budget {args.budget}")

    done = 0
    for cat, key, mid, candidates in todo[: args.budget]:
        for url in candidates:
            try:
                time.sleep(random.uniform(*PAUSE))
                raw = http.get(s, url).content
                write_sizes(raw, out / "img" / cat, mid)
            except Exception as e:  # unreachable, not an image…: try the next candidate
                print(f"  {cat} {key[:40]}: {type(e).__name__} {str(e)[:80]} ({url[:70]})")
                continue
            index[mid] = {"c": cat, "s": source_of(url), "d": today}
            failed.pop(mid, None)
            done += 1
            break
        else:
            failed[mid] = today
        if done and done % 200 == 0:
            dump(out / "index.json", index)  # keep progress if the job is stopped
            print(f"  {done} new photos")
    dump(out / "index.json", index)
    dump(out / "failed.json", failed)
    print(f"done: {done} new photos, {len(index)} in total, {len(failed)} models without a usable photo")
    return 0


if __name__ == "__main__":
    sys.exit(main())
