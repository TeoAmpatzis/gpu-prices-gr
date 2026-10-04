# BuildDraft.gr v1 — UX audit (v2 Phase 0, part B4)

Date: 2026-10-03 · Site under test: local production preview of v1 at `http://localhost:4180` (branch `v2`, v1 code unchanged) · Screenshots: `docs/audit/ux/` (curated JPEGs, referenced below as `ux/…`), full matrix and raw measurements in `docs/audit/ux-full/` (not for commit).

## Summary

Every page type was opened at 360, 768, 1366 and 1920 px, in Greek and English, light and dark: the nine category list pages, product details (opened inside the list), the builder in Guided and Quick list modes, About, Contact and Privacy. v1 has **no "deals" and no "compare" pages**, so there was nothing to test there.

**50 findings: S1 0 · S2 1 · S3 33 · S4 16.** No page scrolls sideways at any tested width, language or theme. The layout audit found 0 issues, and the 112 dark-theme views showed 0 overflow. The problems are about meaning, findability and trust, not broken layout. They fall into five groups:

1. **Navigation and orientation.** There is no home page, and `/` opens the graphics-card prices. On a phone the PC builder tab is off-screen (it starts at x = 1102 px in a 360 px viewport). In the Greek light theme the builder tab is clipped by 13 px at every desktop width, and below 1180 px the hidden tabs give no cue that the bar scrolls (UX-01…03).
2. **Filters work against common conventions** (Baymard):
   - Pill groups start fully ticked, so clicking "NVIDIA" removes NVIDIA.
   - Every spec filter is a single-choice native dropdown, with up to 169 options and no search.
   - The maker lists contain junk and duplicate values.
   - One storage filter covers 2.4 % of drives.
   - There are no quick filters above the list, and the table headers don't sort (UX-10…16).
3. **The price display hides what the plan calls its main advantage.** The real shop, the shipping breakdown and the 7-day change are hover-only tooltips, so phones never see them. Availability and per-price check time are not shown anywhere. Implausible prices appear without a warning. One RAM offer shows **280,47 €** with **"590,01 € με μεταφορικά"** in the same row, and the builder uses the 280,47 € figure (UX-23…27).
4. **The builder's status messages don't separate severity.**
   - Missing parts, "not verified" and a real socket clash all get the same amber triangle. An empty build opens with "⚠ 6".
   - An incompatible part shows as a completed step (✓). Its reason is only in a tooltip.
   - "Clear build" wipes everything with no confirmation or undo.
   - Saved parts that disappeared are dropped silently, and on phones the shared-build notice is hidden (UX-32…42).
5. **The builder's recommendations contradict its own advice.** The RAM guide says "take a 2-stick kit" but the first card is 1×32GB. With "Gaming + 1.000 €", taking the first card in every step gives 1.566,16 € (UX-37). Quick-list pickers start with obsolete parts (Celeron G3930, LGA1151) (UX-49).

### Ten most important

| # | ID | Sev | One line |
| --- | --- | --- | --- |
| 1 | UX-25 | S2 | Same offer shows 280,47 € and "590,01 € με μεταφορικά"; the builder adds 280,47 € to the total. |
| 2 | UX-10 | S3 | Filter pills start all ticked; clicking a value removes it (NVIDIA → shows AMD + Intel). |
| 3 | UX-33 | S3 | Builder: missing parts, "not verified" and a real clash share one amber icon; an empty build starts with "⚠ 6". |
| 4 | UX-01 | S3 | No home page; on phones the PC builder link is off-screen and nothing says it exists. |
| 5 | UX-23 | S3 | Real shop, shipping breakdown and 7-day change live only in hover tooltips; no availability, no per-price check time. |
| 6 | UX-35 | S3 | An incompatible part shows as a completed step (✓) and is hidden from its own step; the reason is tooltip-only. |
| 7 | UX-37 | S3 | Recommended picks contradict the builder's own advice (1×32GB vs "take a 2-stick kit") and overshoot the budget by 57 %. |
| 8 | UX-11 | S3 | Spec filters are single-choice dropdowns of up to 169 options, with no search and zero-count options left in. |
| 9 | UX-02 | S3 | The PC builder tab is clipped by 13 px at 1366 and 1920 in the Greek light theme (main call to action). |
| 10 | UX-38 | S3 | "Clear build" empties a full build in one tap, with no confirmation or undo. |

**Suggested v1 hotfixes** (trivial and important): UX-02 (builder tab clipped) and UX-38 (confirm before clearing). UX-25 becomes a hotfix candidate once the data audit (B2) finds the cause. Everything else is v2 work.

Severity scale: S1 = the page tells the user something false that could cost money · S2 = a feature does not work · S3 = usability problem · S4 = cosmetic. Heuristics are Nielsen's ten, written N1…N10:

| Code | Heuristic |
| --- | --- |
| N1 | Visibility of system status |
| N2 | Match between system and the real world |
| N3 | User control and freedom |
| N4 | Consistency and standards |
| N5 | Error prevention |
| N6 | Recognition rather than recall |
| N7 | Flexibility and efficiency of use |
| N8 | Aesthetic and minimalist design |
| N9 | Help users recognise, diagnose and recover from errors |
| N10 | Help and documentation |

"Baymard" points to the four findings cited in `docs/redesign-v2.md`. Fix targets name v2 phases where the plan defines them: phase 1 is the design system, phase 2 the compatibility engine, then category pages/filters, product page and builder.

## UX findings by page

### All pages: header, navigation, first visit

**UX-01 · S3 · No home page; the builder can't be found on a phone**
- **Rule:** N6, N1. Plan "Αρχική σελίδα, πλοήγηση".
- **Seen:**
  - `/` with nothing stored (Greek browser) opens "Τιμές Καρτών Γραφικών" directly. There is no orientation, no site-wide search and no "build a PC" entry point.
  - At 360 px only two tabs are in view (Κάρτες Γραφικών, Επεξεργαστές). The "Συναρμολόγηση PC" tab sits at x = 1102–1277 px in a 360 px viewport, and the footer links only to About / Contact / Privacy.
  - The first product card starts at y = 429 of 780 px.
- **Where:** `/`, 360 and 1366, el, light.
- **Screens:** `ux/ux-first-visit-360-el-light.jpg`, `ux/ux-first-visit-1366-el-light.jpg`.
- **Fix:** v2 (home page and navigation).

