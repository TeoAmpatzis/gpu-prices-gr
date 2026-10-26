// The product page's "fits your build" (v2 step 4, task 8): the model's builder candidates from its chunk, add /
// replace into the saved build (the same StoredPart as pick mode), the A7 refresh before the check, and what the
// engine's verdict means (rule 14 hides only on a stated basis, as in pick mode).
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Part, PartCategory } from '../../src/engine';
import { slotModels } from '../../src/lib/builder';
import { candidateKey, SLOTS } from '../../src/lib/slots';
import { addToBuild, cpuVersion, fitCandidates, fitView, hasParts, mainCandidate, slotAction, type FitCandidate } from '../../src/lib/buildFit';
import { readBuild, type StoredBuild } from '../../src/lib/buildStore';
import { CATEGORIES } from '../../src/lib/categories';
import { groupModels } from '../../src/lib/data';
import { toPart, usable } from '../../src/lib/pick';
import { fetchOutcomes, planBuild, resolvePlan } from '../../src/lib/pickBuild';
import { checkAll, PICK_CTX } from '../../src/lib/pickCheck';
import { createChecker } from '../../src/lib/pickChecker';
import { toResults, toVerdicts, type Verdict } from '../../src/lib/pickProtocol';
import { VALIDATION_MODE, validateLatest } from '../../src/data/validate';
import type { BaseListing, Category, Latest } from '../../src/types';
import { FIT } from '../../src/ui/fitStrings';

const OLD = '2026-10-10T05:51:00.000Z';
const NOW = '2026-10-17T14:00:00.000Z';

function stubStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  });
  return data;
}
beforeEach(() => void stubStorage());
afterEach(() => vi.unstubAllGlobals());

const listingsOf = (cat: Category): BaseListing[] =>
  validateLatest(cat, JSON.parse(readFileSync(`public/data/${cat}/latest.json`, 'utf8')) as Latest, VALIDATION_MODE).latest.listings as BaseListing[];

/** A real model of the data as its product-page chunk entry holds it (derive.modelChunks: listings cheapest first, parts). */
function realEntry(cat: 'gpu' | 'cpu', wanted: (ls: BaseListing[]) => boolean) {
  const cfg = CATEGORIES[cat] as never;
  const m = groupModels(listingsOf(cat), cfg).find((x) => wanted(x.listings as BaseListing[]))!;
  const listings = [...(m.listings as BaseListing[])].sort((a, b) => a.price - b.price);
  const parts = Object.fromEntries(slotModels(cat, listings as never[]).map((p) => [p.key, toPart(cat, p as never).fields]));
  return { key: m.key, listings, parts };
}

let n = 0;
const part = (category: PartCategory, fields: Record<string, unknown>, name: string = category): Part => ({ category, key: `${category}-${++n}`, name, quantity: 1, fields });
const verdictOf = (build: Part[], slot: PartCategory, c: Part): Verdict => toVerdicts(toResults(checkAll(build, slot, [c], PICK_CTX), true)).get(c.key)!;

