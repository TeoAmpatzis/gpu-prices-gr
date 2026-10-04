# Phase 1 — Stop 2: the component catalogue

**Status: waiting for the owner to choose the logo direction and the palette.** Branch `v2`, data = main `3dd74e4` (2026-10-04 14:38 UTC). Nothing deployed.

## Open it

```
npm run dev
```
then **http://localhost:5174/_preview**. The bar at the top switches logo (A/B/C), palette (Blue/Indigo), theme and language. The address keeps the choice, so any view can be reopened, e.g. `http://localhost:5174/_preview?logo=b&palette=indigo&theme=dark&lang=en`.

The phone frames inside the page are the same catalogue at a real 360 px width, e.g. `/_preview?frame=parts`. There are five views: `shell`, `parts`, `search`, `sheet` and `builder`.

## What is on the page

| Section | What it shows |
| --- | --- |
| Λογότυπα | A Blueprint, B Monogram, C Wordmark. Each is shown on light, dark and brand backgrounds, in ink and in brand colour, at 16/32/48 px, as a favicon in a light and a dark browser tab, and as the 1200 × 630 social image (drawn full size and scaled down). The browser tab of the page itself shows the selected logo's favicon. |
| Χρώματα | Brand and neutral scales with hex values. The four meaning colours in both themes, with their compatibility badges. The hue distance between the brand and the "note" light blue. A WCAG contrast table computed live from the CSS for the current palette, light and dark side by side. |
| Τυπογραφία και κίνηση | The 6 sizes, the weights, tabular numbers, and JetBrains Mono for codes. The motion tokens, with a "Play" demo. |
| Κουμπιά | Primary, secondary, ghost and danger, each in default, hover, focus, active, disabled and loading. Also small and icon-only buttons. |
| Chips φίλτρων | Filter chips with real VRAM counts: off, on, hover, focus, and disabled at 0. Applied-filter chips with ×, and "Καθαρισμός φίλτρων". |
| Συμβατότητα | Error, warning, note ("Πιθανότατα χωράει", "Δεν επιβεβαιώθηκε") and pass ("Συμβατό", "Χωράει"). Each has colour, icon and word, with its reason as visible text. |
| Κελί τιμής | The 5 states with **real listings from today's data**: everything known, shipping unknown, availability unknown, older than 24 h (a real Skroutz price, 36 h old) and unusually low. |
| Γραμμή specs | One real model per category, with 3–5 specs in a fixed order; an unknown spec shows as "label —". |
| Ομάδες φίλτρων | Two checkbox lists: graphics-card makers (real counts, "Περισσότερα" after 8, search from 15) and drive makers (search typed "wes", one maker with 0). A price range with two thumbs and inputs, including an invalid range. Switches in on, off, disabled and focus states. The coverage line ("Μήκος γνωστό για 58%", real) with "Εμφάνιση χωρίς στοιχεία" and an extra-detail tooltip. |
| Πίνακας, κάρτες, part list | Sortable headers; table rows in default, hover, focus, selected and default; phone cards; the PC Builder part list with pass/warning/note/error, an empty slot, a quantity stepper and a product no longer sold. |
| Σελιδοποίηση | Numbers on desktop, "Σελίδα 3 από 20" on phones, page size 20/50/100. |
| Sheet, διάλογος, toast, tooltip | Static versions, plus buttons that open each one live (Esc, focus trap, "Αναίρεση" in the toast). |
| Κενό, φόρτωση, σφάλμα, 404 | Empty state with one reset label; table and phone skeletons; the translated error with "Δοκιμή ξανά" and the technical detail folded; the 404 page with search and category tiles. |
| Διαδρομή, πηγές, αναζήτηση | Breadcrumbs. The status line for a category and for the whole site: sources, each with its own time, and Skroutz/Δίσκοι marked as older than 24 h. Search is live over all 11,431 of today's models, with suggestions grouped by category; it can also be shown open with "rtx 50". |
| Κέλυφος | The header with the selected logo, the "Εξαρτήματα" mega menu (without Σύγκριση/Προσφορές, as decided), the footer ("© 2026 BuildDraft.gr"), and five 360 px phone frames: category page, `/parts` tiles with language and theme, search, filter sheet, part list. |

