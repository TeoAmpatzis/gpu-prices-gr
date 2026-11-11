# 04 — Frontend findings

Scope: `src/` (208 files, about 26,000 lines), read in part and exercised in Chromium. Accessibility, SEO and UX findings are here too.

What held up: no console errors on 204 page loads; no horizontal overflow from 320 px to 1920 px; keyboard paths, focus trap and focus return; error states with retry for failed data; corrupted `localStorage` never broke a page; no `dangerouslySetInnerHTML`, `innerHTML` or `eval` in `src/`; every shop link opened in a new tab carries `rel="noopener noreferrer"` (lines checked: `ShopChoice.tsx:43`, `OffersTable.tsx:67`, `ProductHeader.tsx:85`, `PartList.tsx:101-102`, `Review.tsx:116-117`; `ModelRow.tsx:195` is dead code, see P4-005).

---

## [P2-004] After a page's code fails to load, the error screen stays on every page until a manual reload

- **Category:** Frontend / error handling
- **Severity:** P2
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `src/shell/ErrorBoundary.tsx:8-16`
- **Affected functionality:** Navigation after any lazy chunk fails (offline moment, or a new deploy that replaced the files while a tab was open; the site deploys on every data commit, several times a day).
- **Problem:** The boundary stores the error and never clears it. Its children are not rendered again, so Back, Forward and header links change the address but the screen keeps saying "The prices didn't load".
- **Evidence:** Browser test E08: blocked `assets/ModelPage-*.js`, opened a product → error screen. Unblocked the file, pressed Back → URL `/gpu`, still the error screen. Clicked "PC Builder" in the header → URL `/builder`, still the error screen.
- **Steps to reproduce:** In DevTools block `ModelPage-*.js`; open `/gpu`; click a product; unblock; press Back.
- **Expected behavior:** Leaving the failed page shows the next page.
- **Actual behavior:** Error screen on every page until "Try again" (a full reload).
- **Root cause:** No reset of `state.error` when the route changes.
- **Recommended solution:** Give the boundary a `key` equal to the current path where it is used in `App.tsx`, so React remounts it on navigation.
- **Alternative solutions:** `componentDidUpdate` that clears the error when a `resetKey` prop changes; or reload automatically once when a dynamic import fails.
- **Regression risks:** Low. Check that pages kept mounted while hidden are not remounted by the key.
- **Verification plan:** Turn test E08 into a Playwright test.
- **Estimated effort:** Small

---

## [P3-005] Layout shift above Google's 0.1 limit on info pages, search and compare

- **Category:** Performance / UX
- **Severity:** P3
- **Confidence:** High (measured), cause not traced
- **Status:** Confirmed
- **Affected files:** `src/components/InfoPage.tsx`, `src/components/search/SearchPage.tsx`, `src/components/compare/ComparePage.tsx` (the shifting element was not identified)
- **Affected functionality:** `/privacy`, `/about`, `/how-prices`, `/search`, `/compare`.
- **Problem:** Content moves after first paint.
- **Evidence:** Crawl: `/privacy` 0.175 at 1366 px and 0.145 at 1440 px; `/search?q=rtx` 0.115 to 0.163 from 768 px up; `/about` 0.138 at 1366 px. Lighthouse phone run: `/compare` 0.124, `/search` 0.061. Every category, product and builder page measured 0 to 0.001. CLAUDE.md states the project rule "CLS 0 everywhere".
- **Steps to reproduce:** Lighthouse or the Performance panel on `/privacy` at 1366×768.
- **Expected behavior:** CLS under 0.1 (project rule: 0).
- **Actual behavior:** Up to 0.175.
- **Root cause:** Not determined. Likely the lazy page chunk rendering into a short placeholder so the footer moves.
- **Recommended solution:** Find the shifting node with the Layout Shift regions overlay; reserve height for the lazy page (the category pages already do this with `min-h-screen`).
- **Alternative solutions:** Load the small info page code with the main bundle.
- **Regression risks:** Low.
- **Verification plan:** Re-run the crawl; add these pages to the existing layout tests.
- **Estimated effort:** Small

---

## [P3-009] Search engines and link previews that do not run JavaScript see the same title and description on every address; removed products answer HTTP 200

- **Category:** SEO
- **Severity:** P3
- **Confidence:** High for the static HTML; medium for the effect on ranking
- **Status:** Confirmed
- **Affected files:** `index.html` (static title, description, Open Graph tags), `src/lib/pageMeta.ts` (client-side only), `vercel.json` (rewrites to `/index.html`), `src/lib/sitemap.ts`
- **Affected functionality:** Indexing of the 14,692 addresses listed in the sitemaps; previews when a link is shared in chat apps.
- **Problem:** The server sends one HTML file for every address. Titles, descriptions and canonical links are set by JavaScript after load. Shared links to a product show the home page's preview. An address for a product that no longer exists returns HTTP 200 with "This product is no longer available" and no `noindex` (crawl: `robots=null`, canonical set to the category).
- **Evidence:** `curl -s http://localhost:4199/gpu/rtx-5070-12gb` returns `<title>BuildDraft.gr — Οι χαμηλότερες τιμές hardware στην Ελλάδα</title>` and the same `og:title`, with no canonical link; the crawl read per-page titles only after scripts ran; `/gpu/no-such-model-xyz` returned 200.
- **Steps to reproduce:** `curl -s https://gpu-prices-gr.vercel.app/gpu/rtx-5070-12gb | grep -i "<title>"`.
- **Expected behavior:** Each address carries its own title and preview; gone pages say so to crawlers.
- **Actual behavior:** One title for all; soft 404s.
- **Root cause:** Client-rendered app on static hosting.
- **Recommended solution:** At build time write a small HTML file per product and category with the right `<title>`, description, canonical and Open Graph tags (the build already knows every model and writes the sitemaps). Add `noindex` on the "no longer available" view.
- **Alternative solutions:** Accept it; Google renders JavaScript, other crawlers and chat previews do not.
- **Regression risks:** More files in `dist` (about 14,700 small ones); check Vercel limits.
- **Verification plan:** `curl` three addresses and read the tags.
- **Estimated effort:** Medium

