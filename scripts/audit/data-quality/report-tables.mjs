// Renders the tables of docs/audit/data-quality.md from the JSON outputs of the other scripts, so the
// report's numbers are copied from computed files, not typed. Output: docs/audit/data/report-tables.md
// with one "<!-- table:name -->" section per table (the report includes them verbatim).
// Run after the other scripts: node scripts/audit/data-quality/report-tables.mjs

import { join } from 'node:path';
import { CATS, OUT, mdTable, readJson, writeOut } from './lib.mjs';

const read = (f) => readJson(join(OUT, f));
const coverage = read('coverage.json');
const grouping = read('grouping.json');
const implausible = read('implausible.json');
const identity = read('identity.json');
const freshness = read('freshness.json');
const sample = read('spotcheck-sample.json');
const verdicts = read('spotcheck-verdicts.json');
const impact = read('builder-impact.json');

const out = [];
const section = (name, body) => out.push(`<!-- table:${name} -->\n${body}\n<!-- /table:${name} -->\n`);
const cut = (s, n = 110) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const pct = (k, n) => (n ? `${((100 * k) / n).toFixed(1)}%` : '—');
const CONF = { high: 0, medium: 1, low: 2 };

// ---------- 1. Coverage ----------
for (const cat of CATS) {
  const c = coverage.categories[cat];
  const cell = (s) => (s == null ? 'n/a' : s.k == null ? '—' : `${pct(s.k, s.n)} (${s.k}/${s.n})`);
  section(
    `coverage-${cat}`,
    `${c.models} models; most-listed quarter = ${c.quarterModels} models with ≥ ${c.quarterCutoff} listings; builder rows: ${c.builderRows ?? 'n/a'}.\n\n` +
      mdTable(
        ['Plan field', 'Our JSON field(s)', 'Used by', 'Status', 'All models', 'Most-listed quarter', 'Builder rows'],
        c.fields.map((f) => [f.plan, f.json, f.used, f.status, cell(f.all), cell(f.quarter), cell(f.builder)]),
      ),
  );
}

// ---------- 2. Grouping ----------
for (const cat of CATS) {
  const fs = grouping.findings.filter((f) => f.cat === cat);
  section(
    `grouping-${cat}`,
    mdTable(
      ['Kind', 'Check', 'By design', 'Confidence', 'Groups', 'Models', 'Listings', 'Root cause'],
      fs.map((f) => [f.kind, f.check, f.byDesign ? 'yes' : '', f.confidence, f.groups, f.models, f.listings, f.rootCause || '']),
    ),
  );
  // 20 worst examples: round-robin over the non-by-design checks (most confident first, then biggest).
  const queues = fs
    .filter((f) => !f.byDesign && f.examples.length)
    .sort((a, b) => CONF[a.confidence] - CONF[b.confidence] || (a.kind === 'wrong-merge' ? -1 : 1) - (b.kind === 'wrong-merge' ? -1 : 1) || b.listings - a.listings)
    .map((f) => ({ f, ex: [...f.examples] }));
  const picked = [];
  while (picked.length < 20 && queues.some((q) => q.ex.length)) {
    for (const q of queues) {
      if (picked.length >= 20) break;
      const e = q.ex.shift();
      if (e) picked.push({ f: q.f, e });
    }
  }
  section(
    `grouping-examples-${cat}`,
    mdTable(
      ['#', 'Check', 'Model key(s) (listings)', 'Why', 'Listings (source: title — €)'],
      picked.map(({ f, e }, i) => [
        i + 1,
        cut(f.check, 70),
        (e.models ?? []).map((m) => `${m.key} (${m.listings})`).join('<br>') || '—',
        e.why ?? '',
        e.listings
          .slice(0, 4)
          .map((l) => `${l.source}: ${cut(l.title, 120)}${l.price != null ? ` — ${l.price}` : ''}`)
          .join('<br>') + (e.listings.length > 4 ? `<br>… +${e.listings.length - 4} more` : ''),
      ]),
    ),
  );
}

