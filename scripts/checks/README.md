# Checks

Development checks (not part of the site or the scraper runs). Run from the repo root.

| Check | Command | What it proves |
|---|---|---|
| Live site health | `node scripts/checks/site-check.mjs [url]` | every tab lists products and its photos load, product details have links + chart + photo, the builder offers parts (Quick list picker and Guided cards), text pages render, data/photo files have the right cache headers (only on Vercel), **the newest data is under 12 h old** (scrapes run every 6 h; fails when scheduled runs are failing), **every source of every category under 24 h old** (warns over 12 h; `source-age.mjs`, backlog #8) |
| Layout audit | `npx vite preview --port 4199` then `node scripts/checks/layout-audit.mjs http://localhost:4199 <outDir> [pages] [widths]` (`SHOTS=1` saves screenshots) | no element wider than its box / the screen, at the given widths (default 1920,1366,768,360), el/en, light/dark, with product details, the phone filter sheet, the guided builder walked through every step (`builder`) and a full Quick list build (`builder?mode=quick`) |
| History merge rules | `venv/Scripts/python scripts/checks/test_merge_history.py` | `scraper/merge_history.py` (3-way merge, own point beats imported, 365-point trim, guard), `site_history.merge`, `main.update_history` |
| Normalizer unit tests | `venv/Scripts/python scripts/checks/test_normalize_ram.py` (and `test_normalize_mobo.py`) | real shop titles → the expected model/fields: RAM kits written without "GB", DDR type from part numbers, server DIMMs; boards' E-ATX size and DDR4/DDR5 variants (v2 audit S1 fixes D-03/D-04/D-05) |
| Normalizer before/after | `venv/Scripts/python scripts/checks/renormalize_diff.py <cat> <module> [REF]` | runs the committed (`REF`, default HEAD) and the working-copy normalizer over every title + URL in `latest.json` (offline) and lists the listings whose model or fields change — run it before committing a normalizer change |
| History incident replay | `venv/Scripts/python scripts/checks/test_history_git.py` | with real git: the old commit step loses an import (2026-09-30 incident), the new one keeps it; reverse order, push race, guard, `--allow-shrink` |
| Derived data = full data | `npx tsx scripts/checks/data-equivalence.test.mts` | `list.json` / `builder.json` give the same models, prices, sales, all-time lows, week changes and builder options as the scraper's full files |
| Per-source data age | `npx tsx scripts/checks/source-age.test.mts` | `source-age.mjs`: ok / warn over 12 h / fail over 24 h or never updated, per category × source (incl. the 2026-10-04 Skroutz storage case, 35.1 h) |
| Request counts in the run log | `venv/Scripts/python scripts/checks/test_http_stats.py` | `http_client` counts every request per label (`<cat>/<source>`, `<cat>/shipping`, `specs/<site>`, `makers/<maker>`): requests, blocked (403/429/5xx/challenge), errors; the run log prints `[timing]` lines per category and phase (speed plan step 0, measurement only) |
| Build publishing check | `npm run build`, then `npx tsx scripts/checks/data-check.test.mts` | `derive.checkData`: empty category, >30% drop (models, listings, history points), builder slots |
| PC builder data coverage | `npx tsx scripts/checks/builder-coverage.mts [--save f.json] [--compare f.json]` | per builder slot and field (lengths, clearances, sockets, fan/radiator details…), how many models have it, overall and for the most-listed quarter; snapshots per phase in `coverage/` |
| Lighthouse | `npx lighthouse@12 <url>/#gpu --output=json --output-path=<dir>/x-gpu-mobile.json` (add `--preset=desktop`), then `node scripts/checks/lighthouse-summary.mjs <dir> x` | scores, LCP/CLS/FCP, bytes downloaded, which data files load |

The browser checks need Chrome installed; they use ports 9333 (layout audit) and 9345 (site check).