describe('graphics cards: one candidate per card', () => {
  it('every offer of a chip is its own candidate, keyed by its listing id; "Add" writes that card key', () => {
    const entry = realEntry('gpu', (ls) => ls.length >= 3 && new Set(ls.map((l) => l.id)).size === ls.length);
    const cands = fitCandidates('gpu', entry);
    expect(cands.map((c) => c.key).sort()).toEqual(entry.listings.map((l) => l.id).sort());
    for (const c of cands) expect(c.listings).toEqual([c.key]);
    // A card's engine part carries its own fields and its title as the name (pick.toPart).
    const pick = cands.find((c) => c.offered) ?? cands[0];
    const l = entry.listings.find((x) => x.id === pick.key)!;
    expect(pick.part.name).toBe(l.title);
    expect(pick.part.fields).toEqual(entry.parts[pick.key]);

    expect(addToBuild('gpu', pick, NOW)).toBeNull();
    const saved = readBuild().parts.gpu!;
    expect(saved).toEqual({ key: pick.key, fields: entry.parts[pick.key], builtAt: NOW });
    expect(saved.key).toMatch(/^[a-z]+:/); // a listing id ("skroutz:123"), never the chip
    expect(saved.key).not.toBe(entry.key);
  });

  it('adding another card returns the one it replaced; the same card again is "in the build"', () => {
    const entry = realEntry('gpu', (ls) => ls.length >= 2);
    const [a, b] = fitCandidates('gpu', entry);
    addToBuild('gpu', a, NOW);
    expect(slotAction(readBuild(), 'gpu', a.key)).toEqual({ kind: 'in-build' });
    expect(slotAction(readBuild(), 'gpu', b.key)).toEqual({ kind: 'replace', name: String(a.part.fields.chip) });
    expect(addToBuild('gpu', b, NOW)?.key).toBe(a.key);
    expect(readBuild().parts.gpu?.key).toBe(b.key);
  });
});

describe('CPUs keep the pick page key (chip + cooler in the box)', () => {
  it('a model sold as Box and Tray has two candidates; the button takes the cheapest version not ruled out', () => {
    const entry = realEntry('cpu', (ls) => {
      const v = new Set(ls.map((l) => (l as { coolerIncluded?: boolean | null }).coolerIncluded));
      return v.has(true) && v.has(false);
    });
    const cands = fitCandidates('cpu', entry);
    // Box and Tray apart (and the offers that don't say, under "?"), as on the pick page.
    expect(cands.map((c) => cpuVersion(c.key))).toEqual(expect.arrayContaining(['box', 'tray']));
    const chip = entry.listings[0].chip;
    for (const c of cands) expect(['true', 'false', '?'].map((v) => `${chip}|${v}`)).toContain(c.key);
    const cheapest = cands.find((c) => c.listings.includes(entry.listings[0].id))!;
    expect(mainCandidate(cands, entry.listings, () => false)).toBe(cheapest);
    const other = cands.find((c) => c !== cheapest)!;
    expect(mainCandidate(cands, entry.listings, (k) => k === cheapest.key)).toBe(other);
    // both ruled out: the cheapest (its reasons are shown)
    expect(mainCandidate(cands, entry.listings, () => true)).toBe(cheapest);
  });

  it('the version the build holds stays the page candidate: "in your build", never "replace it with itself"', () => {
    const entry = realEntry('cpu', (ls) => {
      const v = new Set(ls.map((l) => (l as { coolerIncluded?: boolean | null }).coolerIncluded));
      return v.has(true) && v.has(false);
    });
    const cands = fitCandidates('cpu', entry);
    const cheapest = cands.find((c) => c.listings.includes(entry.listings[0].id))!;
    const saved = cands.find((c) => c !== cheapest && cpuVersion(c.key) !== null)!;
    addToBuild('cpu', saved, NOW);
    const main = mainCandidate(cands, entry.listings, () => false, readBuild().parts.cpu!.key);
    expect(main).toBe(saved);
    expect(slotAction(readBuild(), 'cpu', main!.key)).toEqual({ kind: 'in-build' });
    // A saved version the check rules out is not kept: the cheapest one that fits is offered instead.
    expect(mainCandidate(cands, entry.listings, (k) => k === saved.key, saved.key)).toBe(cheapest);
  });

  it('the other version of the same CPU in the build: "Switch to the Box / Tray version", names with their version', () => {
    const b: StoredBuild = { parts: { cpu: { key: 'Ryzen 7 7700|false', fields: { chip: 'Ryzen 7 7700' }, builtAt: NOW } } };
    expect(slotAction(b, 'cpu', 'Ryzen 7 7700|true')).toEqual({ kind: 'switch', name: 'Ryzen 7 7700 (no cooler)', to: 'box' });
    expect(slotAction(b, 'cpu', 'Ryzen 7 7700|?')).toEqual({ kind: 'switch', name: 'Ryzen 7 7700 (no cooler)', to: null });
    const box: StoredBuild = { parts: { cpu: { key: 'Ryzen 7 7700|true' } } };
    expect(slotAction(box, 'cpu', 'Ryzen 7 7700|false')).toEqual({ kind: 'switch', name: 'Ryzen 7 7700 (Box)', to: 'tray' });
    // Another chip is a replace, still named with its version.
    expect(slotAction(box, 'cpu', 'Ryzen 5 7600|false')).toEqual({ kind: 'replace', name: 'Ryzen 7 7700 (Box)' });
  });
});

