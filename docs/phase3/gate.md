# Roadmap step 3 gate: "Pick for my build" + category-page fixes

2026-10-17 · worktree `buildcraft-v2`, branch `v2` (local only, nothing pushed) · plan
`2026-10-12-step3-pick-mode.md` (removed 2026-10-31, in git history) · data: `origin/main` of 2026-10-17 11:40 (merged into v2 as
`93752f0`).

This is the step 3 part of the Phase 3 gate. Phase 3 also holds step 4 (the product page), so the rest of the Phase 3
gate (time to first product on a slow phone vs v1, keyboard reach of the first product, real model pages) is
measured at the end of step 4.

## Verdict

| Check | Result |
| --- | --- |
| Tasks 1–9 of the plan | **Done** (commits below) |
| `npm run check` (typecheck, lint, 738 unit tests, build with the data check against the live manifest) | **Pass**. Lint: 0 errors, 6 warnings (react-hooks, all older than step 3) |
| `npm run e2e` (Playwright) | **87 passed** |
| Compatibility scenarios | 64: pass 50, gap 4 (S03, S04, S35, S45), unknown 10, failure 0 (same as the Phase 2 gate) |
| Phone Lighthouse ≥ 90 (median of 3) | **Yes on all five pages**: `/gpu` 97, `/case` **90**, `/case?pick=1` with a build 95, `/storage` 95, `/builder` 98 |
| CLS 0 | **Yes**, every page, phone and desktop |
| Desktop 100 | `/builder` 100; category pages **99** (one run of three at 100 on each; see "Desktop 99") |
| Accessibility | 100 everywhere |
| Rule 11 budget (first-paint JS ≤ 110 KB, data ≤ 300 KB gzip) | **Within**: JS 87.7 KiB; largest data `/case?pick=1` 287.1–290.2 KiB (**close to the limit**, see "Risks") |

## Commits (step 3)

| Task | Commits |
| --- | --- |
| Plan | `774d0d1` |
| 1 Build store with engine fields and data date (A7, A9) | `3b3e34f` (+ `28e98b1` engine texts) |
| 2 Engine parts from category data | `f59f761` |
| 3 Compat chunks for old saves | `f60c49f` |
| 4 Hide rules + candidate check | `319aba5`, `ed70fe4` |
| 5 Pick mode UI | `ccb3687`, `0648e41`, `3634df5` |
| 6 Budget + Lighthouse (A8) | `afab006`, `774153a`; 6b worker / no layout shift: `90b0b32`, `d1c7bb4`, `8c0166e`, `040a5fc`, `498e34b` |
| 7 C4 maker column + photo | `4b7d735`, `95eae77` |
| 8 C6 chart without fake dips | `ee9ef0d`, `ddc7d1d`, `f198493` |
| 9 C1 C2 C3 C5 | `c3ee148`, `cea1e58`, `ea308f4` |
| Data refresh + guard | `93752f0` (merge of `origin/main`), `399e311` (board fields have data now) |

None has a Co-Authored-By line.

## Lighthouse (median of 3; local `vite preview`, same method as Task 6 / 6b)

`node scripts/phase3/measure-pick.mjs lighthouse http://localhost:4173 docs/phase3/perf/gate <raw> 3
gpu,case,storage,case-pick-b,builder-guided` (the script gained the `storage` page). Raw medians and runs:
`docs/phase3/perf/gate/lighthouse.json`. Last column: 6b-after (2026-10-13).

| Page | Phone (runs) | Phone TBT / CLS / LCP | Desktop (runs) | Desktop TBT / CLS / LCP | 13/10 phone / desktop |
| --- | --- | --- | --- | --- | --- |
| `/gpu` | 97 (97/99/97) | 28 ms / 0 / 2.37 s | 99 (99/100/99) | 0 / 0 / 0.93 s | 99 / 100 |
| `/case` | **90** (83/90/90) | 353 ms / 0 / 2.41 s | 99 (99/99/98) | 64 ms / 0 / 0.93 s | 91 / 99 |
| `/case?pick=1`, build b | 95 (94/95/95) | 245 ms / 0 / 1.95 s | 99 (99/100/99) | 42 ms / 0 / 0.91 s | 93 / 100 |
| `/storage` | 95 (95/96/95) | 176 ms / 0 / 2.38 s | 99 (99/100/99) | 27 ms / 0 / 0.93 s | — |
| `/builder` (guided) | 98 (98/98/98) | 0 / 0 / 2.41 s | 100 (100/100/100) | 0 / 0 / 0.53 s | 98 / 100 |

### What misses or is at the line

- **`/case` phone: 90, at the line** (one run 83). The cost is the known one: the filter + facet-count pass over
  6,869 case listings after `list.json` arrives (TBT 353 ms). Not changed in step 3; the fix (counts after the first
  paint, in idle chunks) is the open item "Category pages' first-load speed". `/case?pick=1` scores higher than plain
  `/case` because with a saved build the pass runs once, after the check, in place of placeholders (6b).
- **Desktop 99 on the category pages**: run 2 of every category page scored 100 (FCP ≈ 0.50 s, LCP ≈ 0.62 s as on
  13/10); runs 1 and 3 ≈ 0.75 / 0.93 s. The difference is the product photos: the local preview proxies `/img/*` to
  the images site on GitHub Pages, and in runs 1 and 3 those answered ≈ 250 ms slower; Lighthouse's desktop simulation
  counts them before the first paint. `/builder` (no photos at load) is 100 in all three. Same code in all runs, so
  this is the network, not a regression; on the live site the photos come from Vercel's CDN.

## Bytes (gzip of the response bodies, KiB, until the pick check finished)

`node scripts/phase3/measure-pick.mjs bytes http://localhost:4173 docs/phase3/perf/gate/bytes.json`.

| | 13/10 (6b) | Now |
| --- | ---: | ---: |
| First-paint JS, every category page (`index` 64.2 + `CategoryPage` 11.6 + `data` 4.0 + `images` 7.9) | 86.5 | **87.7** |
| Pick code after the first paint (`PickView` 7.6 + `buildStore` 6.6 + worker 17.4; not counted, rule 11) | 31.3 | 31.6 |
| Data `/mobo?pick=1` a / b / c | — | 127.2 / 127.2 / 129.5 |
| Data `/cpu?pick=1` a / b / c | — | 56.6 / 56.6 / 59.9 |
| Data `/case?pick=1` a / b / c | 268.2 / 268.2 / 271.3 | **287.1 / 287.1 / 290.2** |

`/case/list.json` today: 6,869 listings; rows 190.4 KiB, history points (`hist`) 54.2, photo ids 31.0, imported
lows 10.1 (each part gzipped on its own).

## Risks

1. **`/case` data is 10–13 KiB under the 300 KB limit** and grew 19 KiB in four days (more listings and history).
   At this pace it passes the limit within a few weeks. It is not step 3's code. Options for the owner: count the
   limit per first paint only (the photo ids could load after the first paint), or keep it and trim the page's
   `list.json` (e.g. `hist` for models not on the first page). Not decided here.
2. `/case` phone is at 90 with one run at 83: below the line on a busy machine. Fix = facet counts after the first
   paint (open item, every tab).

## Open items for later steps

- Phase 3 gate items that need step 4: time to first product vs v1 (`scripts/phase1/content-timing.mjs`), keyboard
  reach of the first product (`scripts/phase1/keyboard-walk.mjs`), real model pages.
- Data value check: `maxMemoryGB` has 5 listings with "3" (the BestPrice "3.072GB" bug fixed on main in `2bdc58f`;
  cached pages not re-read yet) — the validation range (4–16,384) already makes them unknown.
