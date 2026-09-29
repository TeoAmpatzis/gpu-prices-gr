# CLAUDE.md — GPU Prices GR (reference sheet)

Read this first; it is kept current so you don't need to re-explore the repo.

## What & rules
- Static site listing **GPU prices in the Greek market** from aggregators **Skroutz** + **BestPrice**. GPUs only, Greece only.
- **€0/month is a hard rule**: no paid APIs/SaaS. Free tiers only (GitHub Actions, Vercel Hobby).
- Private repo: `github.com/TeoAmpatzis/gpu-prices-gr`. Owner deploys on Vercel (Vite preset, output `dist`).
- UI text in Greek. Icons: `lucide-react` only. Strict TS; `npm run build` is the only check (no tests/lint).
- Git: conventional commits, commit + push after each unit of work, stage files explicitly, never commit `node_modules/ dist/ venv/ .env`.

## Data flow
`GitHub Actions cron (6h)` → `python scraper/main.py` → writes `public/data/latest.json` + `history.json` → commit/push → Vercel redeploys → React app fetches `/data/*.json`.

## Commands
```bash
npm install && npm run dev            # site on :5174
npm run build                         # tsc + vite build (gate before commit)
pip install -r scraper/requirements.txt && playwright install chromium
python scraper/main.py                # all sources
python scraper/main.py --only bestprice --debug   # one source, dump HTML to scraper/debug/
```

## File map
- `scraper/models.py` — `Listing` dataclass (the one shared schema)
- `scraper/normalize.py` — title → brand/chip/vram/partner (regex tables); unmatched titles dropped
- `scraper/sources/<name>.py` — each exposes `fetch() -> list[Listing]`; registered in `main.py` `SOURCES`
- `scraper/main.py` — runs sources isolated, keeps previous data for a source that returns 0, writes JSON
- `src/types.ts` — TS mirror of JSON schema; `src/lib/data.ts` — load + group by chip + filters
- `src/components/*` — FilterBar, ModelTable/ModelRow (cheapest + source badge), PriceChart
- `.github/workflows/scrape.yml` — cron + `workflow_dispatch`, commits data with `contents: write`

## JSON schemas
- `latest.json`: `{updatedAt, sources: {name: {count, ok, updatedAt}}, listings: Listing[]}`
- `Listing`: `{id, source, title, url, price, shopCount, brand: NVIDIA|AMD|Intel, chip, vram, partner, scrapedAt}`
- `history.json`: `{ [chip]: [{d: 'YYYY-MM-DD', min, source}] }` — one point per chip per day (min).

## Adding a source
1. `scraper/sources/foo.py` with `fetch() -> list[Listing]` (use `normalize.make_listing`).
2. Add to `SOURCES` in `main.py`; add colour/label in `src/lib/sources.ts`.

## Scraping notes / pitfalls
- (filled in as learned — URLs, selectors, anti-bot behaviour)

## Status / TODO
- [x] Scaffold
