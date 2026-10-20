# Main backend queue Q4b: wrong imported Skroutz lows — plan (owner's OK needed before building)

2026-10-20. Parent: `2026-10-17-main-backend-queue.md` Q4b. Branch `a3-queue` (worktree
`C:\Users\Teo\Desktop\PROJECTS\buildcraft-a3`), after Q4. Needs an `allow_history_shrink` run → owner's OK before
building, before the push and before the run. Numbers below: main's data at `09cdb17`, offline, scripts in
`.superpowers/sdd/q4b-investigation/`.

## Cause (checked at the source)

Skroutz's own `price_graph` carries bad days. Fetched 20/10 (2 requests): the "all" series of **Xeon E-2486**
(median 616 €) and **Core i9-14900KF** (median 444 €) both have **369.59 € on 2025-09-10**; the i9 also has 286 € on
2026-01-23. Our import takes `min()` of the whole series, so the bad day becomes the model's all-time `low`, and its
daily point lands in `history.json` as `"i": 1`. The same value on the same day shows up in unrelated products and
even other categories (369.59 € in cpu/mobo/storage; 97.99 € on 2026-06-26 in 7 categories; several values on
2026-01-23) — one bad value per day on Skroutz's side.

## The rule (same as v2's, owner-approved 18/10 in ecf3f58, ported to Python)

An imported point is a glitch when **(a)** its exact value on that day is an imported point of **N = 3 or more
models of the category** (or its value is a `low` that 3+ models of the category share), and **(b)** it sits in a run
of at most 3 days at that value, every point imported, with the neighbours at least 5 % higher. (b) is what spares
real sales: a long flat run at a round price on many models (24 €, 12.90 €) stays.

Why N = 3 (shared lows, same day + value):

| N | Models whose `low` is shared | Note |
| ---: | ---: | --- |
| 2 | 946 | catches plain coincidences (two variants of one product, round prices) |
| **3** | **402** | gpu 6, cpu 13, mobo 38, ram 18, storage 49, psu 9, case 68, fan 127, cooler 74 |
| 4 | 264 | misses the 3-model glitches (e.g. 3 RTX/Arc cards at 115.43 €) |

**Real lows it would wrongly catch (estimate).** Without (b), a same-day + same-value rule at N = 3 also catches
thousands of real prices (identical cheap fans; the B9 duplicate keys). With (b), the groups that still look like
real promos are sibling models of one maker, several days at the same price: among the 402 shared lows, **30 models**
(1 mobo group of 3: Asus Prime B840M-A / B860M-K / H810M-A WiFi at 94.90 €; 8 fan groups of 27: Corsair iCUE Link LX
120/140 at 35.89 €, Noctua NF-A12x15 variants at 18.71 €, Chieftec at 4.13 €). Their old `low` stays, unless the run
shape says glitch. Never touched: our own scraped points (no `"i"`), and lows not shared by 3+ models.

## Applied AT IMPORT (so a re-import can't bring the bad data back)

1. `scraper/glitches.py` (new): `shared_days(history)`, `shared_lows(imported)`, `glitches(points, shared, bad)`
   — a line-by-line port of v2 `src/lib/dips.ts` (`sharedImportedDays`, `sharedImportedLows`, `importGlitches`, same
   constants 3 / 3 days / 5 %). Test: the same fixtures as v2's `tests/unit/dips*.test.ts` give the same output.
2. `site_history.enrich`: before `merge()` and before `min(past)`, the fetched series loses its glitch runs (shared
   days = the category's `history.json` imported points + the series being imported; bad lows = the category's
   shared lows). `low` = the lowest point left.
3. The category pass after every history run and every scrape (`main.write_history`): glitch runs found by the
   rule are removed from `history.json`. A glitch only becomes visible when the 3rd model with it is imported, so
   this pass also cleans the first two.
4. `merge_history check`: removed points that the rule flags on origin/main's data are excused (like the alias
   excuse), so routine clean-ups don't need `allow_history_shrink`. **Owner decision:** OK to excuse them, or should
   every removal need a manual shrink run?

## One-off clean-up (the `allow_history_shrink` run)

- `history.json`: **604 imported points removed in 374 models** (of 1.82 M points): gpu 1, cpu 11, mobo 65, ram 5,
  storage 35, psu 5, case 121, fan 275, cooler 86. Examples: T400 4GB 2025-09-10 115.43 €; Core i7-12700T / i7-13700T /
  EPYC 7313 2025-09-10 369.59 €; ASRock Knoll3 and WD Gold 18TB 369.59 € the same day; 500W Standard ATX and Akyga
  AK17 / Deepcool Cyclops / Inter-Tech B30 cases at 24 €; 750W Gold SFX 97.99 € 2026-06-26/27; Adata Legend
  710/860/900 Pro 2TB 220.16 € 2026-07-30.
- `history_imported.json`: the **402** models whose `low` is shared (N = 3) lose their entry, so the import fetches
  them again with the rule. Their bad lows are mostly older than the 365 points we keep (the Core i9-14900KF low
  369.59 € is not in `history.json`), so a re-import is the only way to get the right low.
- The run: `history.yml` with `allow_history_shrink` (ask first). The offline before/after (implementer, report
  `docs/phase3/backend/q4b-glitches.md`) re-runs these counts with the Python port: points removed per category,
  models whose `low` changes, 10 examples incl. the 115.43 / 369.59 / 24 € cases, and checks that our own scraped
  points are untouched.

## Re-import cost (existing budget: 60 `price_graph` requests per category per day, 5–8 s apart)

| | gpu | cpu | mobo | ram | storage | psu | case | fan | cooler |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Models | 6 | 13 | 38 | 18 | 49 | 9 | 68 | 127 | 74 |
| Requests (gpu/ram/psu: 3 products each) | 18 | 13 | 38 | 54 | 49 | 27 | 68 | 127 | 74 |
| Days at 60/day | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 3 | 2 |

468 requests in all, no extra Skroutz load: same request, same budget, same pauses; only the order changes. Two
facts from the 20/10 history run: first imports are still queued (case 882 models left, storage 890, cooler 240,
fan 237), and Skroutz answered 403 to the fan/cooler/storage history requests that day (0 imported). Proposal: the
re-imports go first in their category's queue (they're the most-listed models), which delays the first-import
backlog by the same 1–3 days. With 403 days like 20/10, expect **1–2 weeks**, not 3 days.

## What the site shows until a model's re-import runs

- **Live v1 (main):** `allTimeLow` (src/lib/data.ts) gives the badge only when today's price ≤ every past low and
  the imported `low`. So a bad, too-low `low` never shows a false badge: it **hides a real "all-time low" badge**,
  and the glitch day shows as a dip on the chart. After the push the 604 points are gone; until a model is
  re-imported its low comes from `history.json` only (badge after ≥ 60 days of points, as today).
- **v2:** ecf3f58 already ignores a `low` shared by 3+ models of the category and marks the glitch points `g: 1`
  (left out of the line, the low, the median and the week change). v2 already shows the corrected picture; this
  fix makes main's data agree with it, and v2's filter stays as a second net.

## Steps

1. **Owner OK on this plan** (and on item 4: excuse rule-flagged removals in `check`?).
2. Implementer (TDD, port + parity test with v2's fixtures) + independent reviewer; offline before/after report.
3. Ask before the push; ask before the `allow_history_shrink` run.
4. Watch the run: history check, points removed ≈ 604 (plus any new ones), re-import progress per day, Vercel.