**UX-02 · S3 · The PC builder tab is clipped at every desktop width (Greek, light theme)**
- **Rule:** N1, N8.
- **Seen:**
  - The last tab ends 13 px past the tab bar at 1366 and 1920 px, so "Συναρμολόγηση PC" reads "…P(" with no right border. In the dark theme it ends exactly at the edge (0 px).
  - The only measured difference is `body` font-weight 450 (light) vs 400 (dark), from `index.css`. That is the likely cause.
  - The layout audit can't flag it, because the nav is a scroller with a hidden scrollbar. CLAUDE.md's "0 px overflow at 1366/1920" was probably measured in dark (hypothesis).
- **Where:** all pages, 1366 and 1920, el, light. English fits.
- **Screens:** `ux/ux-tabbar-builder-cut-1366-el-light.jpg` vs `ux/ux-tabbar-builder-cut-1366-el-dark.jpg`.
- **Fix:** **v1 hotfix.** Trivial: trim tab padding/gap, or keep weight 400 in the nav. It is the main call to action.

**UX-03 · S3 · Hidden tabs with no scroll cue; the current tab can be off-screen**
- **Rule:** N1, N6.
- **Seen:** The tab bar scrolls sideways with no scrollbar, fade or arrow.
  - Greek, 768 px: 525 px of tabs hidden (Τροφοδοτικά cut; Κουτιά, Ανεμιστήρες, Ψύκτρες CPU and the builder out of view).
  - Greek, 1024 px: Ψύκτρες CPU cut and the builder out of view.
  - Greek, 1180 px: builder cut.
  - English: overflow 460 px at 768, 0 from 1279.
  - The active tab is not scrolled into view. On Cases, Coolers and the builder, the current tab is invisible at both 360 and 768 px.
- **Where:** all pages, 360–1180 px, el/en, light/dark.
- **Screens:** `ux/ux-tabbar-768-el-light.jpg`, `ux/ux-tabbar-1024-el-light.jpg`, `ux/ux-tabbar-1180-el-light.jpg`, `ux/ux-active-tab-hidden-768-el-dark-case.jpg`.
- **Fix:** v2 (grouped menu, as planned).

**UX-04 · S3 · "5 καταστήματα / 5 stores" mislabels the sources; a delayed source's age is not shown**
- **Rule:** N2, N1. Plan "Πηγή και κατάστημα είναι διαφορετικά πράγματα".
- **Seen:**
  - The status line says "5 καταστήματα · ενημέρωση πριν από 7 ώρ." and its popover heading says "Ενημέρωση ανά κατάστημα". Yet Skroutz, BestPrice and Snif are comparison sites with many shops behind them, as the About page itself says.
  - Listing counts are called "προϊόντα".
  - When a source is late, the line still shows the newest source's age. In the popover the late source shows only "καθυστερεί" (amber dot), with no date. On GPU, Skroutz was "καθυστερεί" while the line said "7 ώρ.".
- **Where:** every category page, all widths, el/en ("5 stores").
- **Screens:** `ux/ux-status-popover-1366-el-light-gpu.jpg`, `ux/ux-list-360-en-light-psu.jpg`, `ux/ux-info-1366-el-light-about.jpg`.
- **Fix:** v2 phase 1 (price cell and status component).

**UX-05 · S3 · No skip link: 37 Tab presses to the first product**
- **Rule:** N7; WCAG 2.4.1.
- **Seen:**
  - From the top of `#gpu` at 1366 px, keyboard focus passes through the logo, the language and theme buttons and 10 tabs (13 stops), then 22 filter controls and the status button. The first product row is press 37.
  - In the builder (CPU step), the first "Επιλογή" is press 31. That path goes through 10 tabs, the mode switch and 11 progress steps.
  - Focus is clearly visible all the way. See "What works well".
- **Where:** 1366, el, light (the order is the same in every theme and language).
- **Screens:** `ux/ux-focus-row-1366-el-light.jpg`. Full sequence in `ux-full/lists.json` (`focus`) and `ux-full/builder.json` (`keyboard`).
- **Fix:** v2 phase 1.

**UX-06 · S4 · Small text below 4.5:1 contrast (light theme)**
- **Rule:** WCAG 1.4.3.
- **Seen:** Approximate in-page measurement (see Method):
  - The builder tab text (`text-accent/80`) is 3.57:1 at 14 px semibold, on every page.
  - The current page number in the pager is 4.46:1.
  - The current-step number in the builder progress bar is 3.9:1 at 12 px.
  - Dark theme: no non-disabled text under the threshold in the views screened.
- **Where:** light theme, all widths.
- **Screens:** `ux/ux-list-1366-el-light-gpu.jpg` (tab), `ux/ux-builder-guided-cpu-1366-el-light.jpg` (step 2).
- **Fix:** v2 phase 1 (tokens).

**UX-07 · S4 · The logo tagline wraps to three lines on phones and splits "e-shop.gr"**
- **Rule:** N8.
- **Seen:** At 360 px the tagline "Skroutz · BestPrice · Shopflix · Snif · e-shop.gr" takes three lines and breaks as "e-" / "shop.gr". The header then fills about 100 px before the tabs.
- **Where:** all pages, 360, el and en.
- **Screens:** `ux/ux-first-visit-360-el-light.jpg`.
- **Fix:** v2 phase 1.

**UX-08 · S4 · An unknown address silently shows graphics cards**
- **Rule:** N9.
- **Seen:** `/#this-page-does-not-exist` shows "Τιμές Καρτών Γραφικών". The bad hash stays in the address bar and there is no "page not found" message.
- **Where:** any width.
- **Screens:** none (it looks exactly like `ux/ux-list-1366-el-light-gpu.jpg`). Measured in `ux-full/extras.json` (`unknown`).
- **Fix:** v2 (real URLs and a 404 page).

**UX-09 · S4 · Blank white photo tiles while photos load (dark theme)**
- **Rule:** N1, N8.
- **Seen:**
  - When the GPU list is ready, 0 of the 9 photos in view have loaded. Each shows as an empty white square (`bg-white` tile), which stands out on the dark theme.
  - All 9 had loaded after 6 s through the local `/img/` proxy. The live CDN is probably faster (hypothesis).
- **Where:** list pages, dark, 1366 (also seen at other widths).
- **Screens:** `ux/ux-photos-loading-1366-el-dark-gpu.jpg`.
- **Fix:** v2 phase 1 (neutral placeholder or icon until loaded).

### Category list pages (all nine)

