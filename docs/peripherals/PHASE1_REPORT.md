# Phase 1 report: registry and boundaries (no visible change)

Date: 2026-11-08. Branch `design/deals-rework`. Nothing committed, pushed or deployed. Working-tree changes only.

## What changed

| Area | Change |
|---|---|
| Registry | New `src/lib/registry.ts`: `REGISTRY` (`domain`, `builderSlot?`, `enabled`, `visible` per category), `Category` derived from it, `SlotCategory = Extract<Category, Slot>`, `slotOf(cat): Slot \| null`. `src/types.ts` re-exports `Category` from it (same nine members). |
| `SLOT_OF` | Now `Record<SlotCategory, Slot>` (a builder-only map). Users switched to `slotOf`: `derive.ts` `modelChunks` (replaces the `Partial<Record>` cast), `PickView.tsx`. Tests that read `SLOT_OF` are unchanged. |
| `pick=1` guard | `CategoryView.tsx`: `picking = filters.pick && slotOf(cfg.id) !== null`. A category without a slot stays a normal page and the picker chunk (`loadPick`) is never imported. Not testable on the real site until a non-slot category exists (Phase 2); the logic is two lines. |
| Python category list | New `scraper/category_ids.py` (no imports; `merge_history.py` is a git merge driver, so it stays light). `categories.py` raises at import if its `CATEGORIES` keys differ from it; `glitches.py` and `merge_history.py` use it instead of their own hand-written lists. |
| Capability table | New `scraper/capabilities.py`: operations `lists / specs / shipping / history`, `UNSUPPORTED` (empty for now), `supports(source, category, op)`. Wired in `main.py` (`allowed()` filters listings for specs, makers and shipping; the `--history-only` loop skips categories where Skroutz history is unsupported) and `validate_skroutz.py` (checks only the categories Skroutz lists). `scrape.yml`: one step label no longer says "nine". |
| Tests | New `tests/unit/registry.test.ts` (ids agree across the TS registry, `category_ids.py`, `categories.py`, `site-check.mjs`; builder parts ↔ slots) and `scripts/checks/test_capabilities.py`. `test_history_git.py` copies `category_ids.py` into its temp repo (it copies a fixed file list). README row added. |

Files touched: 12 modified, 5 new (plus the Phase 0 docs in `docs/peripherals/`). `git status` shows nothing else.

## Gate results (FINAL_PLAN §6, Phase 1)

| Gate | Result |
|---|---|
| `npm run check` (typecheck, lint, 1538 tests in 71 files, build) | green. One lint warning (`PriceChart.tsx:70`), present in the baseline too. |
| `dist/data` for the nine categories byte-identical | **Yes**: 2923 files, old HEAD build vs new build, timestamps normalized, 0 differences. (Every data file embeds the build time, so raw hashes differ run to run.) |
| `data-equivalence.test.mts` | ALL EQUAL |
| Existing unit/e2e/compat tests unchanged | unit and compat: all pass, none edited. **Playwright e2e not run** (not part of `npm run check`). |
| Python tests | all `scripts/checks/test_*.py` pass (run with a scratch venv built from `scraper/requirements.txt`). `test_history_git.py` failed first because of the new import in `merge_history.py`; fixed by copying `category_ids.py` in the test. Production workflows check out the whole repo, so they are not affected. |
| Same first-load bytes | entry `index-*.js` 219.22 kB raw / 72.07 kB gz before and after (hash name differs, size identical). |
| Rollback | revert the working-tree changes / branch; no data or deploy touched. |

## Lighthouse baseline (Phase 0 §7 conditions, run once, mobile preset, Chrome from this PC, `vite preview` of the Phase 1 build)

| Page | Perf | FCP | LCP | TBT | CLS | Downloaded | JS |
|---|---|---|---|---|---|---|---|
| `/` | 99 | 1.2 s | 2.0 s | 0 ms | 0.001 | 157 KB | 72 KB |
| `/gpu` | 99 | 1.2 s | 2.0 s | 10 ms | 0 | 239 KB | 97 KB |

One run each, not the five-run median proposed in Phase 0 §7: treat as indicative. Taken on the Phase 1 build; because bytes are identical to the pre-change build, it also stands as the baseline. `/builder` was not measured. Run with `npx lighthouse@12` (one-off, nothing added to the repo).

## Follow-up checks (run after the first report)

- Playwright e2e (`npx playwright test`, local preview): 276 passed, 1 failed in the full run (`builder-gate` `e-guided-1366-el`, problem text `"fatal: "`). The same test passed when rerun alone, so it looks like a one-off in a 9-minute run; cause not found.
- `node scripts/checks/site-check.mjs http://localhost:4173`: all checks passed (73 smoke and URL tests). The data-age and cache-header parts are skipped or local-only on localhost; the live site was not checked.
- Lighthouse, median of 5 runs each, mobile preset, local preview: `/` perf 99, LCP 1.96 s, TBT 0 ms, CLS 0.001. `/gpu` perf 99, LCP 1.96 s, TBT 15 ms, CLS 0. `/builder` perf 98, LCP 2.27 s, TBT 0 ms, CLS 0. These replace the one-run numbers above.

## Not done / risks

- The live `site-check.mjs` was not run (no deploy happened).
- `pick=1` on a non-slot category: guarded, but no category exists to exercise it yet.
- `glitches.py` now visits categories in scraper order (storage last), not its old order (storage fifth). It only changes the order of console output rows.
- The registry has `enabled` and `visible` but nothing reads `visible` yet (Phase 3 uses it for navigation and sitemap).
- `capabilities.UNSUPPORTED` is empty; the Skroutz restrictions for monitors go in when the monitor category is added (Phase 2). `history.yml` and `site_history.py` were not changed (O1 stays your call).
- Python edits are untested against a real scrape run (no network scrape done); behaviour for the nine categories is covered by the existing test suite and the byte-identical build only.
