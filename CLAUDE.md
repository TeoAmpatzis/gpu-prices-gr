# CLAUDE.md — GPU/CPU Prices GR (reference sheet)

Read this first; it is kept current so you don't need to re-explore the repo.

## What & rules
- Static site listing **GPU and CPU prices in the Greek market** from aggregators **Skroutz** + **BestPrice**. Greece only. Two tabs (`#gpu`, `#cpu`), light/dark theme toggle.
- **€0/month is a hard rule**: no paid APIs/SaaS. Free tiers only (GitHub Actions, Vercel Hobby).
- Private repo: `github.com/TeoAmpatzis/gpu-prices-gr`. Owner deploys on Vercel (Vite preset, output `dist`).
- UI text in Greek. Icons: `lucide-react` only. Strict TS; `npm run build` is the only check (no tests/lint).
- Git: conventional commits, commit + push after each unit of work, stage files explicitly, never commit `node_modules/ dist/ venv/ .env`.

## Data flow
`GitHub Actions cron (6h)` → `python scraper/main.py` → for each category writes `public/data/<gpu|cpu>/latest.json` + `history.json` → commit/push → Vercel redeploys → React app fetches `/data/<cat>/*.json`.

## Commands
```bash
npm install && npm run dev            # site on :5174
npm run build                         # tsc + vite build (gate before commit)
python -m venv venv && venv/Scripts/pip install -r scraper/requirements.txt   # curl_cffi + selectolax, no browser
venv/Scripts/python scraper/main.py                     # all categories × sources (~4 min, ~100 requests)
venv/Scripts/python scraper/main.py --category cpu      # one category
venv/Scripts/python scraper/main.py --only bestprice --debug   # one source, dump HTML to scraper/debug/<source>_<cat>_pN.html
```

## File map
- `scraper/models.py` — `Listing` (GPU) and `CpuListing` dataclasses
- `scraper/categories.py` — `CATEGORIES`: per category the Skroutz/BestPrice paths, `make_listing` and `model_key`
- `scraper/http_client.py` — curl_cffi Chrome-impersonating session, polite sleep, `parse_price`, debug dumps
- `scraper/normalize.py` — title → brand/chip/vram/partner (regex tables); unmatched titles dropped. VRAM falls back to the URL slug. Workstation chips: `RTX PRO n`, `RTX An`, `RTX n Ada`, `RTX n (Pro)`, `Tn`
- `scraper/normalize_cpu.py` — CPU title → brand/chip (`Ryzen 7 9800X3D`, `Core Ultra 7 265K`, `Core i5-14600KF`, `Xeon w5-2455X`, `EPYC 9654`…), cores + socket from title (BestPrice) or URL slug (Skroutz), socket fallback from chip
- `scraper/sources/<name>.py` — each exposes `fetch(cat: Category) -> list`; registered in `main.py` `SOURCES`
- `scraper/main.py` — per category: runs sources isolated, keeps previous data for a source that returns 0, writes JSON
- `src/types.ts` — TS mirror of JSON schema (`GpuListing`, `CpuListing`); `src/lib/data.ts` — generic load/group/filter/sort
- `src/lib/categories.tsx` — `CategoryConfig` per category: model key, pro split (workstation GPUs / server+HEDT CPUs), tier sort, extra filters (VRAM; socket, cores), table columns
- `src/lib/theme.ts` — light/dark store (`.dark` on `<html>`, localStorage `theme`, follows OS until chosen); inline script in `index.html` avoids flash. Colours are CSS-variable tokens (`bg-page`, `text-muted`, `ring-line`, `text-accent`…) in `src/index.css` + `tailwind.config.js` — use them instead of raw `zinc-*`
- `src/lib/sources.ts` — per-source label/colour
- `src/components/*` — CategoryView (one tab), FilterBar, ModelTable/ModelRow (expandable: all listings + chart), PriceChart (lazy-loaded recharts, own light/dark palette), SourceBadge, ThemeToggle
- `.github/workflows/scrape.yml` — cron + `workflow_dispatch`, commits data with `contents: write`

