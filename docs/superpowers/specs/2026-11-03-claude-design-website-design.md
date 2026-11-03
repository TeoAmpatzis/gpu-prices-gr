# BuildDraft.gr — Claude Design website implementation

Status: approved by Teo on 2026-11-03; implementation in progress.
Date: 2026-11-03.

## Goal and authority

Implement the complete supplied website design in the existing BuildDraft application, locally first. Match the supplied layouts while retaining working pricing, compatibility, persistence, and export behavior. Teo will review the plan before implementation and review the running local result before any GitHub push or Vercel deployment.

Confirmed during planning:

- Keep the existing step-by-step builder and restyle it to match the design system.
- Show individual products by default in the catalogue, matching the designs, rather than expandable product-family rows.
- Work in `C:/Users/Teo/Desktop/PROJECTS/BuildDraft`; do not change Legal-Knowledge-Base or other projects.

## Source of truth

1. `C:/Users/Teo/Desktop/BuildDraft-design-v2/HANDOFF.md` and its `project/` HTML and design tokens: latest export, 2026-11-02 approximately 23:50. There are 66 `.dc.html` files, including language counterparts and viewport wrappers.
2. `C:/Users/Teo/Desktop/BuildDraft-screenshots-sorted`: 172 screenshots, including Greek/English, desktop/tablet/mobile, and large desktop widths. These are complementary references from the same design, not another website to implement.
3. Existing application behavior and data contracts, where mockups contain invented functionality or sample data.

Use `BuilderMobile`, `CategoryMobile`, and `CategoryMobileFilters` plus screenshots 17–19 for the intentional compact mobile layouts. The long automatic mobile captures alone are not the target. `*Phone` and `*Tablet` HTML wrappers are viewport references, not separate production pages. Do not ship `support.js`, the Claude runtime, or `<x-dc>` / `<x-import>` elements.

## Visual requirements

- Dark only: page `#030712`, panel `#111827`, indigo accent `#818cf8`.
- Preserve the existing token architecture: RGB triplets support Tailwind opacity modifiers. The exported hex declarations must not replace them wholesale.
- Inter for text and JetBrains Mono for codes/numeric treatments where designed. Keep existing self-hosted fonts, Greek subsets, and license files.
- Wordmark: bold `Build`, light `Draft`, indigo `.gr`, as shown in the latest header. Reuse/update existing logo rendering rather than introducing an unrelated asset system.
- Shared border, spacing, field, button, chip, badge, and card treatments; existing semantic colors remain meaningful.
- Shared container maximum widths: 1280px normally, 1560px at viewport widths >=1700px, 1840px at >=2200px. Desktop horizontal padding 24px; narrow-screen padding 16px.
- Catalogue tables switch to cards below 1024px. Tablet cards use two columns when they fit; mobile uses one.
- Builder switches to cards at 960px and below; buying/sidebar sections stack when the desktop layout cannot fit. Mobile has a compact sticky summary with space reserved beneath content.
- Footer rests at the viewport bottom on short pages. No page-level horizontal overflow at 360px or any reference width.
- Keep reduced motion, keyboard operation, focus restoration, visible focus, semantic tables/headings, and sufficient contrast. Accessible hit areas may exceed the mock's smallest controls.

## Screen coverage and changes

| References | Delivery |
| --- | --- |
| 01–02, `Main` / `MainEn` | Full homepage: split hero/search and source freshness, search chips, nine category cards with actual minima/counts, genuine price-drop rows, four ready-build cards, methodology strip and footer. |
| 03–11, category HTML variants | All nine categories use individual product rows/cards, working filter groups/counts, sorting, active chips, pagination, and optional build-fit context. Preserve category-specific specifications. |
| 12, `Search` / `SearchEn` | Dedicated `/search?q=...` results screen using existing search infrastructure; category and price filters, clear/reset, sorting, pagination, correct empty/error states. No fabricated prebuilt-PC inventory. |
| 13, `Product` / `ProductEn` | Product header/photo, selected product price/action, honest offers, family/product variants as supported, price history, build fit, specification groups, alternatives, correction link. |
| 14–15, `Builder`, `BuilderEmpty` | Status cards, parts list/cards, purchase choices, shipping breakdown, power breakdown, findings, empty selections, and complete action toolbar. Keep automatic-build and guided flows accessible. |
| 17–19, compact mobile HTML | Compact builder cards/summary, catalogue cards, filter sheet with result count and apply action. |
| 20–23, shared/open/share HTML | Shared review, invalid/unavailable-link state, saved-build dialog, share dialog; use the existing browser-local and URL mechanisms. |
| 16, `States` | Loading, empty, no matches, network/data failure, retry, unavailable product, and storage/clipboard failures in the owning pages. Not a new public demo route. |
| 24–26, `Contact`, `Privacy`, `NotFound` | New page layouts and 404 recovery actions; accurate existing contact/privacy substance. |
| 27–28, `MenuOpen`, `SearchSuggest` | Desktop and mobile menu/search states; keyboard and touch operation. |
| 29–30, `HowPrices`, `About` | New `/how-prices` page and redesigned About page with actual methodology/counts; no invented claims. |
| All `En` and wide-screen references | Equivalent functionality and localized copy at every supported size. |