describe('a stale saved part is refreshed before the check (A7)', () => {
  const card = part('gpu', { chip: 'RTX 5080', lengthMm: 340, minPsu: 850 });
  const stale: StoredBuild = { parts: { case: { key: 'somecase', fields: { size: 'Midi Tower', maxBoard: 'ATX', gpuMaxMm: 400 }, builtAt: OLD } } };

  it('no verdict while the chunk is on its way; the fresh 330 mm limit rules the 340 mm card out', async () => {
    const plan = planBuild(stale, 'gpu', NOW);
    expect(plan.ready).toEqual([]);
    expect(plan.refresh).toEqual({ case: 'somecase' });
    const first = resolvePlan(plan, {}, NOW);
    expect(first.result).toBeNull(); // the check waits for the refresh (useBuildCheck runs nothing before it)
    expect(fitView('loading', undefined, [])).toEqual({ state: 'checking', findings: [], notes: [], canAdd: false });

    const load = vi.fn(async () => ({ somecase: { fields: { size: 'Midi Tower', maxBoard: 'ATX', gpuMaxMm: 330 } } }));
    const outcomes = await fetchOutcomes(first.toFetch, NOW, load);
    expect(load).toHaveBeenCalledWith('case', ['somecase'], NOW);
    const build = resolvePlan(plan, outcomes, NOW).result!.parts;
    expect(build.map((p) => p.fields.gpuMaxMm)).toEqual([330]);

    const view = fitView('ready', verdictOf(build, 'gpu', card), build);
    expect(view.state).toBe('blocked');
    expect(view.canAdd).toBe(false);
    expect(view.findings[0].rule).toBe(6);
    expect(view.findings[0].message.en).toBe('The card is 340 mm; the case takes up to 330 mm.');
    expect(view.findings[0].message.el).toContain('340');
    // With the old stored fields it would have passed: the refresh is what the verdict rests on.
    const old = planBuild({ parts: { case: { ...stale.parts.case!, builtAt: NOW } } }, 'gpu', NOW).ready;
    expect(fitView('ready', verdictOf(old, 'gpu', card), old).findings.some((f) => f.rule === 6)).toBe(false);
  });
});

describe('rule 14 (PSU wattage): stated basis rules out, an estimate is shown (as in pick mode)', () => {
  const weak = part('psu', { watts: 350, formFactor: 'ATX' });
  it("a card whose maker states 850 W: doesn't fit, no Add", () => {
    const card = part('gpu', { chip: 'RTX 5080', lengthMm: 300, minPsu: 850 });
    const v = fitView('ready', verdictOf([weak], 'gpu', card), [weak]);
    expect(v.state).toBe('blocked');
    expect(v.canAdd).toBe(false);
    expect(v.findings[0]).toMatchObject({ rule: 14, status: 'error', basis: 'stated' });
  });
  it('a CPU against the same PSU by the whole-build estimate: shown as an error, can still be added', () => {
    const cpu = part('cpu', { chip: 'Core i9-14900K', socket: 'LGA1700', igpu: true, coolerIncluded: false }, 'Core i9-14900K');
    const v = fitView('ready', verdictOf([weak], 'cpu', cpu), [weak]);
    expect(v.state).toBe('issues');
    expect(v.canAdd).toBe(true);
    expect(v.findings.find((f) => f.rule === 14)).toMatchObject({ status: 'error', basis: 'estimate' });
  });
});

