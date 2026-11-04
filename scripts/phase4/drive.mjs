// Phase 4 gate (step 5 task 16): drives one of the builds in builds.mjs through the v2 builder like a buyer — the start
// screen (use + budget), then Guided (step by step) or the Part list, one part per step through the picker's search,
// sort and "Choose"; a screenshot per step into docs/phase4/screens/ (local only, .git/info/exclude). Then it checks
// Review: the findings against the build's `expect`, total = sum of the lines, Copy list (every line with its variant
// and the URL of the listing used), reload keeps the build, the share link opens the same build in a fresh context.
//
//   node scripts/phase4/drive.mjs <runId|all|build letter> [--base http://localhost:4173] [--no-shots]
// Needs a running production preview (`npm run preview:local`). Writes docs/phase4/screens/runs/<runId>.json and
// prints one line per run; exit 1 when any run has a problem. tests/e2e/builder-gate.spec.ts calls `driveRun`.
/* global document -- the page.evaluate callbacks run in the browser */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILDS, RUNS } from './builds.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SHOTS = path.join(ROOT, 'docs/phase4/screens');
const STEPS = ['cpu', 'mobo', 'ram', 'gpu', 'cooler', 'storage', 'case', 'psu'];
const LINES = ['cpu', 'mobo', 'ram', 'gpu', 'cooler', 'storage', 'case', 'psu', 'fan'];

const L = {
  el: {
    use: { gaming: /^Gaming/, everyday: /^Καθημερινή χρήση/, creating: /^Δημιουργία/ },
    stepByStep: 'Βήμα-βήμα', partList: 'Λίστα εξαρτημάτων', choose: 'Επιλογή', nextStep: 'Επόμενο βήμα',
    search: 'Αναζήτηση', fits: 'Χωράει', copyTitle: 'BuildDraft.gr · Η σύνθεσή μου',
  },
  en: {
    use: { gaming: /^Gaming/, everyday: /^Everyday/, creating: /^Creating/ },
    stepByStep: 'Step by step', partList: 'Part list', choose: 'Choose', nextStep: 'Next step',
    search: 'Search', fits: 'Fits', copyTitle: 'BuildDraft.gr · My build',
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Opens `url` with empty storage and the page language set. */
async function fresh(page, base, lang, url) {
  await page.goto(`${base}/about`);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem('lang', l); }, lang);
  await page.goto(`${base}${url}`);
}

/** The picker of a line is ready: cards, "no parts" or a failed file (no loading spinner). */
async function pickerReady(scope, line) {
  const picker = scope.locator(`[data-picker=${line}]`).first();
  await picker.waitFor({ timeout: 30_000 });
  await picker.locator('li.card, .text-muted, button').first().waitFor({ timeout: 30_000 });
  for (let i = 0; i < 60 && (await picker.locator('.animate-spin').count()); i++) await sleep(250);
  await sleep(300);
  return picker;
}

async function setQuery(picker, run, q) {
  await picker.getByRole('textbox').fill(q ?? '');
  await sleep(500); // the search waits 150 ms after the last key
}

async function setSort(picker, sort) {
  await picker.locator('select').selectOption(sort ?? 'recommended');
  await sleep(300);
}

/** Leaf cards' texts ("Name | specs | … | Choose"); CPU versions are cards inside the chip's card. */
const leafTexts = (picker) => picker.locator('li.card:not(:has(li.card))').evaluateAll((els) => els.map((e) => e.innerText.replace(/\n+/g, ' | ').trim()));

/** Chooses the first enabled card matching `re`, clicking "Show more" while needed. Returns the card's text or null. */
async function chooseCard(picker, re, lang) {
  for (let round = 0; round < 8; round++) {
    const texts = await leafTexts(picker);
    const cards = picker.locator('li.card:not(:has(li.card))');
    for (let i = 0; i < texts.length; i++) {
      if (!re.test(texts[i])) continue;
      const btn = cards.nth(i).getByRole('button', { name: L[lang].choose, exact: true });
      if (!(await btn.count()) || (await btn.isDisabled())) continue;
      // Centre it first: Playwright's own scroll leaves it at the bottom edge, under the phone's fixed summary bar.
      await btn.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await btn.click();
      return texts[i];
    }
    const more = picker.getByRole('button', { name: /^(Περισσότερα|Show more) \(\d+\)$/ });
    if (!(await more.count())) return null;
    await more.click();
    await sleep(300);
  }
  return null;
}