// ---------- 3. Implausible values ----------
section(
  'implausible-summary',
  mdTable(
    ['Category', 'Check', 'Listings', 'Models', 'In builder rows', 'Rule of thumb', 'Note / root cause'],
    implausible.results.map((r) => [r.cat, r.check, r.listings, r.models, r.inBuilderRows, r.ruleOfThumb ? 'yes' : '', [r.note, r.rootCause].filter(Boolean).join(' ')]),
  ),
);
for (const r of implausible.results.filter((x) => x.listings)) {
  section(
    `implausible-${r.cat}-${implausible.results.indexOf(r)}`,
    `**${r.cat} — ${r.check}** (${r.listings} listings, first ${Math.min(r.examples.length, 20)})\n\n` +
      mdTable(
        ['Source', 'Value', 'Title', 'Context'],
        r.examples.map((e) => [
          e.source,
          typeof e.value === 'object' ? JSON.stringify(e.value) : e.value,
          cut(e.title, 120),
          Object.entries(e)
            .filter(([k]) => !['source', 'title', 'value', 'id'].includes(k))
            .map(([k, v]) => `${k}: ${typeof v === 'string' ? cut(v, 90) : JSON.stringify(v)}`)
            .join('; '),
        ]),
      ),
  );
}

// ---------- Builder impact ----------
section(
  'builder-impact',
  mdTable(
    ['Slot', 'Problem reaching the builder', 'Rows', 'Examples (chip — value)'],
    impact.checks.map((c) => [c.slot, c.check, c.rows, c.examples.slice(0, 4).map((e) => `${cut(e.chip, 50)} — ${cut(String(e.value), 60)}`).join('<br>')]),
  ),
);

// ---------- 4. Identity ----------
section(
  'identity-regex',
  mdTable(
    ['Category', 'Field', 'Listings', 'Title states a value', 'Contradictions', 'By source', 'Field empty although title states it'],
    identity.regex.map((r) => [r.cat, r.field, r.listings, r.titleStates, r.contradictions, JSON.stringify(r.contradictionsBySource), r.missingWhileTitleStates]),
  ),
);
section(
  'identity-regex-examples',
  mdTable(
    ['Category', 'Field', 'Source', 'Our value', 'Title says', 'Title'],
    identity.regex.flatMap((r) => r.examples.map((e) => [r.cat, r.field, e.source, e.field, e.titleSays, cut(e.title, 110)])),
  ),
);
section(
  'identity-spot',
  mdTable(
    ['Category', 'Sampled', 'Errors', 'Error rate', '95% Wilson interval', 'Missing (title states, field empty)', 'Unclear'],
    CATS.map((c) => {
      const s = identity.spotcheck[c];
      return [c, s.judged, s.errors, pct(s.errors, s.judged), `${(100 * s.wilson95[0]).toFixed(1)}–${(100 * s.wilson95[1]).toFixed(1)}%`, s.missing, s.unclear];
    }),
  ),
);
for (const cat of CATS) {
  const v = new Map(verdicts.verdicts[cat].map((x) => [x.n, x]));
  section(
    `identity-sample-${cat}`,
    mdTable(
      ['#', 'Source', 'Title', 'Key fields', 'Spec cache', 'Verdict'],
      sample.samples[cat].map((s) => [
        s.n,
        s.source,
        cut(s.title, 100),
        Object.entries(s.fields)
          .filter(([, x]) => x != null)
          .map(([k, x]) => `${k}=${x}`)
          .join(', '),
        s.specCache ? Object.entries(s.specCache).map(([k, x]) => `${k}=${x}`).join(', ') : '',
        `${v.get(s.n)?.verdict ?? '?'}${v.get(s.n)?.note ? `: ${v.get(s.n).note}` : ''}`,
      ]),
    ),
  );
}

// ---------- 5. Freshness ----------
section(
  'freshness',
  `"Now" used: ${freshness.now} (the time the script ran).\n\n` +
    mdTable(
      ['Category', 'Source', 'ok (last run)', 'count', 'Last success (sources.updatedAt)', 'scrapedAt oldest … newest', 'Age at snapshot (h)', 'Age now (h)', '> 24 h now'],
      freshness.rows.map((r) => [
        r.cat,
        r.source,
        r.ok,
        r.count,
        r.lastSuccess,
        r.oldestScrapedAt === r.newestScrapedAt ? r.oldestScrapedAt : `${r.oldestScrapedAt} … ${r.newestScrapedAt}`,
        r.ageAtSnapshotH,
        r.ageNowH,
        r.over24hNow ? 'YES' : 'no',
      ]),
    ),
);

writeOut('report-tables.md', out.join('\n'));
console.log(`wrote ${out.length} tables`);
