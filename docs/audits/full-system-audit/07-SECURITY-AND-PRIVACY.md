# 07 — Security and privacy

Only non-destructive checks were made. The live site received ordinary page loads and header requests. No secrets appear in this report.

## Attack surface

Small. The site is static files. There is no login, no form that sends data anywhere, no API, no database, no cookies, no user-generated content stored on a server. The OWASP items that need a server (injection into queries, broken access control, authentication failures, server-side request forgery, insecure deserialization) have nothing to act on. What remains: script injection in the browser, response headers, the supply chain, the automation that can write to the repository, and privacy claims.

## What was checked and held

| Check | Result |
|---|---|
| Script injection through `q`, filter values, share-link names, compare items, product slug (5 URLs, test E02) | No script ran, no element injected. React escapes all of them. |
| `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` in `src/` | None |
| External links opened in a new tab | All carry `rel="noopener noreferrer"` |
| Shop URLs in the data (42,467 listings) | All `https://`, only the five expected hosts |
| Secrets in the repository | None found in tracked files; `.env.local` is ignored by git |
| Workflow inputs in shell steps | Passed through `env:`; no inline interpolation in `run:` |
| Raw scraper files on the live site | Not served (404) |
| Dev-only pages on the live site (`/_preview`) | Not served (404) |
| `npm audit --omit=dev` (what ships to visitors) | 0 vulnerabilities |
| Privacy policy against the code | The policy (`src/content/pages.ts:197-208`) lists `lang`, `pcBuild`, `pcBuilds`, `bdCompare:v1`; those are the four keys the code writes. The crawl saw no request to any third-party host. |
| HTTPS | Vercel adds HSTS by default |

---

## [P2-005] No security response headers are set

- **Category:** Security / hardening
- **Severity:** P2
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `vercel.json` (headers block has only cache rules)
- **Affected functionality:** Every page.
- **Problem:** The live responses carry no `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` or `frame-ancestors`, `Referrer-Policy`, or `Permissions-Policy`. The site can be framed by any other site, and there is no second line of defence if a script injection is ever introduced. Severity is P2 rather than higher because no injection path exists today and there is nothing to steal but a saved parts list.
- **Evidence:** Response headers of `https://gpu-prices-gr.vercel.app/` read during the audit: only Vercel's defaults (`Strict-Transport-Security`, `Access-Control-Allow-Origin: *`).
- **Steps to reproduce:** `curl -sI https://gpu-prices-gr.vercel.app/`.
- **Expected behavior:** A baseline set of headers.
- **Actual behavior:** None.
- **Root cause:** Never configured.
- **Recommended solution:** Add to `vercel.json` for `/(.*)`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a `Content-Security-Policy`. The policy must allow the two inline scripts in `index.html` (by hash), `'self'` scripts and styles, `img-src 'self' data:`, `connect-src 'self'`, `worker-src 'self'`, `frame-ancestors 'none'`.
- **Alternative solutions:** Start with `Content-Security-Policy-Report-Only`.
- **Regression risks:** A too-strict policy blocks the inline language script or the facet worker. Test on a preview first.
- **Verification plan:** Run the Playwright suite and the crawl with the headers on; look for CSP console errors.
- **Estimated effort:** Small

---

## [P3-004] Development tools carry known vulnerabilities, and the dev server listens on the whole network

- **Category:** Dependencies
- **Severity:** P3
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `package.json` (dev dependencies), `vite.config.ts:37` (`host: true`)
- **Affected functionality:** The developer's machine, not visitors.
- **Problem:** `npm audit` reports 15 vulnerabilities in dev dependencies: 2 critical, 3 high, 10 moderate (vite, vitest, esbuild and others). Several concern the dev server reading or serving files to anyone who can reach it. `host: true` makes `npm run dev` reachable from other devices on the same network.
- **Evidence:** `npm audit` → 15 (10 moderate, 3 high, 2 critical). `npm audit --omit=dev` → 0.
- **Steps to reproduce:** `npm audit`.
- **Expected behavior:** Dev server bound to localhost unless a phone test needs it; patched tools.
- **Actual behavior:** Open to the network, old versions.
- **Root cause:** `host: true` was added for testing on a phone; versions were not raised.
- **Recommended solution:** Update vite and vitest within their current major versions; set `host` from an environment variable so it is off by default.
- **Alternative solutions:** Keep `host: true` and use it only on a trusted network.
- **Regression risks:** Tool updates can change the build output; run `npm run check` and the e2e suite.
- **Verification plan:** `npm audit` again.
- **Estimated effort:** Small

---

## [P4-004] A share link can put any text on the page under "No longer sold"

- **Category:** Security / content spoofing
- **Severity:** P4
- **Confidence:** High
- **Status:** Confirmed
- **Affected files:** `src/lib/share.ts` (`n.<slot>` parameters), `src/lib/share.ts:16`
- **Affected functionality:** `/builder?…` links.
- **Problem:** When a linked part is not in the data, the page prints the name taken from the link.
- **Evidence:** Test E03: `/builder?cpu=no-such-cpu-key&n.cpu=FREE RTX 5090 — visit evil.example` shows "No longer sold: FREE RTX 5090 — visit evil.example (Processor)". The text is escaped; it is not clickable.
- **Steps to reproduce:** Open that address.
- **Expected behavior:** Only plausible product names.
- **Actual behavior:** Any text up to the URL length.
- **Root cause:** By design, so a gone part can still be named.
- **Recommended solution:** Limit length (for example 80 characters) and strip anything that looks like an address.
- **Alternative solutions:** Show "a part that is no longer sold" without the name.
- **Regression risks:** None.
- **Verification plan:** Unit test on `decodeShare`.
- **Estimated effort:** Small

---

## Notes without a finding

- `Access-Control-Allow-Origin: *` on every response is Vercel's default for static files. All data is public. No action.
- `.env.local` on the developer's machine holds a Vercel token. It is ignored by git. Its value was not read into this report.
- The scraping approach for Skroutz is recorded as an operational and compliance risk in `05-BACKEND-AND-API-FINDINGS.md` (P3-011).
- Missing photos: `/img/*` answers 404 with a one-day cache lifetime, so a photo added later can stay missing for a day (P4-006 in `08`).
