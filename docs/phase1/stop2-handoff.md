# BuildDraft.gr v2 — Phase 1, Stop 2: report for the owner's review

*From Claude Code, 2026-10-05. Branch `v2` at `0002093`, data = main `3dd74e4`. Nothing deployed; the live site is unchanged.*

## 1. Where we are

Phase 1 (identity, design system, site shell, real URLs) has three stops.

- **Stop 1 (plan)** was approved on 2026-10-04 with these owner decisions:
  - **Menu:** without Σύγκριση/Προσφορές. Deals goes to v2.0 Phase 5; Compare goes to v2.1.
  - **Phone header:** logo · search · PC Builder · Εξαρτήματα. Language and theme live on `/parts` and in the footer.
  - **Monospace font:** for codes only.
  - **Name:** "PC Builder" in both languages.
  - **Builder layout shift (CLS):** an explicit gate exception, ≤ 0.0099 and unchanged from the baseline; it gets fixed in Phase 4.
  - **v1 swaps:** the six small swaps into v1 pages are done in this phase.
  - **Category ids:** v1's stay (`/gpu`, `/cpu`, …).
  - **Phase 3 alias rules:** recorded in the plan. The first v2 deploy starts with an empty alias list by an explicit one-time rule. `ALIAS_CHECK=off` is used only after asking the owner.
- **Stop 2 (this report)** is done: a component catalogue that shows three logo directions, two palettes and every component in every state, in dark/light, Greek/English, at 360 and 1366 px, using real products and prices from today's data.
- **Stop 3** builds the real shell and the real URLs with the chosen logo and palette. It starts only after the decisions in section 2.

## 2. Decisions needed now