describe('fitView', () => {
  const pc = part('case', { size: 'Midi Tower', maxBoard: 'ATX', gpuMaxMm: 400 });
  it('plain "Fits" only when nothing is left unchecked; an unknown length is listed, never "fits"', () => {
    const board = part('mobo', { socket: 'AM5', chipset: 'B650', formFactor: 'ATX', memory: 'DDR5', ramSlots: 4, maxMemoryGB: 192 });
    const ram = part('ram', { type: 'DDR5', modules: 2, capacity: 32, speed: 6000, formFactor: 'Desktop' });
    const fits = fitView('ready', verdictOf([board], 'ram', ram), [board]);
    expect(fits.state).toBe('fits');
    expect([fits.findings, fits.notes, fits.canAdd]).toEqual([[], [], true]);
    // A card against a case: the thickness (rule 7) can't be checked with today's data: "as far as we could check".
    const measured = part('gpu', { chip: 'RTX 5070', lengthMm: 300, minPsu: 650 });
    const partly = fitView('ready', verdictOf([pc], 'gpu', measured), [pc]);
    expect(partly.state).toBe('partly');
    expect(partly.notes.map((f) => f.rule)).toEqual([7]);
    const unmeasured = part('gpu', { chip: 'RTX 5070', lengthMm: null, minPsu: 650 });
    const v = fitView('ready', verdictOf([pc], 'gpu', unmeasured), [pc]);
    expect(v.state).toBe('partly');
    expect(v.notes.map((f) => [f.rule, f.status])).toEqual([[6, 'unknown'], [7, 'unknown']]);
  });
  it('saved parts that could not be checked: never plain "Fits"; "alone" only when nothing relevant is saved', () => {
    const board = part('mobo', { socket: 'AM5', chipset: 'B650', formFactor: 'ATX', memory: 'DDR5', ramSlots: 4, maxMemoryGB: 192 });
    const ram = part('ram', { type: 'DDR5', modules: 2, capacity: 32, speed: 6000, formFactor: 'Desktop' });
    const v = verdictOf([board], 'ram', ram);
    expect(fitView('ready', v, [board]).state).toBe('fits');
    // The board was checked, the saved CPU is no longer available: "fits as far as we could check".
    expect(fitView('ready', v, [board], true).state).toBe('partly');
    // Nothing could be checked (every relevant saved part missing or its chunk failed): "not checked", never "alone".
    const alone = verdictOf([], 'ram', ram);
    expect(fitView('ready', alone, [], true)).toMatchObject({ state: 'unchecked', canAdd: true });
    expect(fitView('ready', alone, []).state).toBe('alone');
  });
  it('nothing in the build to check against: "alone"; a timeout adds nothing and blocks nothing', () => {
    const fan = part('fan', { size: 120, pack: 1 });
    expect(fitView('ready', verdictOf([], 'fan', fan), []).state).toBe('alone');
    expect(fitView('timeout', undefined, [pc])).toEqual({ state: 'timeout', findings: [], notes: [], canAdd: true });
    expect(fitView('checking', undefined, [pc]).canAdd).toBe(false);
  });
  it('pick mode (default) keeps errors and warnings only; the product page (full) keeps notes and unknowns too', async () => {
    const unmeasured = part('gpu', { chip: 'RTX 5070', lengthMm: null, minPsu: 650 });
    const run = (full: boolean) =>
      new Promise<Verdict>((done) => {
        createChecker(null, (fn) => (fn(), () => {})).run('gpu', [pc], [unmeasured], (m) => done(m.get(unmeasured.key)!), { full });
      });
    expect((await run(false)).findings).toEqual([]);
    expect((await run(true)).findings.map((f) => [f.rule, f.status])).toEqual([[6, 'unknown'], [7, 'unknown']]);
  });
});

