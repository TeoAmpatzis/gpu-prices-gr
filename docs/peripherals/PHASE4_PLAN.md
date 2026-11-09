# Phase 4 plan: universal comparison (every category, not only monitors)

Date: 2026-11-09. Branch `feat/compare`. Teo's decision: comparison works for **every part on the site** (the nine PC-part categories and monitors). Based on `FINAL_PLAN.md` section 4 and decisions D1, D3, D4. Nothing is visible until the last task; the entry points (tray, button, `/compare` route) stay hidden behind one flag until Teo approves.

## What exists and gets reused
- `productSelection.ts`: `bd1:<source>:<id>` listing selection and its encode/decode.
- `modelData.ts`: `loadModel(cat, slug, expectedBuiltAt)` with the build-mismatch check.
- `offers.ts`: `offerTotal`, `sortOffers`, `availabilityOf`; `priceSummary.ts` for the price rows.
- `ui/specs.ts` `specGroups(cat, listings, lang)`: the full spec rows of every category, already Greek and English, with the "from the shop page" tag. This is the adapter source for the nine existing categories (D4).
- Registry (`registry.ts`) says which categories exist and are visible.

## Design (decisions already taken in FINAL_PLAN are not repeated)
- **Pure module `src/lib/compare/`**, lazy chunk, no pricing maths of its own, independent of the PC-builder engine.
- **Reference:** `{cat, slug, selection?}`. Text form `cat:slug` or `cat:slug:bd1:source:id`. Cards compare an exact listing; a family page compares the family (labelled as such).
- **State:** `localStorage bdCompare:v1`, one active group, max 4 items per category, max 3 groups (12 items). Adding to a full group returns a "full" result and the UI says so: no silent removal. All reads and writes in try/catch; corrupt data is ignored; the `storage` event keeps tabs in sync. Separate from the saved PC build (`pcBuild`).
- **Share link:** `/compare?v=1&cat=gpu&items=<ref>,<ref>` for the active group only; at most 4 items, duplicates rejected, anything invalid ignored. Opening a link never overwrites saved groups.
- **Table:** rows aligned by label across the items of one category. Per row: all equal, differs, or unknown for some items. Differences get a non-colour marker. No winner. Only price and delivered total may carry a "lower" marker, and only when both totals are known. "Hide identical" keeps rows with unknown values; a separate switch hides rows unknown for every item.
- **One build snapshot:** all items load against one `builtAt`; a mismatch gives a whole-table retry state, a single failure keeps the other columns with retry/remove.
- **Phones:** two columns at a time with an item selector; sticky labels.
- **Privacy:** new localStorage key and the share link are added to the privacy text, and `PRIVACY_UPDATED` is bumped in the same change.

## Tasks
1. [ ] References and share links: `refs.ts` encode/decode/validate, tests for malformed, duplicate and oversized input.
2. [ ] State: `store.ts` with the limits, results (`added`, `full`, `duplicate`, `wrongCategory`), persistence and cross-tab sync, tests incl. corrupt JSON and blocked storage.
3. [ ] Table builder: `table.ts` rows from `specGroups` plus price rows (cheapest offer, delivered total when known, availability only if collected), equality/unknown rules, hide-identical, tests.
4. [ ] Data loading hook with one-snapshot check and per-item retry.
5. [ ] UI: compare button (rows, cards, model page), sticky tray, `/compare` page, mobile layout; Greek and English strings.
6. [ ] Wiring: route `/compare`, `vercel.json` rewrite, `pageMeta`, sitemap entry, privacy text and date, flag.
7. [ ] Checks: unit, e2e (add, remove, full, share link, reload, two tabs, blocked storage), layout at 360 and 1440 px, accessibility (keyboard, non-colour markers), bundle (tray at most 3 KiB gzip in the initial JS; table lazy).
8. [ ] Typed monitor definitions (units, booleans, conflicts) once monitor data is live; typed definitions for the other categories, one at a time.

## Open questions for Teo (my defaults in brackets)
1. Where does the compare button appear first: category rows and cards, and the model page [both]?
2. Tray position on phones: bottom bar [yes, hidden on `/builder`]?
3. Show family-level price history in the compare page [no: omitted, as FINAL_PLAN says]?
