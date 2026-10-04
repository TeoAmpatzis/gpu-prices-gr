// Shared helpers for the UX audit scripts (v2 Phase 0, part B4). Playwright + Chromium against a
// running local preview of the site (BASE_URL, default http://localhost:4180). Nothing here changes
// the site: the scripts only open pages, click, measure and take screenshots.
/* global document, window, getComputedStyle, HTMLElement */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';

export const BASE = process.env.BASE_URL ?? 'http://localhost:4180';
export const OUT = 'docs/audit/ux'; // curated JPEGs (committed)
export const FULL = 'docs/audit/ux-full'; // full matrix and raw measurements (not committed)

export const CATEGORY_PAGES = ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler'];
export const INFO_PAGES = ['about', 'contact', 'privacy'];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const launch = () => chromium.launch();

/**
 * A fresh browser context + page with the language, theme and (optionally) a saved build set before
 * any page script runs. `build`: undefined = leave storage empty, object = written once per context.
 */
export async function open(browser, { width, height, lang = 'el', theme = 'light', build, fresh = false, permissions } = {}) {
  const mobile = width < 1024;
  const context = await browser.newContext({
    viewport: { width, height: height ?? (width <= 400 ? 780 : width < 1024 ? 1024 : 900) },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    locale: lang === 'el' ? 'el-GR' : 'en-US',
    colorScheme: theme === 'dark' ? 'dark' : 'light',
  });
  if (permissions) await context.grantPermissions(permissions, { origin: BASE });
  if (!fresh) {
    await context.addInitScript(
      ({ lang, theme, build }) => {
        try {
          localStorage.setItem('lang', lang);
          localStorage.setItem('theme', theme);
          // The saved build is written once per context, so later changes survive reloads.
          if (build && !sessionStorage.getItem('audit-build')) {
            localStorage.setItem('pcBuild', JSON.stringify(build));
            sessionStorage.setItem('audit-build', '1');
          }
        } catch {
          // storage unavailable: the page uses its defaults
        }
      },
      { lang, theme, build },
    );
  }
  const page = await context.newPage();
  return { context, page };
}

/** Page loaded: no skeleton left and a heading present (same rule as scripts/checks/layout-audit.mjs). */
export async function ready(page, timeout = 20000) {
  await page.waitForFunction(
    () => document.readyState === 'complete' && !document.querySelector('main .skeleton') && !!document.querySelector('main, h1'),
    null,
    { timeout },
  );
  await sleep(400);
}

export async function go(page, hash, { wait = true } = {}) {
  await page.goto(`${BASE}/${hash.startsWith('#') || hash === '' ? hash : `#${hash}`}`);
  if (wait) await ready(page);
}

export async function shot(page, path, opts = {}) {
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path, type: 'jpeg', quality: 70, ...opts });
  return path;
}

/** Clicks the first visible element matching `selector` whose text matches `re` (optional). */
export async function clickText(page, selector, re) {
  return page.evaluate(
    ({ selector, src, flags }) => {
      const re = src ? new RegExp(src, flags) : null;
      const el = [...document.querySelectorAll(selector)].find(
        (e) => e instanceof HTMLElement && e.offsetParent !== null && (!re || re.test(e.textContent ?? '')),
      );
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    },
    { selector, src: re?.source, flags: re?.flags },
  );
}

/**
 * Interactive elements smaller than 44 × 44 px (WCAG 2.5.5 AAA; the site's own phone rule) and smaller
 * than 24 × 24 px (WCAG 2.2 2.5.8 AA). Inline text links inside paragraphs are listed apart (exempt).
 */
export function tapTargets(page) {
  return page.evaluate(() => {
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=radio], summary';
    const out = [];
    for (const el of document.querySelectorAll(sel)) {
      if (!(el instanceof HTMLElement) || el.closest('[hidden]') || el.closest('.sr-only')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.width >= 44 && r.height >= 44) continue;
      const inline = el.tagName === 'A' && cs.display === 'inline' && !!el.closest('p');
      const text = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.getAttribute('placeholder') || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40);
      out.push({
        tag: el.tagName.toLowerCase(),
        text,
        w: Math.round(r.width),
        h: Math.round(r.height),
        under24: r.width < 24 || r.height < 24,
        inline,
        disabled: el.hasAttribute('disabled'),
      });
    }
    return out;
  });
}

/** Elements whose `title` holds text that is not visible in the element itself (hover-only info). */
export function hoverOnly(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('main [title]')) {
      if (!(el instanceof HTMLElement) || el.closest('[hidden]') || el.offsetParent === null) continue;
      const title = el.getAttribute('title')?.trim() ?? '';
      if (!title || (el.innerText ?? '').includes(title)) continue;
      out.push({ tag: el.tagName.toLowerCase(), text: (el.innerText ?? '').trim().slice(0, 40), title: title.slice(0, 120) });
    }
    return out;
  });
}

/**
 * Approximate WCAG contrast of every visible text element: the text colour (× the opacity of the
 * element and its ancestors) over the backgrounds of its ancestors composited from the root down.
 * Background images and positioned overlays are ignored, so results are a screening, not a verdict.
 * Returns the elements under 4.5:1 (3:1 for large text).
 */
export function contrastScan(page, scope = 'body') {
  return page.evaluate((scope) => {
    const parse = (c) => {
      const m = c.match(/[\d.]+/g);
      if (!m || m.length < 3) return null;
      const [r, g, b, a] = m.map(Number);
      return { r, g, b, a: a ?? 1 };
    };
    const blend = (top, bottom) => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    });
    const lum = ({ r, g, b }) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    };
    const out = [];
    const root = document.querySelector(scope) ?? document.body;
    for (const el of root.querySelectorAll('*')) {
      if (!(el instanceof HTMLElement) || el.closest('[hidden], .sr-only, svg, [aria-hidden="true"]')) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const chain = [];
      for (let p = el; p; p = p.parentElement) chain.push(p);
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      let opacity = 1;
      for (const p of chain.reverse()) {
        const ps = getComputedStyle(p);
        const c = parse(ps.backgroundColor);
        if (c && c.a > 0) bg = blend(c, bg);
        opacity *= Number(ps.opacity);
      }
      const fg0 = parse(cs.color);
      if (!fg0) continue;
      const fg = blend({ ...fg0, a: fg0.a * opacity }, bg);
      const size = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const value = ratio(fg, bg);
      if (value < (large ? 3 : 4.5)) {
        out.push({
          text: el.innerText.trim().replace(/\s+/g, ' ').slice(0, 50),
          ratio: Math.round(value * 100) / 100,
          size,
          color: cs.color,
          disabled: !!el.closest('[disabled], [aria-disabled="true"]'),
        });
      }
    }
    return out;
  }, scope);
}

/** Sideways overflow of the page itself (px), as the layout audit measures it. */
export function pageOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** Visible text of the element matching `selector` (first visible one). */
export function textOf(page, selector) {
  return page.evaluate((selector) => {
    const el = [...document.querySelectorAll(selector)].find((e) => e instanceof HTMLElement && e.offsetParent !== null);
    return el instanceof HTMLElement ? el.innerText.trim() : null;
  }, selector);
}

/** Scroll the window (or the element matching `selector`) to y. */
export function scrollTo(page, y, selector) {
  return page.evaluate(
    ({ y, selector }) => {
      const el = selector ? document.querySelector(selector) : null;
      if (el) el.scrollTop = y;
      else window.scrollTo(0, y);
    },
    { y, selector },
  );
}
