// Phase 0 (v2 audit, B1): does v1's "Only compatible" filter in the guided builder hide exactly the
// parts that fail a rule? For each case: open a step with some parts already chosen (share-link
// parameters), load every card, read "N shown · M incompatible hidden", then turn the filter off
// (clashes are shown greyed out and cannot be chosen) and compare with an independent oracle written
// from the plan's rules over the raw builder.json fields (not v1's code).
//
//   node scripts/audit/picker-audit.mjs <baseUrl> <dataDir> <outDir>
//   (baseUrl: a running preview of the build whose data is in dataDir, e.g. dist/data)

import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [BASE, DATA, OUT] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });

const read = (f) => JSON.parse(readFileSync(join(DATA, f), 'utf8'));
const fromColumns = ({ cols, rows }) => rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
const builder = read('builder.json');
const rows = Object.fromEntries(Object.entries(builder.slots).map(([s, c]) => [s, fromColumns(c)]));
rows.storage = fromColumns(read('builder-storage.json'));
// The card's name: graphics cards show their title, everything else the model name (chip).
const nameOf = (slot, r) => (slot === 'gpu' ? r.title : r.chip);

const CASES = [
  {
    id: 'P1', step: 'mobo', params: { cpu: 'Ryzen 7 9700X|false' },
    what: 'AM5 CPU chosen → boards with another socket must be hidden (rule 1)',
    fails: (r) => r.socket !== 'AM5',
  },
  {
    id: 'P2', step: 'ram', params: { mobo: 'asrocka620mhdvm2' },
    what: 'DDR5 board with 2 slots chosen → DDR4 kits and kits of more than 2 sticks must be hidden (rules 2, 3)',
    fails: (r) => r.type !== 'DDR5' || r.modules > 2,
  },
  {
    id: 'P3', step: 'gpu', params: { case: 'kolinkobservatorymxmesh' },
    what: 'Case taking cards up to 330 mm → measured cards over 330 mm must be hidden; unmeasured ones shown (rule 6)',
    fails: (r) => r.lengthMm != null && r.lengthMm > 330,
  },
  {
    id: 'P4', step: 'cooler', params: { cpu: 'Ryzen 7 9700X|false', case: 'kolinkobservatorymxmesh' },
    what: 'AM5 CPU + case taking coolers up to 160 mm → coolers that list sockets without AM5, and air coolers over 160 mm, must be hidden (rules 8, 10)',
    fails: (r) =>
      (r.sockets != null && r.sockets !== '' && !String(r.sockets).split(',').includes('AM5')) ||
      (r.type === 'Air' && r.heightMm != null && r.heightMm > 160),
  },
  {
    id: 'P5', step: 'psu', params: { cpu: 'Ryzen 7 9700X|false', gpu: 'bestprice:2160322211' },
    what: 'RTX 5080 (card maker: 850 W) chosen → power supplies under 850 W must be hidden (rule 14)',
    fails: (r) => r.watts < 850,
  },
  {
    id: 'P6', step: 'fan', params: { case: 'kolinkobservatoryhfmesh' },
    what: 'Case whose data say fanSlots = 1 (but 6 fans included per its own titles) → by the data, packs of more than 1 fan fail; in reality the case has at least 6 positions',
    fails: (r) => r.pack > 1,
  },
  {
    id: 'P7', step: 'cpu', params: { gpu: 'bestprice:2160322211', psu: '550W Bronze ATX' },
    what: 'RTX 5080 + 550 W PSU chosen → no CPU fails a rule by itself (the PSU is the problem): nothing should be hidden',
    fails: () => false,
  },
  {
    id: 'P8', step: 'cpu', params: { mobo: 'asusprimeb760plusd4' },
    what: 'LGA1700 board chosen → CPUs with another socket must be hidden (rule 1)',
    fails: (r) => r.socket !== 'LGA1700',
  },
];

