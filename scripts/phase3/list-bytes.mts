// Where the bytes of /data/<cat>/list.json go: gzip size of each part alone (and the whole file), from dist/data.
// Run after `npm run build`:  npx tsx scripts/phase3/list-bytes.mts <cat|all>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const CATS = ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'fan', 'cooler'];
const arg = process.argv[2] ?? 'all';
const cats = arg === 'all' ? CATS : [arg];
const kib = (v: unknown) => gzipSync(Buffer.from(JSON.stringify(v))).length / 1024;
const f1 = (n: number) => n.toFixed(1);

let total = 0;
for (const cat of cats) {
  const raw = readFileSync(join(process.cwd(), 'dist/data', cat, 'list.json'));
  const file = JSON.parse(raw.toString('utf8')) as Record<string, unknown> & { cols: string[]; rows: unknown[][] };
  const whole = gzipSync(raw).length / 1024;
  total += whole;
  const known = new Set(['cols', 'rows', 'hist', 'histBase', 'img', 'photos', 'imported']);
  const other = Object.fromEntries(Object.entries(file).filter(([k]) => !known.has(k)));
  console.log(`\n${cat}: ${f1(whole)} KiB gzip (${file.rows.length} listings x ${file.cols.length} columns)`);
  const parts: [string, number][] = [
    ['cols', kib(file.cols)],
    ['rows', kib(file.rows)],
    ['hist', kib(file.hist)],
    ['histBase', file.histBase === undefined ? 0 : kib(file.histBase)],
    ['img', file.img === undefined ? 0 : kib(file.img)],
    ['photos', file.photos === undefined ? 0 : kib(file.photos)],
    ['imported', kib(file.imported)],
    ['other', kib(other)],
  ];
  for (const [n, v] of parts) if (v) console.log(`  ${n.padEnd(10)} ${f1(v).padStart(7)}`);
  const perCol = file.cols.map((c, i) => [c, kib(file.rows.map((r) => r[i]))] as [string, number]).sort((a, b) => b[1] - a[1]);
  console.log('  columns of rows (alone): ' + perCol.map(([c, v]) => `${c} ${f1(v)}`).join(', '));
}
if (cats.length > 1) console.log(`\nall categories: ${f1(total)} KiB gzip`);