/** A probe: one look at the step with a query, a check on the cards, a screenshot; nothing chosen. */
async function probe(page, picker, run, pr, log, shot) {
  await setQuery(picker, run, pr.query);
  if (pr.sort) await setSort(picker, pr.sort);
  // `all`: "Only compatible" off for this look, so hidden parts show with their label (back on afterwards).
  const only = picker.getByRole('button', { name: /^(Μόνο συμβατά|Only compatible)$/ });
  if (pr.all) await only.click();
  await sleep(300);
  const texts = await leafTexts(picker);
  const out = { name: pr.name, query: pr.query, shown: texts.length, first: texts.slice(0, 5) };
  if (pr.check === 'someShown' && texts.length === 0) log.problems.push(`probe ${pr.name}: no card shown for "${pr.query}" with "Only compatible" on`);
  if (pr.check === 'psuJunkNotFirst' && texts[0] && /no stated efficiency|χωρίς δηλωμένη απόδοση/i.test(texts[0])) log.problems.push(`probe ${pr.name}: a PSU without stated efficiency is first under Recommended (#4)`);
  // `none`: no shown card may match `re`; `firstNot`: the first card must not match it (the probe's own finding).
  if (pr.check === 'none' && texts.some((t) => new RegExp(pr.re, 'i').test(t))) log.problems.push(`probe ${pr.name}: a card matches /${pr.re}/: ${texts.find((t) => new RegExp(pr.re, 'i').test(t))}`);
  if (pr.check === 'firstNot' && texts[0] && new RegExp(pr.re, 'i').test(texts[0])) log.problems.push(`probe ${pr.name}: the first card matches /${pr.re}/: ${texts[0]}`);
  if (pr.check === 'noAtxFits') {
    const atxFits = await picker.locator('li.card').evaluateAll((els) =>
      els.filter((e) => /· ATX(?! 3\.)/.test(e.innerText.replace(/\n+/g, ' · ')) && e.querySelector('.badge-fits')).map((e) => e.innerText.split('\n')[0]),
    );
    out.atxFits = atxFits;
    out.atxShown = texts.filter((t) => /· ATX(?! 3\.)/.test(t)).length;
    if (atxFits.length) log.problems.push(`probe ${pr.name}: ATX PSU labelled "fits" in the small case: ${atxFits.slice(0, 3).join('; ')}`);
  }
  out.shot = await shot(`probe-${pr.name}`);
  if (pr.all) await only.click();
  log.probes.push(out);
  await setQuery(picker, run, '');
}

/** Picks the build's part for `line` in an open picker (guided step or part-list sheet). */
async function pickPart(page, scope, run, line, log, shot) {
  const part = BUILDS[run.build].parts[line];
  const picker = await pickerReady(scope, line);
  for (const pr of part.probe ?? []) await probe(page, picker, run, pr, log, shot);
  await setSort(picker, part.sort);
  await setQuery(picker, run, part.query);
  let got = await chooseCard(picker, new RegExp(part.pick, 'i'), run.lang);
  let how = 'pick';
  if (!got && part.fallback) {
    if (part.fallbackQuery) await setQuery(picker, run, part.fallbackQuery);
    got = await chooseCard(picker, new RegExp(part.fallback, 'i'), run.lang);
    how = 'fallback';
  }
  if (!got) {
    log.problems.push(`${line}: nothing matches /${part.pick}/ for "${part.query}" (first cards: ${(await leafTexts(picker)).slice(0, 3).join(' ;; ')})`);
    return null;
  }
  await sleep(400);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (wide > 0) log.problems.push(`${line}: the page scrolls ${wide}px sideways`);
  return { line, how, card: got };
}

async function guided(page, base, run, log, shot) {
  await page.getByRole('button', { name: L[run.lang].stepByStep, exact: true }).click();
  await page.locator('#step-title').waitFor({ timeout: 30_000 });
  for (const step of STEPS) {
    await page.goto(`${base}/builder?step=${step}`); // the step list's own link; Next is checked by builder.spec.ts
    const part = BUILDS[run.build].parts[step];
    if (!part.skip) {
      const chosen = await pickPart(page, page.locator('main'), run, step, log, shot);
      log.steps.push({ step, ...chosen, shot: await shot(step) });
    } else {
      await pickerReady(page.locator('main'), step);
      log.steps.push({ step, skipped: true, shot: await shot(`${step}-skipped`) });
    }
    if (step === 'case') {
      const fan = BUILDS[run.build].parts.fan;
      if (!fan.skip) {
        const chosen = await pickPart(page, page.locator('main section[aria-labelledby=fans-title]'), run, 'fan', log, shot);
        log.steps.push({ step: 'fan', ...chosen, shot: await shot('fan') });
      }
    }
  }
  await page.getByRole('button', { name: L[run.lang].nextStep }).first().click(); // psu → Review through the button
  await page.locator('[data-review-total]').waitFor({ timeout: 30_000 });
}