describe("the first paint's keys (slots.candidateKey, no builder code) equal the builder's", () => {
  it('for every model of every slot category, each listing maps to its fitCandidates key', () => {
    let checked = 0;
    for (const cat of SLOTS) {
      const cfg = CATEGORIES[cat as Category] as never;
      for (const m of groupModels(listingsOf(cat as Category), cfg)) {
        const listings = m.listings as BaseListing[];
        const parts = Object.fromEntries(slotModels(cat, listings as never[]).map((p) => [p.key, {}]));
        const byId = new Map(fitCandidates(cat, { listings, parts }).flatMap((c) => c.listings.map((id) => [id, c.key] as const)));
        for (const l of listings) {
          if (candidateKey(cat, l, m.key) !== byId.get(l.id)) throw new Error(`${cat} ${m.key} ${l.id}`);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(10_000);
  });
});

describe('no build, no section', () => {
  it('hasParts is false for an empty or missing build, true with one part', () => {
    expect(hasParts(readBuild())).toBe(false);
    stubStorage({ pcBuild: JSON.stringify({ use: 'gaming' }) });
    expect(hasParts(readBuild())).toBe(false);
    stubStorage({ pcBuild: JSON.stringify({ case: 'x' }) });
    expect(hasParts(readBuild())).toBe(true);
  });
});

describe('replace names the part it replaces when the saved data names it', () => {
  it('a CPU or board by its chip, RAM / PSU by their readable key, a case by its slot (no name saved)', () => {
    const b: StoredBuild = {
      parts: {
        cpu: { key: 'Ryzen 7 7700|true' },
        mobo: { key: 'asusprimeb650plus', fields: { chip: 'ASUS PRIME B650-PLUS' }, builtAt: NOW },
        ram: { key: 'DDR5 32GB (2×16GB) 6000MHz Desktop' },
        case: { key: 'lianlio11dynamicevo', fields: { size: 'Midi Tower' }, builtAt: NOW },
      },
    };
    expect(slotAction(b, 'cpu', 'Ryzen 5 7600|true')).toEqual({ kind: 'replace', name: 'Ryzen 7 7700 (Box)' });
    expect(slotAction(b, 'mobo', 'x')).toEqual({ kind: 'replace', name: 'ASUS PRIME B650-PLUS' });
    expect(slotAction(b, 'ram', 'x')).toEqual({ kind: 'replace', name: 'DDR5 32GB (2×16GB) 6000MHz Desktop' });
    expect(slotAction(b, 'case', 'x')).toEqual({ kind: 'replace', name: null });
    expect(slotAction(b, 'psu', 'x')).toEqual({ kind: 'add' });
  });
  it('usable decides the button: a candidate the builder does not offer is marked so', () => {
    const entry = realEntry('gpu', (ls) => ls.length >= 1);
    const cands: FitCandidate[] = fitCandidates('gpu', entry);
    const models = slotModels('gpu', entry.listings as never[]);
    for (const c of cands) expect(c.offered).toBe(usable('gpu', models.find((m) => m.key === c.key)! as never));
  });
});

describe('CPU version labels (a Box CPU the maker says has no cooler is not "Tray")', () => {
  it('a |false key (a Box 7600X-like chip or a Tray one) is labelled by the cooler, never "Tray"', () => {
    const b: StoredBuild = { parts: { cpu: { key: 'Ryzen 5 7600X|false', fields: { chip: 'Ryzen 5 7600X' }, builtAt: NOW } } };
    const a = slotAction(b, 'cpu', 'Ryzen 5 7600X|true') as { name: string };
    expect(a.name).toBe('Ryzen 5 7600X (no cooler)');
    expect(a.name).not.toMatch(/Tray/);
  });
  it('the strings say "no cooler in the box" in both languages, with no Tray', () => {
    for (const t of [FIT.versionTray, FIT.switchTray]) expect(`${t.el} ${t.en}`).not.toMatch(/Tray/);
    expect(FIT.versionTray.en).toBe('No cooler in the box');
  });
});
