// End-to-end health check of the site in headless Chrome (live or a local `vite preview`).
//   node scripts/checks/site-check.mjs [https://gpu-prices-gr.vercel.app]
// Every tab: products listed, no error, photos in view load; the first product opens with shop links,
// a price chart and its large photo; the PC builder offers parts; the text pages render; the data and
// photo files are served with the expected cache headers; the newest data is under 12 hours old.
// Exit code 1 if anything fails.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = (process.argv[2] || 'https://gpu-prices-gr.vercel.app').replace(/\/$/, '');
const CATS = ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler'];
const chromePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, '/usr/bin/google-chrome'].find((p) => p && existsSync(p));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9345', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'site-check-'))}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, what, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${detail ? `  (${detail})` : ''}`);
};

let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(200);
  try { wsUrl = (await (await fetch('http://127.0.0.1:9345/json/list')).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const waitFor = async (expr, ms = 15000) => { for (let t = 0; t < ms; t += 250) { if (await evaluate(expr)) return true; await sleep(250); } return false; };
const open = async (hash) => { await send('Page.navigate', { url: 'about:blank' }); await sleep(100); await send('Page.navigate', { url: `${BASE}/#${hash}` }); };

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });

// ---- files and headers
const head = async (path) => { const r = await fetch(BASE + path, { method: 'GET' }); return { ok: r.ok, type: r.headers.get('content-type') ?? '', cache: r.headers.get('cache-control') ?? '', body: r }; };
const man = await head('/data/manifest.json');
const manifest = man.ok ? await man.body.json() : null;
check(!!manifest, 'manifest.json served', manifest ? `built ${manifest.builtAt}` : '');
for (const cat of CATS) {
  const c = manifest?.cats?.[cat];
  check(!!c && c.models > 0 && c.listings > 0, `${cat}: data`, c ? `${c.models} models, ${c.listings} listings, ${c.historyPoints ?? '?'} history points, updated ${c.updatedAt}` : 'missing');
}
// Scrapes run every 6 hours: newest data older than 12 hours means scheduled runs are failing
// (2026-10-03: selectolax 1.0 broke three runs in a row and nobody noticed for ~15 hours).
const MAX_AGE_H = 12;
const newest = Math.max(0, ...CATS.map((cat) => Date.parse(manifest?.cats?.[cat]?.updatedAt ?? '') || 0));
const ageH = (Date.now() - newest) / 36e5;
check(newest > 0 && ageH <= MAX_AGE_H, `newest data under ${MAX_AGE_H} h old`, newest ? `${ageH.toFixed(1)} h since ${new Date(newest).toISOString()}` : 'no updatedAt in the manifest');
const list = await head('/data/gpu/list.json');
check(list.ok && /max-age=300/.test(list.cache), 'list.json cached 5 min', list.cache);

// ---- every tab
let samplePhoto = null;
for (const cat of CATS) {
  await open(cat);
  const loaded = await waitFor(`!!document.querySelector('main tbody tr button[aria-expanded]') && !document.querySelector('.skeleton')`);
  const error = await evaluate(`!!document.querySelector('.notice-danger')`);
  const rows = await evaluate(`document.querySelectorAll('main tbody tr button[aria-expanded]').length`);
  await waitFor(`[...document.querySelectorAll('main img')].filter(i => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).every(i => i.complete)`, 8000);
  const photos = await evaluate(`(() => { const v = [...document.querySelectorAll('main img')].filter(i => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }); return { inView: v.length, loaded: v.filter(i => i.naturalWidth > 0).length, src: v[0]?.getAttribute('src') ?? null }; })()`);
  samplePhoto ??= photos.src;
  check(loaded && !error && rows > 0 && photos.loaded === photos.inView, `#${cat}: products and photos`, `${rows} rows on page 1, photos in view ${photos.loaded}/${photos.inView}`);
}

// ---- product details (graphics cards)
await open('gpu');
await waitFor(`!!document.querySelector('main tbody tr button[aria-expanded]')`);
await evaluate(`document.querySelector('main tbody tr button[aria-expanded="false"]').click(); true`);
const details = await waitFor(`[...document.querySelectorAll('main tbody ul a')].some(a => a.getAttribute('href')) && !!document.querySelector('main tbody [role=img] svg path')`, 10000);
const d = await evaluate(`({ offers: document.querySelectorAll('main tbody ul a').length, links: [...document.querySelectorAll('main tbody ul a')].filter(a => a.getAttribute('href')).length, photo: [...document.querySelectorAll('main tbody img')].some(i => i.width >= 150 && i.naturalWidth > 0) })`);
check(details && d.links === d.offers && d.photo, 'product details: shop links, chart, large photo', `${d.links}/${d.offers} links, photo ${d.photo}`);

// ---- PC builder: Quick list (the first part's picker) and Guided (the processor step's cards)
await open('builder?mode=quick');
const builder = await waitFor(`[...document.querySelectorAll('main button')].some(b => /^(Επιλογή|Choose)$/.test(b.textContent.trim()))`);
await evaluate(`[...document.querySelectorAll('main button')].find(b => /^(Επιλογή|Choose)$/.test(b.textContent.trim())).click(); true`);
// The page shows before builder.json arrives; the picker fills in when it has.
await waitFor(`document.querySelectorAll('main ul.max-h-80 li').length > 0`, 10000);
const options = await evaluate(`document.querySelectorAll('main ul.max-h-80 li').length`);
check(builder && options > 0, 'PC builder (Quick list) offers parts', `${options} options for the first slot`);
await open('builder?step=cpu');
const guided = await waitFor(`document.querySelectorAll('main li.card').length > 0`);
const cards = await evaluate(`document.querySelectorAll('main li.card').length`);
check(guided && cards > 0, 'PC builder (Guided) shows part cards', `${cards} cards on the processor step`);
// Storage rows live in their own file (builder.LAZY_SLOTS), fetched only when the step opens.
const lazyEarly = await evaluate(`performance.getEntriesByType('resource').some(e => /builder-storage\\.json/.test(e.name))`);
check(!lazyEarly, 'builder-storage.json not loaded with the builder', lazyEarly ? 'requested on a step without storage' : '');
await open('builder?step=storage');
const storage = await waitFor(`document.querySelectorAll('main li.card').length > 0`);
const storageCards = await evaluate(`document.querySelectorAll('main li.card').length`);
check(storage && storageCards > 0, 'PC builder (Guided) storage step shows drives', `${storageCards} cards`);

// ---- text pages
for (const page of ['about', 'contact', 'privacy']) {
  await open(page);
  const ok = await waitFor(`!!document.querySelector('main article h2')`);
  check(ok, `#${page} renders`);
}
const footer = await evaluate(`[...document.querySelectorAll('footer nav a')].map(a => a.getAttribute('href')).join(' ')`);
check(!/credits/.test(footer), 'footer has no image-credits link (removed 2026-10-01)', footer);

// ---- photo file through /img (Vercel → images repo)
if (samplePhoto) {
  const p = await head(samplePhoto);
  check(p.ok && p.type.includes('image/webp'), 'photos served under /img', `${samplePhoto} ${p.type} ${p.cache}`);
}

console.log(failures ? `\n${failures} FAILED` : '\nall checks passed');
ws.close();
chrome.kill();
process.exit(failures ? 1 : 0);
