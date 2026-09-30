"""Render the brand images into public/ with headless Chrome + Pillow (run by hand after a design change).

  venv/Scripts/pip install Pillow      # local only, not a scraper dependency
  venv/Scripts/python scripts/brand/render.py

Outputs: favicon-32.png, icon-512.png (rounded, from public/favicon.svg), apple-touch-icon.png
(180px, square: iOS rounds the corners itself) and og.png (1200x630, from og.html).
Headless Chrome can't make windows narrower than ~500px, so icons are rendered at 512 and scaled down.
"""

import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")


def screenshot(html: Path, out: Path, width: int, height: int) -> None:
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={width},{height}",
         "--virtual-time-budget=5000", f"--screenshot={out}", html.as_uri()],
        check=True, capture_output=True,
    )


def icon_page(square: bool) -> str:
    svg = (PUBLIC / "favicon.svg").read_text(encoding="utf-8")
    if square:
        svg = svg.replace('rx="8"', 'rx="0"')
    svg = svg.replace("<svg ", '<svg width="512" height="512" ', 1)
    return f'<!doctype html><html><body style="margin:0;background:transparent">{svg}</body></html>'


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for square, outputs in ((False, {"icon-512.png": 512, "favicon-32.png": 32}), (True, {"apple-touch-icon.png": 180})):
            page = tmp / f"icon-{square}.html"
            page.write_text(icon_page(square), encoding="utf-8")
            big = tmp / f"icon-{square}.png"
            screenshot(page, big, 512, 512)
            img = Image.open(big).convert("RGBA").crop((0, 0, 512, 512))
            if not square:
                # Chrome paints the page background white: keep only the rounded square.
                mask = Image.new("L", (512, 512), 0)
                ImageDraw.Draw(mask).rounded_rectangle((0, 0, 511, 511), radius=128, fill=255)
                img.putalpha(mask)
            for name, size in outputs.items():
                img.resize((size, size), Image.LANCZOS).save(PUBLIC / name, optimize=True)
        screenshot(Path(__file__).with_name("og.html"), PUBLIC / "og.png", 1200, 630)
        og = Image.open(PUBLIC / "og.png").convert("RGB").crop((0, 0, 1200, 630))
        og.save(PUBLIC / "og.png", optimize=True)
    for name in ("favicon-32.png", "icon-512.png", "apple-touch-icon.png", "og.png"):
        with Image.open(PUBLIC / name) as im:
            print(f"{name}: {im.size[0]}x{im.size[1]}, {(PUBLIC / name).stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
