# Monitors live and comparison complete: design and implementation plan

Date: 2026-11-10. Owner: Teo (away; asked for the plan and for the sure parts to be implemented meanwhile). Based on: `docs/peripherals/{FINAL_PLAN,PHASE3_PLAN,PHASE4_PLAN}.md`, the 2026-11-09 handoffs, and a read of the code on `origin/main` (7be2006) plus the unpushed branch `fix/monitor-scrape-bootstrap`.

## 1. Goal and success criteria

**End goal:** monitors are a published category (list, filters, model page, search, sitemap, navigation) and the comparison system works for every published category including monitors.

Success means all of these are true on the live site:
1. `/monitor` and `/monitor/<slug>` load, in Greek and English, dark theme, at 360 px and 1440 px.
2. The monitor data on `main` passes the gates in section 6 (three complete scrapes in a row, coverage, no false merges, size and speed budgets).
3. Compare buttons, the tray and `/compare` work for monitors (same flow as for parts), and still work for the nine part categories.
4. The nine existing categories are unchanged (frozen-data equivalence).
5. Nothing is pushed, deployed or run on GitHub without Teo's explicit go-ahead.

**Not in scope for this goal:** exact product photos (monitors have no photo job), the BuildDraft.gr domain, deals audit recall, Shopflix/e-shop robots questions. They stay parked (section 9).

## 2. Findings that shape the plan (checked in code, not assumed)

| # | Finding | Consequence |
|---|---|---|
| F1 | `public/data/monitor/` does not exist on `main`. Both scheduled scrapes failed on 2026-11-09 on bugs in the monitor commits (below). | Monitors cannot be enabled until the fix branch is pushed and scrapes succeed. |
| F2 | The site already builds every category from the registry (`src/lib/registry.ts`: `enabled` builds it, `visible` publishes it). Hard-coded lists exist only in: `routes.ts` `CATEGORY_LIST`, `Home.tsx` `HOME_CATEGORIES`, `nav.ts` `GROUPS`, `vercel.json` rewrites, `scripts/checks/site-check.mjs` `CATS`, three e2e files. | Derive what can be derived from the registry; list the rest in one launch checklist. Flipping becomes one small commit that tests describe exactly. |
| F3 | With `enabled: true, visible: true` locally, 7 unit tests fail (measured): `compare/refs`, `compare/store`, `modelChunks` (2), `pick-parts`, `registry`, `routes`. All assume monitors are hidden or that every category is a builder part. | Make the tests registry-aware so they pass in both states; keep one test that pins the hidden state's behaviour. |
| F4 | Comparison already supports monitors by design: `isComparable` follows `visible`; `specGroups('monitor', …)` exists in `ui/specs.ts`; `keySpecs` has a monitor entry. | Monitor compare comes with `visible: true`; it needs verification, not new code. Typed units/booleans for monitors (Phase 4 task 8) is optional polish. |
| F5 | Specs queue: the shops' product pages are read round-robin across categories, and the other categories' queues are nearly empty (cached forever). Monitors therefore get most of the 150-pages-per-run BestPrice budget. About 2,400 monitor products wait. | Roughly 16 runs, about 4 days at 4 `scrape-shops` runs a day. No budget change needed; do not raise it without asking. |
| F6 | Title-derived coverage is about 84%; gate needs 90% on launched models. | Coverage is measured on the real data after the page reads have run, by a script (task M7). |

## 3. Bug register

