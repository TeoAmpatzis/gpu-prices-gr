# Phase 3 plan: monitor pages (hidden until the gates pass)

Date: 2026-11-09. Branch `feat/monitor-ui` (from `main` 1af6d60). Based on `FINAL_PLAN.md` section 3 (Filters, Pages) and section 7 (acceptance). Nothing here is visible on the site until `visible: true` is switched on in the last task, which needs Teo's approval.

## What exists today (measured)
- Monitor category skeleton: `MONITOR` config (`src/lib/categories.tsx`), `MONITOR_RULES` (diagonal pills + brand filter), registry entry `enabled:false, visible:false`, texts in `shell/texts.ts`, empty key specs, spec groups in `ui/specs.ts`.
- Data on `main` from the next scheduled scrape: `public/data/monitor/*`. Page reads (EAN + about 18 specs) accumulate at 150 pages per run shared with all categories, so most models have no page values for a while.
- Sample data (earlier local scrape, 3,456 models, 5,765 listings) gives the sizes below.

## Findings that shape the plan
1. **Data size:** `monitor/list.v2.json` is 305 KB gzip (limit 300 KB initial data). 120 KB of it is the `image` column: monitors have no photo job, but their listings keep the shop image URL (`write_image_urls` is skipped, so it never strips it). Removing that column alone gives 184 KB; dropping `reject`, `drop`, `width`, `revision` as well gives 180 KB. `title` (63 KB) can stay.
2. **Filters need three states.** Page-only specs (HDR, curved, ports, VESA, sync) are unknown for most models at launch. `yesNo` filters today treat unknown as "no" (`categoryRules.ts:149`), which would hide most monitors. Strict feature filters must exclude unknown, with an explicit "include unknown".
3. **Title-derived specs are good enough to launch:** diagonal 98%, resolution height 98%, refresh 87%, panel 96%, brand 100% (sample).

## Scope of Phase 3
**Launch filters** (all from title or Skroutz spec line, no page read needed): price, brand, diagonal buckets, resolution (FHD / QHD / 4K / other), refresh threshold (60+, 75+, 100+, 144+, 165+, 240+), panel (IPS / VA / TN / OLED), colour.
**Filters added when coverage allows** (page values): HDR, curved, ultrawide, ports (HDMI, DisplayPort, USB-C), adaptive sync, VESA. Shown only once at least 40% of models state the field; tri-state with "include unknown".
**Sorts:** Recommended (popularity and price, no invented quality score), Best deals, price, diagonal, refresh (unknown last, stable ties).
**Model page:** spec groups with source/evidence note ("from the title" / "from the shop page"), no PC-builder fit block, family/variant links, price table as for other categories. No Compare button yet (Phase 4 adds it for every category).
**Site wiring:** navigation group "Peripherals" with Monitors; search index; sitemap; page titles and descriptions (`pageMeta`); structured data; `vercel.json` rewrites for `/monitor` routes. Everything Greek and English, dark theme, checked at 360 px and desktop.

## Tasks
1. [ ] **Data size.** Strip `image` (and drop unused columns) for categories without photos; test the list stays under 200 KB gzip on the sample. *Touches `scraper/main.py` (a scraper change: needs your OK).*
2. [ ] **Filter engine.** Tri-state predicate and typed range filter in `categoryRules.ts` / `filterUrl.ts` / `facets.ts`, with unit tests against an independent oracle (boundaries, unknown policy, URL round trip).
3. [ ] **Monitor config.** Launch filters, groups, sorts, ranking weights, columns for table and cards.
4. [ ] **Model page.** Key specs and spec groups with evidence labels; no builder block.
5. [ ] **Wiring.** Nav, search, sitemap, `pageMeta`, structured data, `vercel.json` rewrites, strings in both languages.
6. [ ] **Tests.** Unit, e2e (smoke, filters, URL), layout audit at 360 and 1440 px, Lighthouse median of 3.
7. [ ] **Enable.** With real monitor data on `main`: `enabled: true`, fix the seven tests that assume nine categories, run the gate checks. Then `visible: true` only after Teo approves.

## Gates before `visible: true` (from FINAL_PLAN section 7)
- Three consecutive complete monitor scrapes on `main`; zero requests to disabled operations (Skroutz shipping/specs/history).
- Zero false merges on the reviewed corpus; coverage of diagonal, resolution, panel, refresh at least 90% on launched models (needs page reads; currently 84% by title alone).
- Filters/sort/facets equal an independent oracle; URL round trip.
- Greek/English, 360 to 1440 px, keyboard operable.
- Performance: JS 110 KB, initial data 300 KB gzip, home feed 20 KiB; no new requests on the builder.
- Existing nine categories unchanged on frozen data.

## Progress (2026-11-09, branch feat/monitor-ui)
Decisions given by Teo: route `/monitor`; image strip approved; launch with title-derived filters.
- [x] 1 Data size: `drop_images` in `scraper/main.py` (commit 667686a). Sample monitor list 305 KB -> 185 KB gzip.
- [x] 2 Filter engine: **not needed for launch.** The launch filters use the existing `oneOf`/`threshold` builders, where an unknown value never matches. The tri-state predicate and the typed range come with the page-based filters (HDR, ports, curvature), once enough models state them.
- [x] 3 Config: brand, resolution, refresh rate, panel filters; panel column (71a68d2). Colour dropped: only 1% of listings state it.
- [x] 4 Model page: spec groups from title and shop page (page-only values tagged "from the shop page"), key specs diagonal/resolution/refresh, page fields kept out of the list file (36c13cc).
- [ ] 5 Wiring (nav group, search, sitemap, pageMeta, structured data, `vercel.json` rewrites for `/monitor` and `/monitor/:slug`, routes): done together with 7, because everything switches on with `visible: true`.
- [ ] 6 Tests: unit tests added with each task; e2e, layout audit (360/1440) and Lighthouse come with 7.
- [ ] 7 Enable with real data, then `visible: true` after Teo approves.

## Decisions I need from Teo
1. **Route name:** `/monitor` or Greek `/othones`? Existing routes are English (`/gpu`, `/ram`). Recommendation: `/monitor`.
2. **Task 1 is a scraper change** (removes the image URL from monitor listings in `latest.json`). OK to do?
3. **Launch with title-derived filters only** and add page-based filters when coverage allows (recommended), or wait until page values exist for most models?