---

## [P4-001] The router throws on a malformed `%` escape, outside the error boundary

- **Category:** Frontend / robustness
- **Severity:** P4
- **Confidence:** High
- **Status:** Confirmed in the module; not reachable on the live site by typing the address
- **Affected files:** `src/lib/routes.ts:30`, `src/App.tsx` (the `matchRoute` call in `useMemo`)
- **Affected functionality:** Any path with an invalid escape such as `/gpu/%E0%A4%A`.
- **Problem:** `decodeURIComponent` throws `URIError`; nothing catches it.
- **Evidence:** vite-node: `matchRoute('/gpu/%')` → `URIError: URI malformed` (3 of 10 odd paths). Live: Vercel answers HTTP 400 before the app loads. Local `vite preview`: HTTP 500 from the preview server itself. So today the crash needs a static host that serves `404.html`, or an in-app link with a bad escape (none found).
- **Steps to reproduce:** `npx vite-node -e` calling `matchRoute('/gpu/%')`.
- **Expected behavior:** The 404 page.
- **Actual behavior:** Exception.
- **Root cause:** No `try` around the decode.
- **Recommended solution:** Wrap the decode; on failure return `{ kind: 'notFound' }`.
- **Alternative solutions:** None needed.
- **Regression risks:** None.
- **Verification plan:** Unit test with the three paths.
- **Estimated effort:** Small

---

## [P4-002] URL parameters are accepted without range checks

- **Category:** Frontend / input validation
- **Severity:** P4
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `src/lib/filterUrl.ts` (`decodeFilters`), `src/lib/share.ts:58-59`
- **Affected functionality:** Shared and hand-edited addresses.
- **Problem:** Several values pass through unchecked. None broke a page.
- **Evidence:** vite-node: `page=1e9` → `page: 1000000000` (the list is clamped when drawn, the address is not corrected); `min=999999&max=1` → both kept, 0 products; `vram=%00` → `extra.vram = "\u0000"`; a 20,000-character `q` is kept whole; `/builder?cpu=x&budget=1e308` → `budget: 1e+308`.
- **Steps to reproduce:** Open `/gpu?page=1000000000`.
- **Expected behavior:** Values clamped to sensible ranges; unknown option values dropped.
- **Actual behavior:** Kept as given.
- **Root cause:** Decoders check type, not range or membership.
- **Recommended solution:** Clamp `page`, cap `q` length (for example 100), drop option values not in the filter's list, cap `budget` (the automatic builder's grid ends at 10,000).
- **Alternative solutions:** Leave as is; harmless today.
- **Regression risks:** Low.
- **Verification plan:** Extend `tests/unit` for `filterUrl` and `share`.
- **Estimated effort:** Small

---

## [P4-003] A very long unbroken search query makes the results page scroll sideways

- **Category:** Frontend / layout
- **Severity:** P4
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `src/components/search/SearchPage.tsx` (heading)
- **Affected functionality:** `/search?q=<long text without spaces>`.
- **Problem:** The heading repeats the query (cut to about 500 characters) without a word-break rule.
- **Evidence:** Test E11: 6,000 `a` characters → `scrollWidth > innerWidth` at 1366 px.
- **Steps to reproduce:** Open `/search?q=` followed by 600 letters.
- **Expected behavior:** The heading wraps.
- **Actual behavior:** Horizontal scroll.
- **Root cause:** No `overflow-wrap: anywhere` on the heading.
- **Recommended solution:** Add `break-words` (and a shorter cut) to the heading.
- **Alternative solutions:** Cap the query length (P4-002).
- **Regression risks:** None.
- **Verification plan:** Re-run E11.
- **Estimated effort:** Small

---

## [P4-009] Search page: links told apart from text by colour only

- **Category:** Accessibility (WCAG 1.4.1)
- **Severity:** P4
- **Confidence:** Medium (reported by Lighthouse; not checked by eye)
- **Status:** Probable
- **Affected files:** `src/components/search/SearchPage.tsx`
- **Affected functionality:** `/search`.
- **Problem:** Lighthouse audit `link-in-text-block` fails; accessibility score 96 there, 100 on the other ten pages measured.
- **Evidence:** `lh/search-mobile-0.json`.
- **Steps to reproduce:** Lighthouse, accessibility category, `/search?q=rtx`.
- **Expected behavior:** Links inside text are underlined or have 3:1 contrast with the text around them.
- **Actual behavior:** Flagged.
- **Root cause:** Link style inside a paragraph.
- **Recommended solution:** Underline those links.
- **Alternative solutions:** None.
- **Regression risks:** None.
- **Verification plan:** Lighthouse again.
- **Estimated effort:** Small

---

## Accessibility: what was and was not checked

Checked by script on 9 pages: names of all controls, labels of all fields, duplicate ids, heading order, one `<h1>`, image `alt`, table headers, positive `tabindex`, `lang`. Result: 0 issues. Checked by keyboard: skip link, menu, filter sheet trap and return, focus outline. Checked: reflow at 320 px, touch targets at 390 px. Lighthouse accessibility: 100 on 10 of 11 pages.

Not checked: colour contrast by measurement (the repo has its own contrast unit test, which passes), screen-reader output with a real screen reader, 200% text zoom, forced-colours mode, the picker dialog's focus trap, drag gestures on the bottom sheet. A full WCAG 2.2 AA conformance claim cannot be made from this audit.
