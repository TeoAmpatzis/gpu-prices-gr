# 12 — Remediation roadmap

Nothing below has been done. Each step waits for the owner's approval. Scraper and workflow changes also need the approved-plan step the project rules ask for.

Priority scale used in this audit: P0 = site down or data loss now; P1 = wrong result for many visitors or a security hole in use; P2 = wrong result in a visible place, or a missing safety net; P3 = quality, trust and process; P4 = small hardening and tidy-up. **No P0 or P1 finding was made.**

## All findings

| ID | Title | Status | Confidence | Effort | File |
|---|---|---|---|---|---|
| P2-001 | 7% deals computed but never shown | Confirmed | High | Small | 06 |
| P2-002 | Home "largest price drops" promotes probable wrong prices | Confirmed | High | Small | 06 |
| P2-003 | Automatic builder picks a €645 memory kit over a €221 stick | Confirmed | High | Small | 06 |
| P2-004 | Error screen stays after a page's code fails to load | Confirmed | High | Small | 04 |
| P2-005 | No security response headers | Confirmed | High | Small | 07 |
| P2-006 | Three-day scrape gap with no alarm | Confirmed | High | Small | 05 |
| P3-001 | Automatic builder leaves budget unused and pairs top cards with the cheapest case and supply | Confirmed | High | Medium | 06 |
| P3-002 | Phantom family "RTX 5070 16GB" from a shop's typo | Confirmed | High | Small | 10 |
| P3-003 | Three definitions of deal / lowest | Confirmed | High | Medium | 06 |
| P3-004 | Dev-tool vulnerabilities; dev server open to the network | Confirmed | High | Small | 07 |
| P3-005 | Layout shift above 0.1 on info, search, compare | Confirmed | High | Small | 04 |
| P3-006 | State documents out of date | Confirmed | High | Medium | 09 |
| P3-007 | Corrupt data file read as empty; in-place writes | Probable | Medium | Small | 05 |
| P3-008 | Category tiles show junk minimum prices | Confirmed | High | Small | 06 |
| P3-009 | Same title and preview for every address without JavaScript; soft 404s | Confirmed | High | Medium | 04 |
| P3-011 | Skroutz collected through a proxy past its bot protection | Confirmed | High | Small (decision) | 05 |
| P3-012 | Tests do not run automatically before deploy | Confirmed | High | Small | 11 |
| P4-001 | Router throws on a malformed `%` | Confirmed | High | Small | 04 |
| P4-002 | URL parameters without range checks | Confirmed | High | Small | 04 |
| P4-003 | Long search query overflows sideways | Confirmed | High | Small | 04 |
| P4-004 | Share link can show any text as a part name | Confirmed | High | Small | 07 |
| P4-005 | About 670 lines of unused list UI | Confirmed | High | Small | 09 |
| P4-006 | Missing photo cached for a day | Confirmed | High | Small | 08 |
| P4-007 | Actions and Python packages not pinned | Confirmed | High | Small | 05 |
| P4-008 | Build weakens its checks when a remote file is unreachable | Probable | Medium | Small | 05 |
| P4-009 | Search page links told apart by colour only | Probable | Medium | Small | 04 |
| P4-010 | Two page types over the JavaScript budget | Needs Verification | Medium | Medium | 08 |
| P4-012 | Live pages take 31 s to go network-idle | Needs Verification | Low | Small | 08 |

(P3-010 and P4-011 were merged into other entries during the audit; the numbers were not reused.)

## Suggested order

### Step 1 — visible wrong results (about one working day, all small)

1. P2-001: trust the build's deal flag in `saleOf`; add the boundary test.
2. P2-002: ceiling and second-source rule for the home page drops.
3. P3-008: tile minimum from the default segment.
4. P2-003: bound the dual-channel preference by price.
5. P2-004: reset the error boundary on navigation; add the e2e test.

Why first: these are what a visitor sees on the first screen and in the headline features, and each is a few lines plus a test.

### Step 2 — safety nets (about one day)

6. P3-012: a workflow that runs `npm run check` and the Playwright suite on pushes and pull requests.
7. P2-006: a scheduled freshness check that fails when the live data is older than 14 hours.
8. P2-005: security headers, first as `Content-Security-Policy-Report-Only` on a preview, then enforced.
9. P3-004: update vite and vitest inside their major versions; `host` off by default.

Why second: they keep step 1 fixed and catch the next outage.

### Step 3 — data and logic consistency (two to four days; scraper parts need an approved plan)

10. P3-003: one definition of deal and lowest, computed in the build.
11. P3-002: part number beats title for memory size; valid sizes per chip.
12. P3-007: stop on corrupt JSON; write through a temporary file.
13. P3-001: decide whether the automatic builder should spend the budget; implement or label.

### Step 4 — reach and upkeep (as time allows)

14. P3-009: per-address HTML with the right title and preview tags; `noindex` on gone products.
15. P3-005: reserve height on info, search and compare pages.
16. P3-006: rewrite the state documents.
17. P4-005: delete the unused list UI (needs approval to delete files).
18. The remaining P4 items in any order; verify P4-010 and P4-012 first.

### Decision for the owner, no code

19. P3-011: how to treat Skroutz as a source.

## Dependencies between items

- Do P3-012 before the larger changes of steps 3 and 4.
- P2-001 becomes trivial if P3-003 is done first, but P2-001 is a two-line fix and should not wait.
- P2-002 and P3-008 touch the same function (`homeFile`).
- P4-002 (cap query length) also fixes P4-003.

## Regression checks to run after any step

`npm run check`; `npm run e2e`; the Python checks; then the audit's scripts if wanted: the vite-node logic check (flagged deals must equal shown deals), the 204-page crawl (no console errors, CLS), the journey script (E08 and E14 should turn green).