const multiset = (names) => names.reduce((m, n) => m.set(n, (m.get(n) ?? 0) + 1), new Map());
const diff = (a, b) => {
  // Names in a that b does not have (as many times as they are missing).
  const mb = multiset(b);
  const out = [];
  for (const n of a) {
    if (mb.get(n)) mb.set(n, mb.get(n) - 1);
    else out.push(n);
  }
  return out;
};

async function cards(page) {
  // Load every card ("Show more" adds 24).
  for (let i = 0; i < 200; i++) {
    const more = page.getByRole('button', { name: /^(Show more|Περισσότερα) \(\d+\)$/ });
    if (!(await more.count())) break;
    await more.click();
  }
  return page.$$eval('ul.grid > li.card', (els) =>
    els.map((e) => ({ name: e.querySelector('.line-clamp-2')?.textContent ?? '', disabled: e.getAttribute('aria-disabled') === 'true' })),
  );
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await context.addInitScript(() => {
  localStorage.setItem('lang', 'en');
  localStorage.setItem('theme', 'light');
});
const results = [];
for (const c of CASES) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const q = new URLSearchParams({ ...c.params, step: c.step });
  await page.goto(`${BASE}/?picker=${c.id}#builder?${q}`);
  const count = page.getByText(/^\d+ shown/);
  await count.waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, { timeout: 30_000 });
  const line = (await count.textContent()).trim();
  const m = line.match(/^(\d+) shown(?: · (\d+) incompatible hidden)?/);
  const shownCount = Number(m[1]);
  const hiddenCount = Number(m[2] ?? 0);
  const on = await cards(page);
  await page.screenshot({ path: join(OUT, `${c.id}-${c.step}-only-compatible-on.jpg`), type: 'jpeg', quality: 70 });
  await page.getByRole('button', { name: 'Only compatible' }).click();
  const off = await cards(page);
  const greyed = off.filter((x) => x.disabled).map((x) => x.name);

  const slotRows = rows[c.step];
  const oracleFail = slotRows.filter(c.fails).map((r) => nameOf(c.step, r));
  const oraclePass = slotRows.filter((r) => !c.fails(r)).map((r) => nameOf(c.step, r));
  const shownOn = on.map((x) => x.name);
  const result = {
    id: c.id,
    step: c.step,
    params: c.params,
    what: c.what,
    countLine: line,
    shownCount,
    hiddenCount,
    cardsWithFilterOn: on.length,
    cardsWithFilterOff: off.length,
    greyedWithFilterOff: greyed.length,
    oracle: { fail: oracleFail.length, pass: oraclePass.length, total: slotRows.length },
    // (a) the hidden count equals the clashes v1 greys out, and the parts that fail a rule
    a_hiddenEqualsGreyed: hiddenCount === greyed.length,
    a_hiddenEqualsOracle: hiddenCount === oracleFail.length,
    // (b) every hidden (greyed) part really fails a rule
    b_hiddenButPasses: diff(greyed, oracleFail).slice(0, 15),
    b_hiddenButPassesCount: diff(greyed, oracleFail).length,
    // (c) no part that fails a rule is shown as choosable
    c_failingButChoosable: diff(oracleFail, greyed).filter((n) => shownOn.includes(n)).slice(0, 15),
    c_failingButChoosableCount: diff(oracleFail, greyed).filter((n) => shownOn.includes(n)).length,
    c_failingNotGreyedCount: diff(oracleFail, greyed).length,
    errors,
  };
  results.push(result);
  console.log(`${c.id} ${c.step}: "${line}" | greyed ${greyed.length} | oracle fail ${oracleFail.length} | hidden-but-passes ${result.b_hiddenButPassesCount} | failing-but-choosable ${result.c_failingButChoosableCount}`);
  await page.close();
}
await browser.close();
writeFileSync(join(OUT, 'picker-audit.json'), `${JSON.stringify(results, null, 2)}\n`);
