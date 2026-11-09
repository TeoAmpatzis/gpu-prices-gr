# Phase 0 report: recon and prerequisites (read-only)

Date: 2026-11-08. Branch `design/deals-rework`, worktree `BuildDraft-release`. No application code, scraper, workflow or data changed. Nothing committed, pushed or deployed. New files: this report and `phase0-fixtures.json` (both untracked). Recon tooling lived in the session scratchpad (a venv with the repo's own `scraper/requirements.txt`; nothing added to the repo).

Legend: **[V]** verified by reading code/workflows or by a request; **[H]** heuristic or estimate; **[U]** unverified / not done.

## 1. Findings that need the owner

| # | Finding | Evidence |
|---|---|---|
| O1 | **Confirmed.** `history.yml` runs `main.py --history-only`; `site_history.py` requests `https://www.skroutz.gr/s/<id>/<slug>/price_graph?...`. Skroutz robots.txt (fetched today) has `Disallow: /s/*/shops_list` and `Disallow: /s/*/price_graph`. `scrape.yml` itself says these paths are disallowed. | `site_history.py:4,47`, `history.yml:78`, `scrape.yml:5`, live robots.txt [V] |
| O5 (new) | **e-shop pagination vs robots.** e-shop robots.txt (`User-Agent: *`) has `Disallow: /*offset=*`. `sources/eshop.py:108` pages every category with `?offset=N`. So existing e-shop scraping of pages 2+ conflicts with its robots.txt. For monitors this means e-shop yields only the first 10 products per list (page 1 has no `offset`) unless you decide otherwise. | `eshop.py:108`, live robots.txt [V] |
| O6 (new) | **Shopflix access path.** `sources/shopflix.py` reads a public Algolia key out of Shopflix's own JavaScript and queries Algolia directly. Shopflix robots.txt does not cover that endpoint and I did not find terms on it. My own attempt to repeat that extraction for monitors was **blocked by the harness as access circumvention**; I did not retry or work around it. Shopflix is therefore **not sampled**. Whether monitors should use that path is your call. | `shopflix.py:1-70`, robots.txt [V]; sampling [U] |
| O7 (new) | **Skroutz monitor volume.** `/c/43/othones-upologiston.html` shows 2,696 products, 60 per page, so 45 list pages per run, about 2-3 min of polite requests when unblocked. Existing `MAX_PAGES = 80` suffices. Cards that show a price range ("132,17 € - 214,98 €") are skipped by the current parser unless JSON-LD gives an exact price, so some monitors may be dropped. Needs your view on the Skroutz budget before adding. | recon pages 1-3 [V]; total from page header text |

## 2. Source recon

Request volume for the whole recon: about 25 requests across 5 hosts, 1.2-2.5 s apart, Chrome-impersonating client, no blocks, no retries needed, no evasion. Product pages were never requested.

| Source | robots.txt (fetched today) | Monitor list path | Volume | Pagination | Title shape | MPN-like token [H] |
|---|---|---|---|---|---|---|
| BestPrice | `?pg=` allowed; `?o=` and `/compare` disallowed. Plain `curl` gets a TLS reset; the impersonating client works. | `/cat/2621/othones-ypologiston.html` | 50 pages x 16 = about 800 hard cap (`pagination.totalPages = 50`). Monitors likely exceed this, so slices are needed like the big component categories. | scraper POSTs `fromPagination` (not `?pg=`) | `Brand Series MODEL [panel] [HDR] [Gaming] Monitor 27" 2560x1440 QHD 180Hz 1ms`; size, resolution, refresh, panel in title; BestPrice already merges shops (16-54 shops per card) | 38/48 (79%) |
| Skroutz | `/s/*/shops_list`, `/s/*/price_graph`, `/c/*/manufacturers`, `*filter_id=*` disallowed; list pages not disallowed. Direct request from this PC worked (production uses WARP). | `/c/43/othones-upologiston.html` (also `/c/5322/refurbished-monitors.html`, not for use) | 2,696 products, 60/page, 45 pages | `?page=N` | `Brand Series CODE 27" IPS HDR QHD 2560x1440` plus a `specs` line: `Gaming, Ρυθμός Ανανέωσης: 165Hz, Χρόνος Απόκρισης: 1ms`. Series code only (e.g. `G55C`), not the full manufacturer code (`LS27CG552EU`). | 89/180 (49%) |
| Snif | only login/admin/ajax paths disallowed | `/category/19197/` | at least 3 x 19 listed; total not measured | `?page=N` | noisy: old/refurbished (`REF`, `Ανακατασκευασμένη`), non-monitors (TV shelf, a charger), mixed Greek/English, sometimes the full code at the end (`LS34C652UAUXEN`, `62DDGAT6EU`) | 52/57 (91%) |
| e-shop | `Disallow: /*offset=*` (see O5) | `/ypologistes-othones-list?table=PER&category=ΟΘΟΝΗ` (iso-8859-7) | 10 per page, total not measured | `offset` (disallowed) | upper-case, prefix `ΟΘΟΝΗ`, includes non-monitors (laptop screen extenders, portable monitors); the prefix `ΟΘΟΝΗ` is not in the existing `PREFIX` regex | 7/10 |
| Shopflix | `Disallow: *?`, `/search`; list pages `/c/<id>/<slug>` allowed | `/c/1059/othones-ypologiston` (also `/c/1328` refurbished, `/c/3831` laptop screens) | [U] | Algolia (O6) | [U] | [U] |

GTIN/EAN (open question O3): **none of the list pages exposed a GTIN/EAN** in the fields the existing parsers read. Product pages and JSON-LD were not examined (Skroutz is lists-only; the other sources would need product-page requests, outside this phase). [U for product pages]

"MPN-like" heuristic: a token of length at least 6 with a letter and a digit, not a size/resolution/refresh/ms token. It counts series codes (`G55C`) as well as full manufacturer codes, so the figures are an upper bound on usable-MPN coverage.

**What this says about the riskiest assumption (FINAL_PLAN §8):** not decided. The evidence leans negative for list-only data. Skroutz titles carry series codes only, and Skroutz is lists-only by D2, so it cannot supply the missing full MPN. BestPrice titles often carry a code but not always the full one (`Samsung Odyssey G5 G50SF` vs `LS27CG552EU` for a neighbouring model). From titles alone, ≥95% recall and ≥90% coverage without false merges look unlikely; BestPrice product pages (D5) are the main lever and were not sampled. Only a measured matching experiment in Phase 2 on a frozen, reviewed sample can settle it. This is a judgement from a small first-pages sample, not a measurement.

## 3. `Record<Category>` classification (replaces "21 files")

Actual count: **20 files in `src/` + `vite-plugin-data.ts`; 29 including `tests/` and `scripts/`**. The plan's "21" does not match any of these; the classification below is by usage.

Full (exhaustive, non-Partial) maps: these break at compile time when `monitor` joins `Category`, unless handled.

| Site | Kind | Monitor needs |
|---|---|---|
| `src/lib/pick.ts:11` `SLOT_OF: Record<Category, Slot>` | **slot-only** | removed; replaced by `slotOf` (users: `PickView.tsx:91`, `derive.ts:59,566`, tests `modelChunks.test.ts:210,357`, `pick-parts.test.ts:23`) |
| `src/components/product/keySpecs.ts:36` `FILL` | generic presentation | monitor entry |
| `src/lib/ranking.ts:39` `RANKING` | generic | monitor entry |
| `src/lib/derive.ts:729` `MIN_MODELS` | generic (data guard) | monitor-specific initial minimum |
| `src/shell/nav.ts:17` `CATS` | generic (navigation) | monitor entry, peripherals group |
| `src/shell/texts.ts:65` `CAT_PAGE` | generic (strings, el/en) | monitor entry |
| `src/types.ts:310`, `src/lib/aliases.ts:8,10`, `src/data/modelAliases.ts:59-81` | generic (alias maps) | keys per category |
| `src/preview/data.ts:21-99` | dev preview, generic | follows `CATEGORY_IDS` |

`Partial<Record<Category, ...>>` sites need no new entry, but several carry builder semantics and must skip categories without a slot: `builderFiles`, `compatFiles`, `FAMILY`, `SAME_KIND`, `CHEAPER_KIND` in `derive.ts`, and `homeFile`. `derive.ts:566` already casts `SLOT_OF as Partial<Record<...>>`, so that site already tolerates a missing slot.

`pick=1` guard: `CategoryView.tsx:73` does `if (filters.pick) void loadPick()` with no category check [V]; as the plan says, this is where non-slot categories must be rejected.

## 4. Plan citations checked

Correct: `categoryRules.ts:149` (`yesNo` unknown = no), `modelData.ts:46,62`, `site.ts:15` (`PRIVACY_UPDATED`), `shipping.py:35,159` (`ESHOP_FREE_FROM = 90`), `scraper/main.py:291-303` (settle, image urls, finish, shipping, history order), `vite-plugin-data.ts:191` (prune), `specs.py:417` (`l.update`), `offers.ts:60-66`, `bestprice.py MAX_PAGES = 80`, `scrape.yml` flags `--no-shipping --specs-budget 0 --makers-budget 0`.

Loose or not matching exactly:
- `ModelPage.tsx:174` is in `src/components/product/ModelPage.tsx`, not `src/pages/`; line 174 is `<PriceHistory entry={entry} />`. The plan's meaning (family-level history) holds; the pointer is loose.
- `bestprice.py:29,38` and `main.py:197`: the "drops records before enrichment" claim holds in spirit (`make_listing` returning None is dropped at `if listing:`), but those exact lines are the `make_listing` call and a `PARSERS` check. [partly V]
- `filterUrl.ts:96` is the min/max numeric parameter loop (loosely matches "not only RANGE_FIELDS").
- Not re-verified: `deals.ts:98` beyond a for-loop over `byModel`; `catalogueFilters.ts RANGE_FIELDS`; `share_fields` at `main.py:50-95`; `validate_skroutz.py:37` (it is `check()` at that line).

## 5. Fixtures

`docs/peripherals/phase0-fixtures.json`: **295 real list titles** (BestPrice 48, Skroutz 180 incl. spec lines, Snif 57, e-shop 10), no prices. This meets the "≥60 titles" item. It is a first-pages sample, biased to each site's default ordering, not the reviewed 300-listing matching corpus the acceptance criteria require; that corpus still has to be built and labelled. It includes real hard cases: the same series in several sizes/panels (`Samsung Odyssey G5` 27"/31.5", IPS/VA), a series code vs a full code (`G55C` vs `LS27CG552EU`), and non-monitors and refurbished items (Snif, e-shop).

## 6. Headroom

- **Run time [V]:** `scrape.yml` (Skroutz) recent successful manual runs 13 and 57 min; `scrape-shops.yml` 45 and 56 min; timeout 90 min each. The last six scheduled Skroutz runs were `cancelled` before today's two manual successes. Adding monitors to the shops workflow (about 55 min already) leaves roughly 35 min; BestPrice monitor slices plus enrichment could consume that. **Do not assume monitors fit without a measured dry run.**
- **Photo repo [V]:** `TeoAmpatzis/builddraft-images` is about 120 MB (`size` 122,783 KB). Monitors would add roughly 1-2k models; at about 11 KB/model (roughly 11k models today, estimated from `MIN_MODELS`) that is on the order of 15-25 MB [H]. No size problem expected.
- **App data [V]:** `public/data` is 156 MB locally, nine categories.
- **Source budgets:** Skroutz +45 list pages per run (O7); BestPrice at least 2-3 extra slices, each up to 50 pages (the cap is per URL, so slice design matters) [H].

## 7. Performance measurement conditions (proposed; for you to confirm)

Not run: Lighthouse is not installed locally and `npx lighthouse@12` would be a new download; I did not do that without asking. Proposal, matching `scripts/checks/README.md` (Lighthouse 12):
- Build: production `npm run build`, serve `dist/` with `vite preview` (not the dev server).
- Lighthouse 12, mobile preset (default Moto G Power emulation, simulated slow-4G, 4x CPU slowdown) and `--preset=desktop`; headless Chrome of a recorded version; 5 runs, report the median; URLs `/`, `/gpu`, `/builder` (later `/monitor`, `/compare`).
- Filter timing: Vitest or Playwright with 4x CPU throttle, 5,000-listing synthetic fixture, p95 over 200 runs, main-thread tasks via the Long Tasks API.
- Bundle bytes: gzip -9 of the files `dist/index.html` references.

Current baseline from the existing `dist/` (built 2026-11-08 15:48, so it may differ from `HEAD`) [V]: entry `index-Dn-OfHxv.js` 224,535 B raw / **71,916 B gz** (70.2 KiB); `index-DbeFHfkI.css` 62,097 / 12,441 gz; largest lazy chunks `Workbench` 36.6 KiB gz, `pick.worker` 22.6 KiB gz. The "tray ≤3 KiB gz" target is about 4% of the current entry. Lighthouse scores and the 40 KiB model-chunk / 8 KiB builder-index ceilings were **not** re-measured.

## 8. Not done / unverified

- Shopflix sampling (O6).
- Product-page/GTIN availability for any source; BestPrice product-page enrichment recall.
- Snif and e-shop monitor totals; e-shop beyond page 1 (robots).
- Lighthouse and filter-time baselines.
- Share of Skroutz monitor cards that show a price range (seen in the first dozen cards; not counted).
- `npm run check` was not run (nothing changed).

## 9a. Decisions taken (owner delegated them to Claude, 2026-11-08; reversible by the owner at any time)

1. **O1:** monitors never touch Skroutz history, shipping or specs (already D2). `history.yml` and `site_history.py` are **not changed now** (workflow change needs its own go-ahead). Recommendation, not action: disable or review the `price_graph` import separately, since it hits a robots-disallowed path.
2. **O5:** e-shop is **not a monitor source** (no `offset=` paging). The existing e-shop scraper for the nine categories is untouched; flagged for owner review.
3. **O6:** Shopflix is **not a monitor source**. No Algolia key extraction for monitors.
4. **Monitor sources at launch:** BestPrice (sliced lists, product pages per D5) and Skroutz (lists only). Snif is optional later, only with a non-monitor/refurbished filter.
5. **Performance conditions:** §7 accepted. The Lighthouse baseline (one-off `npx lighthouse@12`, nothing added to the repo) runs at the start of Phase 1.
6. **Matching risk:** Phase 2 starts with a measured matching experiment on a reviewed corpus; targets may be lowered or maker-site parsers added before launch, never looser matching.

Phase 0 exit: done. Phase 1 still needs an explicit go-ahead for that phase.

## 9. Decisions that were open at the end of Phase 0 (kept for the record)

1. **O1** (Skroutz `price_graph` import vs robots): review before any Skroutz-related work.
2. **O5** (e-shop `offset=`): accept page-1-only for monitors, drop e-shop for monitors, or review the existing e-shop scraper.
3. **O6** (Shopflix Algolia path): allow or not for monitors. I will not extract or use the key without your explicit approval.
4. **Sources for monitors:** from this evidence BestPrice (needs slices) and Skroutz (lists only) are viable; Snif is viable but noisy and needs a filter for non-monitors and refurbished items; e-shop and Shopflix are blocked on O5/O6.
5. **Performance conditions** in §7, and whether I may install/run Lighthouse for baselines.
6. **Matching risk:** accept that Phase 2 starts with a measured matching experiment, and that targets (≥95% recall, ≥90% coverage) may be lowered or maker-site parsers added before launch (plan §8).
