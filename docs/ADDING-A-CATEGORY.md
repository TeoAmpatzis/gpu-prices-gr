# Adding a category

Written after mice (2026-11-12), from the files that change actually touched. Monitors followed the same path. The rules in `docs/PROJECT-STATE.md` apply throughout: a plan the owner approved before any scraper change, the owner's yes before every push to `main`.

## The three states

A category moves through three states in `src/lib/registry.ts`, each with its own push:

| State | Registry | What it means |
| --- | --- | --- |
| Disabled | `enabled:false, visible:false` | The scraper collects it; the site build ignores it. Needed first, because the build rejects an enabled category that has no data. |
| Hidden | `enabled:true, visible:false` | The build derives its files and the publishing check guards it; no route, menu, search or sitemap entry. |
| Public | `enabled:true, visible:true` | On the site. |

Mice went from disabled to public in one push, because the checks ran on the public state. Use the hidden state when the page needs review on real data first.

## Scraper

1. `scraper/category_ids.py`: the id, last. `tests/unit/registry.test.ts` checks it equals the site's list.
2. `scraper/models.py`: the listing dataclass. A spec no source states is `None`, never a default.
3. `scraper/normalize_<cat>.py`: `make_listing` and, when identity needs all listings, `settle`. Tests on observed titles in `scripts/checks/test_normalize_<cat>.py`.
4. `scraper/categories.py`: source paths, `model_key`, `shared` fields, `rejects`, `images`. BestPrice shows at most 50 pages (800 products) per list: measure price slices first.
5. `scraper/capabilities.py`: what each source may do for the category (lists, product pages, shipping, history). `scripts/checks/test_capabilities.py` pins the matrix.
6. No new workflow. The two scrape workflows run every category.

## Site

Each of these is a map with one entry per category; `tsc` fails until all have one.

- `src/types.ts`: the listing type.
- `src/lib/registry.ts`: the entry (`domain`, and `builderSlot` only for PC parts).
- `src/lib/categoryRules.ts`: pills, model key (the same as the scraper's), filters. `src/lib/categories.tsx`: texts, icon, table columns.
- `src/lib/ranking.ts`: Recommended weights and the `MODERN` score.
- `src/shell/nav.ts` (name, menu group), `src/shell/texts.ts` (page title and subtitle).
- `src/ui/specs.ts` (spec line and product-page rows), `src/components/catalogue/specs.ts`, `src/components/product/keySpecs.ts`.
- `src/lib/derive.ts`: `MIN_MODELS` (half the first collection's model count, from the build's manifest) and `LIST_SKIP_BY_CATEGORY` for fields the list rows never use.

At release, in the same commit as `visible:true`:

- `vercel.json`: both rewrites (`/<cat>` and `/<cat>/<slug>`).
- `scripts/checks/site-check.mjs`: the `CATS` list.
- `tests/unit/registry.test.ts`: the published list.

Search, sitemap, per-address pages, home tiles and comparison follow the registry; they need no edit.

## Tests that read every category

These run over the real data of each enabled category, so a new one joins them on its own and may need an entry:

- `tests/unit/facets.test.ts`: pill and filter counts.
- `tests/unit/keySpecs.test.ts`: expects four header specs for most models; mice are exempt because their sources state few specs.
- `tests/unit/modelChunks.test.ts`: `NO_CHEAPER` lists the categories without a "same, cheaper" rule.

## Order of work

1. Disabled scaffold and normalizer with tests; `npm run check`, the Python checks.
2. One isolated local collection into a folder under `local/`, never into `public/data/`. Keep the fetched pages: every later parser change is then tested offline.
3. A data review for the owner: counts per source, every reject reason with samples, fifty random model groups, share of unknown per field.
4. With the owner's yes: merge to `main` while disabled, and let the workflows collect. Compare with the local trial.
5. Filters, specs and tests. A local build with the category made visible, for screenshots and the browser tests; restore the flag afterwards.
6. With the owner's yes: public. Then `node scripts/checks/site-check.mjs` and `node scripts/checks/freshness.mjs` on the live site.

## Run time

Measured for mice: about 6 minutes more in the `scrape-shops` prices job (BestPrice 176 list pages, Snif 62) plus 60 BestPrice shipping pages per run, and 3.5 minutes of Skroutz list reading (84 pages). The prices job took 60 minutes of its 90 with mice.

## Taking a category back

- Public to hidden: revert the release commit (registry flag, `vercel.json`, `site-check.mjs`, the registry test) and push. The data and its history stay.
- A parser fault: fix the normalizer with a test, push, and let the next scheduled run rewrite the data. Do not delete data or rewrite history.
- Renaming or merging models drops history points: run that scrape with `allow_history_shrink` and `allow_data_drop`.
