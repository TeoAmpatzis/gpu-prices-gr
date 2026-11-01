// Step 5 task 10: the automatic build per budget (src/lib/autoBuild.ts) on a small set of builder rows. The grid on
// today's real data is scripts/checks/auto-build.test.mts.
import { describe, expect, it } from 'vitest';
import { evaluate, powerEstimate } from '../../src/engine';
import { AUTO_GRID, autoCandidates, autoFiles, bestFor, cheapestPick, type AutoModels } from '../../src/lib/autoBuild';
import { partOf } from '../../src/lib/builderEngine';
import { autoFor } from '../../src/lib/recommend';
import type { Model } from '../../src/lib/data';
import { SLOTS, type Slot } from '../../src/lib/slots';
import { engineUseOf } from '../../src/lib/useMinimums';

const model = (key: string, price: number, row: Record<string, unknown>) => {
  const cheapest = { id: key, chip: key, price, ...row };
  return { key, chip: (row.chip as string) ?? key, cheapest, listings: [cheapest] } as unknown as Model<never>;
};

const models: AutoModels = {
  cpu: [
    model('Ryzen 5 7600|true', 180, { chip: 'Ryzen 5 7600', socket: 'AM5', cores: 6, igpu: true, coolerIncluded: true, boxCooler: 'AMD Wraith Stealth' }),
    model('Ryzen 7 7800X3D|false', 380, { chip: 'Ryzen 7 7800X3D', socket: 'AM5', cores: 8, igpu: true, coolerIncluded: false }),
    model('Ryzen 3 8300G|true', 90, { chip: 'Ryzen 3 8300G', socket: 'AM5', cores: 4, igpu: true, coolerIncluded: true }),
  ],
  mobo: [model('board', 120, { chip: 'Asus TUF B650-Plus', chipset: 'B650', socket: 'AM5', formFactor: 'ATX', memory: 'DDR5', ramSlots: 4 })],
  ram: [
    model('DDR5 16GB (2×8GB) 6000MHz', 50, { type: 'DDR5', capacity: 16, modules: 2, speed: 6000, formFactor: 'Desktop' }),
    model('DDR5 32GB (2×16GB) 6000MHz', 90, { type: 'DDR5', capacity: 32, modules: 2, speed: 6000, formFactor: 'Desktop' }),
  ],
  gpu: [
    model('b570', 220, { chip: 'Arc B570', vram: 10, lengthMm: 250, minPsu: 450 }),
    model('9070xt', 650, { chip: 'RX 9070 XT', vram: 16, lengthMm: 300, minPsu: 650 }),
  ],
  cooler: [model('cooler', 30, { type: 'Air', sockets: 'AM4,AM5,LGA1700,LGA1851', heightMm: 155 })],
  storage: [model('ssd', 60, { media: 'SSD', iface: 'NVMe', pcie: 4, formFactor: 'M.2 2280', capacity: 1000 })],
  case: [
    model('case', 70, {
      size: 'Midi Tower', maxBoard: 'ATX', gpuMaxMm: 400, coolerMaxMm: 170, fanSlots: 7,
      fanMounts: [{ pos: 'front', size: 120, n: 3 }, { pos: 'rear', size: 120, n: 1 }, { pos: 'top', size: 120, n: 3 }],
      fansIncluded: [],
    }),
    // Cheaper, every fit stated, but only 2 fan positions: the fan plan (3+) can't go in it (review I1).
    model('small', 50, { size: 'Midi Tower', maxBoard: 'ATX', gpuMaxMm: 400, coolerMaxMm: 170, fanSlots: 2, fansIncluded: [] }),
  ],
  psu: [
    model('other1000', 40, { brand: 'Other', watts: 1000, efficiency: 'Gold', formFactor: 'ATX' }),
    model('noeff1000', 45, { brand: 'Corsair', watts: 1000, efficiency: null, formFactor: 'ATX' }),
    model('corsair650', 70, { brand: 'Corsair', watts: 650, efficiency: 'Bronze', formFactor: 'ATX' }),
    model('corsair850', 110, { brand: 'Corsair', watts: 850, efficiency: 'Gold', formFactor: 'ATX' }),
    model('corsair1000', 160, { brand: 'Corsair', watts: 1000, efficiency: 'Gold', formFactor: 'ATX' }),
  ],
  fan: [model('fan3', 20, { size: 120, pack: 3 }), model('fan1', 9, { size: 120, pack: 1 })],
};

const byKey = (slot: Slot, key: string) => models[slot].find((m) => m.key === key)!;