**UX-10 · S3 · Filter pills start all ticked; clicking a value removes it**
- **Rule:** Baymard applied filters; N4, N2.
- **Seen:**
  - Every pill group (makers on GPU/CPU, socket, DDR type, storage type, efficiency, size, cooler type) starts with every value ticked (✓). So do the five "Πηγή" source chips.
  - Clicking "NVIDIA" removes NVIDIA: 70 → 27 models (AMD + Intel). The summary chip reads "Κατασκευαστής: AMD, Intel" and the URL becomes `#gpu?brand=amd,intel`.
  - To see only Gold PSUs a user must untick 7 pills.
  - Unticking all three GPU makers gives 0 models and a chip "Κατασκευαστής: —".
  - Ticked-by-default pills also look like active filters when nothing is filtered.
- **Where:** all categories, all widths (in the phone sheet too).
- **Screens:** `ux/ux-pill-click-nvidia-1366-el-light-gpu.jpg`, `ux/ux-pill-none-1366-el-light-gpu.jpg`, `ux/ux-sheet-top-360-el-light-case.jpg`.
- **Fix:** v2 category pages/filters (none ticked = all; a tick narrows).

**UX-11 · S3 · Spec filters are single-choice dropdowns: long, unsearchable, zero options left in**
- **Rule:** Baymard truncation (~10 + "more"); plan filter rules 1–3; N7.
- **Seen:**
  - Every spec filter is a native single-choice `<select>`. You can't pick AM4 *and* AM5, two chipsets or two makers.
  - Options per list: maker 22 (GPU card maker), 84 (RAM), 76 (storage), 138 (PSU), 169 (cases), 160 (fans), 134 (coolers). Also CPU socket 20, cores 26 and series 26; motherboard chipset 49; RAM speed 27 and CL 23.
  - There is no search inside a list.
  - Options with 0 results stay in the list (disabled). For example, CPU "Σειρά" in the Desktop segment lists "EPYC (0)" and "Xeon (0)".
  - Price has only a maximum (no minimum), applied to the price without shipping (from code).
- **Where:** sidebar ≥ 1024 px and the phone sheet, every category.
- **Screens:** `ux/ux-storage-sidebar-specs-1366-el-light.jpg`, `ux/ux-sheet-bottom-360-el-light-case.jpg`. Option counts in `ux-full/lists.json` (`inventory`).
- **Fix:** v2 category pages/filters.

**UX-12 · S3 · The maker list shows junk and duplicate makers**
- **Rule:** N4, N8.
- **Seen:** The cases "Κατασκευαστής" dropdown (169 options) includes:
  - Words that aren't makers: "Midi", "Full", "Mini", "MINI/MICRO", "Micro", "ATX", "Gaming", "Computer", "Power", "Pro", "Super", "In", "LC".
  - Part numbers: "GC-625-PRO", "LI37753269AN".
  - Spellings that differ only in case: "Armaggeddon" / "ARMAGGEDDON" / "ARMAGG.", "Havn" / "HAVN", "Tracer" / "TRACER", "Adata" / "ADATA", "Vevor" / "VEVOR", "Alphagear" / "AlphaGear" / "ALPHAGEAR" and more.
