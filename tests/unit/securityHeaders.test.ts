// Audit 2026-11-10, P2-005: the site sends security headers, and the policy allows exactly the inline scripts of
// index.html. Changing an inline script without its hash here would stop it on the live site.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
const all = Object.fromEntries((vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []).map((h) => [h.key, h.value]));

describe('security headers (vercel.json)', () => {
  it('sends the baseline headers on every address', () => {
    expect(all['X-Content-Type-Options']).toBe('nosniff');
    expect(all['X-Frame-Options']).toBe('DENY');
    expect(all['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(all['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(all['Content-Security-Policy']).not.toMatch(/script-src[^;]*unsafe/);
  });

  it('the policy lists the hash of every inline script of index.html, and no other', () => {
    const inline = [...readFileSync('index.html', 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
    const listed = all['Content-Security-Policy'].match(/'sha256-[^']+'/g) ?? [];
    expect(inline.length).toBeGreaterThan(0);
    expect([...listed].sort()).toEqual([...inline].sort());
  });
});