Keep `/parts` functional and apply the same category-card treatment even though it has no dedicated new screenshot. Preserve existing addresses, old hash redirects, aliases, product-family links, and filter/bookmark restoration. Add only the two required routes, `/search` and `/how-prices`, with matching static-host rewrites.

## Individual products without false identity

This is a real behavior change approved by Teo, not merely CSS. Current GPU addresses, photos, and history are keyed by chip/VRAM families; RAM and some other categories also use grouped identities. Raw source listings already contain titles, identifiers, sources, prices, and some individual specifications.

The new display unit is a source product listing, identified by `(category, source, id)`. This deliberately allows two source listings for what might be the same physical model. A source listing can itself represent an aggregator's offer; do not present it as an independently verified merchant SKU. Do not silently merge similar titles across sites into a claimed exact product. Existing conservative GPU twin logic remains in its current builder role.

- Introduce a presentation-level product record derived from the existing category list. Keep a reference to its parent family.
- Filters, displayed counts, sort order, pagination, and compatibility badges operate on these visible records. Family-only metadata must not be assigned to an individual product as verified fact.
- Keep the existing family path. Product links may add `?source=<source>&offer=<id>` to select a listing. These are additive query parameters, not new product-slug identities.
- Direct links without a selection continue to show a family overview. A missing selected listing shows an unavailable-selection message and an explicit family fallback; never silently substitute another product into a build.
- The selected product's header, price, outbound link, specs, and add-to-build action use that exact listing. Other family listings are visibly labeled as alternatives rather than identical-product offers.
- History and any example photo remain explicitly family-level where exact-product history/photo does not exist. A family median or low is never described as the selected card's historical price.
- Builder selection must use its existing canonical part keys and preserve the requested product when that product is representable. If an existing builder model intentionally groups variants, require an explicit selection of the supported configuration; do not replace it silently.
- Pin the selected listing with the existing `StoredBuild.offers` string field. New choices use `bd1:<source>:<encodeURIComponent(id)>`; read existing bare ids only when they resolve uniquely within the allowed offers. Malformed or ambiguous choices remain unresolved. Keep the storage shape and existing shared-link parameters compatible.
- Add/replace must write the canonical part and qualified offer choice in one `writeBuild` operation. Choosing a different offer within the same family is a real selection change, not an automatic “already in build” result. Pending, missing, or failed requested offers must remain visible as unresolved; a computed fallback must not be presented as the selected product or an executable purchase choice.
- Preserve the current 90-day median and trusted-history/dip handling. The mock's 30-day wording changes to 90 days wherever this calculation is used. Existing chart ranges remain 30/90/365/all.

This completes the individual-product experience with current data. Guaranteed global SKU matching, new manufacturer identifiers, exact-SKU historical series, and new scraper collection are outside this plan.

## Homepage data and performance

Generate a small `/data/home.json` through the existing Vite derivation, from validated inputs. This is a new derived frontend contract approved as part of this plan; no scraper output schema or `src/types.ts` source-listing changes are planned.

The file contains nine category counts/minimum prices, up to five qualifying price-drop records, and up to four automatic-build previews at the design budgets (€700, €1,000, €1,500, €2,500). Product counts use the same listing unit as the catalogue and say so. Family counts, if shown, have a separate label.

Author defaults for approval: ready-build uses are gaming at 1080p for €700/€1,000, 1440p for €1,500, and 4K for €2,500. These are previews of the existing automatic recommendations, not fixed sample builds. A discount claim requires its trusted latest history date to be the current or previous UTC calendar day and its corresponding current-price source timestamp to be no more than 24 hours old; absent/future dates do not qualify. Apply this rule at generation and rendering, so a stale generated feed cannot keep showing fresh discount claims. Carry the source timestamp as `checkedAt` in the deal record.

Reuse trusted family history and `medianSummary` for the drop section; identify it as model-family price history excluding shipping, compared with its 90-day median. Insufficient or stale history does not produce a discount claim. Fewer than five qualifying records is valid. Reuse existing auto-build outputs and `autoFor`; do not invent parts, totals, shipping, or fit guarantees. A budget with no suitable build gets an honest unavailable state and a builder action. Preview totals disclose unknown shipping and unresolved checks.