- **Where:** cases (checked); other categories have long lists too.
- **Screens:** none (native dropdowns can't be screenshotted headless). Option text captured in `ux-full/lists.json` (`sheet.footer`).
- **Fix:** scraper normalisation (data audit B2), then v2 filters.

**UX-13 · S3 · A storage filter that covers 2.4 % of drives**
- **Rule:** plan filter rule 4 and "under 30 % coverage → no filter"; N5.
- **Seen:**
  - "Cache DRAM (SSD)" offers "Ναι (4)" and "Όχι (25)" across 1,226 consumer drives.
  - Choosing "Ναι" hides every drive whose DRAM isn't stated, which is almost all of them, and nothing says why.
- **Where:** `#storage`, all widths.
- **Screens:** `ux/ux-list-1366-el-light-storage.jpg` (page). The counts are in the dropdown's options, recorded in `ux-full/lists.json` (`inventory.storage`).
- **Fix:** v2 category pages/filters (coverage notice, or remove until coverage ≥ 30 %).

**UX-14 · S3 · Some attributes shown in the list have no filter**
- **Rule:** Baymard "a filter for every attribute shown".
- **Seen:** Mostly covered; gaps:
  - Storage: read speed, TBW, HDD rpm and cache are shown but not filterable. €/TB can be sorted but not filtered.
  - Fans: the per-fan price column can't be filtered or sorted.
  - RAM: the Type column (Desktop / Laptop / Server) can only be filtered as "Laptop / Server" together.
  - PSU: SFX, TFX and Flex share one segment.
  - All lists: the 7-day change and the price with shipping can't be filtered or sorted.

  See the table below.
- **Where:** list pages.
- **Screens:** `ux/ux-list-1366-el-light-storage.jpg`, `ux/ux-list-1366-el-light-fan.jpg`.
- **Fix:** v2 category pages/filters.

**UX-15 · S3 · No quick filters above the list; on phones, sort and filters are hidden in the sheet**
- **Rule:** Baymard promoted filters; N7.
- **Seen:**
  - Nothing between the result count and the table offers the category's common filters (e.g. "AM5", "DDR5", "1TB").
  - Below 1024 px the only control above the cards is "Φίλτρα". Sort is only inside the sheet.
- **Where:** all categories, all widths.
- **Screens:** `ux/ux-list-1366-el-light-gpu.jpg`, `ux/ux-list-360-el-light-gpu.jpg`.
- **Fix:** v2 category pages/filters.

**UX-16 · S3 · Table headers don't sort; few per-unit sorts**
- **Rule:** N4, N7; plan "στήλες που ταξινομούνται".
- **Seen:**
  - Clicking "VRAM" or "Φθηνότερη" leaves the order and the URL unchanged. No header is a button or carries `aria-sort`.
  - Sort is a sidebar dropdown with five options, plus €/TB on storage. There is no €/GB (RAM), €/W (PSU) or per-fan sort.
- **Where:** tables ≥ 1024 px, all categories.
- **Screens:** `ux/ux-list-1366-el-light-gpu.jpg`, `ux/ux-sort-help-1366-el-light-gpu.jpg` (the sort's "Πώς ταξινομούνται;" help). Test in `ux-full/lists.json` (`headerClick`).
- **Fix:** v2 category pages/filters.

**UX-17 · S3 · One word, two meanings, and three "reset" buttons**
- **Rule:** N4.
- **Seen:**
  - On `#gpu`, "ΚΑΤΑΣΚΕΥΑΣΤΗΣ" labels the NVIDIA/AMD/Intel pills, and also the table column that shows the board partner of the cheapest listing.
  - The segment control is labelled "ΚΑΤΗΓΟΡΙΑ" on a category page.
  - Three buttons reset filters:
    - "Επαναφορά" (sidebar) also resets the sort (from code).
    - "Καθαρισμός όλων" keeps the sort.
    - "Καθαρισμός φίλτρων" sits in the empty state.
  - Rows are "μοντέλα" but their listings are "προϊόντα" ("139 προϊόντα").
- **Where:** list pages, el (en has the same structure).
- **Screens:** `ux/ux-list-1366-el-light-gpu.jpg`, `ux/ux-empty-1366-el-light-gpu.jpg`.
- **Fix:** v2 phase 1 (copy) and category pages.

**UX-18 · S3 · Rows that group many makers show one maker and one photo**
- **Rule:** N2.
- **Seen:**
  - RAM, PSU and GPU rows are specification groups.
  - "DDR5 32GB (1×32GB) 5600MHz" shows Manufacturer "Lexar" and a Kingston FURY Beast photo. Its 119 listings come from Lexar, Patriot, GoodRam, Kingston, Klevv, Crucial, G.Skill and others.
  - "RTX 5060" shows "Gigabyte" for 139 listings from at least 8 board partners (Gigabyte, Palit, PNY, MSI, Zotac, Asus, Gainward, Inno3D…).
- **Where:** RAM/PSU/GPU, all widths.
- **Screens:** `ux/ux-details-1366-el-light-ram.jpg`, `ux/ux-details-1366-el-light-gpu.jpg`.
- **Fix:** v2 product page (variants) and category pages.

**UX-19 · S3 · Load error: raw technical text, no retry**
- **Rule:** N9.
- **Seen:**
  - When `list.json` fails, the page shows "Αποτυχία φόρτωσης δεδομένων: /data/gpu/list.json: HTTP 500". Offline it shows "… : Failed to fetch", in English inside the Greek UI.
  - There is no retry button and no advice.
- **Where:** any list page. Simulated: 1366 (HTTP 500) and 360 (offline).
- **Screens:** `ux/ux-error-http500-1366-el-light-gpu.jpg`, `ux/ux-error-offline-360-el-light-gpu.jpg`.
- **Fix:** v2 phase 1 (error state component).

**UX-20 · S4 · On phones, applied-filter chips wrap and push the results down**
- **Rule:** N8; plan "chips που κυλούν οριζόντια".
- **Seen:** Two filters ("Μόνο προσφορές", "Πλαϊνό παράθυρο: Ναι") plus "Καθαρισμός όλων" take three lines. The first product starts at y ≈ 585 of 780 px.
- **Where:** `#case`, 360, el, light.
- **Screens:** `ux/ux-applied-360-el-light-case.jpg`.
- **Fix:** v2 category pages.

**UX-21 · S4 · The phone loading skeleton is the desktop layout**
- **Rule:** N1, N4.
- **Seen:** While data loads at 360 px, the skeleton draws a sidebar card with fields and chips. The real page then shows a single "Φίλτρα" button, so the content jumps up.
- **Where:** list pages, 360.
- **Screens:** `ux/ux-loading-360-el-light-gpu.jpg` vs `ux/ux-list-360-el-light-gpu.jpg`.
- **Fix:** v2 phase 1.

**UX-22 · S4 · English words inside Greek filter labels**
- **Rule:** N2.
- **Seen:**
  - "Τεμάχια στο kit: 1 × module" (the English UI says "1 × stick").
  - "Latency (το πολύ)", "Laptop / Server", "Semi-modular".
  - Technical terms such as Socket and Chipset are fine.
- **Where:** RAM and PSU sidebars, el.
- **Screens:** `ux/ux-list-1366-el-light-ram.jpg`, `ux/ux-list-1366-el-light-psu.jpg`.
- **Fix:** v2 phase 1 (copy).

#### Price display (lists and details)

**UX-23 · S3 · The real shop, the shipping breakdown and the check time are not visible**
- **Rule:** plan principle 3 ("Κάθε τιμή δείχνει κατάστημα, μεταφορικά και πότε ελέγχθηκε"); N1; touch has no hover.
- **Seen:**
  - The price shows a *source* badge (Skroutz, BestPrice…). The actual shop ("MobileHub", "Plaisio", "Dexter"…) and "452,99 € + 4,00 € μεταφορικά" exist only as `title` tooltips on "… με μεταφορικά".
  - On the GPU phone page, 131 pieces of information are hover-only: about 40 shop/shipping tooltips, 38 "Μεταβολή 7 ημερών", 50 group-dot names, the sale source and the all-time-low date.
  - No availability is shown anywhere.
  - No per-price check time; only the page-wide "ενημέρωση πριν από 7 ώρ.".
- **Where:** list rows and cards, details, builder. All widths; the worst case is phones.
- **Screens:** `ux/ux-details-1366-el-light-gpu.jpg`, `ux/ux-list-360-el-light-gpu.jpg`. Counts in `ux-full/lists.json` (`hover`).
- **Fix:** v2 phase 1 (price cell).

**UX-24 · S3 · The 7-day change has no label**
- **Rule:** N6, N10.
- **Seen:** "↘45,00 €" / "↗13,34 €" sits under the price. "Μεταβολή 7 ημερών" exists only as a tooltip, so on phones there is no way to learn what the number is.
- **Where:** all list pages, all widths.
- **Screens:** `ux/ux-list-360-el-light-gpu.jpg`, `ux/ux-list-1366-el-light-gpu.jpg`.
- **Fix:** v2 phase 1.

**UX-25 · S2 · One offer, two contradictory prices**
- **Rule:** N1; plan principle 3.
- **Seen:**
  - In RAM "DDR5 32GB (1×32GB) 5600MHz", the first offer reads **280,47 €** BestPrice "Lexar 32GB…" next to **"590,01 € με μεταφορικά"**. The tooltip says "Techstores: 586,51 € + 3,50 € μεταφορικά".
  - The row's headline is 280,47 € (↘218,53 € in 7 days). The guided builder took this offer and added **280,47 €** to its total (Review and "Copy list").
  - At least one of the two numbers is wrong. Which one, and why, is unknown. Hypothesis: a stale shipping cache or a mismatched offer; for the data audit (B2).
  - If the 280,47 € offer does not exist, this is S1.
- **Where:** `#ram` details 1366 (also on phones); builder.
- **Screens:** `ux/ux-details-1366-el-light-ram.jpg`, `ux/ux-builder-guided-review-1366-el-light.jpg`. Text in `ux-full/lists.json` (`details.1366-ram`) and `ux-full/builder.json` (`copyList`).
- **Fix:** v1 hotfix candidate once B2 confirms the cause (e.g. hide a total that is far from its listing price); v2 phase 1.

**UX-26 · S3 · Implausibly low prices get no warning and are recommended first**
- **Rule:** plan "Τιμές" rule 4 ("Ασυνήθιστα χαμηλή"); N5.
- **Seen:**
  - "Samsung 990 Pro Heatsink 2TB" shows **239,99 €** (Snif, no shipping data). The next offers are 397,46 € (e-shop.gr) and 439,00 € (BestPrice). It is first in Recommended on `#storage` and was the builder's first storage card.
  - The builder's first PSU card is "850W Gold" at 55,99 € (an Adata XPG Kyber II 850W, per the link).
  - Whether these prices are real is not verifiable here (hypothesis: data errors, B2). Either way the UI presents them as normal.
- **Where:** `#storage`, builder.
- **Screens:** `ux/ux-details-768-el-light-storage.jpg`, `ux/ux-list-1366-el-light-storage.jpg`, `ux/ux-builder-review-full-1366-el-light.jpg`.
- **Fix:** v2 phase 1 (outlier badge) with B2.

**UX-27 · S4 · The "Range" column is dominated by mismatched listings**
- **Rule:** N8.
- **Seen:** "έως 3.689,00 €" for a 32GB DDR5 stick, "έως 3.044,31 €" for RX 9070 XT, "έως 1.269,90 €" for RTX 5060. The column can't be trusted as a price range.
- **Where:** tables ≥ 1280 px.
- **Screens:** `ux/ux-details-1366-el-light-ram.jpg`, `ux/ux-list-1366-el-light-gpu.jpg`.
- **Fix:** v2 category pages (drop it, or use a percentile range); B2 for the listings.

### Product details (opened inside the list)

**UX-28 · S3 · A product has no address**
- **Rule:** N2, N7.
- **Seen:**
  - Opening a product leaves the URL at `#gpu`, so a product can't be bookmarked or sent.
  - The Contact page asks users to "στείλτε τον σύνδεσμο του προϊόντος" (send the product's link), which doesn't exist.
- **Where:** all list pages; Contact page.
- **Screens:** `ux/ux-details-1366-el-light-gpu.jpg`, `ux/ux-info-360-el-light-contact.jpg`. Test in `ux-full/extras.json` (`productUrl`).
- **Fix:** v2 product page.

**UX-29 · S3 · Offer titles are truncated so far that offers look identical**
- **Rule:** N6.
- **Seen:**
  - At 1366 px the title column shows about 15–30 characters: "GIGABYTE NVIDIA…", "Palit GeForce…".
  - Two rows read exactly "Inno3D GeForce RTX 5060 8GB…". RAM shows "Lexar 32GB…" and "PATRIOT…".
  - The full title is only a tooltip.
- **Where:** details, 1024–1279 and 1366 (one line from 1280 px).
- **Screens:** `ux/ux-details-1366-el-light-gpu.jpg`, `ux/ux-details-1366-el-light-ram.jpg`.
- **Fix:** v2 product page.

**UX-30 · S3 · On phones the offers are a small scroll box inside the page**
- **Rule:** N7, N8.
- **Seen:**
  - The offers list is capped at 320 px with its own scrolling. At 360 px only 2–3 of 139 offers are visible, and the page scrolls around the box.
  - Offers are ordered by price without shipping (from code). There is no way to order them by total.
- **Where:** details, 360 and 768.
- **Screens:** `ux/ux-details-360-el-light-gpu.jpg`.
- **Fix:** v2 product page.

**UX-31 · S4 · An opened card leaves a blank area in the two-column tablet grid**
- **Rule:** N8.
- **Seen:** At 768 px the opened card grows to about 950 px tall. The card beside it stays short, leaving a large empty area.
- **Where:** 640–1023 px.
- **Screens:** `ux/ux-details-768-el-light-storage.jpg`.
- **Fix:** v2 product page.

### PC builder — Guided (`#builder`)

**UX-32 · S3 · On a phone the first screen is all chrome and a warning**
- **Rule:** N8, N1.
- **Seen:**
  - The header, the mode switch, a 5-line yellow notice about measurement coverage, and an unlabelled progress row (1–11) fill the first 655 px.
  - The first question ("Για τι θα χρησιμοποιηθεί…") is below the fold.
  - The bottom bar already shows "⚠ 6" before the user has done anything.
- **Where:** 360, el/en, light/dark.
- **Screens:** `ux/ux-builder-guided-360-el-light.jpg`, `ux/ux-builder-guided-360-el-dark.jpg`.
- **Fix:** v2 builder.

**UX-33 · S3 · Missing parts, "not verified" and real clashes look the same**
- **Rule:** N1, N9; plan "τρία επίπεδα μηνυμάτων".
- **Seen:**
  - An empty build lists six "Διαλέξτε …" notes, each with the amber warning triangle. The phone bar counts them as "⚠ 6".
  - A build with an Intel CPU on an AM5 board shows "⚠ 7" on the phone bar. On desktop it is seven identical amber notes: four missing parts, "no iGPU", "no cooler", and, last, "Ασυμβατότητα: επεξεργαστής και μητρική δεν ταιριάζουν".
  - The real clash is indistinguishable from "you haven't picked a case yet".
- **Where:** summary, all widths.
- **Screens:** `ux/ux-builder-guided-1366-el-light.jpg`, `ux/ux-builder-clash-quick-1366-el-light.jpg`, `ux/ux-builder-clash-quick-360-el-light.jpg`, `ux/ux-builder-clash-review-360-el-light.jpg`.
- **Fix:** v2 phase 2 and builder.

**UX-34 · S3 · The status line uses one icon for "not verified" and "incompatible"**
- **Rule:** N1, N4.
- **Seen:** "⚠ 7 χωράνε · 1 πιθανότατα · 1 χωρίς επιβεβαίωση" (nothing wrong) and "⚠ 1 ασύμβατα" (a real clash) use the same amber triangle.
- **Where:** summary, all widths.
- **Screens:** `ux/ux-builder-guided-review-1366-el-light.jpg`, `ux/ux-builder-clash-quick-1366-el-light.jpg`.
- **Fix:** v2 phase 2 and builder.

**UX-35 · S3 · An incompatible part shows as a completed step and disappears from its own step**
- **Rule:** N1, N9.
- **Seen:**
  - With the clashing board saved, the progress bar shows ✓ Μητρική.
  - The board step lists "201 εμφανίζονται · 822 ασύμβατα κρυμμένα", and the chosen board is not among them, so the user can't see or remove it there.
  - The reason "Socket LGA1700 ≠ μητρικής AM5." exists only as the tooltip of the red "Ασύμβατο" badge in Review, so a phone can't reach it.
  - The summary says only "επεξεργαστής και μητρική δεν ταιριάζουν".
- **Where:** builder, all widths.
- **Screens:** `ux/ux-builder-clash-mobo-step-1366-el-light.jpg`, `ux/ux-builder-clash-review-1366-el-light.jpg`. Tooltip text in `ux-full/extras.json` (`clashHover`).
- **Notes:** The clash was created from a saved build. The UI doesn't let a user pick a clashing part, but saved builds, shared links and data changes can produce one.
- **Fix:** v2 phase 2 and builder.

**UX-36 · S3 · After choosing a part, "Next" is about 1,250 px further down**
- **Rule:** N7.
- **Seen:**
  - In the CPU step (24 cards) the chosen card sits at y = 754 and "Επόμενο" at y = 2003, in a 900 px viewport. The same holds at 1920 px.
  - The page doesn't advance, and the sticky summary has no Next.
  - Phones are fine: Next is in the bottom bar.
- **Where:** builder, ≥ 1024 px.
- **Screens:** `ux/ux-builder-guided-mobo-chosen-1366-el-light.jpg`. Positions in `ux-full/extras.json` (`next`).
- **Fix:** v2 builder.

**UX-37 · S3 · Recommended picks contradict the builder's own advice and the budget**
- **Rule:** N4, N2.
- **Seen:**
  - The RAM step text says "Πάρτε kit 2 τεμαχίων (dual channel)… 32GB (2×16GB) για gaming". The first RAM card is "DDR5 32GB (1×32GB) 5600MHz".
  - The board step says "Πρόταση: 100–120 €" and shows a 209,90 € Z890 board first.
  - With "Gaming" and 1.000 €, taking the first card in every step gives **1.566,16 €** ("υπέρβαση 566,16 €").
  - "Εντός προϋπολογισμού" exists but is off by default.
- **Where:** guided builder, all widths.
- **Screens:** `ux/ux-builder-guided-ram-1366-el-dark.jpg`, `ux/ux-builder-guided-mobo-chosen-1366-el-light.jpg`, `ux/ux-builder-guided-review-1366-el-light.jpg`.
- **Fix:** v2 builder (ranking per step).

**UX-38 · S3 · "Clear build" deletes everything at once**
- **Rule:** N3, N5.
- **Seen:**
  - "Καθαρισμός" (a plain text link in the summary header) emptied a 9-part build in one click. No confirmation appeared (no dialog event) and there is no undo.
  - Only "use" and "budget" stay in `pcBuild`.
- **Where:** summary, all widths (phone: inside the bar's details).
- **Screens:** `ux/ux-builder-guided-review-1366-el-light.jpg` (before), `ux/ux-builder-cleared-1366-el-light.jpg` (after).
- **Fix:** **v1 hotfix** (a confirm step is trivial); v2 undo.

**UX-39 · S3 · Saved parts that no longer exist vanish silently**
- **Rule:** N1.
- **Seen:**
  - A saved build with a CPU and a GPU that are no longer in the data opens with only the board: "Σύνολο · 1 εξαρτήματα", "Διαλέξτε επεξεργαστή."
  - Nothing says that two parts were removed.
- **Where:** builder, both modes.
- **Screens:** `ux/ux-builder-vanished-part-1366-el-light.jpg`. Test in `ux-full/builder.json` (`vanished`).
- **Fix:** v2 builder.

**UX-40 · S3 · The parts list names specifications, not products**
- **Rule:** N2.
- **Seen:**
  - Review, summary and "Copy list" show "Τροφοδοτικό: 850W Gold · 55,99 € (BestPrice)" and "Μνήμη RAM: DDR5 32GB (1×32GB) 5600MHz". The real products, Adata XPG Kyber II and Lexar, appear only in the link URL.
  - Someone reading a shared list can't tell what to buy.
- **Where:** builder, all widths; clipboard text.
- **Screens:** `ux/ux-builder-review-full-1366-el-light.jpg`. Clipboard text in `ux-full/builder.json` (`copyList`).
- **Fix:** v2 builder.

**UX-41 · S3 · The builder total leaves out shipping and shows sources, not shops**
- **Rule:** plan "Τιμές"; N4.
- **Seen:**
  - The summary, Review and Copy list all say "χωρίς μεταφορικά", while the category pages show "με μεταφορικά".
  - Each part shows a source badge (BestPrice, Snif), not the shop.
  - The date has no time ("Σύνολο · 3/10/2026").
- **Where:** builder, all widths.
- **Screens:** `ux/ux-builder-guided-review-1366-el-light.jpg`.
- **Fix:** v2 builder and prices.

**UX-42 · S3 · On phones the "shared build" notice is hidden**
- **Rule:** N1.
- **Seen:**
  - Opening a share link at 360 px shows the build as if it were the user's own. The notice "Βλέπετε μια σύνθεση από σύνδεσμο…" exists in the DOM but sits inside the collapsed summary bar.
  - On desktop it is visible.
- **Where:** builder share link, 360 and 768.
- **Screens:** `ux/ux-builder-shared-360-el-light.jpg` vs `ux/ux-builder-shared-1366-el-light.jpg`.
- **Fix:** v2 builder.

**UX-43 · S4 · Step order and names differ between the progress bar and the parts list**
- **Rule:** N4.
- **Seen:**
  - The progress bar runs "… 8 Κουτί, 9 Τροφοδοτικό, 10 Ανεμιστήρες". Summary, Review and Copy list run "… Κουτί, Ανεμιστήρες, Τροφοδοτικό".
  - Names change too: "CPU / Επεξεργαστής", "GPU / Κάρτα γραφικών", "Δίσκος / Αποθήκευση".
- **Where:** builder.
- **Screens:** `ux/ux-builder-review-full-1366-el-light.jpg`.
- **Fix:** v2 builder.

**UX-44 · S4 · "Χωράει" (fits) is used for checks that aren't about space**
- **Rule:** N2.
- **Seen:** The CPU, board, RAM and PSU cards carry "Χωράει" for socket, memory-type and wattage checks.
- **Where:** builder.
- **Screens:** `ux/ux-builder-guided-mobo-chosen-1366-el-light.jpg`, `ux/ux-builder-guided-mobo-chosen-360-el-light.jpg`, `ux/ux-builder-guided-review-1366-el-light.jpg`.
- **Fix:** v2 phase 2 (message wording).

**UX-45 · S4 · A permanent yellow notice sits on every builder screen**
- **Rule:** N8.
- **Seen:** The coverage notice ("κάρτες γραφικών 80%, κουτιά 27%, ψύκτρες 33%") appears on every step and in both modes. It is two lines on desktop and five on phones, which invites banner blindness.
- **Where:** builder.
- **Screens:** `ux/ux-builder-guided-1366-el-light.jpg`, `ux/ux-builder-guided-360-el-light.jpg`.
- **Fix:** v2 builder (per-check notes instead).

**UX-46 · S4 · On phones the progress steps are bare numbers**
- **Rule:** N6.
- **Seen:** Only the current step is named. The others are "3, 4 … 11" (or ✓), so "7" means nothing without tapping it.
- **Where:** 360–767 px.
- **Screens:** `ux/ux-builder-guided-cpu-360-el-light.jpg`, `ux/ux-builder-guided-cpu-360-en-light.jpg`.
- **Fix:** v2 builder.

**UX-47 · S4 · Greek plural with 1**
- **Rule:** N4.
- **Seen:** "1 ασύμβατα" and "Σύνολο · 1 εξαρτήματα".
- **Where:** builder summary, el.
- **Screens:** `ux/ux-builder-clash-quick-1366-el-light.jpg`, `ux/ux-builder-vanished-part-1366-el-light.jpg`.
- **Fix:** v2 phase 1 (copy); trivial.

**UX-48 · S4 · Builder controls smaller than the site's 44 px phone rule**
- **Rule:** the site's own rule (CLAUDE.md); WCAG 2.5.8 is met (≥ 24 px).
- **Seen:** At 360 px, the 10 progress buttons are 38 × 44 px and the 9 price/shop links in Review are 24 px tall. Every category page measured 0 controls under 44 px.
- **Where:** builder, 360.
- **Screens:** `ux/ux-builder-guided-360-el-light.jpg`. Sizes in `ux-full/builder.json` (`tap360`).
- **Fix:** v2 builder.

### PC builder — Quick list (`#builder?mode=quick`)

The summary findings above (UX-33, 34, 38, 39, 41) apply here too.

**UX-49 · S3 · Pickers list the cheapest parts first, with no sort**
- **Rule:** N2, N7.
- **Seen:** The CPU picker (359 options) opens with Celeron G3930 (LGA1151, 21,75 €), then Athlon 3000G and Celeron G5925: obsolete parts first, and there is no sort control.
- **Where:** Quick list, all widths.
- **Screens:** `ux/ux-builder-quick-picker-1366-el-light.jpg`, `ux/ux-builder-quick-picker-360-el-light.jpg`.
- **Fix:** v2 builder (the category page as the picker, as planned).

**UX-50 · S4 · The text guide always opens expanded; the picker is a small scroll box**
- **Rule:** N8.
- **Seen:**
  - The 9-section guide (`<details open>`, never remembered) sits above the parts. On a phone the first part row comes after about three screens of text.
  - Each picker is a 320 px box with its own scrolling.
- **Where:** Quick list, 360 (also visible at 1366).
- **Screens:** `ux/ux-builder-quick-360-el-light.jpg`, `ux/ux-builder-quick-1366-el-light.jpg`.
- **Fix:** v2 builder.

### About, Contact, Privacy

No page-specific problems found. The texts are short, readable at 360 px, bilingual and correctly themed. Related findings are global (UX-01…08) and UX-28, where the Contact page asks for a product link that doesn't exist. The five source links on About measure 20 px tall, but they are inline text links (exempt).

- **Screens:** `ux/ux-info-1366-el-light-about.jpg`, `ux/ux-info-360-el-light-about.jpg`, `ux/ux-info-1366-el-light-contact.jpg`, `ux/ux-info-360-el-light-contact.jpg`, `ux/ux-info-1366-el-light-privacy.jpg`, `ux/ux-info-360-el-light-privacy.jpg`.

### Deals and compare

Not present in v1. There is no deals page and no product comparison. The closest features are the "Μόνο προσφορές" / "Ιστορικά χαμηλά" filters and the "Μεγαλύτερη έκπτωση" sort.

## Columns vs filters (Baymard "a filter for every attribute shown")

The columns are the desktop table (≥ 1024 px). Phone cards show the same values in one line. ✓ = a filter exists · ~ = partly · ✗ = none.

| Category | Attribute shown in the list | Filter | Notes |
| --- | --- | --- | --- |
| **All** | Cheapest price | ~ | Maximum only (no minimum); applies to the price without shipping |
| | Price with shipping | ✗ | Not filterable or sortable |
| | Source badge | ✓ | "Πηγή" chips (pre-ticked, UX-10) |
| | Sale "−N%" | ✓ | "Μόνο προσφορές" |
| | All-time low | ✓ | "Ιστορικά χαμηλά" |
| | 7-day change | ✗ | — |
| | Range | ✗ | Probably not needed; see UX-27 |
| | Listings | ✗ | Sort "Περισσότερα προϊόντα" only |
| GPU | VRAM | ✓ | "VRAM (τουλάχιστον)" |
| | Memory type | ✓ | |
| | Manufacturer (board partner of the cheapest listing) | ✓ | "Κατασκευαστής κάρτας"; the label clashes with the chip-maker pills (UX-17) |
| CPU | Cores | ✓ | "≥" only |
| | Socket | ✓ | |
| Motherboards | Chipset | ✓ | |
| | Socket | ✓ | Twice: pills and dropdown |
| | Size | ✓ | |
| | Memory ("DDR5 · 4 slots") | ✓ | Memory + RAM slots |
| RAM | Type (Desktop / Laptop / Server) | ~ | Segment "Laptop / Server" lumps two kinds |
| | CL | ✓ | "≤" |
| | Manufacturer | ✓ | The column shows only the cheapest listing's maker (UX-18) |
| | DDR type, capacity, kit, speed (in the name) | ✓ | |
| Storage | Type line: NVMe/SATA, PCIe gen, form factor | ✓ | |
| | Capacity (in the name) | ✓ | Buckets |
| | €/TB | ~ | Sort only |
| | Read speed | ✗ | Shown under the type ≥ 1024 px and on cards |
| | DRAM | ~ | 2.4 % coverage (UX-13) |
| | TBW | ✗ | |
| | HDD rpm | ✗ | |
| | HDD cache | ✗ | |
| PSU | Type (ATX / SFX…) | ~ | Segment lumps SFX, TFX and Flex |
| | Manufacturer | ✓ | |
| | Watts and efficiency (in the name) | ✓ | |
| Cases | Size | ✓ | Pills |
| | Max board | ✓ | "Χωράει μητρική" |
| Fans | Pack | ✓ | |
| | Per-fan price | ✗ | Not filterable or sortable |
| | Size (in the name) | ✓ | Pills |
| Coolers | Type (Air / AIO + radiator) | ✓ | Pills + "Ψυγείο AIO" |

No category has quick filters above the list (UX-15). Every spec filter is single-choice (UX-11).

## What works well

- **No broken layout.** The layout audit reports 0 issues (1920/1366/768/360 × el/en; light at every width, dark at 360). The dark matrix (112 views) shows no sideways scrolling, and long Greek labels wrap rather than overflow.
- **Applied filters appear in both places Baymard asks for.** Each filter shows its state in place (ticked chips, selected option) and as removable chips above the list with "Καθαρισμός όλων". Every option carries a live count, zero-result options are greyed, and filters, sort and page live in the URL.
- **The phone filter sheet works.** It closes by drag, Esc or backdrop, shows a live "Εμφάνιση N αποτελεσμάτων" button, and has 44 px targets (`ux/ux-sheet-top-360-el-dark-case.jpg`). Every category page measured 0 controls under 44 px at 360 and 768.
- **The empty state is helpful:** it explains the problem and offers "Καθαρισμός φίλτρων" (`ux/ux-empty-1366-el-light-gpu.jpg`, `ux/ux-empty-360-el-light-gpu.jpg`).
- **Loading has placeholders:** skeleton screens with `aria-busy` on lists, and a spinner in builder steps (`ux/ux-loading-1366-el-light-gpu.jpg`, `ux/ux-builder-loading-1366-el-light.jpg`).
- **Keyboard focus is clearly visible** on every control sampled, in both themes: a 2 px accent outline on buttons and links, and a 2 px accent ring on fields after their 150 ms transition (`ux/ux-focus-chip-1366-el-light.jpg`, `ux/ux-focus-search-1366-el-dark.jpg`).
- **Builder:**
  - "Μόνο συμβατά" is on by default and says how many parts are hidden.
  - Non-fitting labels carry a written reason on the cards.
  - Budget split and per-step suggestions are shown (`ux/ux-builder-guided-use-1366-el-light.jpg`, `ux/ux-builder-guided-use-360-el-light.jpg`).
  - The share link reproduces the build exactly.
  - "Αντιγραφή λίστας" puts a complete text list with links on the clipboard (verified).
  - Review links each missing part back to its step.
- **Both languages are complete** in every view checked, and the English layout holds at 360 px.

## Representative screenshots (light, el)

| Page type | 360 px | 1366 px |
| --- | --- | --- |
| First visit (`/`) | `ux/ux-first-visit-360-el-light.jpg` | `ux/ux-first-visit-1366-el-light.jpg` |
| Category list (each of the nine) | `ux/ux-list-360-el-light-<cat>.jpg` | `ux/ux-list-1366-el-light-<cat>.jpg` |
| Product details | `ux/ux-details-360-el-light-gpu.jpg` | `ux/ux-details-1366-el-light-gpu.jpg` |
| Phone filter sheet | `ux/ux-sheet-top-360-el-light-case.jpg` | (sidebar in the list shots) |
| Builder — Guided | `ux/ux-builder-guided-360-el-light.jpg` | `ux/ux-builder-guided-1366-el-light.jpg` |
| Builder — Guided, Review | `ux/ux-builder-summary-open-360-el-light.jpg` | `ux/ux-builder-guided-review-1366-el-light.jpg` |
| Builder — Quick list | `ux/ux-builder-quick-360-el-light.jpg` | `ux/ux-builder-quick-1366-el-light.jpg` |
| About / Contact / Privacy | `ux/ux-info-360-el-light-<page>.jpg` | `ux/ux-info-1366-el-light-<page>.jpg` |

Dark theme at every width, both languages: `docs/audit/ux-full/matrix/` (e.g. `1366-el-dark-gpu.jpg`). Light theme at every width: `docs/audit/ux-full/layout/` (PNG).

## Method and limits

**Tools**

- **Layout audit.** `scripts/checks/layout-audit.mjs` ran with `SHOTS=1` (system Chrome over DevTools Protocol): 346 PNGs and `report.txt` ("no issues"), copied to `ux/layout-report.txt`. On this machine Chrome exits immediately (code 21) when the output folder is relative, because the script uses it for `--user-data-dir`. It was run with an absolute output path.
- **New Playwright scripts** (Chromium from `@playwright/test` 1.63; `npx eslint` passes on them with 0 errors):

  | Script | What it does |
  | --- | --- |
  | `scripts/audit/ux-lib.mjs` | Shared helpers |
  | `ux-matrix.mjs` | Dark theme, every page × width × language: 112 JPEGs and a JSON file |
  | `ux-lists.mjs` | First visit, list inventory, details, filter sheet, tab bar, empty, loading and error states, keyboard, tap targets, hover-only text, contrast |
  | `ux-builder.mjs` | Guided walk, Quick list, clash, vanished part, share link, Copy list, clear, loading, keyboard, contrast |
  | `ux-extras.mjs` | Follow-up checks |

- **Raw results:** `docs/audit/ux-full/{lists,builder,extras}.json` and `matrix/matrix-dark.json`.

**Limits**

- **Data.** The site under test is a local production build of v1 with the data present at build time (status "updated 7 h ago"; Skroutz marked late on GPU). Prices are not live. Data problems are reported only as the UI shows them; their causes belong to the data audit (B2). Wherever a price may be wrong, the finding says "hypothesis".
- **Devices.** Phones and tablets were Chromium device emulation (`isMobile`, `hasTouch` below 1024 px, scale 1), not real devices. iOS Safari was not tested. Native `<select>` popups can't be captured headless, so dropdown contents were read from the DOM. Hover-only information was found from `title` attributes.
- **Contrast** is an in-page approximation: ancestor backgrounds composited from the root down, with opacity. It is not axe-core. It covered 8 list/info views and 2 builder views in both themes, not every state.
- **Keyboard** order was sampled on `#gpu` and the builder CPU step. Screen readers were not tested.
- **Builder states.** The clash and vanished-part states were created by writing `pcBuild` to localStorage. The share-link test used the link that Review produced.
- **Not tested:** the live site, Lighthouse, real slow networks (only one delayed or failed request), and the legal accuracy of the privacy text.
- `docs/audit/ux-full/` (the full matrix: 477 PNG/JPEG screenshots, 72 MB, and the raw JSON) is git-ignored (`.gitignore` line 19). Only `docs/audit/ux/` and this file are meant for commit.
