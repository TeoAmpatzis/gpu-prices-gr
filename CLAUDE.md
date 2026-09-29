# CLAUDE.md — PC Hardware Prices GR (reference sheet)

Read this first; it is kept current so you don't need to re-explore the repo.

## What & rules
- Static site listing **PC hardware prices in the Greek market** (GPU, CPU, RAM, PSU, cases, case fans, CPU coolers) from aggregators **Skroutz** + **BestPrice**. Greece only. Seven tabs (`#gpu #cpu #ram #psu #case #fan #cooler`), light/dark theme toggle.
- **€0/month is a hard rule**: no paid APIs/SaaS. Free tiers only (GitHub Actions, Vercel Hobby).
- Private repo: `github.com/TeoAmpatzis/gpu-prices-gr`. Owner deploys on Vercel (Vite preset, output `dist`).
- UI text in Greek. Icons: `lucide-react` only. Strict TS; `npm run build` is the only check (no tests/lint).
- Git: conventional commits, commit + push after each unit of work, stage files explicitly, never commit `node_modules/ dist/ venv/ .env`.

## Data flow
`GitHub Actions cron (6h)` → `python scraper/main.py` → for each category writes `public/data/<category>/latest.json` + `history.json` → commit/push → Vercel redeploys → React app fetches `/data/<cat>/*.json`.

## Commands
```bash
npm install && npm run dev            # site on :5174
npm run build                         # tsc + vite build (gate before commit)
python -m venv venv && venv/Scripts/pip install -r scraper/requirements.txt   # curl_cffi + selectolax, no browser
venv/Scripts/python scraper/main.py                     # all categories × sources (~30 min, ~900 requests; workflow timeout 60)
venv/Scripts/python scraper/main.py --category cpu      # one category
venv/Scripts/python scraper/main.py --only bestprice --debug   # one source, dump HTML to scraper/debug/<source>_<cat>_pN.html
```

