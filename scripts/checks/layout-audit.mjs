// Layout audit: every page × width × language × theme, via Chrome DevTools Protocol.
// Usage: node scripts/checks/layout-audit.mjs <baseUrl> <outDir> [pages] [widths]   (SHOTS=1 also saves screenshots)
// Reports elements wider than their box, outside the viewport, or the page scrolling sideways.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const BASE = process.argv[2];
const OUT = process.argv[3];
const PAGES = (process.argv[4] || 'gpu,cpu,mobo,ram,psu,case,fan,cooler,builder,about,contact,privacy').split(',');
const WIDTHS = (process.argv[5] || '1920,1366,768,360').split(',').map(Number);
const LANGS = ['el', 'en'];
const THEMES = ['light', 'dark'];
const SHOTS = process.env.SHOTS === '1';
mkdirSync(OUT, { recursive: true });

const chromePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find(existsSync);
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars=false', '--remote-debugging-port=9333', `--user-data-dir=${OUT}/profile`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(200);
  try {
    const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
    wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
  } catch {}
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

// Runs in the page: elements wider than their box, outside the viewport, or the page scrolling sideways.
const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth, out = [];
  const name = (el) => {
    let s = el.tagName.toLowerCase();
    const c = (el.getAttribute('class') || '').split(/\\s+/).filter(Boolean).slice(0, 5).join('.');
    if (c) s += '.' + c;
    const txt = (el.innerText || el.value || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
    return s + (txt ? ' "' + txt + '"' : '');
  };
  const scrollerAncestor = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o !== 'visible') return p; } return null; };
  if (document.documentElement.scrollWidth > vw + 1) out.push({ kind: 'PAGE scrolls sideways', el: 'html', px: document.documentElement.scrollWidth - vw });
  if (document.body.scrollWidth > document.body.clientWidth + 1) out.push({ kind: 'BODY wider than viewport', el: 'body', px: document.body.scrollWidth - document.body.clientWidth });
  for (const el of document.querySelectorAll('body *')) {
    if (!(el instanceof HTMLElement) || el.closest('[aria-hidden="true"]') || el.closest('.sr-only')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.display === 'inline') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const extra = el.scrollWidth - el.clientWidth;
    if (extra > 1 && el.tagName !== 'SELECT' && el.tagName !== 'INPUT' && !(cs.scrollbarWidth === 'none' && el.classList.contains('overflow-x-auto'))) {
      const ox = cs.overflowX;
      const kind = ox === 'visible' ? 'content sticks out of box' : (ox === 'hidden' || ox === 'clip') ? (cs.textOverflow === 'ellipsis' ? 'text truncated (ellipsis)' : 'content clipped') : 'horizontal scrollbar';
      out.push({ kind, el: name(el), px: extra });
    }
    if ((r.right > vw + 1 || r.left < -1) && cs.position !== 'fixed') {
      const sc = scrollerAncestor(el);
      if (!sc || sc === document.documentElement || sc === document.body) out.push({ kind: 'outside viewport', el: name(el), px: Math.round(Math.max(r.right - vw, -r.left)) });
    }
  }
  return out;
})()`;

const waitReady = async () => {
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    const ok = await evaluate(`document.readyState === 'complete' && !document.querySelector('.skeleton') && !!document.querySelector('main, h1')`);
    if (ok) { await sleep(300); return true; }
  }
  return false;
};
const click = (sel, textRe) => evaluate(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(e => e.offsetParent !== null${textRe ? ` && ${textRe}.test(e.textContent)` : ''}); if (!els.length) return false; els[0].click(); return true; })()`);

const issues = new Map(); // key -> {kind, el, px, where:Set}
const record = (where, list) => {
  for (const x of list || []) {
    const key = x.kind + ' | ' + x.el.replace(/"[^"]*"$/, '').trim() + (x.kind.startsWith('text truncated') ? '' : ' | ' + x.el);
    const cur = issues.get(key) || { ...x, where: new Set(), maxPx: 0 };
    cur.where.add(where); cur.maxPx = Math.max(cur.maxPx, x.px);
    issues.set(key, cur);
  }
};

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: BASE + '/' });
await waitReady();
let shot = 0;
const screenshot = async (label) => {
  if (!SHOTS) return;
  const { result } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${OUT}/${String(++shot).padStart(3, '0')}-${label}.png`, Buffer.from(result.data, 'base64'));
};

for (const width of WIDTHS) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: width <= 400 ? 780 : width < 1024 ? 1024 : 900, deviceScaleFactor: 1, mobile: width < 1024 });
  for (const lang of LANGS) {
    await evaluate(`localStorage.setItem('lang', '${lang}'); localStorage.setItem('theme', 'light'); localStorage.removeItem('pcBuild'); true`);
    for (const page of PAGES) {
      await send('Page.navigate', { url: `${BASE}/#${page}` });
      await send('Page.reload', { ignoreCache: false });
      if (!(await waitReady())) { record(`${width} ${lang} ${page}`, [{ kind: 'PAGE did not load', el: page, px: 0 }]); continue; }
      const states = [['', async () => {}]];
      if (!['builder', 'about', 'contact', 'privacy'].includes(page)) {
        states.push(['details', async () => click('tbody button[aria-expanded="false"], li.card button[aria-expanded="false"], main button[aria-expanded="false"]')]);
        if (width < 1024) states.push(['filter-sheet', async () => { await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))`); return click('button[aria-haspopup="dialog"]'); }]);
      }
      if (page === 'builder') {
        states.push(['picker', async () => click('button', '/^(Επιλογή|Choose)$/')]);
        // Fill every slot with its first compatible part, then audit the full build.
        states.push(['full-build', async () => {
          for (let i = 0; i < 10; i++) {
            const opened = await click('button', '/^(Επιλογή|Choose)$/');
            if (!opened) break;
            await sleep(400);
            await evaluate(`(() => { const b = document.querySelector('ul.max-h-80 li button'); if (b) b.click(); return !!b; })()`);
            await sleep(400);
          }
          return true;
        }]);
        if (width < 1024) states.push(['summary-open', async () => click('button[aria-expanded="false"]')]);
      }
      for (const [state, act] of states) {
        await act();
        await sleep(500);
        for (const theme of THEMES) {
          await evaluate(`document.documentElement.classList.toggle('dark', ${theme === 'dark'}); true`);
          await sleep(100);
          const where = `${width} ${lang} ${theme} ${page}${state ? ' ' + state : ''}`;
          record(where, await evaluate(AUDIT));
          if (theme === 'light' || width === 360) await screenshot(`${width}-${lang}-${theme}-${page}${state ? '-' + state : ''}`);
        }
      }
    }
  }
}

const rows = [...issues.values()].sort((a, b) => a.kind.localeCompare(b.kind) || b.where.size - a.where.size);
let txt = '';
for (const r of rows) {
  const w = [...r.where];
  txt += `[${r.kind}] ${r.el}  (+${r.maxPx}px, ${w.length} views)\n    e.g. ${w.slice(0, 4).join(' ; ')}\n`;
}
writeFileSync(`${OUT}/report.txt`, txt || 'no issues\n');
console.log(txt || 'no issues');
console.log(`\n${rows.length} distinct issues`);
ws.close();
chrome.kill();
process.exit(0);