async function quick(page, run, log, shot) {
  await page.getByRole('button', { name: L[run.lang].partList, exact: true }).click();
  await page.locator('[data-line=cpu]').waitFor({ timeout: 30_000 });
  for (const line of LINES) {
    const part = BUILDS[run.build].parts[line];
    if (part.skip) continue;
    await page.locator(`[data-line=${line}]`).getByRole('button', { name: L[run.lang].choose, exact: true }).click();
    const dialog = page.getByRole('dialog');
    const chosen = await pickPart(page, dialog, run, line, log, shot);
    const shotName = await shot(line);
    if (await dialog.count()) await page.keyboard.press('Escape');
    log.steps.push({ step: line, ...chosen, shot: shotName });
  }
  await page.locator('[data-review-total]').waitFor({ timeout: 30_000 });
}

/** Review as data: lines (price, URL, variant, label), total, findings by group. */
async function readReview(page) {
  await page.locator('[data-messages]').waitFor({ timeout: 30_000 });
  for (let i = 0; i < 80 && (await page.locator('[data-offer-notice=loading]').count()); i++) await sleep(250);
  await sleep(500);
  return page.evaluate(() => ({
    total: Number(document.querySelector('[data-review-total]')?.dataset.reviewTotal),
    lines: [...document.querySelectorAll('[data-review-line]')].map((li) => {
      const a = li.querySelector('a[data-price]');
      return {
        line: li.dataset.reviewLine,
        price: a ? Number(a.dataset.price) : null,
        url: a?.getAttribute('href') ?? null,
        name: li.querySelector('.font-medium')?.textContent?.trim() ?? null,
        variant: li.querySelector('[data-variant]')?.textContent?.trim() ?? null,
        label: li.querySelector('.badge')?.className.match(/badge-(fits|likely|unverified|check|no)/)?.[1] ?? null,
      };
    }),
    findings: [...document.querySelectorAll('[data-group] li[data-rule]')].map((li) => ({
      group: li.closest('[data-group]').dataset.group,
      rule: Number(li.dataset.rule),
      status: li.dataset.status,
      text: li.textContent.trim(),
    })),
    notChecked: document.querySelector('[data-not-checked]')?.textContent?.trim() ?? null,
    link: document.querySelector('#share-link')?.value ?? null,
  }));
}

const priced = (r) => r.lines.filter((l) => l.price != null).map((l) => `${l.line}=${l.price}`).sort().join(',');

function checkReview(run, r, log) {
  const b = BUILDS[run.build];
  const sum = Math.round(r.lines.reduce((s, l) => s + (l.price ?? 0), 0) * 100) / 100;
  if (Math.abs(sum - r.total) > 0.011) log.problems.push(`total ${r.total} ≠ sum of lines ${sum}`);
  for (const line of LINES) {
    const want = !b.parts[line].skip;
    const has = r.lines.some((l) => l.line === line && l.price != null);
    if (want && !has) log.problems.push(`Review: ${line} has no price/part`);
  }
  const ex = b.expect ?? {};
  for (const f of r.findings) {
    if (f.status === 'error' && !(ex.errors ?? []).includes(f.rule)) log.problems.push(`unexpected error, rule ${f.rule}: ${f.text}`);
    if (f.status === 'warning' && f.group !== 'notes' && !(ex.warnings ?? []).includes(f.rule)) log.problems.push(`unexpected warning, rule ${f.rule}: ${f.text}`);
  }
  for (const n of ex.need ?? []) if (!r.findings.some((f) => f.rule === n.rule && f.status === n.status)) log.problems.push(`missing expected finding: rule ${n.rule} ${n.status}`);
  if (run.build === 'd') {
    const psu = r.lines.find((l) => l.line === 'psu');
    if (psu && psu.label === 'fits' && !/SFX/.test(`${psu.name} ${psu.variant ?? ''}`)) log.problems.push('d: an ATX PSU is labelled "fits" in the SFX-only case');
  }
}

async function checkCopy(page, run, r, log) {
  await page.locator('[data-copy=list]').click();
  await sleep(500);
  for (let i = 0; i < 40 && (await page.locator('[data-links=loading]').count()); i++) await sleep(250);
  const text = await page.evaluate(() => navigator.clipboard.readText());
  const lines = text.split(/\r?\n/);
  log.copy = lines;
  if (lines[0] !== L[run.lang].copyTitle) log.problems.push(`Copy list title "${lines[0]}"`);
  for (const l of r.lines.filter((x) => x.price != null)) {
    const row = lines.find((c) => l.url && c.endsWith(l.url));
    if (!row) { log.problems.push(`Copy list: no line ends with the URL of ${l.line} (${l.url})`); continue; }
    const title = l.variant ?? l.name;
    // A PSU line is "maker model · specs" in both places; others carry the listing's own title (the variant).
    const want = l.line === 'psu' ? (l.name ?? '').split(' · ')[0] : title;
    if (want && !row.toLowerCase().includes(want.replace(/^\d+ × /, '').toLowerCase())) log.problems.push(`Copy list ${l.line}: "${row}" lacks "${want}"`);
  }
  if (r.link && lines[lines.length - 1] !== r.link) log.problems.push('Copy list: the share link is not last');
}

