# Phase 1 plan: foundations (identity, design system, site shell, real URLs)

**Status: Stop 1, waiting for the owner's approval.** Branch `v2` at `1ff6442`, data = main `3dd74e4` (2026-10-04 14:38 UTC). Every number below was measured on 2026-10-04 with that data unless it says *estimate*; estimates are measured at Stop 3 and reported.

**In one paragraph.** Keep React + Tailwind and add no UI library. Tokens become a three-layer system (scales → roles → v1 aliases), so v1 pages restyle without layout edits. A ~1 KB own router reads a route table that is also used by the old-link redirect, `vercel.json` and the tests. Old `#…` links are rewritten to real URLs by a tiny inline script before the app starts, keeping every parameter. Search loads its own build-time index (~84 KB gzip) only when the search box is used. A model URL is the readable form of today's model key (unique in every category). A "specific product" level exists only for graphics cards, and only after Phase 2 brings card keys into the data. List-page code moves into its own chunk, so the shell fits the 110 KB budget on the builder too.

---

## What v1 pages get in Phase 1 (and nothing else)

| Change | Where | Why |
| --- | --- | --- |
| New tokens through the old names (`accent` → brand, `ok`/`up`/`warn` → meaning colours, surfaces/text → neutral scale) | `index.css`, `tailwind.config.js` | C9: they look right without layout edits; UX-06 contrast |
| Where URLs are read and written: hash → path + query, same parameter names and values | `filterUrl.ts`, `useFilterState.ts`, `builderState.ts` (and its share link) | C6; the only logic touched |
| Meaning fixes where v1 uses the brand colour as "good": price drop and fit badges use the green token | ~5 class names in `ModelRow.tsx` and the badges in `index.css` | Blue/indigo brand must not mean "price went down" |
| Component swaps in the same place: per-source status line, error with Retry, phone skeleton, photo placeholder colour | `SourcesStatus`, error notice, `Skeleton`, `ProductPhoto` | UX-04 + backlog #9, UX-19, UX-21, UX-09 (all marked "v2 P1" in the audit) |
| Copy: one word per concept, Greek labels without English words, plurals | `i18n.ts`, `categories.tsx` labels (text only) | UX-17, UX-22, UX-47 |

No v1 filter, table, row, card, builder step or rule changes. v1's header, tab bar, page-title block and footer are replaced by the shell. The `Backdrop` layers (grid, glow, traces) follow the brand token; the preview shows them, and the owner can drop them at Stop 2.

---

## A1. Technical choices