| # | Decision | Options | Facts that matter | Screenshots |
| --- | --- | --- | --- | --- |
| 1 | **Logo direction** | **A Blueprint** (drawing-corner marks around a chip, name beside) · **B Monogram** ("BD" drawn like circuit traces, cut out of a rounded square) · **C Wordmark** (name only: "Build" bold, "Draft" light, a chip as the dot of ".gr"; its favicon is a separate B + chip symbol) | All three are single-colour SVG, no gradients, with a simplified drawing at 16 px. They are **first drafts of each direction**: stroke weights, trace placement and chip-dot size can be tuned after the choice. B is the clearest at 16 px. C needs its separate favicon symbol. | 01, 02, 03 |
| 2 | **Palette** | **Blue** (blue-600 #2563EB buttons, slate neutrals, notes in cyan) · **Indigo** (indigo-600 #4F46E5, cool-grey neutrals, notes in sky blue) | Both pass all 56 text/background pairs at WCAG AA, in light and dark (224 automated checks). The plan's risk was confusing the brand colour with the light blue that means "Likely fits / Not verified". The distance between them is **31° for Blue** and **44° for Indigo**, so Indigo separates them better. Blue looks more like a typical shop. | 03, 04, 05 |
| 3 | **Footer wording** (to confirm) | The owner wrote "keep the BuildDraft.gr". This was read as **"© 2026 BuildDraft.gr" without the owner's name** in the footer. | LICENSE, README and `package.json` keep the owner's name either way. If confirmed, CLAUDE.md's rule about the footer line is updated at Stop 3. | 12-b |

Also welcome: anything else to change in the components before Stop 3. For example: whether the header logo should be in the text colour (as now) or the brand colour; whether v1's background decorations (grid, glow, side traces) stay in the new identity; and any wording.

**Reply format that works:** `Logo: B · Palette: Indigo · Footer: confirmed · Other: …`

## 3. What was built at Stop 2

- **Design tokens.** Brand and neutral scales, the four meaning colours (green = compatible / price down, orange = needs action, red = error / price up, light blue = note / estimate), dark and light themes. Also motion tokens (120/180/260 ms, transform and opacity only, 0 ms with "reduce motion"), the 6 type sizes, radii and shadows. Token names reuse v1's (`page`, `panel`, `fg`, `muted`, `accent`…), so at Stop 3 v1 pages take the new look without layout changes.
- **Components, each in all its states.**
  - **Basic controls:**
    - Buttons: primary, secondary, ghost and danger, each in default, hover, focus, pressed, disabled and loading.
    - Filter chips and applied-filter chips.
    - Compatibility badges: colour, icon and word together.
  - **The price cell.** It shows:
    - price;
    - "shop, μέσω source";
    - shipping when known;
    - availability when known;
    - when it was checked, marked when older than 24 h;
    - a labelled 7-day change;
    - "Ασυνήθιστα χαμηλή".
  - **The spec line:** 3–5 specs per category in a fixed order.
  - **Filter groups:**
    - a checkbox list with counts, "show more" after 8 options and a search box from 15;
    - a price range with two handles and number inputs;
    - an on/off switch;
    - a coverage line, "Μήκος γνωστό για 58%".
  - **Lists:** sortable table header, table row, phone card, the PC Builder's part-list row, and pagination.
  - **Overlays:** bottom sheet, dialog, toast and tooltip.
  - **States:** empty, loading (phone-shaped skeleton), error with "Δοκιμή ξανά", and 404.
  - **Navigation:**
    - breadcrumbs;
    - a status line that names sources (not "shops") with each source's own update time, and flags any source older than 24 h;
    - global search over all 11,431 models, with suggestions grouped by category.
- **Site shell.**
  - **Header:** logo · Εξαρτήματα ▾ · search · PC Builder · ΕΛ/EN · theme.
  - **The "Εξαρτήματα" mega menu** (desktop): Βασικά, then Κουτί ρεύμα και ψύξη, then Εργαλεία; the current section is marked.
  - **The `/parts` tiles page** (phones): also holds language and theme.
  - **Footer:** links, the site-wide status line, and "© 2026 BuildDraft.gr".
  - **404 page.**
  - **Skip link:** "Μετάβαση στο περιεχόμενο", the first Tab stop.
- **Real data.** The catalogue uses today's real products and prices: a real Skroutz price older than 24 h, a real unusually low price, real counts.
  - **Samples:** where the data can't show a state, the page says so. Availability is a marked sample (collected from Phase 2).
  - **Examples:** the compatibility messages are examples (the rules come in Phase 2).
  - **Links:** model links go to the category searched by name (`/gpu?q=…`), as planned until Phase 3 builds model pages.
- **Glossary** (`docs/phase1/glossary.md`): one Greek and one English word per concept. Source vs shop, "PC Builder", singular builder part names, plurals through one helper ("1 εξάρτημα / 3 εξαρτήματα").

The owner opens it with `npm run dev` → **http://localhost:5174/_preview**. Switches at the top select the logo, palette, theme and language; the address keeps the choice.

## 4. Screenshots (folder `screenshots/`)

Each image is 1248 px wide and no taller than ~1,900 px; longer sections are split into `-a`/`-b`.

| File | Shows | Logo · palette · theme · language |
| --- | --- | --- |
| 01-logos-blue-light | The three logo directions on light, dark and brand backgrounds; 16/32/48 px; favicon in a light and a dark tab; the 1200 × 630 social image | all · Blue · light · el |
| 02-logos-indigo-light | The same in Indigo | all · Indigo · light · el |
| 03-header-every-logo-palette-theme | **The real header for all 12 combinations** (3 logos × 2 palettes × light/dark): the quickest way to compare | all |
| 04-colours-blue-light | Brand and neutral scales, meaning colours in both themes, hue distance, start of the contrast table | Blue · light |
| 05-colours-indigo-light | The same in Indigo | Indigo · light |
| 06-buttons-chips-compatibility-blue-light | Buttons in every state, filter chips, applied chips, compatibility badges with reasons | A · Blue · light |
| 07-price-cell-spec-line-blue-light | The price cell's 5 states with real listings; the spec line for one real model per category | A · Blue · light |
| 08-filters-blue-light | Checkbox lists with counts and search, price range, switches, coverage line with tooltip | A · Blue · light |
| 09-table-cards-partlist-indigo-light (a, b) | Sortable table with hover / focus / selected rows, phone cards, PC Builder part list (pass, warning, note, error, empty slot, quantity, product no longer sold) | A · Indigo · light |
| 10-overlays-states-404-indigo-light (a, b) | Pagination, bottom sheet, dialog, toasts, tooltip, empty, error with retry, loading skeletons, 404 | A · Indigo · light |
| 11-breadcrumbs-status-search-indigo-light | Breadcrumbs, per-source status line (category and site-wide, stale source flagged), search open with "rtx 50" | A · Indigo · light |
| 12-shell-header-menu-footer-phones-blue-light (a, b) | Header, mega menu open, footer, and five 360 px phone screens: category page, `/parts` tiles, search, filter sheet, part list | A · Blue · light |
| 13-dark-buttons-chips-compatibility-indigo | Dark theme: buttons, chips, compatibility | A · Indigo · dark |
| 14-dark-table-cards-partlist-blue (a, b) | Dark theme: table, cards, part list | A · Blue · dark |
| 15-dark-shell-phones-indigo (a, b) | Dark theme: header, menu, footer, phone screens | A · Indigo · dark |
| 16-english-price-cell-spec-line-indigo | English: price cell and spec line | A · Indigo · light · en |

## 5. Checks done

- **Production unchanged:** a production build of v2 is **byte-identical** to v1's built files (same names, same bytes). `scripts/phase1/check-no-preview.mjs` finds no catalogue code, styles, text or font in `dist/`. Three measures keep it that way until Stop 3:
  - the catalogue loads only in development builds;
  - its styles come only from its own stylesheet;
  - Tailwind skips the new folders in production builds.
- **`npm run check` passes:**
  - typecheck clean;
  - lint 0 errors (6 warnings, all from v1), no new suppressions and no inline disables;
  - 294 tests (70 earlier + 224 contrast);
  - build and data check passed.
- **`npm run e2e`:** 15 of 15 pass.
- **No horizontal overflow at 360 px:**
  - the catalogue in light/dark × el/en;
  - all 20 phone-screen combinations (5 views × light/dark × el/en);
  - all 20 full-page screenshots (logged per shot).
- **Keyboard:**
  - search: ↓ moves through suggestions and Enter opens one;
  - menu: opens with ↓ and puts focus on its first link; Esc closes it and returns focus to the button;
  - skip link: the first Tab stop, visible when focused.
- **Fixed during the review of my own screenshots:**
  - **CSS order.** Component styles were overriding Tailwind utilities, which put search icons over placeholders and showed the desktop menu button on phones. Component styles now sit in Tailwind's components layer.
  - **Missing classes.** Class names built at runtime (`ui-btn--${variant}`) were dropped by Tailwind; they're now written in full.
  - **Phone overflow.** The sortable header's hidden screen-reader text escaped its scrolling table and made phone pages 254 px too wide; it now has a positioned parent.
  - **Smaller fixes:** the monogram's traces, the wordmark's chip-dot, the social image drawn to scale, singular builder part names.

## 6. Notes and limits (said plainly)

- **Logos:** first drafts, drawn by Claude Code in SVG. They are good enough to pick a direction, not final artwork.
- **Search:** it finds **models**. For graphics cards, RAM and PSUs, models are spec groups, so "Kingston Fury" finds RAM through the maker suggestion, not a specific kit. Real product search needs Phase 2 product keys.
- **The search index:** in the catalogue it's built in the browser from the list files. Stop 3 builds the real index file (~84 KB compressed, loaded only when the search box is used).
- **Monospace font:** the catalogue uses the full published JetBrains Mono 400 files (25 KB). Stop 3 ships a subset (target ≤ 15 KB), loaded only where codes appear.
- **Shell components:** the header, menu, footer and 404 are built and shown, but **not yet live**. The real site still shows v1 until Stop 3.

## 7. What Stop 3 does after the choice (from the approved plan)

1. **Tokens.** Apply the chosen logo and palette as tokens, remove the unchosen options, and keep the catalogue as an internal page (development only).
2. **Header, menu, footer.**
   - **Header:** logo, global search, PC Builder, language, theme, and the skip link.
   - **"Εξαρτήματα" menu:** desktop mega menu and phone tiles page, without Σύγκριση/Προσφορές.
   - **Footer:** links and the per-source status line.
3. **Global search.** The build-time index file, loaded only on use, keyboard accessible.
4. **Real URLs.**
   - Every old `#…` link (including shared builds) redirects to its real URL, every parameter kept.
   - Deep links open directly.
   - Breadcrumbs appear below the categories.
5. **Minimal home page:** search, category tiles, PC Builder.
6. **Copy:** consistent wording across the shell (glossary, plurals, Greek labels without English words).
7. **v1 pages:** they get the new tokens and the six agreed swaps; their layout and logic stay as they are.
   - The status line names each source with its own time.
   - Load errors show a translated message with "Δοκιμή ξανά".
   - Phones get a phone-shaped loading skeleton.
   - Photos show a neutral tile while loading.
   - The wording fixes from the audit (UX-17, UX-22, UX-47).
   - Meaning colours replace the brand colour where v1 used it as "good".
8. **Checks (section D of the prompt):**
   - `npm run check`, with no new suppressions;
   - e2e for every old link, deep links and shared builds;
   - Lighthouse: 3 runs each for home, a category and the builder;
   - first-load size against the 110 KB budget (the plan moves list-page code to its own file to stay under it);
   - layout audit at 360/768/1366/1920 × themes × languages;
   - a keyboard walk;
   - the motion measurement on a slowed-down phone profile;
   - screenshots in `docs/phase1/`;
   - then a stop at the Phase 1 gate.

## 8. Backlog items added during Phase 1 (`docs/v2-backlog.md`)

- **#7:** Skroutz is blocked by Cloudflare. In the last 10 scrape runs, all 7 that ran had Skroutz blocked in at least one category (24 of 63 category lists). Blocked categories keep stale Skroutz prices: storage was 35 h old on 2026-10-04.
- **#8:** a per-source staleness check (warn at 12 h, fail at 24 h, per source × category).
- **#9:** the status line shows each source's own time. **Built in the catalogue; goes live at Stop 3.**
- **#10:** model names with Greek words or Greek look-alike letters. These are 237 cooler names (e.g. "Διπλού Ανεμιστήρα 120mm") and two fans duplicated by one Greek capital. To fix in Phase 2's validation.
- **#11:** the Προσφορές (Deals) page, v2.0 Phase 5, together with the home page.
- **#12:** Σύγκριση (Compare), v2.1. The product page's "Σύγκριση" button waits for it.

## 9. Files (in the repo, branch `v2`)

- **Plan:** `docs/phase1/plan.md`, approved with the owner's decisions.
- **Stop 2 report:** `docs/phase1/stop2.md`.
- **Glossary:** `docs/phase1/glossary.md`.
- **Full-page screenshots:** `docs/phase1/preview/` (20, Stop 2).
- **Code:**
  - design system: `src/ui/`;
  - shell: `src/shell/`;
  - search: `src/lib/search.ts`;
  - catalogue: `src/preview/`;
  - dev-only route: `src/main.tsx`.
- **Scripts:** `scripts/phase1/preview-shots.mjs`, `handoff-shots.mjs` (removed at Stop 3: it needed the Stop 2 logo/palette/theme options), `check-no-preview.mjs`.