/** Drives one run; `browser` is a Playwright Browser. Returns the log ({ problems: [] } when everything held). */
export async function driveRun(browser, runId, { base = 'http://localhost:4173', shots = true } = {}) {
  const run = RUNS[runId];
  if (!run) throw new Error(`unknown run ${runId}`);
  const b = BUILDS[run.build];
  const phone = run.width < 1024;
  const viewport = { width: run.width, height: phone ? 780 : 900 };
  const log = { runId, ...run, name: b.name, steps: [], probes: [], problems: [], started: new Date().toISOString() };
  const ctx = await browser.newContext({ viewport, isMobile: phone, hasTouch: phone, locale: run.lang === 'el' ? 'el-GR' : 'en-GB', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let n = 0;
  const shot = async (what, p = page, full = false) => {
    if (!shots) return null;
    const file = `${runId}-${String(++n).padStart(2, '0')}-${what}.jpg`;
    fs.mkdirSync(SHOTS, { recursive: true });
    await p.screenshot({ path: path.join(SHOTS, file), type: 'jpeg', quality: 55, fullPage: full });
    return `docs/phase4/screens/${file}`;
  };
  try {
    await fresh(page, base, run.lang, '/builder');
    await page.getByRole('button', { name: L[run.lang].use[b.use] }).click();
    await page.locator('#budget').fill(String(b.budget));
    await page.locator('[data-minimum]').waitFor({ timeout: 30_000 }).catch(() => {});
    log.minimum = await page.locator('[data-minimum]').first().innerText().catch(() => null);
    log.steps.push({ step: 'start', shot: await shot('start') });
    if (run.mode === 'guided') await guided(page, base, run, log, shot);
    else await quick(page, run, log, shot);
    const review = await readReview(page);
    log.review = review;
    log.saved = await page.evaluate(() => localStorage.getItem('pcBuild')); // the saved build (Lighthouse "build b")
    log.steps.push({ step: 'review', shot: await shot('review', page, true) });
    checkReview(run, review, log);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) log.problems.push(`Review: ${overflow}px sideways scroll`);
    await checkCopy(page, run, review, log);
    // Reload keeps the build.
    await page.reload();
    const again = await readReview(page);
    if (priced(again) !== priced(review) || again.total !== review.total) log.problems.push(`reload: ${priced(again)} ${again.total} ≠ ${priced(review)} ${review.total}`);
    // The share link in a fresh context (empty storage), same viewport and language.
    if (review.link) {
      const ctx2 = await browser.newContext({ viewport, isMobile: phone, hasTouch: phone });
      await ctx2.addInitScript((l) => localStorage.setItem('lang', l), run.lang);
      const p2 = await ctx2.newPage();
      await p2.goto(review.link);
      const shared = await readReview(p2);
      log.shared = { total: shared.total, lines: priced(shared), shot: await shot('shared-link', p2, true) };
      if (priced(shared) !== priced(review) || shared.total !== review.total) log.problems.push(`share link: ${priced(shared)} ${shared.total} ≠ ${priced(review)} ${review.total}`);
      if ((await p2.evaluate(() => localStorage.getItem('pcBuild'))) !== null) log.problems.push('share link wrote the visitor’s saved build');
      await ctx2.close();
    } else log.problems.push('no share link on Review');
  } catch (err) {
    log.problems.push(`fatal: ${String(err?.message ?? err).split('\n').filter((l) => /intercepts|waiting for|Timeout|Error/.test(l)).slice(0, 4).join(' / ').slice(0, 600)}`);
    await shot('fatal', page, true).catch(() => {});
  } finally {
    log.errors = errors;
    for (const e of errors) log.problems.push(`page error: ${e}`);
    log.finished = new Date().toISOString();
    await ctx.close();
  }
  return log;
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('playwright');
  const args = process.argv.slice(2);
  const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:4173';
  const shots = !args.includes('--no-shots');
  const sel = args.find((a) => !a.startsWith('--') && a !== base) ?? 'all';
  const ids = Object.keys(RUNS).filter((id) => sel === 'all' || id === sel || id.startsWith(`${sel}-`));
  const outDir = path.join(SHOTS, 'runs');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  let bad = 0;
  for (const id of ids) {
    const log = await driveRun(browser, id, { base, shots });
    fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(log, null, 2));
    if (log.problems.length) bad++;
    console.log(`${id}: ${log.problems.length ? `${log.problems.length} problem(s): ${log.problems.join(' | ')}` : 'ok'} · total ${log.review?.total ?? '-'}`);
  }
  await browser.close();
  console.log(`${ids.length - bad}/${ids.length} runs ok`);
  process.exitCode = bad ? 1 : 0;
}
