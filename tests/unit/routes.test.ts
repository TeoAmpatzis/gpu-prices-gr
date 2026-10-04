// The URL scheme (plan A2): routes, every old v1 "#…" link and its new address, the host's rewrites, and
// unique model slugs over today's data.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, CATEGORY_IDS, type CategoryConfig } from '../../src/lib/categories';
import { groupModels } from '../../src/lib/data';
import { APP_SEGMENTS, CATEGORY_LIST, legacyTarget, matchRoute } from '../../src/lib/routes';
import { modelSlug } from '../../src/lib/slug';
import type { BaseListing } from '../../src/types';

describe('routes', () => {
  it('category ids are v1\'s, in the same order', () => expect(CATEGORY_LIST).toEqual(CATEGORY_IDS));
  it.each([
    ['/', { kind: 'home' }],
    ['/gpu', { kind: 'category', cat: 'gpu' }],
    ['/storage/', { kind: 'category', cat: 'storage' }],
    ['/gpu/rtx-5070-12gb', { kind: 'model', cat: 'gpu', slug: 'rtx-5070-12gb' }],
    ['/builder', { kind: 'builder' }],
    ['/parts', { kind: 'parts' }],
    ['/about', { kind: 'info', page: 'about' }],
    ['/contact', { kind: 'info', page: 'contact' }],
    ['/privacy', { kind: 'info', page: 'privacy' }],
    ['/gpus', { kind: 'notFound' }],
    ['/builder/x', { kind: 'notFound' }],
    ['/gpu/a/b', { kind: 'notFound' }],
    ['/_preview', { kind: 'notFound' }],
  ])('%s', (path, route) => expect(matchRoute(path)).toEqual(route));
});

describe('old v1 links redirect with every parameter', () => {
  const cases: [string, string | null][] = [
    ...CATEGORY_LIST.map((c) => [`#${c}`, `/${c}`] as [string, string]),
    ['#gpu?vram=16', '/gpu?vram=16'],
    ['#gpu?brand=nvidia&vram=16&mem=gddr7&series=rtx-50&partner=asus&seg=all&sale=1&low=1&max=900&sort=price-asc&page=2&per=100&src=skroutz,bestprice&q=5070', '/gpu?brand=nvidia&vram=16&mem=gddr7&series=rtx-50&partner=asus&seg=all&sale=1&low=1&max=900&sort=price-asc&page=2&per=100&src=skroutz,bestprice&q=5070'],
    ['#cpu?brand=amd&socket=am5&cores=8&series=ryzen-7&igpu=yes&box=box', '/cpu?brand=amd&socket=am5&cores=8&series=ryzen-7&igpu=yes&box=box'],
    ['#mobo?sock=am5&platform=amd&socket=am5&chipset=b850&size=atx&memory=ddr5&slots=4&wifi=yes&brand=asus', '/mobo?sock=am5&platform=amd&socket=am5&chipset=b850&size=atx&memory=ddr5&slots=4&wifi=yes&brand=asus'],
    ['#ram?type=ddr5&cap=32&speed=6000&kit=2&cl=30&brand=kingston', '/ram?type=ddr5&cap=32&speed=6000&kit=2&cl=30&brand=kingston'],
    ['#storage?type=nvme&cap=2-3tb&pcie=4&size=m.2-2280&dram=yes&brand=samsung&seg=nas&sort=per-tb', '/storage?type=nvme&cap=2-3tb&pcie=4&size=m.2-2280&dram=yes&brand=samsung&seg=nas&sort=per-tb'],
    ['#psu?eff=gold&watts=850&modular=full&brand=corsair', '/psu?eff=gold&watts=850&modular=full&brand=corsair'],
    ['#case?size=midi-tower&fits=atx&window=yes&rgb=no&brand=lian-li', '/case?size=midi-tower&fits=atx&window=yes&rgb=no&brand=lian-li'],
    ['#fan?size=120&pack=3&rgb=yes&pwm=yes&brand=arctic', '/fan?size=120&pack=3&rgb=yes&pwm=yes&brand=arctic'],
    ['#cooler?type=aio&rad=360&rgb=no&brand=noctua', '/cooler?type=aio&rad=360&rgb=no&brand=noctua'],
    ['#builder', '/builder'],
    ['#builder?mode=quick', '/builder?mode=quick'],
    ['#builder?step=case', '/builder?step=case'],
    [
      '#builder?cpu=Ryzen+7+9700X%7Cfalse&mobo=asrockb850mprorswifi&gpu=skroutz%3A60811441&psu=850W+Gold+ATX&use=gaming&budget=1000',
      '/builder?cpu=Ryzen+7+9700X%7Cfalse&mobo=asrockb850mprorswifi&gpu=skroutz%3A60811441&psu=850W+Gold+ATX&use=gaming&budget=1000',
    ],
    ['#about', '/about'],
    ['#contact', '/contact'],
    ['#privacy', '/privacy'],
    ['', null],
    ['#', null],
    ['#main', null],
    ['#gpus', null],
  ];
  it.each(cases)('/%s', (hash, target) => expect(legacyTarget('/', hash)).toBe(target));
  it('only at the site root (v1 had no other page)', () => expect(legacyTarget('/gpu', '#ram')).toBeNull());
});

describe('vercel.json serves exactly the app\'s addresses', () => {
  const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as { rewrites: { source: string; destination: string }[] };
  // The two shapes used: "/:name(a|b)" and "/:name(a|b)/:slug".
  const toRegex = (source: string) =>
    new RegExp(`^${source.replace(/:\w+\(([^)]+)\)/g, '($1)').replace(/:\w+\*/g, '.*').replace(/:\w+/g, '[^/]+')}$`);
  const app = vercel.rewrites.filter((r) => r.destination === '/index.html').map((r) => toRegex(r.source));
  const served = (path: string) => path === '/' || app.some((re) => re.test(path));
  it.each(APP_SEGMENTS.map((s) => `/${s}`))('%s', (path) => expect(served(path)).toBe(true));
  it.each(CATEGORY_LIST.map((c) => `/${c}/some-model`))('%s', (path) => expect(served(path)).toBe(true));
  it.each(['/gpus', '/_preview', '/builder/x', '/data/x', '/gpu/a/b'])('%s is a 404', (path) => expect(served(path)).toBe(false));
  it('keeps v2 deploys switched off', () => expect(JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')).git.deploymentEnabled.v2).toBe(false));
});

describe('model slugs are unique in every category (today\'s data)', () => {
  for (const cat of CATEGORY_LIST) {
    it(cat, () => {
      const listings = (JSON.parse(readFileSync(new URL(`../../public/data/${cat}/latest.json`, import.meta.url), 'utf8')) as { listings: BaseListing[] }).listings;
      const models = groupModels(listings, CATEGORIES[cat] as unknown as CategoryConfig<BaseListing>);
      const slugs = models.map((m) => modelSlug(cat, m));
      expect(slugs.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))).toBe(true);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  }
});
