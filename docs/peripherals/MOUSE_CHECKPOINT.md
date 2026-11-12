# Mouse implementation checkpoint — 2026-11-11 (Gate B)

**Update 2026-11-12**: the owner approved the merge. `main` = `e377b42` (this branch merged with `origin/main`, fast-forward push at 05:25 UTC), mouse still disabled and invisible. On the merged code before the push: 31 Python check programs, `npm run check` (1,655 tests) and `npm run e2e` (322 of 322) passed; after it the Vercel deployment succeeded and `node scripts/checks/site-check.mjs` passed on the live site. Same part number under two names: the owner keeps the plan's rule (reject both). The owner did not comment on the 50 model groups. **Now waiting** for the first scheduled collection with mouse (plan Task 5, step 3): `scrape-shops` at `43 */6` UTC and the next gated `scrape`; do not start runs by hand without asking. Then compare `public/data/mouse/` on `origin/main` with the trial (7,114 listings, 5,037 models) before step 5. The 00:43 UTC `scrape-shops` slot of 2026-11-12 started no run (see "Also watch" below). The sections below describe the state before the merge.

**Update 2026-11-12, 10:15 UTC** (owner: wait for the scheduled Skroutz run, keep the mouse shipping reads, finish the remaining tasks):

- `scrape-shops` run 43162578473 (started by hand with the owner's yes) succeeded: `prices` 60 min, `specs` 19 min. Mouse on `origin/main`: BestPrice 2,554 and Snif 1,034 accepted listings, 2,546 models, 347 rejected; the trial had 2,551 and 1,032. It also read 60 BestPrice mouse shipping pages (135 s).
- Skroutz mouse data is still missing. The gate lets `scrape` run when Skroutz data is older than 11 h (last 02:03 UTC), so the 16:13 UTC wake-up is the first that can run.
- Local commits on this branch, not pushed: a parser fix (a model number before "Κουμπιά:" was read as the button count, 9 listings; offline replay-5 unchanged at 7,114 listings / 5,037 models), Task 6 (filters, dual-mode pills), Task 7 (spec rows, colour selector on the model page), menu and home from the registry, `tests/e2e/mouse.spec.ts`. Unit tests: 1,674 pass; the Python checks pass.
- Not committed on purpose: `src/lib/derive.ts` (list file leaves out `partNumber` and `identityTitle`) and `tests/unit/mouseQuality.test.ts`. Its one failing assertion is `MIN_MODELS.mouse > 1`: it turns green at Task 5 step 5.
- Local rehearsal with mouse visible (BestPrice and Snif data only): build passed, `mouse/list.v2.json` 112 KB gzip, mouse browser tests 5 of 5, no overflow at 360 px. Screenshots: `local/mouse/preview/` (`node local/mouse/shots.mjs`). The registry was restored to disabled and invisible afterwards.
- Seen in the rehearsal: no source states a "No" for Bluetooth, RGB and the other flags, so those filters offer only "Yes" (the "No" choice appears when a source states it).

**Next, when Skroutz mouse data is on `origin/main`:** merge `origin/main`; set `MIN_MODELS.mouse = floor(N / 2)` from the build's manifest count; `enabled:true, visible:false`; `npm run check`, `npm run e2e`, the Python checks; commit Task 8; push to `main` (hidden). Then Gate C: the owner's yes for `visible:true`, with `vercel.json` rewrites and `site-check.mjs` in the same commit, and Task 10 documents.

The first data review: [MOUSE_DATA_REVIEW.md](MOUSE_DATA_REVIEW.md).

## Branch and scope

- Branch `feat/mouse-category`. Pushed with the owner's yes on 2026-11-11: `origin/feat/mouse-category` is at `f73c8d9` (parser fixes and the Gate B report). Later commits, such as this checkpoint, are local until the owner approves another push.
- Checks on `f73c8d9` before that push: all 31 Python check programs, `npm run check` (1,655 tests) and `npm run e2e` (322 of 322) passed. The push started no CI run on the branch; GitHub run 43092987454 (green) tested the older `8e71980`.
- Plan: `docs/superpowers/plans/2026-11-11-mouse-category.md`. Tasks 1–4 are complete. Task 5: steps 1, 2 and 4 are done; step 3 (a collection through GitHub Actions) has not run; steps 5 and 6 follow the owner's review.
- Mouse is `enabled:false, visible:false`. No mouse data is in `public/data/`. Nothing was pushed to `main`.
- The untracked `UNIVERSITY_PROJECT_PRESENTATION_GUIDE.md` is unrelated; leave it.

## What exists

- Parser and identity: `scraper/normalize_mouse.py`; tests `scripts/checks/test_normalize_mouse.py` (32), `test_skroutz_collector.py`, `test_mouse_pipeline.py` (10); observed titles in `scripts/checks/fixtures/mouse-titles.json`.
- The live trial of 2026-11-11 20:25 UTC: `local/mouse/collection-20261111T202540Z/` (ignored by git; `local/mouse/current-trial.txt` points to it). `pages/` holds all 322 captured list pages, `raw/` the observations as collected. Keep both: they make every parser change testable without new requests.
- `local/mouse/replay_trial.py <name>`: runs the real source readers against the saved pages (network blocked) and the normal pipeline into `<trial>/<name>/`, then checks that IDs and prices equal `raw/`. `replay-4` is the reviewed data.
- `local/mouse/report.py <name>`: the data sections of the review (counts, rejects, 50 seeded model groups, field coverage). The review document is `local/mouse/report-head.md` followed by that output.
- `local/mouse/explore*.py`: quick looks used while fixing the parser (collisions, unknown makers, price spreads, connection joins).

## To change the parser again

1. Add the observed title to a test in `scripts/checks/test_normalize_mouse.py` and see it fail.
2. Fix `scraper/normalize_mouse.py`, run the three mouse test programs.
3. `venv/Scripts/python local/mouse/replay_trial.py replay-5` (a new name each time), then `local/mouse/report.py replay-5` and compare with the previous replay.
4. No source requests are needed for this.

## Open with the owner (asked 2026-11-11, not answered yet)

1. The review itself: the 50 random model groups and the reject samples in MOUSE_DATA_REVIEW.md.
2. Same part number under two names: keep rejecting both listings (20 in the trial), or treat them as one product as the storage category does.
3. A separate yes to merge this branch into `main` with mouse disabled and invisible, so the scheduled workflows collect mouse data once. The workflows run from `main`, and a push to `main` deploys.

Before any merge: local `main` (`174d35c`) has a different history from `origin/main`, and `git diff main...HEAD` reports no merge base. Compare the branch with a freshly fetched `origin/main` instead, and do not reset or force anything.

Also watch: scheduled `scrape-shops` run 43091153663 (2026-11-11 19:52 UTC) failed because its `specs` job stayed queued for 16 minutes and never started; `prices` had succeeded and committed. No step of ours failed. If the next runs show the same, look at the job split of `fb23142`.

## After the owner's review (Gate B)

1. Decide the open points listed under "Known limits" in the review.
2. With the owner's yes: merge to `main` (mouse disabled) and collect once through the existing workflows (plan Task 5, step 3). A local trial is not production data.
3. Set `MIN_MODELS.mouse` from the frontend's own model count of the reviewed data, then `enabled:true, visible:false` (steps 5–6).
4. Tasks 6–9: filters, colour selector, derived-data tests, visible preview. Public visibility is a separate approval (Gate C).

Execution ledger: `.superpowers/sdd/2026-11-11-mouse-category/progress.md`.
