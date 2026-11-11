# Mouse implementation checkpoint — 2026-11-11 (Gate B)

Work stops here until the owner has reviewed the first data: [MOUSE_DATA_REVIEW.md](MOUSE_DATA_REVIEW.md).

## Branch and scope

- Branch `feat/mouse-category`. `origin/feat/mouse-category` is at `19e2955`; the later commits are local only (a push needs the owner's yes).
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

## After the owner's review (Gate B)

1. Decide the open points listed under "Known limits" in the review.
2. With the owner's yes: push the branch and collect once through the existing workflows (plan Task 5, step 3). A local trial is not production data.
3. Set `MIN_MODELS.mouse` from the frontend's own model count of the reviewed data, then `enabled:true, visible:false` (steps 5–6).
4. Tasks 6–9: filters, colour selector, derived-data tests, visible preview. Public visibility is a separate approval (Gate C).

Execution ledger: `.superpowers/sdd/2026-11-11-mouse-category/progress.md`.