Load this feed after the first paint and reserve section space. The homepage must not download all nine category lists, full histories, the compatibility engine, or all builder parts. Opening a ready build must retain existing replacement safeguards for the user's current named/unsaved build.

## Adaptations to unsupported mock behavior

These are proposed scope decisions for plan approval, not claimed prior owner approvals:

- Contact remains an actionable email page using `builddraftgr@gmail.com`. Do not ship a nonworking form, invent `hello@builddraft.gr`, or promise a response deadline. A real message-submission service requires a separate decision.
- Shared builds remain stateless encoded URLs. No new database, cloud storage, timed expiry, accounts, or server-backed saved lists. Restyle the expired-link design as an invalid/incomplete/unavailable build-link state with truthful recovery options.
- Keep truthful privacy text. Do not copy invented analytics, affiliate commissions, 12-month retention, or other operational/legal claims from the mockups.
- Availability badges appear only if the current listing actually supplies availability. Unknown shipping, freshness, specifications, and compatibility remain unknown.
- Product comparison has no supplied comparison screen or existing implementation. Omit its inert mock button; a comparison feature is separate scope.
- Search covers the nine existing hardware categories. Do not invent a shop inventory or merchant filters that the loaded search index cannot answer. Its complete supported filters are category and min/max item price; source filters remain on category pages.
- Builder's initial intent/budget screen remains, restyled. The screenshot's empty list is reached through the existing part-list action or `/builder?mode=quick`. Saved builds and shared links keep their existing restoration precedence.
- Do not alter compatibility rules, power formula, price ranking, shipping semantics, scraper, schedules, raw data, or external service configuration as a visual implementation shortcut.

## Architecture and delivery

Keep React 18, TypeScript, Vite, Tailwind, Lucide, and the current custom router/i18n. Extend existing owners rather than replacing the application or importing standalone mock runtimes. Use focused view/style modules where shared ownership becomes clearer; no new framework or paid dependency.

Current HEAD during inspection: `362c43a`, branch `main`, initially clean. November 2 release commits supersede older documentation describing main as v1. Implementation should use a local redesign branch from the reviewed release HEAD in this same checkout. No parallel checkout, backup export, push, remote workflow, or deployment is part of this task. Do not commit on main.

Implement task by task with local builder/reviewer passes as the repository requires. Full step is authorized after plan approval; stop mid-step only for a material newly discovered owner decision or protected schema/scraper change. Update project state only through a proposed diff for Teo, as its instructions require.

## Acceptance and evidence

- All referenced screens/states have working controls and accurate data, in Greek and English.
- Compare representative settled states with supplied screenshots at 390, 820, 951, 1440, 1366, 1920, 2560, and 3840px; additionally test 360px and breakpoint edges 959/960/961 and 1023/1024px. Account for dynamic text and data when judging differences.
- Desktop/tablet/mobile layouts have no page overflow, hidden actions, overlapping sticky bars, clipped Greek labels, or inaccessible overlays.
- Exact selected product survives detail navigation, add-to-build, save/reload, share/import, and Back navigation where supported; unsupported selection cannot silently change product.
- Existing unit/compatibility tests and production browser tests pass with behavior-based selector updates where the approved layout changed.
- `npm run check` and the complete Chromium e2e suite pass. Record existing warnings separately. Run Firefox/WebKit only if available and justified by an observed cross-browser issue; do not claim coverage not run.
- Preserve first-load limits: JS <=110KB gzip and data <=300KB gzip per existing rule, with fonts reported separately and permitted post-paint pick code identified. New home data target <=20KiB gzip. Investigate regressions instead of hiding them with later loads on paper.
- Measure representative homepage, heaviest category, product, and builder performance against the same pre-change baseline, using three mobile/desktop Lighthouse runs where tooling is available. Record median and payload differences.
- Run the finished production preview locally for Teo and provide its URL, screenshots, test results, and material limitations. Stop for review. GitHub push and Vercel deployment need Teo's later explicit instruction.

## Planning baseline

On 2026-11-03, before product changes: `npm run check` passed (typecheck, lint, unit/compatibility tests, production build). Lint reported one existing `react-hooks/exhaustive-deps` warning in `src/components/PriceChart.tsx:70`. Existing home, GPU category, and builder were opened through Playwright against the dev server without uncaught page errors. This is a baseline, not redesign verification or a complete browser-suite result. Temporary inspection screenshots are under ignored `test-results/design-audit/`.