| ID | Bug | Status | Proof / next step |
|---|---|---|---|
| B1 | `scrape-shops` crash: `specs.py` had two `_list` functions (7a8a4b2), so case `radiatorMounts` became a list and `share_fields` crashed (`AttributeError: 'str' object has no attribute 'get'`). | Fixed on `fix/monitor-scrape-bootstrap` (4b29699): helper renamed `_items`. Reproduced on live BestPrice pages before the fix. | Teo pushes; confirm next `scrape-shops` run is green. |
| B2 | `scrape` crash: `validate_skroutz.py snapshot` required `monitor/latest.json`. | Fixed (4b29699): missing file = empty baseline. | Same. |
| B3 | Skroutz check failed with `monitor: empty listings or count mismatch (2350 vs 2706)`: the source `count` was the fetched number while rejected listings were removed afterwards. | Fixed (7222851). Replayed snapshot, scrape and check on real data: no errors. | Same. |
| B4 | `PriceChart.tsx:70` hook lint warning (`useLayoutEffect` with a complex dependency expression). | Fixed on `fix/phone-card-footer-and-lint` (1716006). `npm run check` shows 0 warnings. | Teo pushes with the next one. |
| B8 | At 360 px the product card footer was wider than its box by 9 px on every category (the compare button pushed into the card padding; `max-width: 52%` on the action). Layout audit: 111 issues on gpu+case before, 1 after (the remaining one is the filter slider's deliberate 22 px margin, a false positive). | Fixed on `fix/phone-card-footer-and-lint` (98f3743). Seen on live since the compare launch (441a6f1). | Teo pushes; look at a phone card on live. |
| B5 | Maker catalogues `thermaltake` (HTTP 404) and `noctua` (HTTP 429) failed in the run of 2026-11-09. Cached pages still apply, so no data is lost, but new products get no maker specs. | Investigated 2026-11-10 (X2). **Noctua:** the sitemap answers 200 and 396 product URLs match the parser; the 429 was a transient rate limit on the runner, nothing to fix. **Thermaltake:** the shop moved to Shopify; the old sitemap `/pub/pub/sitemaps/sitemap.xml` is 404 and the new one is `https://thermaltake.com/sitemap.xml` (index of `sitemap_products_N.xml`), with `/products/<handle>` pages, so the maker parser (old `/<name>.html` spec tables) needs a rewrite. | Scraper change, ask Teo. Low value: Thermaltake specs only, cached pages still apply. |
| B6 | `python -m unittest discover -s scraper/tests` runs 0 tests on `origin/main` (the tests live on `feat/exact-photos-ui`). | Open, harmless until that branch lands. | Noted; no action. |
| B7 | Probable future bugs, to look for deliberately: (a) monitor `list.v2.json` over 300 KB gzip once the real data grows; (b) false merges of two different monitors (same title, different panel/size); (c) filters hiding monitors whose value is unknown; (d) `Home.tsx` category count and nav groups when a tenth category appears; (e) compare table for monitors showing "—" for most rows while page reads are incomplete. | Each has a check in section 6 or task M5/C2. |

## 4. Branch map and ordering rules

- Every branch starts from `origin/main`. Never from the local `main` or `design/claude-v2`.
- `fix/monitor-scrape-bootstrap` (2 commits, verified) must be pushed first. Nothing else depends on its code, but nothing monitor-related can be verified live without its data.
- `feat/monitor-launch` (this plan, tasks M1 to M4): registry-driven lists and tests. Safe to push with monitors still hidden; behaviour of the live site must not change.
- `launch/monitor-visible` (task M8): on top of `feat/monitor-launch`; contains only the flip and the launch checklist. **Never pushed without Teo's approval and the gates.**
- `feat/exact-photos-ui` stays local and parked.
- Commits: `TeoAmpatzis <189219701+TeoAmpatzis@users.noreply.github.com>`, no Co-Authored-By. `npm run check` before each commit. Teo pushes with `! git push origin <branch>:main`.

## 5. Tasks

Legend: **[sure]** = implemented without asking, no live effect. **[ask]** = needs Teo.

### Workstream M: monitors

**M1 [sure] Registry-driven category list.** Files: `src/lib/routes.ts`, `src/shell/nav.ts`, `src/shell/Home.tsx`.
- `CATEGORY_LIST` = categories whose `REGISTRY[c].visible` is true, in registry order (which equals v1's order for the nine).
- `GROUPS` gets a third group "Περιφερειακά / Peripherals" holding `monitor`; the menu and parts page show only groups with visible categories.
- `HOME_CATEGORIES` is filtered by `visible`.
- Proof: with monitors hidden, `CATEGORY_LIST`, the menu, the sitemap and the home grid are byte-identical to today (existing tests); with a visible monitor (test mock) they include it.

**M2 [sure] Registry-aware tests.** Change the 7 tests from F3 so they derive expectations from the registry instead of hard-coding nine categories or "monitor is hidden". Add one test that pins the hidden-state behaviour using the mock approach already used in `tests/unit/hiddenCategory.test.ts`. Proof: `npx vitest run` passes with the registry as is, and passes again when the registry is flipped locally (checked once by hand, not committed).

**M3 [sure] e2e and site-check read the registry.** `tests/e2e/{smoke,seo}.spec.ts` build `CATEGORIES` from the registry's visible set; `site-check.mjs` keeps its manual list because `registry.test.ts` compares it to the registry (the test names the missing id when out of sync). Proof: `npx playwright test smoke seo` green with monitors hidden.

**M4 [sure] Local monitor data for rehearsals.** No new code: the e2e config and the unit tests build from `public/data`. Local data comes from a lists-only scrape: `venv/Scripts/python.exe scraper/main.py --category monitor --no-shipping --specs-budget 0 --makers-budget 0` (about 5.5 minutes, no product pages). Clean up afterwards with `git checkout -- public/data && git clean -fdq public/data`; this data is never committed.

**M5 [sure, after M1-M3] Rehearsal with monitors visible, locally.** On a throw-away branch flip `enabled/visible` to true with the local data and run: `npm run check`, the full e2e, `node scripts/checks/layout-audit.mjs` at 360 and 1440, `scripts/phase3/list-bytes.mts`. Collect every defect into section 7 below. Fix the ones that are code defects in monitor files; report the ones that need decisions.

**M6 [ask] Scraper-side fixes that the rehearsal reveals** (identity step, normalisation, `no-identity` rejects at about 9% of listings, 32 `ambiguous`). These change the scraper and data, so each one is proposed with evidence first.

**M7 [sure, done] Gate script `scripts/phase3/monitor-gates.mts`.** Reads `public/data/monitor/latest.json` (+ `specs.json`) and prints: models, listings per source, coverage of diagonal/resolution/panel/refresh on launched models, count of models merged from listings with different diagonal or resolution (false-merge candidates), `list.v2.json` gzip size. Exit code non-zero when a gate fails. Used by task M8 and by Teo to re-check later.

**M8 [ask] Launch commit (`launch/monitor-visible`).** One commit: `registry.ts` monitor `enabled: true, visible: true`; `vercel.json` rewrites add `monitor`; `site-check.mjs` `CATS` adds `monitor`. All other places already follow the registry (M1 to M3). Checklist before pushing: `npm run check`, full e2e, layout audit, Lighthouse median of 3 on `/monitor` and one model page, `monitor-gates.mts` green, Teo's explicit approval. After the push: Vercel status, `site-check.mjs` live, `gh run list`.

**M9 [sure] After launch: roll-back note.** Rolling back = revert the launch commit (flip back to hidden). Data keeps being collected. No data deletion is needed.

### Workstream C: comparison

**C1 [done 2026-11-10] Verification pass for the gaps listed in the 2026-11-09 handoff.** Playwright against the built site with GPUs, 1440 and 360 px: 4 columns on desktop (5 table columns), the phone selector (2 columns at a time, 4 products selectable), the "already has 4 products" notice on a fifth add, keyboard Tab order (header, actions, then each product and its Remove), Copy link puts the share URL on the clipboard, the shared link opens with all 4 columns and a save button, no sideways scroll, no page errors. **Still not verified:** screen reader behaviour, a real touch device, the clipboard fallback in an insecure context, the save button when the saved group is already full. **Small polish found:** on a phone the two column selectors cut the product name ("Asrock Radeon RX 9("), so two similar products are hard to tell apart; not changed.

**C2 [sure, written, waiting for data] Compare with monitors.** `tests/e2e/monitor.spec.ts` (list, brand filter in the URL, model page without a builder fit block, compare of two monitors with reload, canonical address). It is skipped while monitors are hidden and runs the day they are published; it must be run once on real data before the launch push (`launch/monitor-visible` plus monitor data in `public/data`). Manual rehearsal on 2026-11-10 already showed 4 monitors compared on desktop and 2 at a time on a phone.

**C3 [ask] Typed monitor definitions** (units, booleans, conflicts) from Phase 4 task 8, only after coverage is high enough to make them meaningful. Optional for launch.

**C4 [sure] Lighthouse with the tray.** Measure `/gpu` with one item in the tray against the 2026-11-09 baseline; the tray must not cost more than 2 points or 100 ms LCP.

### Workstream X: bugs and hygiene

**X1 [sure]** B4: extract the dependency expression into a variable in `PriceChart.tsx`; no behaviour change; `npm run lint` shows 0 warnings.

**X2 [done] investigate only** B5: result recorded in the bug register. A Thermaltake parser rewrite is a scraper change (ask).

**X3 [ask] Parked, restart only if Teo wants them:** exact photos pipeline (design agreed: candidates committed under `exact/candidates`, index and images in `builddraft-images`, `EXACT_PHOTOS_ONLY=false`), domain, PR #2, B8/B9.

**Resolved, no work needed:** `/case` mobile Lighthouse. Measured 2026-11-10 on current main (median of 3): mobile 99 (LCP 1.95 s, TBT 62 ms, CLS 0, JS 104 KB, data 269 KB), desktop 100. The old figure of 89 predates the list-file and facets-worker work. `/gpu`: mobile 99, desktop 100.

## 6. Gates before `visible: true` (each has a command and a pass condition)

| Gate | Command / evidence | Pass |
|---|---|---|
| Complete scrapes | `gh run list --workflow scrape-shops.yml`, `scrape.yml`; `git ls-tree origin/main public/data/monitor/` | Three consecutive green runs that each updated `monitor/latest.json` |
| No disabled operations | Run logs | Zero requests to Skroutz shipping, specs, history for monitors |
| Coverage | `npx tsx scripts/phase3/monitor-gates.mts` | Diagonal, resolution, panel, refresh each at least 90% on launched models |
| False merges | Same script (candidates) + manual look at the printed list | 0 confirmed |
| Data size | Same script | `list.v2.json` initial data at most 300 KB gzip |
| Filters / facets / URL | Existing unit tests + oracle tests for monitor rules | Green |
| Languages and layout | `layout-audit.mjs` at 360 and 1440, el and en | 0 issues |
| Speed | `lighthouse-baseline.mjs` median of 3, `content-timing.mjs` | JS at most 110 KB gzip; no regression on the nine categories |
| Nine categories unchanged | `data-equivalence.test.mts` on frozen data | ALL EQUAL |
| Teo approval | Chat | Explicit yes |

## 7. Rehearsal defects (filled by task M5)

Rehearsal on branch `launch/monitor-visible` (monitors published) with a local lists-only scrape (5,809 listings, 3,498 models), 2026-11-10:

- `npm run check`: green, 1628 tests, build includes monitors. Monitor model chunks: largest 4.5 KiB gzip. `list.v2.json` 192 KB gzip (limit 300), `detail.json` 113 KB.
- Full e2e: 306 of 307 passed. The one failure (`aliases.spec` expected exactly nine categories) was a test assumption, now registry-aware. Re-run: green.
- Screenshots 1440 and 360, English and Greek: monitor list, filters (diagonal, manufacturer, resolution...), model page, compare with 4 monitors (5 columns desktop, 2 at a time on a phone), no page errors. The home grid gains a Monitors tile and the menu a "Peripherals" group.
- `monitor-gates.mts` on the local data: coverage diagonal 97.7%, resolution 98.4%, panel 95.0%, **refresh rate 86.7% (below 90%)**, false-merge candidates 0 after allowing 0.6 inch (a panel sold as 31.5 or 32). Refresh needs the shop page reads to pass the gate.
- Defects found by the rehearsal: B8 above (existing, all categories). No monitor-specific code defect.
- Not covered by the rehearsal: real page-read data (none exists yet), Lighthouse on `/monitor`, keyboard and screen reader use of the monitor filters.

## 8. What can go wrong and how we notice

- A scrape fails again: the next scheduled runs show it in `gh run list`; logs read with `gh run view <id> --log-failed`. Do not rerun workflows without asking.
- Monitor list grows past budget: `monitor-gates.mts` shows the size; fix by dropping unused columns (already done for images).
- A monitor model page shows wrong specs: keep the evidence labels ("from the title" / "from the shop page") and compare against the product page before trusting.
- Hidden category leaks (search, sitemap, compare) before launch: `hiddenCategory.test.ts` and `registry.test.ts` fail.

## 9. Parked items (not needed for this goal)

Exact photos pipeline and the `feat/exact-photos-ui` branch; photo review store backed up at `C:\Users\Teo\Desktop\BuildDraft-photo-store\`; `/case` Lighthouse; domain; PR #2; B8/B9; deals audit; robots questions O5/O6.