| Choice | Decision | Justification (one line) | Bytes visitors download |
| --- | --- | --- | --- |
| Styling | **Keep Tailwind 3 + CSS custom properties.** Tokens in three layers: raw scales (brand 50–950, neutral 11 steps) → roles (`bg`, `surface`, `border`, `text`, `brand`, `success`, `warning`, `danger`, `info`, each with `-subtle`/`-strong`) → v1's names as aliases | v1 pages already read colours through variables, so the new identity reaches them with no layout edits; no runtime cost | 0 KB JS; CSS is 8.6 KB gzip today, **estimate +2–3 KB** |
| Router | **Own router, ~1 KB**: `useSyncExternalStore` over `history`, `<Link>`, a matcher over one route table (`src/lib/routes.ts`) | 12 fixed patterns; we need custom pieces anyway (redirect before first render, keep visited category pages mounted like v1, prefetch on hover), and the route table must also drive the redirect script, `vercel.json` and the tests | **Measured prototype: 622 B gzip** (992 B min); estimate ≤ 1.2 KB with scroll handling. Alternative wouter 3.13.0: **3,205 B gzip** measured (Router, Route, Switch, Link, Redirect, 3 hooks) |
| Old-link redirect | Inline script in `index.html`, runs before the theme script and the app: known `#page?…` → `history.replaceState` to `/page?…` | The server never sees the hash, so only the page can redirect. Running before React means no flash and no extra history entry | ~0.3 KB inline (estimate) |
| Deep links | `vite preview`/`vite dev` already fall back to `index.html` (SPA mode). For Vercel (at launch): `vercel.json` rewrites the known first path segments to `/index.html`; unknown paths get a real 404 | Real URLs must open directly; unknown top-level paths should answer 404, not a soft page | 0 |
| Global search index | Built by `vite-plugin-data` as `/data/search.json` (never committed). Per category: every model's name and cheapest price, in popularity order (`ranking.ts`), plus the category's makers. **Loaded only on focus, hover or touch of the search box**, cached like other `/data` files (`?v=builtAt`). Matching in the browser: precomputed lower-case strings without accents; every typed word must start a word of the name; ranked by match quality, then popularity. Category names (el/en) are matched from a static list, so "μητρικές" answers before the index arrives | Data stays build-time and static (cost 0); nothing loads until someone searches | **Measured: 84.3 KB gzip** (361 KB raw, 11,431 models). Adding every model's makers was 92.8 KB, so only per-category maker lists go in (estimate +1–2 KB). **0 bytes on first load** |
| Icons | lucide-react (already used, tree-shaken). The shell adds ~10 icons | Project rule: lucide only | Estimate ~3 KB gzip (v1's entry already carries 4.3 KB of icons) |
| Logo, favicon, social image | Inline SVG component; favicon SVG + PNGs and `og.png` rendered by the existing `scripts/brand/render.py` | One colour, no gradients (plan) | Logo ~0.4 KB in JS; favicon/OG are not on the page |
| Fonts | **Inter** stays (variable, self-hosted, latin + greek preloaded). **Monospace: JetBrains Mono 400** (OFL 1.1, @fontsource 5.3.0), self-hosted, further subset with fonttools (local tool only) to Basic Latin + Latin-1 + Greek + `€ × ° ± – — …`, without ligatures. Loaded through `unicode-range` and not preloaded, only on pages that show mono text; `font-display: swap` with a size-adjusted fallback face so CLS stays 0 | Smallest Greek-capable mono measured. As shipped (one weight): latin 20.7 + greek 4.1 KB. Variable version: 39.5 + 8.8 KB. Fira Code: 35.4 + 13.5 KB. Noto Sans Mono: latin-ext alone 155 KB | **Estimate ≤ 15 KB after subsetting**, only where used; 0 on pages without codes |
| Component library | **None.** Native `<dialog>` (focus trap, Esc, inert background), native `<input type=range>` (two thumbs) + number inputs, own small components | Budget: first-load JS ≤ 110 KB gzip on every page; the builder is at 98.5 KB today | — |
| First-load JS budget | Move v1's list-page code into its own chunk, loaded by the category routes (CategoryView, FilterBar, ModelTable/Row, Pagination, ActiveFilters, BottomSheet, SortHelp, facets, filterUrl, useFilterState, SourcesStatus, Skeleton: **≈10.3 KB gzip measured** in today's 73.3 KB entry). Builder and home then don't download it | Without the split the builder reaches ~110–112 KB (estimate) and breaks the budget | Builder ≈ 99 KB, category pages ≈ 85 KB (split in 2 files), home ≈ 70 KB, all *estimates* |

React stays: `react-dom` is 41.4 KB of the entry chunk. A lighter React-compatible library is not worth the risk in this phase.

---

## A2. URL scheme

### A2.1 "Model" and "specific product" in today's data

| Category | Model today (key → example) | Models | Specific product? | Notes |
| --- | --- | --- | --- | --- |
| GPU | chip + VRAM: `RTX 5070 12GB` | 96 | **Yes, later**: the card (`normalize.card_key` = maker + chip + VRAM + product-line words), e.g. Inno3D RTX 5070 Twin X2 OC | Measured: 86% of listings have a card key; 789 cards; 49% on 2+ sources. The key splits a few same cards ("Zotac Twin Edge OC" / "Gaming Twin Edge OC"). It exists **only in Python** today: Phase 2 adds a `card` field to GPU listings (scraper plan + approval). Phase 3 builds product pages. The 14% of listings without a card key are shown on the model page only |
| CPU | chip: `Ryzen 7 9800X3D` | 421 | No: the model *is* the product | Box/Tray become variants on the model page |
| Motherboards | the board (letters+digits key) | 1,197 | No: model = product | — |
| RAM | spec kit across makers: `DDR5 32GB (2×16GB) 6000MHz Desktop` | 483 | **Not supported**: no series or part-number field | A maker's kit (e.g. Kingston Fury Beast 2×16 6000 CL30) needs a product key from Phase 2's part-number check (UX-18) |
| Storage | drive + capacity (+ SSD/HDD in the key) | 2,333 | No: model = product | Other capacities become variants (Phase 3) |
| PSU | spec: `850W Gold ATX` | 184 | **Not supported**: no series field | Same as RAM |
| Cases, fans, coolers | the product (letters+digits key) | 2,601 / 2,004 / 2,112 | No: model = product | Fans' key includes the pack (×3) |

