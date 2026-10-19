# Main backend queue Q4: plausible ranges before `SAFER` — plan (owner's OK needed before building)

2026-10-19. Parent plan: `2026-10-17-main-backend-queue.md` Q4. Branch `a3-queue`, one commit, owner's OK before the
push; starts only after the first scheduled scrape on `ac84dfb` (Q3) is green.

## Problem

`main.share` and `makers.apply` join the sites' and makers' measurements with `specs.SAFER` (min for clearances, max
for lengths) **before** anything checks the values. A wrong value then wins for every listing of the model:
BestPrice's Spire U20M `gpuMaxMm` 3.502 beats Skroutz's 350 (min), and a cooler "height" of 25 mm (the fan's thickness)
loses to nothing when it is the only value. v2 hides out-of-range values at build (`src/data/validate/ranges.ts`,
`enforce`), but then the right 350 is already gone.

## Change

- `scraper/ranges.py` (new): the same table as v2's `ranges.ts`, one line per v2 id —
  `cooler-height` heightMm 30–200 · `case-gpu-max` gpuMaxMm 100–700 · `case-cooler-max` coolerMaxMm 25–250 ·
  `gpu-length` lengthMm 100–400 · `cpu-tdp` tdp 10–500 · `mobo-max-memory` maxMemoryGB 4–16,384 · `ram-cas` cas 5–60.
  Not included: PSU watts (v2 report-only; it is the model name), RAM speed (done in the normalizer by Q3), GPU
  `minPsu` (v2's floor depends on the card's power table; stays in v2).
- One function `ranges.clean(cat, listings, origin)` sets an out-of-range value to `None` and logs
  `[<cat>] range: <field> <value> from <site/maker> dropped (<v2 id>)`, counted per field in the run summary.
- Called at the two places values enter, before any sharing:
  1. `main.finish` right after `specs.apply` (shop product pages + title values), before `makers.apply` and `share`;
  2. inside `makers.apply` on each maker value before it is filled or joined through `SAFER`.
  `overrides.json` stays last and unchecked (a hand-set value always wins).
- No new fields, no schema change, no history effect, no workflow inputs needed.

## Tests (`scripts/checks/test_ranges.py`, real saved values)

- Spire U20M: BestPrice 3.502 + Skroutz 350 → both listings 350 (today 3.502).
- A cooler with only a 25 mm "height" → `None` (unknown), not 25.
- Every boundary inclusive (3000 W style lesson: 30 mm cooler, 700 mm case, 16,384 GB kept).
- A maker value out of range is dropped and the shop value kept.
- Table equality with v2: a test reads `buildcraft-v2`'s `ranges.ts` ids/min/max when present (skipped on GitHub) so the
  two tables can't drift unnoticed.

## Offline before/after (copy of main's data, no network)

Run `specs.apply` + `makers.apply` + `share` old vs new on every category: values dropped per field and site, models
whose shared value changes (old → new, e.g. Spire U20M 3.502 → 350), and listings that go from a value to unknown.
Expected small: the validation report had 23 out-of-range values (gpuMaxMm 3.502, coolers 12–14 mm, 28 case listings
> 500 mm are inside 700).

## Steps

1. Owner OK on this plan. 2. Implementer (TDD) + independent reviewer. 3. Before/after report
`docs/phase3/backend/q4-ranges.md`. 4. Ask before the push. 5. Watch the next scrape: green, `range:` lines ≈ the
offline count, history check, counts, Vercel.