Where today's data can't show a state, the page says so. Availability is a marked sample, because it is collected from Phase 2. The compatibility messages are examples, because the rules come in Phase 2. Model links in search go to the category searched by name (`/gpu?q=…`), as planned until Phase 3; in the catalogue a click shows "Θα άνοιγε: …" instead of leaving the page.

## The two choices

| | Blue | Indigo |
| --- | --- | --- |
| Brand | blue-600 #2563EB (buttons), blue-700 #1D4ED8 (links) | indigo-600 #4F46E5, indigo-700 #4338CA |
| Neutrals | slate (blue-grey) | cool grey |
| "Note" light blue | cyan #0E7490 | sky #0369A1 |
| Hue distance brand ↔ note (plan A6.8) | **31°** | **44°** |
| Contrast pairs passing AA | 56/56 light, 56/56 dark | 56/56 light, 56/56 dark |

Both pass every pair (`tests/unit/tokens.test.ts`, 224 checks). Indigo keeps the brand further from the "Likely fits / Not verified" light blue, which was the risk raised in the plan. Blue reads more like a classic shop.

Logos: **A** reads as "a draft of a build". **B** is the most compact at 16 px. **C** is the most restrained, but needs its separate B-and-chip symbol for the favicon. All three are first drafts of each direction, drawn in SVG on a 32-unit grid with a simplified drawing at 16 px. Details can still be tuned after the choice: stroke weights, the monogram's traces, the size of the chip dot.

## Checks done at this stop

- **Production is unchanged:** `npm run build` gives byte-identical files to v1's (the same five JS/CSS files, the same names). `node scripts/phase1/check-no-preview.mjs` finds no catalogue code, styles, text or fonts in `dist/`. The page loads only from `import.meta.env.DEV` code, its styles only from its own stylesheet, and Tailwind doesn't scan `src/ui`, `src/shell` or `src/preview` in production builds until Stop 3.
- **`npm run check`:** typecheck clean, lint 0 errors (6 old warnings, no new suppressions, no inline disables), 294 tests (70 + 224 contrast), build and data check passed. `npm run e2e`: 15 passed.
- **No horizontal overflow** at 360 px: the page itself in light/dark × el/en, and all 20 phone-frame combinations (5 views × light/dark × el/en). The screenshot script logs it for every shot. Fixed on the way: the sortable header's screen-reader text escaped its scrolling table and widened phone pages (it now has a positioned parent).
- **Keyboard:** search ↓/↓/Enter opens the highlighted suggestion; the menu opens with ↓ and puts focus on its first link; Esc closes it and returns focus to the button; the skip link is the first Tab stop and becomes visible.

## Screenshots (`docs/phase1/preview/`)

- 12 full pages at 1366 px in Greek: `<logo>-<palette>-<theme>-el-1366.jpg` for logos a/b/c × blue/indigo × light/dark.
- 8 more with logo A: each palette × theme at 360 px in Greek (`…-el-360.jpg`) and at 1366 px in English (`…-en-1366.jpg`).

Re-take with `node scripts/phase1/preview-shots.mjs docs/phase1/preview` (dev server running).

## Not done yet (Stop 3, after the choice)

The tokens are not yet applied to the real site. Still to come:
- router and real URLs with the redirects;
- the live header, menu and footer;
- the search index file;
- the subset monospace font;
- the six v1 swaps;
- every section D check.

## Files

- **Design system:**
  - `src/ui/`: tokens, component styles, contrast pairs, strings, components, logos.
  - `src/shell/`: section names and menu groups, header, mega menu, tiles, footer, 404, language/theme switches.
  - `src/lib/search.ts`: the search matcher.
- **Catalogue:**
  - `src/preview/`: the page, sections, data picks, phone frames, its stylesheet and font.
  - `src/main.tsx`: the dev-only route.
- **Scripts:** `scripts/phase1/preview-shots.mjs`, `scripts/phase1/check-no-preview.mjs`.
- **Tests:** `tests/unit/tokens.test.ts`.
