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
python -m venv venv && venv/Scripts/pip install -r scraper/requirements.txt   # curl_cffi + selectolax, no browser
venv/Scripts/python scraper/main.py                     # all sources (~2 min, ~50 requests)
venv/Scripts/python scraper/main.py --only bestprice --debug   # one source, dump HTML to scraper/debug/
```

## File map
- `scraper/models.py` — `Listing` dataclass (the one shared schema)
- `scraper/http_client.py` — curl_cffi Chrome-impersonating session, polite sleep, `parse_price`, debug dumps
- `scraper/normalize.py` — title → brand/chip/vram/partner (regex tables); unmatched titles dropped. VRAM falls back to the URL slug. Workstation chips: `RTX PRO n`, `RTX An`, `RTX n Ada`, `RTX n (Pro)`, `Tn`
- `scraper/sources/<name>.py` — each exposes `fetch() -> list[Listing]`; registered in `main.py` `SOURCES`
- `scraper/main.py` — runs sources isolated, keeps previous data for a source that returns 0, writes JSON
- `src/types.ts` — TS mirror of JSON schema; `src/lib/data.ts` — load, group by model (chip+VRAM), filters, tier sort, gaming/workstation split
- `src/lib/sources.ts` — per-source label/colour
- `src/components/*` — FilterBar, ModelTable/ModelRow (expandable: all listings + chart), PriceChart (lazy-loaded recharts), SourceBadge
- `.github/workflows/scrape.yml` — cron + `workflow_dispatch`, commits data with `contents: write`

## JSON schemas
- `latest.json`: `{updatedAt, sources: {name: {count, ok, updatedAt}}, listings: Listing[]}`
- `Listing`: `{id: 'source:nativeId', source, title, url, price, shopCount: number|null, brand: NVIDIA|AMD|Intel, chip, vram, partner, scrapedAt}`
- `history.json`: `{ [model]: [{d: 'YYYY-MM-DD', min, source}] }` — model = `"<chip> <vram>GB"` (`model_key` in main.py = `modelKey` in data.ts); one point per model per day (min across runs), 365 days kept.

## Deploy (Vercel)
- Project `gpu-prices-gr` (Hobby, linked via `vercel link`, Git-connected → every push to `main` deploys).
- **Commit author must map to the owner's GitHub account** or Vercel Hobby marks the deploy "Blocked" (CLI deploys too). Repo-local git identity = `TeoAmpatzis <189219701+TeoAmpatzis@users.noreply.github.com>`; the scrape workflow commits with the same identity. Don't switch it back to `github-actions[bot]`.

## Adding a source
1. `scraper/sources/foo.py` with `fetch() -> list[Listing]` (use `normalize.make_listing`).
2. Add to `SOURCES` in `main.py`; add colour/label in `src/lib/sources.ts`.

## Scraping notes / pitfalls
- **Anti-bot**: plain curl → Skroutz Cloudflare "Just a moment" 403, BestPrice TLS connection reset. `curl_cffi` with `impersonate="chrome"` passes both, locally and from GitHub Actions runners (verified 2026-09-29). Headless Playwright is *blocked* on BestPrice — don't go back to it.
- **Skroutz**: `https://www.skroutz.gr/c/55/kartes-grafikwn.html?page=N`, 60 cards/page (~12 real pages). Cards `li.card[data-skuid]`, title `a.sku-card-title-link[title]`, price `a.sku-link` text — can be a range `"740,10 € - 757,90 €"` (take first). No shop count on cards. Out-of-range pages return the last page again → stop when no new IDs. Sponsored cards duplicate products (dedupe by skuid). Titles often omit VRAM; the slug has it.
- **BestPrice**: `https://www.bestprice.gr/cat/2613/kartes-grafikwn.html`, 16 cards/page (~36 pages). `?pg=N` GET is ignored (always page 1). Pages 2+ = multipart POST to the same URL with `fromPagination=1`, `pg=N` and headers `X-PAGINATION: true`, `X-BP-PAGE: 1`, `X-GID: <"guestId" from page 1 HTML>`. Cards `div.p[data-id]`, `data-price` in cents, title `.p__title a[title]` (may end in "Κάρτα Γραφικών <SKU>"), shops `.p__merchants`. Total pages in embedded `"pagination":{"totalPages":N,...}`.

## Status / TODO
- [x] Scaffold
- [x] Scrapers (Skroutz, BestPrice) + normalize — ~1050 listings, ~90 models
- [x] GitHub Actions cron (`17 */6 * * *`) — first run green
- [x] Frontend: filters, model table, source badges, 7-day change, history chart
- [x] Vercel: linked + Git-connected (see Deploy)
- [ ] Ideas: per-partner filter, price-drop highlights, URL-synced filters, merge identical products across sources