**Proposal:** two levels, `/<category>/<model>` for every category and `/<category>/<model>/<product>` only for graphics cards, once the data has card keys. RAM and PSU get a product level only if Phase 2 produces reliable product keys; until then their model page lists the offers of every maker (as today).

### A2.2 Slugs (verified unique)

- **GPU, CPU, RAM, PSU** (their keys are readable): slug = the key, lower-case, `×` → `x`, every other run of non-letters/digits → `-`. Examples: `rtx-5070-12gb`, `ryzen-7-9800x3d`, `core-i5-14600kf`, `ddr5-32gb-2x16gb-6000mhz-desktop`, `850w-gold-atx`.
- **Boards, storage, cases, fans, coolers** (key = letters+digits of the name): slug = the shown name with every run of other characters turned into `-`, so **removing the hyphens gives back the key exactly**. Unique by construction. Storage adds `-ssd`/`-hdd` like its key. Examples: `asrock-b850m-pro-rs-wifi`, `samsung-990-pro-2tb-ssd`.
- **Measured over all 11,431 models: 0 collisions.** For comparison, slugs from the *shown* name would collide 116 times in RAM and 35 in PSU (the name drops Desktop/Laptop/Server and ATX/SFX), plus 3 in storage (WD Blue SSD and HDD). Longest slug: 90 characters.
- Data problems these slugs expose (Phase 2, backlog #10): 237 cooler names contain BestPrice's Greek descriptors ("Διπλού Ανεμιστήρα 120mm"; keys drop Greek letters, so they're stable but ugly). Greek capitals typed as Latin split two fans into duplicates ("UNI ΙNFINITY", "DUΟ") and mangle names ("Antec ΑΧ61").

### A2.3 When the scraper re-groups listings: redirect, not 404

Keys are **not** stable while the normalizers improve. Model keys present in history but not in today's data (one week of data): boards **674**, storage **318**, cases **257**, fans **143**, coolers **86**, RAM 16, CPU 12, GPU 6, PSU 6. Most of these come from normalizer fixes (e.g. D-05 merged 12 board models; the storage normalizer `88283e3`), some from products leaving the shops. Listing ids (`source:nativeId`) are the shops' own and stable, so redirects are computed from them:

1. Every build publishes `/data/<cat>/slugs.json`: current slug → its listing ids, plus every redirect carried over so far (build-time file, never committed, `public/data` untouched).
2. The next build fetches the **live** `slugs.json` (the data check already fetches the live manifest this way). Each slug that disappeared is redirected to the model that now holds most of its listing ids.
   - **Merge:** several old slugs → one new model.
   - **Split:** the old slug → the model with most of its listings, and the page says "now split into: X, Y".
   - **Gone from every shop:** → the category searched for the old name, with a "no longer sold" notice.
3. If the live file can't be fetched, the build fails (override `ALIAS_CHECK=off`), so a build never silently drops the redirects carried so far.
4. History stays under its old key (unchanged); the model page can join the histories of its redirected keys (Phase 3).

**When:** built in Phase 3 with the model pages. v1 has no product URLs, so the first v2 deploy starts with nothing to redirect. Phase 1 only reserves the patterns. Until Phase 3, a model URL (and a search suggestion) opens the category searched for that model (`/gpu?q=RTX 5070`). v1's search matches names as text, so near names such as "RTX 5070 Ti" can appear too. **Temporary.**

### A2.4 Example URLs

| Page | URL |
| --- | --- |
| Home | `/` |
| Category | `/gpu` · with filters and page: `/gpu?brand=nvidia&vram=16&sort=price-asc&page=2&per=100` · `/ram?type=ddr5&cap=32&kit=2&cl=30` · `/storage?seg=nas&type=hdd` |
| Model | `/gpu/rtx-5070-12gb` · `/ram/ddr5-32gb-2x16gb-6000mhz-desktop` · `/mobo/asrock-b850m-pro-rs-wifi` · `/storage/samsung-990-pro-2tb-ssd` (page in Phase 3) |
| Specific product | `/gpu/rtx-5070-12gb/inno3d-twin-x2-oc` (graphics cards only, after Phase 2/3) |
| Builder | `/builder` · `/builder?mode=quick` · `/builder?step=case` |
| Shared build | `/builder?cpu=Ryzen+7+9700X%7Cfalse&gpu=skroutz%3A60811441&psu=850W+Gold+ATX&use=gaming&budget=1000` (same parameters and values as v1; Phase 4 may add a shorter form, but must keep reading this one) |
| Parts tiles (the phone menu) | `/parts` |
| About / Contact / Privacy | `/about` · `/contact` · `/privacy` |
| 404 | any other path, e.g. `/gpus` (on Vercel a real 404 status) |
| Reserved, not built now | `/compare`, `/deals` (see A6.7), `/list/<code>` (v2.1), `/_preview` (development builds only) |

Category ids stay v1's `gpu cpu mobo ram storage psu case fan cooler`: short, already in shared links, and a 1:1 redirect. Readable aliases (`/motherboards`, `/mitrikes`) can be added later without breaking anything.

### A2.5 Every old link and where it goes

| Old (v1) | New |
| --- | --- |
| `/` or `/#` | `/`: the new home (v1 showed graphics cards here) |
| `/#gpu`, `/#cpu`, `/#mobo`, `/#ram`, `/#storage`, `/#psu`, `/#case`, `/#fan`, `/#cooler` | `/gpu` … `/cooler` |
| `/#<category>?<parameters>` | `/<category>?<parameters>`: **every parameter kept as it is**, in the same order (list below) |
| `/#builder` | `/builder` |
| `/#builder?mode=quick` · `?step=<use, cpu, mobo, ram, gpu, cooler, storage, case, psu, fan, review>` | `/builder?mode=quick` · `/builder?step=<same>` |
| `/#builder?cpu=…&mobo=…&ram=…&gpu=…&cooler=…&storage=…&case=…&fan=…&psu=…&use=<gaming, everyday, creating, unsure>&budget=<€>` | `/builder?…` with the same parameters. Opens the same build on Review with the "shared build" notice; the saved build is untouched until the user changes something (v1 behaviour) |
| `/#about`, `/#contact`, `/#privacy` | `/about`, `/contact`, `/privacy` |
| Any other hash (`/#main`, `/#foo`) | Left alone: these are in-page anchors (the skip link uses `#main`) |
| A query before the hash (`/?x=1#gpu`) | Dropped; the hash's parameters win (v1 ignored it too) |

**Category parameters that must survive** (from the configs):
- **Every category:** `q`, `src`, `sale=1`, `low=1`, `max`, `sort` (`model`, `price-asc`, `price-desc`, `offers`, `discount`, `per-tb`), `page`, `per` (20/50/100).
- **GPU:** `brand`, `vram`, `mem`, `series`, `partner`, `seg`
- **CPU:** `brand`, `socket`, `cores`, `series`, `igpu`, `box`, `seg`
- **Boards:** `sock`, `platform`, `socket`, `chipset`, `size`, `memory`, `slots`, `wifi`, `brand`, `seg`
- **RAM:** `type`, `cap`, `speed`, `kit`, `cl`, `brand`, `seg`
- **Storage:** `type`, `cap`, `pcie`, `size`, `dram`, `brand`, `seg` (`main`, `nas`, `pro`, `all`)
- **PSU:** `eff`, `watts`, `modular`, `brand`, `seg`
- **Cases:** `size`, `fits`, `window`, `rgb`, `brand`
- **Fans:** `size`, `pack`, `rgb`, `pwm`, `brand`
- **Coolers:** `type`, `rad`, `rgb`, `brand`

**Rule for Phases 3 and 4:** a redesigned filter or builder may write a new parameter form, but must keep **reading** these forever. The e2e redirect tests stay as the guard.

---

## A3. Component inventory

Phase 1 builds every component below in the catalogue (`/_preview`, development only), each with all its states, in dark/light, el/en, at 360 and 1366 px. The ones marked **Live in P1** are used by the shell or swapped into v1 pages now. The rest reach real pages in Phases 3–4, and **their audit issues close then, not in Phase 1**.

| Component | Variants | States | Audit issues | Live in P1 |
| --- | --- | --- | --- | --- |
| Button | primary, secondary, ghost, danger; sizes default/small; icon-only (with label for screen readers) | default, hover, focus-visible, active, disabled, loading (spinner, keeps width) | UX-06 (contrast), UX-48 (44 px tap targets), UX-17 (one label per action) | yes (shell) |
| Filter chip | toggle chip; applied-filter chip with "×" | off, on, hover, focus, disabled (0 results, never when on); applied row scrolls sideways on phones | UX-10 (meaning of a chip), UX-20 (applied chips push results down) | catalogue (P3) |
| Compatibility badge | error (red, ✕ icon, "Ασύμβατο"/"Incompatible"), warning (orange, ⚠, "Θέλει προσοχή"/"Needs action"), note (light blue, ⓘ, "Πιθανότατα χωράει"/"Likely fits", "Δεν επιβεβαιώθηκε"/"Not verified"), pass (green, ✓, "Ταιριάζει"/"Compatible", or "Χωράει"/"Fits" for space checks only) | each with colour + icon + word; reason text below (never tooltip-only) | UX-33, UX-34 (one icon for different levels), UX-44 ("Χωράει" for non-space checks), UX-35 (reason tooltip-only) | catalogue (P2/P4) |
| Price cell | list size, card size | everything known; shipping unknown; availability unknown (not collected yet: shown only when known); older than 24 h (marked); unusually low ("Ασυνήθιστα χαμηλή, έλεγξε το κατάστημα"); 7-day change with a visible label. Shop + source: "Plaisio, μέσω Skroutz" / source only when the shop is unknown | UX-23 (hover-only details), UX-24 (unlabelled change), UX-41, P-01 (shipping only for the same offer) | catalogue (P3) |
| Spec line | per category: 3–5 specs in a fixed order (e.g. GPU: VRAM · memory · length · min PSU) | known / unknown shown as "—" (never skipped, so columns line up) | UX-14, UX-18 | catalogue (P3) |
| Filter group: checkbox list | with counts; "Περισσότερα"/"Show more" after 8; search inside when > 15 options | checked, 0-count (disabled), focus, searching, empty search | UX-11 (169-option single dropdowns), O-03 (socket in 3 controls) | catalogue (P3) |
| Filter group: range | slider with two thumbs + min/max number inputs (€, mm, W) | default, dragging, typed, invalid (min > max), disabled | UX-11 (price had max only) | catalogue (P3) |
| Filter group: toggle | on/off switch with label | off, on, focus, disabled | — | catalogue (P3) |
| Coverage line | "Μήκος γνωστό για 77%" + "Εμφάνιση χωρίς στοιχεία"/"Show items without data" toggle | toggle off/on | UX-45 (permanent coverage notice) | catalogue (P3) |
| Table: sortable header, row | header with sort direction (`aria-sort`); row | header: unsorted, ascending, descending, focus; row: default, hover, focus, expanded, selected | UX-16 (headers don't sort) | catalogue (P3) |
| Product card (phones) | list card | default, focus, loading | UX-21, UX-31 | catalogue (P3) |
| Part-list row (builder) | filled, empty slot ("Επιλογή …"), quantity | default, with error/warning/note badge, missing, removed product | UX-40, UX-43, UX-39 | catalogue (P4) |
| Pagination | numbers (desktop), "Σελίδα 3 από 20" (phones), page size 20/50/100 | first, middle, last page, focus | UX-48 | catalogue (v1 keeps its own) |
| Bottom sheet | filters, generic | closed, open, dragging, focus trapped | UX-15, UX-30 | catalogue (v1 keeps its own) |
| Dialog | confirm (e.g. "Καθαρισμός build;"), info | open, focus trapped, Esc closes | UX-38 (clear build without confirmation) | catalogue (P4) |
| Toast | info, success, with "Αναίρεση"/"Undo" | entering, visible, leaving; announced politely to screen readers | UX-38 (undo) | catalogue (P4) |
| Tooltip | extra detail only | hidden, shown on hover **and** focus **and** tap; never the only place for essential information | UX-23 | catalogue |
| Empty state | no results (one reset label: "Καθαρισμός φίλτρων"/"Clear filters"), empty build | — | UX-17 (three different reset buttons) | catalogue (P3) |
| Loading skeleton | table, phone card (matches the phone layout), tiles | pulse (opacity only; off with reduced motion) | UX-21 (phone skeleton was the desktop layout), UX-09 (blank white photo tiles in dark) | **yes** (swap) |
| Error state | data load, page code load | translated message + "Δοκιμή ξανά"/"Retry"; technical detail folded | UX-19 (raw "HTTP 500" / English "Failed to fetch", no retry) | **yes** (shell + v1 swap) |
| 404 page | unknown path; unknown model (Phase 3) | search + category tiles + Home link | UX-08 (unknown hash showed GPU prices) | **yes** |
| Breadcrumbs | Αρχική › Κάρτες γραφικών (› Model › Product later) | current page not a link (`aria-current`); long names truncated in the middle on phones | UX-03 (current section hidden), UX-28 | **yes** |
| Status line | page (this category's sources), footer (all) | each source's own last update time, always visible (no hover); a source older than 24 h is marked ⚠ with its time; wording "πηγές"/"sources", not "καταστήματα" | UX-04, backlog #9 | **yes** (swap + footer) |
| Search box | header (desktop/tablet), full-screen panel (phones), large (home) | empty, typing, loading index, suggestions grouped by category (≤ 5 per group, "Όλα τα N σε Κάρτες γραφικών →"), no results, keyboard highlight; WAI-ARIA combobox | UX-01 | **yes** |
| Header | desktop, tablet, phone | default, menu open, search open; skip link "Μετάβαση στο περιεχόμενο"/"Skip to content" (first Tab) | UX-01, UX-02, UX-05, UX-07 | **yes** |
| "Εξαρτήματα" mega menu | desktop/tablet panel (3 groups) | closed, open, current category marked; opens on click/Enter/↓, closes on Esc/outside click; no hover-only opening | UX-01, UX-02, UX-03 | **yes** |
| Category tiles page | `/parts` on phones (also reachable on desktop) | current category marked; language + theme at the top on phones | UX-01, UX-03 | **yes** |

Copy (C8): a glossary in `docs/phase1/glossary.md` (one Greek and one English word per concept: πηγή/source vs κατάστημα/shop, μοντέλο/model, προϊόν/product, Καθαρισμός φίλτρων/Clear filters …). Plurals use `Intl.PluralRules` through one helper in `i18n.ts` (0 KB, built into the browser), fixing "1 ασύμβατα"/"1 εξαρτήματα" (UX-47).

---

## A4. Motion

O-02's causes (Phase 0 profiles):
- Long main-thread work (filter counts, details rendering). That belongs to Phase 3.
- Page-wide colour transitions, behind the 67 ms theme-switch frames. That belongs here.

**Tokens** (CSS variables, Tailwind utilities):

| Token | Value | Used for |
| --- | --- | --- |
| `--motion-fast` | 120 ms | press feedback, chip toggle, tooltip |
| `--motion-base` | 180 ms | menus, popovers, search panel, toast in |
| `--motion-slow` | 260 ms | bottom sheet, dialog, tiles page |
| exits | 0.75 × the entry duration | everything that closes |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | things appearing |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | things leaving |

**Rules:**
1. Animate only `transform` and `opacity`. A unit test scans `src/ui/`, `src/shell/` and `index.css` and fails on `transition-colors`, `transition-all`, Tailwind's bare `transition`, or any CSS transition of another property.
2. Hover, selected and focus colour changes are instant.
3. Theme and language switches never animate. The toggle sets `data-switching` on `<html>` for one frame, with `* { transition: none !important }`. This also stops v1's ~30 colour transitions from running page-wide, without editing v1's components.
4. Panels have a fixed size and slide or fade; there are no height animations. `will-change` is set only while animating.
5. No heavy work in an animation frame: the search index is fetched on hover/focus and parsed in idle time, not in the frame that opens the panel.
6. Reduced motion: `@media (prefers-reduced-motion: reduce)` sets every motion duration to 0 ms. The skeleton pulse runs only under `motion-safe`.

**Measurement:** `scripts/checks/motion-check.mjs`, built from Phase 0's `animation-profile.mjs`.
- **Setup:** Chrome over CDP, 360×800 phone emulation, **CPU slowed 4×** (Lighthouse's phone). Desktop menu at 1366 with the same slowdown.
- **Transitions measured:**
  - open/close the tiles page and the mega menu
  - focus search, type "rtx 50", ↓, Enter
  - theme toggle and language toggle
  - open/close bottom sheet, dialog and toast (catalogue)
  - route change home → builder
- **Recorded per transition:** frame-to-frame times (`requestAnimationFrame`), long-animation-frame entries, and the input's Event Timing duration.
- **Pass:**
  - no frame > 50 ms and at most 1 frame > 33 ms per transition
  - input → next paint ≤ 100 ms
  - median of 3 runs
- **Reported** next to O-02's Phase 0 numbers (theme: 67 ms frames).
- **Also measured, outside the pass:** v1 category pages' own work (Κουτιά's 1.18 s freeze) is measured and reported but not part of the pass; it's Phase 3.
- **Reduced motion:** an e2e test with reduced motion emulated checks that animated shell elements compute to 0 s.

---

## A5. Shell layout

**Desktop ≥ 1024 px** (container 1248 px):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Skip to content]  (visible on first Tab only)                              │
│ ▣ BuildDraft.gr   Εξαρτήματα ▾   [🔍 Αναζήτηση: π.χ. RTX 5070, 990 Pro   ]  │
│                                              [🛠 PC Builder]  ΕΛ|EN   ☾     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Αρχική › Κάρτες γραφικών                                                    │
│ Κάρτες γραφικών                                    (v1 page title block)    │
│ ...v1 page...                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ Σχετικά · Επικοινωνία · Απόρρητο                                            │
│ Πηγές: Skroutz 3 ώρ. · BestPrice 2 ώρ. · Snif 2 ώρ. · Shopflix 2 ώρ. ·      │
│        e-shop.gr 2 ώρ.   ⚠ Skroutz/Δίσκοι: 35 ώρ.                           │
│ BuildDraft.gr · © 2026 Θεόδωρος Αμπατζής · δεν συνδέεται με τα καταστήματα  │
└──────────────────────────────────────────────────────────────────────────────┘

Εξαρτήματα ▾ open (click / Enter / ↓; Esc closes):
┌───────────────────────────────────────────────────────────────────┐
│ ΒΑΣΙΚΑ              ΚΟΥΤΙ, ΡΕΥΜΑ ΚΑΙ ΨΥΞΗ     ΕΡΓΑΛΕΙΑ           │
│ ▢ Επεξεργαστές      ▢ Κουτιά                  🛠 PC Builder      │
│ ▢ Μητρικές          ▢ Τροφοδοτικά             ⇄ Σύγκριση (σύντομα)│
│ ▢ Μνήμη RAM         ▢ Ψύκτρες CPU             % Προσφορές (σύντομα)│
│ ■ Κάρτες γραφικών ← current                                      │
│ ▢ Δίσκοι            ▢ Ανεμιστήρες                                 │
└───────────────────────────────────────────────────────────────────┘
```

**Tablet 640–1023 px:** same header in two rows when needed: logo · Εξαρτήματα ▾ · PC Builder · ΕΛ · ☾, then the search field across the full width. The mega menu is the same panel in two columns.

**Phone < 640 px (360):**

```
┌────────────────────────────────────┐
│ ▣ BuildDraft.gr        🔍  🛠  ▦   │  (44 px buttons; ▦ = Εξαρτήματα)
├────────────────────────────────────┤
│ Αρχική › Κάρτες γραφικών           │  current section always visible
│ ...v1 page...                      │
└────────────────────────────────────┘

🔍 → full-screen search panel (input focused, suggestions under it; ✕, Esc
     or phone Back closes)
▦  → /parts (a real page, so Back returns):
┌────────────────────────────────────┐
│ ←  Εξαρτήματα          ΕΛ|EN   ☾   │
│ [🔍 Αναζήτηση…                   ] │
│ ┌──────────┐ ┌──────────┐          │
│ │ ▢ Επεξερ-│ │ ▢ Μητρι- │          │  2 tiles per row, icon + name
│ │  γαστές  │ │  κές     │          │  + model count (manifest.json)
│ └──────────┘ └──────────┘          │
│  … Βασικά, Κουτί ρεύμα και ψύξη …  │
│ [🛠 PC Builder                   ] │
└────────────────────────────────────┘
```

**Temporary home (C7):** title + one-line description, the large search box, the 9 category tiles (icon, name, model count) and the "PC Builder" button. Nothing else (the real home is Phase 5).

---

## A6. Risks and open questions

**Questions for you** (my recommendation first):
1. **Σύγκριση and Προσφορές** are in the menu (C3), but no phase builds those pages yet. → In Phase 1 they show as "Σύντομα"/"Coming soon" items that are not links. Which phase builds them is your call.
2. **Phone header** (360 px): logo + search + PC Builder + menu fit, but language and theme don't. → Move language and theme to the top of the `/parts` page (and the footer). The alternative keeps them in the header and shows only the logo mark (no name) at 360.
3. **Monospace use.** The plan says "codes and technical values". → Codes only (part numbers, model codes). Spec values and prices stay in Inter with tabular numbers: narrower at 360 px, and no extra font on every list page.
4. **"PC Builder" in Greek.** v1 says "Συναρμολόγηση PC"; the plan and this prompt say "PC Builder". → Keep "PC Builder" as the tool's name in both languages (glossary entry), so C8's "no English words" applies to labels, not to this one product name.
5. **Builder CLS.** Today it's 0.0099 (shown as 0.01). Today's Lighthouse run attributes it to v1's builder step card (`section.card`) when data arrives, not to the shell. The Phase 1 target is CLS 0. → Leave the builder untouched (Phase 4 redesigns it) and report 0.01 as unchanged from baseline. The alternative is a one-line minimum height on that card now.
6. **v1 swaps in A3 "Live in P1"** (status line, error state, phone skeleton, photo placeholder, copy): the audit assigns them to P1 and they don't move anything. → Do them. The price cell, spec line, filters, badges and part rows stay in the catalogue until Phases 2–4.

**Risks:**

7. **JS budget.** The plan depends on moving list-page code to its own chunk. Category pages then load two JS files; if their Lighthouse drops, the shell preloads the chunk per route. Measured at Stop 3 against the baseline (GPU 97/100).
8. **Blue palette vs the light-blue "note" colour.** Brand blue and "Likely fits" light blue are neighbours. With the Blue palette, the note colour must lean cyan, and the icon + word carry the meaning. Indigo separates more clearly. You choose at Stop 2; the preview shows both side by side with badges and buttons together.
9. **Search covers models, not products, for GPU/RAM/PSU.** "Kingston Fury" finds no RAM model (models are specs). The maker lists send it to RAM filtered by maker. Real product search needs Phase 2/3 product keys.
10. **Search index on a slow phone.** 84 KB is about 0.5 s on Lighthouse's slow 4G (estimate). Categories answer instantly; the index starts downloading on hover/touch, before focus.
11. **Vercel behaviour can't be tested before launch** (ground rule 2): deep-link rewrites and the real 404 status. Locally, `vite preview` serves deep links (e2e-tested), and a unit test checks that `vercel.json` covers every route in the table. Real check in Phase 5.
12. **Model URLs before Phase 3** use v1's text search, so near names (e.g. "RTX 5070 Ti") can appear too. Temporary, and listed in the final report.
13. **Redirects after re-grouping** (A2.3) work only once v2 is live and fetch the live `slugs.json`. Before launch they're tested with a fixture, not end to end.
14. **Builder Back button (O-01)** stays as v1 (steps use `replaceState`): Phase 4. Real URLs don't change it.

---

## How Stops 2 and 3 run

**Stop 2 (preview, then wait for your choice).**
- **Page:** `/_preview`, development only. It is imported behind `import.meta.env.DEV`, so production builds don't contain it. Verified at Stop 2 by searching `dist/` for a marker string and for the chunk.
- **Controls:** logo A/B/C, palette Blue/Indigo, theme, language, all in the URL (`/_preview?logo=b&palette=indigo&theme=dark&lang=en`), so every screenshot can be reproduced.
- **Content:** real products and prices from today's data. The browser tab favicon switches with the selected logo. Each logo is shown at 16/32/48 px, in the header and as a 1200×630 social image. Contrast tables are computed live for every text/background pair.
- **Screenshots** (in `docs/phase1/preview/`): 12 at 1366 px in Greek (3 logos × 2 palettes × dark/light), plus 8 at 360 px and in English (2 palettes × 2 themes × 2 widths/languages).

**Stop 3 (after your choice).** One commit each:
1. tokens + fonts
2. router, route table, old-link redirect + tests
3. header, mega menu, tiles page, breadcrumbs, footer, status line
4. search index + search box
5. home, 404, error/loading states
6. v1 swaps + copy + list-chunk split
7. checks, screenshots (`docs/phase1/`), report

Each commit passes `npm run check`, with no new lint suppressions.

**Checks (section D):**
- `npm run check`.
- **e2e:**
  - the 15 smoke tests, moved to the new URLs
  - every row of A2.5 with its parameters
  - deep links opened directly (`/gpu?vram=16`, `/builder?step=case`)
  - a v1 shared-build link that still opens the same build
- **Lighthouse:** local `npm run preview:local`, 3 runs, median; home, `/gpu`, `/builder`; mobile and desktop. Compared with the §7 baseline (v1's `/` = GPU 97/100; builder 91/100).
- **First-load JS and data per page**, compared with the baseline and the 110 KB budget.
- **Layout audit:** 360/768/1366/1920 × dark/light × el/en.
- **Keyboard walk** of the whole shell (Tab order, visible focus, menu/combobox keys).
- **Motion check** (A4).
- **Production bundle without `/_preview`.**
