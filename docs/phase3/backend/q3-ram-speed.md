# Main backend queue Q3 (RAM speed + B9 batch 4) with Q5 (key aliases + history fold)

2026-10-19 · branch `a3-queue` commit `95c39c8` on `origin/main` `c4ab9ee` · **not pushed** (owner's OK first).
Plan: `docs/superpowers/plans/2026-10-17-main-backend-queue.md` Q3, Q5. Implementer + independent reviewer (2 rounds,
approved).

## What changes

- `scraper/normalize_ram.py`: reads Shopflix "με Ταχύτητα N" (and "DDR4-3200", "5200MT", the "6800GHz" typo). Range per
  type: DDR2 400–1,066, DDR3 800–2,933 (**new, owner to confirm**), DDR4 1,600–5,333, DDR5 4,000–10,000 MT/s. Outside
  the range or none stated: the part-number speed (G.Skill F4-/F5-, Corsair …NNNNC, ADATA/XPG AD/AX, Goodram GR/IR,
  Kingston KF/KVR/KSM codes seen with a matching stated speed on ≥2 titles), then DDR5 clock values ×2 when the double
  is a JEDEC speed, else unknown. A valid stated speed never changes.
- `scraper/model_aliases.json` (code-owned, 28 RAM entries) + `scraper/aliases.py`: old key → new key; chains collapse,
  cycles rejected. `main.write_history` / `update_history`, `site_history` and `merge_history check` fold an old key's
  points into the new key (own point beats imported, lower of the same kind, 365 trim). An alias is **skipped while its
  old key has listings again** (logged `[ram] alias X -> Y skipped: X has listings again`).

## Offline before/after (copy of main's `public/data/ram`, no network)

| | Before | After |
| --- | ---: | ---: |
| Listings changing model | | 1,205 of 6,502 (0 dropped, 0 added) |
| Models | 471 | 430 |
| History points | 114,704 | 113,173 (1,512 same-day pairs became one + 19 at the 365 trim) |
| Models with history | 510 | 485 |
| Skroutz import markers | 332 | 328 (5 moved, 4 onto an existing one) |
| `merge_history check` | | **passes without `--allow-shrink`** (0 points, 0 markers lost; 1,850 without aliases) |

Speed changes: 1,193 none → speed (≈1,154 via "Ταχύτητα"); 2800 → 5600 ×3; 2400 → 4800 ×3; 60000 → 6000 ×2;
48000 → 4800; 2600 → 5200; DDR2 3200 / DDR2 1600 / DDR3 667 → unknown. Aliases: 25 merges into an existing model,
3 renames. 63 old keys split across several speeds: no alias, their history stays under the old key. Merge targets:
22 cheaper, 0 more expensive.

## For the owner

1. **Push `95c39c8` to main?** Then watch the next scheduled scrape (history check, counts, Vercel).
2. **`allow_history_shrink` run:** the alias-aware check passes offline, so it should not be needed. Recommended: no
   special run; let the next scheduled scrape apply it, and use `allow_history_shrink` only if its check refuses.
3. **Visible effect:** 27 models without a speed in the name lose their cheap Shopflix listings to speed models, so
   their chart and week change show a rise (e.g. DDR4 16GB (1×16GB) Desktop 124.08 → 148.89 €). Nothing is lost.
4. **Deviation from the plan:** DDR5 ×2 also without "MHz" in the title (4 listings; the part number wins first and the
   double must be a JEDEC speed). New DDR2/DDR3 ranges above.
5. Not runnable locally: `test_specs.py` (Windows Application Control blocks selectolax again); tests that import
   `main` ran with a local stub. GitHub Actions runs the real library.
6. Known limits (minor): `merge_history.py restore` ignores aliases (the next scrape folds again); `check` excuses an
   aliased old key's point by the full alias list.

v2 side: after v2 merges main, the build reads `scraper/model_aliases.json` into `MODEL_ALIASES` (step 4 Task 5).

## Live result (2026-10-20)

Pushed as `ac84dfb`. The first scrape (19/10) had Skroutz 403s and a Shopflix RAM error, so 23 of 28 aliases were
skipped. Scrape **39372024820** (data commit `f77aac0`, 20/10 06:00 UTC) had 5/5 sources ok:

| | Offline (19/10) | Live (20/10) |
| --- | ---: | ---: |
| RAM models | 430 | 426 |
| Shopflix listings with speed null | not counted (1,193 listings of all sites gained a speed) | 1,216 → 51 |
| Alias old keys left in `ram/history.json` | 0 | 0 (all 23 aliases that apply folded) |
| RAM history points | 114,704 → 113,173 | 114,653 → 113,363 |
| `merge_history check` | passes without `--allow-shrink` | passed without `allow_history_shrink` |

**The 51 Shopflix listings still without a speed** (live data at `09cdb17`):

- **48 are expected**: the title states no speed at all. Shopflix's template leaves the value blank ("Kingston 32GB DDR4
  με Ταχύτητα για Server", "G.Skill Trident Z5 RGB 32GB DDR5 Mhz 2x16GB") or has no speed field ("Lenovo DDR4 με
  Module 1x16GB για Laptop", "G.Skill Trident Z5 Neo RGB DDR5 128GB RAM με Modules για Desktop", "Synology
  D4EU02-8G Μνήμη RAM 8GB DDR4 για Laptop"). Synology/Lenovo/HP/Dell codes are not in the part-number table, and
  guessing a speed for them would be wrong.
- **3 are missed patterns** (small, for a later batch):
  - "Φορητού DDR4 8GB G.Skill 3200 CL22 8GRS": bare speed before `CL`, no "MHz".
  - "1-0044 DDR3 2GB 1333 AMD Desktop DIMM για Desktop": bare JEDEC number after the size.
  - "Kingston KTH-PL426/16G 16GB DDR4": Kingston's HP-compatible code (`KTH-PL4` + `26` = 2666), not in the KF/KVR/KSM
    list.
  A bare JEDEC number next to the DDR type or before `CL` would catch the first two. Effect: 3 listings.