## JSON schemas
- `latest.json`: `{updatedAt, sources: {name: {count, ok, updatedAt}}, listings: Listing[]}`
- GPU `Listing`: `{id: 'source:nativeId', source, title, url, price, shopCount: number|null, brand: NVIDIA|AMD|Intel, chip, vram, partner, scrapedAt}`
- `CpuListing`: same base fields + `cores: number|null, socket: string|null` (`AM5`, `LGA1851`, `sTR5`…), brand AMD|Intel
- `history.json`: `{ [model]: [{d: 'YYYY-MM-DD', min, source}] }` — model = GPU `"<chip> <vram>GB"`, CPU `"<chip>"` (`model_key` in categories.py = `modelKey` in categories.tsx); one point per model per day (min across runs), 365 days kept.

## Deploy (Vercel)
- Project `gpu-prices-gr` (Hobby, linked via `vercel link`, Git-connected → every push to `main` deploys).
- **Commit author must map to the owner's GitHub account** or Vercel Hobby marks the deploy "Blocked" (CLI deploys too). Repo-local git identity = `TeoAmpatzis <189219701+TeoAmpatzis@users.noreply.github.com>`; the scrape workflow commits with the same identity. Don't switch it back to `github-actions[bot]`.

## Adding a source
1. `scraper/sources/foo.py` with `fetch(cat) -> list` (use `cat.make_listing`, URL per category).
2. Add to `SOURCES` in `main.py`; add colour/label in `src/lib/sources.ts`.

## Scraping notes / pitfalls
- **Anti-bot**: plain curl → Skroutz Cloudflare "Just a moment" 403, BestPrice TLS connection reset. `curl_cffi` with `impersonate="chrome"` passes both, locally and from GitHub Actions runners (verified 2026-09-29). Headless Playwright is *blocked* on BestPrice — don't go back to it.
- **Categories**: GPU = Skroutz `c/55`, BestPrice `cat/2613`; CPU = Skroutz `c/32/cpu-epeksergastes.html`, BestPrice `cat/2606/epeksergastes.html` (~29 pages). BestPrice CPU titles end in "Επεξεργαστής N Πυρήνων για Socket X"; Skroutz CPU titles say "Intel Ultra 7" (no "Core").
- **Skroutz**: `https://www.skroutz.gr/c/55/kartes-grafikwn.html?page=N`, 60 cards/page (~12 real pages). Cards `li.card[data-skuid]`, title `a.sku-card-title-link[title]`, price `a.sku-link` text — can be a range `"740,10 € - 757,90 €"` (take first). No shop count on cards. Out-of-range pages return the last page again → stop when no new IDs. Sponsored cards duplicate products (dedupe by skuid). Titles often omit VRAM; the slug has it.
- **BestPrice**: `https://www.bestprice.gr/cat/2613/kartes-grafikwn.html`, 16 cards/page (~36 pages). `?pg=N` GET is ignored (always page 1). Pages 2+ = multipart POST to the same URL with `fromPagination=1`, `pg=N` and headers `X-PAGINATION: true`, `X-BP-PAGE: 1`, `X-GID: <"guestId" from page 1 HTML>`. Cards `div.p[data-id]`, `data-price` in cents, title `.p__title a[title]` (may end in "Κάρτα Γραφικών <SKU>"), shops `.p__merchants`. Total pages in embedded `"pagination":{"totalPages":N,...}`.

## Status / TODO
- [x] Scaffold
- [x] Scrapers (Skroutz, BestPrice) + normalize — ~1050 listings, ~90 models
- [x] GitHub Actions cron (`17 */6 * * *`) — first run green
- [x] Frontend: filters, model table, source badges, 7-day change, history chart
- [x] Vercel: linked + Git-connected (see Deploy)
- [x] CPUs tab (~865 listings, ~400 models) + light/dark theme
- [ ] Ideas: per-partner filter, price-drop highlights, URL-synced filters, merge identical products across sources
