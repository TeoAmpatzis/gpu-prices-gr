# Mouse implementation checkpoint — 2026-11-11

Owner requested **save progress and stop**. Resume from this checkpoint; do not repeat the live collection merely to recover context.

## Branch and scope

- Branch: `feat/mouse-category`, project `C:/Users/Teo/Desktop/PROJECTS/BuildDraft`.
- Last pushed commit before this checkpoint: `19e2955` (preflight findings). This checkpoint is a local commit, not a deployment.
- Implementation plan: `docs/superpowers/plans/2026-11-11-mouse-category.md`. Tasks 1–4 completed; Task 5 is in progress. **Do not mark Task 5 or Gate B complete.**
- Mouse is still `enabled:false, visible:false`. No mouse data was copied to `public/data/`; no main push, public release or hidden enablement occurred.
- Existing untracked `UNIVERSITY_PROJECT_PRESENTATION_GUIDE.md` is unrelated; preserve it.

## Saved code changes since the pushed checkpoint

- Added observed maker vocabulary and complete colour phrases; preserve model words Silent, Vertical and Ergonomic. Recognized makers can follow descriptive text/model codes; ambiguous multiple makers stay quarantined.
- Expanded maker vocabulary from **207 actual BestPrice/Skroutz mouse-filter labels** captured during the full trial, with observed punctuation aliases. This latest expansion has not yet been replayed over the full collection.
- Added mouse-only missing-model recovery from an exact matching list-page Product URL/name. Original card title remains `title`; supplemental observation persists in optional `identityTitle`, mirrored in Python/TypeScript.
- Recovery preserves card connection/colour/part-number evidence; rejects contradictory or accessory/used supplemental observations; repeat settling revalidates them. PN conflicts use evidence from both titles.
- Configured the seven measured BestPrice slices (176 list pages in the trial).
- Added real title fixtures, two real list-page JSON-LD excerpts and regression tests.

## Completed isolated live collection

Directory: `local/mouse/collection-20261111T202540Z/`.

Pointer: `local/mouse/current-trial.txt`. Runner: `local/mouse/collect_trial.py`. Log: `local/mouse/trial.log`.

| Source | Raw unique observations | List requests | Seconds | Blocked/errors |
| --- | ---: | ---: | ---: | ---: |
| BestPrice | 2,775 | 176 | 372.2 | 0 / 0 |
| Skroutz | 3,996 | 84 | 199.7 | 0 / 0 |
| Snif | 1,158 | 62 | 129.6 | 0 / 0 |

All three source callbacks succeeded. Requests used existing per-host pacing. No shipping, product-spec pages, price-graph history, manufacturer pages or image downloads were requested. Ordinary daily lows and candidate photo URLs were derived locally.

Files:

- `raw/<source>.json`: source observations saved **before** settling/admission; timing files alongside them.
- `pages/*.html`: all captured source responses, including Snif's terminal response. Keep these for offline replay.
- `data/mouse/latest.json`, `rejected.json`, `history.json`, `image_urls.json`: initial admission output from the module version loaded when collection started.
- `result.json`: source success metadata and request counters.
- `maker-filter-labels.json`: 207 observed maker labels extracted afterward from the cached source filters.

**Initial output is not the final review dataset.** The live process loaded an earlier normalizer before review corrections and the 207-maker expansion. It admitted 3,349 observations / 2,454 model keys and rejected 4,580 observations: 4,475 no-identity, 75 not-mouse, 17 identity-conflict, 13 bundles. Do not calibrate `MIN_MODELS.mouse` or publish these numbers as final coverage.

Large no-identity counts exposed vocabulary gaps. Most initial no-identity cases lacked a recognized maker; there are also genuinely unbranded titles, ambiguous parent/sub-brand titles and missing model names. Examples requiring review include A4Tech Bloody, BakkerElkhuizen/Evoluent and ATK VXE. Do not guess relationships to force a merge.

## Checks and review

- Current focused checkpoint checks pass: **28 normalizer tests, 35 Skroutz collector tests, 10 mouse pipeline tests**. Logs: `local/mouse/checkpoint-*.log`.
- `npm run check` passed during this turn: 83 suites, 1,655 passed / 1 skipped, typecheck/lint/build green (`local/mouse/task5-check.log`).
- All 31 Python check programs passed before the final supplemental-title fixes and maker expansion. Rerun them before committing finished Task 5/releasing; do not treat the earlier run as proof of those later changes.
- Independent reviewer reproduced supplemental rejection/evidence-loss bugs; red/green tests fixed them and review confirmed no remaining Critical/Important finding in those fixes. The later 207-maker expansion has not had a full-data review.
- Previous complete local browser suite: 322 passed. GitHub run `43092987454` tested pushed code `8e71980`; its check job passed and browser job was still in progress at the last check. Check status when resuming; do not dispatch/cancel/rerun blindly.

## Resume next

1. Inspect this local checkpoint commit, status, ledger and existing trial outputs. Keep work inside this project.
2. **Replay cached pages offline through the current parsers**, not just the old normalized rows. This preserves list-spec evidence and applies supplemental-title fixes. Reconstruct source IDs/dedup/tags exactly as the readers do: Skroutz cheapest across cards/paths, gaming true on overlap; BestPrice/Snif first-per-ID as existing readers. Reuse original source `scrapedAt` and trial freshness metadata. Assert parsed unique counts match saved raw observations. Block network in the replay.
3. Run the existing pipeline over those reconstructed observations with `DATA_DIR` patched to a new directory inside this trial (e.g. `replay-data/`), shipping disabled. Retain the original `data/` and raw files as evidence. No replay/report script has been written yet.
4. Inspect new rejects and false joins/splits. Confirm Snif termination from its final captured response. Any further parser fix needs an observed-title regression, then another offline replay; no new source requests needed for these corrections.
5. Complete `docs/peripherals/MOUSE_DATA_REVIEW.md`: full per-source counts, all reject reasons and up to 20 examples each, 50 seeded random model groups, source-only models, per-field unknown/conflict coverage, runtime, candidate-photo coverage. Current file still describes the **partial preflight** and must be updated around the full trial plus corrected replay.
6. Run all 31 Python programs and relevant frontend checks; get final focused review. Commit finished code/report and push only within existing authorization/scope, never rewrite history or push generated local data.
7. **Owner reviews Gate B before hidden enablement.** Only afterward derive the reviewed frontend model count and set the minimum, enable hidden processing, and proceed to Tasks 6–9. Public visibility remains a separate approval gate.

Detailed execution ledger: `.superpowers/sdd/2026-11-11-mouse-category/progress.md`. Preserve this directory while the plan is unfinished.