## File map
- `scraper/models.py` — `Listing` (GPU), `CpuListing`, `RamListing`, `PsuListing`, `CaseListing`, `FanListing`, `CoolerListing` dataclasses
- `scraper/categories.py` — `CATEGORIES`: per category the Skroutz paths and BestPrice paths (several pages/slices merged, see pitfalls), `make_listing` and `model_key`
- `scraper/names.py` — shared by cases/fans/coolers: `VENDORS`, `split_vendor`, `COLORS` + `noise_regex`, `clean_name`, `valid_vendor`, `model_key` (letters+digits)
- `scraper/http_client.py` — curl_cffi Chrome-impersonating session, polite sleep, `parse_price`, debug dumps
- `scraper/normalize.py` — title → brand/chip/vram/partner (regex tables); unmatched titles dropped. VRAM falls back to the URL slug. Workstation chips: `RTX PRO n`, `RTX An`, `RTX n Ada`, `RTX n (Pro)`, `Tn`
- `scraper/normalize_cpu.py` — CPU title → brand/chip (`Ryzen 7 9800X3D`, `Core Ultra 7 265K`, `Core i5-14600KF`, `Xeon w5-2455X`, `EPYC 9654`…), cores + socket from title (BestPrice) or URL slug (Skroutz), socket fallback from chip
- `scraper/normalize_ram.py` — RAM title + slug → type (DDR2–5), kit (modules × size), speed, form factor (Desktop/Laptop/Server), vendor. Model = spec kit across vendors: `"DDR5 32GB (2×16GB) 6000MHz"`
- `scraper/normalize_psu.py` — PSU title + slug + Skroutz spec line → watts, efficiency (80 PLUS / Cybenetics folded to one tier; `None` = not stated), modularity (Skroutz only), form factor (ATX/SFX/TFX/Flex), vendor. Model = `"850W Gold"`
- `scraper/normalize_case.py` — case title → vendor + model name (cut at size phrase/`με`/`Κουτί`; colours, panel options, "Gaming", RGB removed anywhere so both sites match), size, window, RGB. Model = the case itself
- `scraper/normalize_cooling.py` — fans: vendor + model + size + pack (`"Arctic P12 Pro 120mm ×3"`; pack from `3τμχ` or slug `-3tmch`, size falls back to the model number). Coolers: air vs AIO (water keywords), AIO radiator from Skroutz specs `(3x120mm)` or a bare 120–480 not followed by `mm` (that's fan size); radiator appended to the name if missing; custom-loop parts dropped
- All `make_listing(...)` take an optional `specs` string: Skroutz passes the card's `p.specs` line (e.g. `"Τύπος:ATX / SFX"`)
- `scraper/sources/<name>.py` — each exposes `fetch(cat: Category) -> list`; registered in `main.py` `SOURCES`
- `scraper/main.py` — per category: runs sources isolated, keeps previous data for a source that returns 0, writes JSON
- `src/types.ts` — TS mirror of JSON schema (`GpuListing`, `CpuListing`); `src/lib/data.ts` — generic load/group/filter/sort
- `src/lib/categories.tsx` — `CategoryConfig` per category: model key, pill `groups` (brand for GPU/CPU, DDR type for RAM, efficiency for PSU, size for cases/fans, air/AIO size for coolers), optional `segments`, pro split (workstation GPUs / server+HEDT CPUs / laptop+server RAM / non-ATX PSUs), `sortByGroup` (PSU/cases/fans/coolers: false → most-offered first), tier sort, extra filters (VRAM; socket, cores; capacity, speed; watts; window, RGB; pack), table columns
- `src/lib/theme.ts` — light/dark store (`.dark` on `<html>`, localStorage `theme`, follows OS until chosen); inline script in `index.html` avoids flash. Colours are CSS-variable tokens (`bg-page`, `text-muted`, `ring-line`, `text-accent`…) in `src/index.css` + `tailwind.config.js` — use them instead of raw `zinc-*`
- `src/lib/sources.ts` — per-source label/colour
- `src/components/*` — CategoryView (one tab), FilterBar, ModelTable/ModelRow (expandable: all listings + chart), PriceChart (lazy-loaded recharts, own light/dark palette), SourceBadge, ThemeToggle
- `.github/workflows/scrape.yml` — cron + `workflow_dispatch`, commits data with `contents: write`

## JSON schemas
- `latest.json`: `{updatedAt, sources: {name: {count, ok, updatedAt}}, listings: Listing[]}`
- GPU `Listing`: `{id: 'source:nativeId', source, title, url, price, shopCount: number|null, brand: NVIDIA|AMD|Intel, chip, vram, partner, scrapedAt}`
- `CpuListing`: same base fields + `cores: number|null, socket: string|null` (`AM5`, `LGA1851`, `sTR5`…), brand AMD|Intel
- `RamListing`: base fields (brand = vendor, chip = kit spec) + `type: DDR2..DDR5, capacity (total GB), modules, speed: number|null, formFactor: Desktop|Laptop|Server`
- `PsuListing`: base fields (brand = vendor, chip = `"<W>W <efficiency>"`) + `watts, efficiency: Titanium|Platinum|Gold|Silver|Bronze|Diamond|Standard|null, modular: Full|Semi|Non|null, formFactor: ATX|SFX|TFX|Flex`
- `CaseListing`: base fields (brand = vendor, chip = vendor + model) + `size: Full Tower|Midi Tower|Mini Tower|SFF / Cube|Άλλο, window, rgb`
- `FanListing`: + `size (mm), pack, rgb`; `CoolerListing`: + `type: Air|AIO, radiator: number|null, rgb`
- `history.json`: `{ [model]: [{d: 'YYYY-MM-DD', min, source}] }` — model = GPU `"<chip> <vram>GB"`, CPU `"<chip>"`, RAM/PSU `"<chip> <formFactor>"`, case/fan/cooler = chip lowercased, letters+digits only (`model_key` in categories.py = `modelKey` in categories.tsx); one point per model per day (min across runs), 365 days kept.

## Deploy (Vercel)
- Project `gpu-prices-gr` (Hobby, linked via `vercel link`, Git-connected → every push to `main` deploys).
- **Commit author must map to the owner's GitHub account** or Vercel Hobby marks the deploy "Blocked" (CLI deploys too). Repo-local git identity = `TeoAmpatzis <189219701+TeoAmpatzis@users.noreply.github.com>`; the scrape workflow commits with the same identity. Don't switch it back to `github-actions[bot]`.

## Adding a source
1. `scraper/sources/foo.py` with `fetch(cat) -> list` (use `cat.make_listing`, URL per category).
2. Add to `SOURCES` in `main.py`; add colour/label in `src/lib/sources.ts`.

## Scraping notes / pitfalls
- **Anti-bot**: plain curl → Skroutz Cloudflare "Just a moment" 403, BestPrice TLS connection reset. `curl_cffi` with `impersonate="chrome"` passes both, locally and from GitHub Actions runners (verified 2026-09-29). Headless Playwright is *blocked* on BestPrice — don't go back to it.
- **Categories**: GPU = Skroutz `c/55`, BestPrice `cat/2613`; CPU = Skroutz `c/32/cpu-epeksergastes.html`, BestPrice `cat/2606/epeksergastes.html` (~29 pages). BestPrice CPU titles end in "Επεξεργαστής N Πυρήνων για Socket X"; Skroutz CPU titles say "Intel Ultra 7" (no "Core"). RAM = Skroutz `c/56/mnhmes-pc-ram.html` (~48 pages), BestPrice `cat/2609` (~2000 products). PSU = Skroutz `c/30/psu-trofodotika.html`, BestPrice `cat/2608` (~1200 products, titles have no modularity). Cases = Skroutz `c/28/cases-koutia.html`, BestPrice `cat/2607` (~2050 products; BestPrice titles carry marketing colour names like "Racing Green", Skroutz only has colour in the slug). Fans = Skroutz `c/674`, BestPrice `cat/6148` (~1400, 3 price slices). Coolers = Skroutz `c/673` (air) + `c/677` (water), BestPrice `cat/2614` + `cat/8397`.
- **BestPrice caps pagination at 50 pages (800 products)** — RAM is fetched as 8 capacity-filter slices (`/cat/2609/mnimes-ram/f/5641_<range>/<slug>.html`), PSUs as 5 wattage slices (`/f/679_<range>/…`), cases as 4 **price** slices (`?min=5000&max=7999`, cents — works for any category), merged by id. Filters combine as `/f/291_23590_1062_0/…`. Filter links are in the category page HTML (`/cat/<id>/<slug>/f/<attr>_<value>/…`).
- **Skroutz family cards**: some cards (e.g. "G.Skill Aegis DDR4", `sku-variations-label`) cover several variants and show a price *range* across them. The page's JSON-LD (`itemListElement[].item.offers.price`, keyed by `/s/<skuid>/`) has the price of the exact variant the card links to — `skroutz.py` prefers it; a range card without JSON-LD is skipped.
- **Skroutz**: `https://www.skroutz.gr/c/55/kartes-grafikwn.html?page=N`, 60 cards/page (~12 real pages). Cards `li.card[data-skuid]`, title `a.sku-card-title-link[title]`, price `a.sku-link` text — can be a range `"740,10 € - 757,90 €"` (take first). No shop count on cards. Out-of-range pages return the last page again → stop when no new IDs. Sponsored cards duplicate products (dedupe by skuid). Titles often omit VRAM; the slug has it.
- **BestPrice**: `https://www.bestprice.gr/cat/2613/kartes-grafikwn.html`, 16 cards/page (~36 pages). `?pg=N` GET is ignored (always page 1). Pages 2+ = multipart POST to the same URL with `fromPagination=1`, `pg=N` and headers `X-PAGINATION: true`, `X-BP-PAGE: 1`, `X-GID: <"guestId" from page 1 HTML>`. Cards `div.p[data-id]`, `data-price` in cents, title `.p__title a[title]` (may end in "Κάρτα Γραφικών <SKU>"), shops `.p__merchants`. Total pages in embedded `"pagination":{"totalPages":N,...}`.

## Status / TODO
- [x] Scaffold
- [x] Scrapers (Skroutz, BestPrice) + normalize — ~1050 listings, ~90 models
- [x] GitHub Actions cron (`17 */6 * * *`) — first run green
- [x] Frontend: filters, model table, source badges, 7-day change, history chart
- [x] Vercel: linked + Git-connected (see Deploy)
- [x] CPUs tab (~865 listings, ~400 models) + light/dark theme
- [x] RAM tab (~3800 listings, ~360 spec kits)
- [x] PSU tab (~2300 listings, ~165 specs)
- [x] UI redesign (Inter, cards, labelled filter sections, soft chips; `.card`/`.field`/`.label` in index.css)
- [x] Cases tab (~4000 listings, ~2200 models, ~930 on both sites)
- [x] Fans tab (~2500 listings, ~1600 models) + CPU coolers tab (~2600 listings, ~1570 models, air + AIO)
- Heredoc/`python -` edits that contain regexes: `` in a non-raw string becomes a backspace — write edit scripts to a file or use the Edit tool
- Headless Chrome screenshots can't go below ~500px wide — a `--window-size=390` shot is a cropped 500px layout, not real overflow
- [ ] Ideas: per-partner filter, price-drop highlights, URL-synced filters, merge identical products across sources