describe('autoCandidates + bestFor (answers 5–6)', () => {
  const gaming = autoCandidates(models, 'gaming-1080p');
  it('the best card tier first, then the CPU tier, within the budget', () => {
    const rich = bestFor(gaming, 5000)!;
    expect(rich.parts.gpu).toBe('9070xt');
    expect(rich.parts.cpu).toBe('Ryzen 7 7800X3D|false');
    const cheap = cheapestPick(gaming)!;
    expect(cheap.parts.gpu).toBe('b570');
    expect(bestFor(gaming, cheap.total)).toBe(cheap);
    expect(bestFor(gaming, cheap.total - 1)).toBeNull(); // under the minimum: no build
  });
  it('every candidate: within its total, no engine error or warning, gaming ≥ 6 cores, PSU ≥ the recommended, known maker and efficiency', () => {
    for (const p of gaming) {
      const parts = SLOTS.filter((s) => p.parts[s]).map((s) => partOf(s, byKey(s, p.parts[s]!), s === 'fan' ? p.fanQty : 1));
      const f = evaluate(parts, { use: engineUseOf('gaming-1080p') });
      expect(f.filter((x) => x.status === 'error' || x.status === 'warning')).toEqual([]);
      expect(p.parts.cpu).not.toBe('Ryzen 3 8300G|true');
      const e = powerEstimate(parts);
      const psu = byKey('psu', p.parts.psu!).cheapest as unknown as { watts: number; brand: string; efficiency: string | null };
      expect(psu.watts).toBeGreaterThanOrEqual(Math.max(e.makerW ?? 0, e.formulaW ?? 0));
      expect(psu.brand).not.toBe('Other');
      expect(psu.efficiency).not.toBeNull();
      expect(p.total).toBeCloseTo(Object.values(p.prices).reduce((n, v) => n + v, 0), 2);
      // The fan plan's fans (3 front + 1 rear at least, none in the box), one 120 mm product; the cheaper 2-position
      // case can't take them, so the next case is used (review I1: case and fans are chosen together).
      expect(p.parts.fan).toBeDefined();
      expect(p.parts.case).toBe('case');
    }
  });
  it('everyday: no graphics card, the CPU has graphics of its own', () => {
    const p = bestFor(autoCandidates(models, 'everyday'), 5000)!;
    expect(p.parts.gpu).toBeUndefined();
    expect(p.gpuTier).toBe(0);
  });
  it('gaming 1440p: 32 GB of RAM and a 12 GB+ card', () => {
    const p = cheapestPick(autoCandidates(models, 'gaming-1440p'))!;
    expect(p.parts.ram).toBe('DDR5 32GB (2×16GB) 6000MHz');
    expect(p.parts.gpu).toBe('9070xt');
  });
});

describe('autoFiles: auto.json and the minimum per use', () => {
  const { file, minimum } = autoFiles(models, 'now');
  it('one entry per grid point from 400 € to 10,000 €, -1 under the minimum', () => {
    const points = (AUTO_GRID.to - AUTO_GRID.from) / AUTO_GRID.step + 1;
    expect(AUTO_GRID.to).toBeGreaterThanOrEqual(10_000);
    expect(file.uses['gaming-1080p']).toHaveLength(points);
    const min = minimum['gaming-1080p']!.total;
    file.uses['gaming-1080p'].forEach((b, i) => expect(b === -1).toBe(AUTO_GRID.from + i * AUTO_GRID.step < min));
  });
  it('a budget at or above the minimum but under the next grid point gets the minimum build (review I2)', () => {
    const min = minimum['gaming-1080p']!;
    const r = autoFor(file, 'gaming-1080p', min.total);
    expect(r.kind).toBe('build');
    if (r.kind === 'build') {
      expect(r.build.total).toBeCloseTo(min.total, 2);
      expect(r.build.parts).toEqual(min.parts);
    }
    expect(autoFor(file, 'gaming-1080p', min.total - 0.01).kind).toBe('under');
    expect(file.min['gaming-4k']).toBe(-1);
  });
  it('"not sure" has gaming 1080p’s builds and minimum', () => {
    expect(file.uses.unsure).toEqual(file.uses['gaming-1080p']);
    expect(minimum.unsure).toEqual(minimum['gaming-1080p']);
  });
  it('a use nothing can meet (4K needs a 16 GB card and 2 TB): null, every point -1', () => {
    expect(minimum['gaming-4k']).toBeNull();
    expect(file.uses['gaming-4k'].every((b) => b === -1)).toBe(true);
  });
});
