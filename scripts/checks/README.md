# Checks

Development checks (not part of the site or the scraper runs). Run from the repo root.

| Check | Command | What it proves |
|---|---|---|
| Live site health | `node scripts/checks/site-check.mjs [url]` | every tab lists products and its photos load, product details have links + chart + photo, the builder offers parts (Quick list picker and Guided cards), text pages render, data/photo files have the right cache headers (only on Vercel) |
| Layout audit | `npx vite preview --port 4199` then `node scripts/checks/layout-audit.mjs http://localhost:4199 <outDir> [pages] [widths]` (`SHOTS=1` saves screenshots) | no element wider than its box / the screen, at the given widths (default 1920,1366,768,360), el/en, light/dark, with product details, the phone filter sheet, the guided builder walked through every step (`builder`) and a full Quick list build (`builder?mode=quick`) |
| History merge rules | `venv/Scripts/python scripts/checks/test_merge_history.py` | `scraper/merge_history.py` (3-way merge, own point beats imported, 365-point trim, guard), `site_history.merge`, `main.update_history` |
| History incident replay | `venv/Scripts/python scripts/checks/test_history_git.py` | with real git: the old commit step loses an import (2026-09-30 incident), the new one keeps it; reverse order, push race, guard, `--allow-shrink` |
| Derived data = full data | `npx tsx scripts/checks/data-equivalence.test.mts` | `list.json` / `builder.json` give the same models, prices, sales, all-time lows, week changes and builder options as the scraper's full files |
| Build publishing check | `npm run build`, then `npx tsx scripts/checks/data-check.test.mts` | `derive.checkData`: empty category, >30% drop (models, listings, history points), builder slots |
| PC builder data coverage | `npx tsx scripts/checks/builder-coverage.mts [--save f.json] [--compare f.json]` | per builder slot and field (lengths, clearances, sockets, fan/radiator details…), how many models have it, overall and for the most-listed quarter; snapshots per phase in `coverage/` |
| Lighthouse | `npx lighthouse@12 <url>/#gpu --output=json --output-path=<dir>/x-gpu-mobile.json` (add `--preset=desktop`), then `node scripts/checks/lighthouse-summary.mjs <dir> x` | scores, LCP/CLS/FCP, bytes downloaded, which data files load |

The browser checks need Chrome installed; they use ports 9333 (layout audit) and 9345 (site check).
