// Step 5 task 10: the builder's Recommended order by use and budget left, the step's target price, the automatic
// build looked up per budget and the over-budget lines (src/lib/recommend.ts).
import { describe, expect, it } from 'vitest';
import type { Model } from '../../src/lib/data';
import { autoFor, groupOf, overPlan, recommend, stepTarget, type AutoChoice } from '../../src/lib/recommend';
import type { AutoFile } from '../../src/types';
import { SLOTS } from '../../src/lib/slots';
import { USE_KEYS, USE_MINIMUMS } from '../../src/lib/useMinimums';
import { BUILDER, PC_FOR } from '../../src/ui/builderStrings';

const model = (key: string, price: number, row: Record<string, unknown> = {}) =>
  ({ key, chip: key, cheapest: { id: key, chip: key, price, ...row }, listings: [{ id: key, price }] }) as unknown as Model<never>;
const top = (ms: Model<never>[], cmp: (a: Model<never>, b: Model<never>) => number) => [...ms].sort(cmp).map((m) => m.key);

const cpus = [
  model('Ryzen 5 5500', 70, { chip: 'Ryzen 5 5500', cores: 6, igpu: false }),
  model('Ryzen 7 5700G', 130, { chip: 'Ryzen 7 5700G', cores: 8, igpu: true }),
  model('Ryzen 5 7600', 180, { chip: 'Ryzen 5 7600', cores: 6, igpu: true }),
  model('Ryzen 7 7800X3D', 380, { chip: 'Ryzen 7 7800X3D', cores: 8, igpu: true }),
];
const gpus = [
  model('Arc B570', 220, { chip: 'Arc B570', vram: 10 }),
  model('RX 9070 XT', 650, { chip: 'RX 9070 XT', vram: 16 }),
  model('GT 1030', 80, { chip: 'GT 1030', vram: 2 }),
];

describe('recommend: Recommended by use and budget left (answer 5, finding #5)', () => {
  it('the CPU on top differs between everyday 500 € and gaming 1440p 3,500 €', () => {
    const everyday = top(cpus, recommend('cpu', cpus, { use: 'everyday', target: 150, psuWatts: null }));
    const gaming = top(cpus, recommend('cpu', cpus, { use: 'gaming-1440p', target: 450, psuWatts: null }));
    expect(everyday[0]).toBe('Ryzen 7 5700G'); // has graphics, within 115% of the target, best tier there
    expect(gaming[0]).toBe('Ryzen 7 7800X3D');
    // Below the minimum (everyday: no graphics of its own) goes last.
    expect(everyday.at(-1)).toBe('Ryzen 5 5500');
  });
  it('everyday: the graphics card on top is the cheapest (the use needs none)', () => {
    expect(top(gpus, recommend('gpu', gpus, { use: 'everyday', target: null, psuWatts: null }))[0]).toBe('GT 1030');
  });
  it('gaming: a card under the resolution memory minimum is group C', () => {
    const ctx = { use: 'gaming-1440p' as const, target: 700, psuWatts: null };
    expect(groupOf('gpu', gpus[2], ctx)).toBe(2);
    expect(top(gpus, recommend('gpu', gpus, ctx))).toEqual(['RX 9070 XT', 'Arc B570', 'GT 1030']);
  });
  it('a PSU with no stated efficiency or an unknown maker is never first (answer 8)', () => {
    const psus = [
      model('other', 40, { brand: 'Other', watts: 850, efficiency: 'Gold' }),
      model('noeff', 45, { brand: 'Corsair', watts: 850, efficiency: null }),
      model('gold', 90, { brand: 'Corsair', watts: 750, efficiency: 'Gold' }),
      model('small', 30, { brand: 'Corsair', watts: 450, efficiency: 'Bronze' }),
    ];
    const order = top(psus, recommend('psu', psus, { use: 'gaming-1080p', target: 50, psuWatts: 650 }));
    expect(order[0]).toBe('gold');
    expect(order.slice(-2).sort()).toEqual(['noeff', 'other']);
  });
  it('"Fit not verified" ranks after the verified parts inside its group, not after every group', () => {
    const four = model('Ryzen 3 4100', 60, { chip: 'Ryzen 3 4100', cores: 4, igpu: false });
    const all = [...cpus, four];
    const order = top(all, recommend('cpu', all, { use: 'gaming-1440p', target: 450, psuWatts: null }, (m) => m.key === 'Ryzen 7 7800X3D'));
    expect(order[0]).toBe('Ryzen 5 7600');
    expect(order[3]).toBe('Ryzen 7 7800X3D');
    expect(order[4]).toBe('Ryzen 3 4100'); // group C (4 cores) after the unverified part of group A
  });
  it('no budget: groups by the minimum only', () => {
    expect(groupOf('cpu', cpus[3], { use: 'everyday', target: null, psuWatts: null })).toBe(0);
  });
});

const auto: AutoChoice = { parts: { cpu: 'c', gpu: 'g', psu: 'p' }, prices: { cpu: 200, gpu: 600, psu: 200 }, fanQty: 0, total: 1000 };

describe('stepTarget and overPlan', () => {
  it("the auto build's line, scaled to what is left after the chosen parts", () => {
    expect(stepTarget('gpu', auto, {}, 1000)).toBe(600);
    // CPU chosen at 400 (plan 200): 600 left for the GPU and PSU lines (plan 800) → 600 × 600 / 800.
    expect(stepTarget('gpu', auto, { cpu: 400 }, 1000)).toBe(450);
    expect(stepTarget('gpu', null, {}, 1000)).toBeNull();
    expect(stepTarget('gpu', auto, {}, null)).toBeNull();
  });
  it('"+N € over the plan" only on the lines that broke an exceeded budget', () => {
    expect(overPlan({ cpu: 300, gpu: 600, psu: 150 }, auto, 1000)).toEqual({ cpu: 100 });
    expect(overPlan({ cpu: 210, gpu: 600 }, auto, 1000)).toEqual({}); // total within budget
  });
});

describe('autoFor: the build of a budget in auto.json', () => {
  const file: AutoFile = {
    v: 1,
    builtAt: 'x',
    grid: { from: 400, to: 500, step: 50 },
    slots: SLOTS,
    keys: ['cpuA', 'gpuB'],
    builds: [[0, 0, -1, -1, 1, -1, -1, -1, -1, -1, 200, 0, 0, 230, 0, 0, 0, 0, 0]],
    min: { 'gaming-1080p': 0, 'gaming-1440p': -1, 'gaming-4k': -1, everyday: -1, creating: -1, unsure: -1 },
    uses: { 'gaming-1080p': [-1, 0, 0], 'gaming-1440p': [-1, -1, -1], 'gaming-4k': [], everyday: [], creating: [], unsure: [] },
  };
  it('under the minimum, between grid points (the step below), above the range', () => {
    expect(autoFor(file, 'gaming-1080p', 420)).toEqual({ kind: 'under' }); // under the minimum (430)
    // At or above the minimum, before the next grid point: the minimum build, never "under" (review I2).
    expect(autoFor(file, 'gaming-1080p', 440)).toMatchObject({ kind: 'build', build: { total: 430 } });
    expect(autoFor(file, 'gaming-1440p', 440)).toEqual({ kind: 'under' });
    expect(autoFor(file, 'gaming-1080p', 380)).toEqual({ kind: 'under' });
    expect(autoFor(file, 'gaming-1080p', 499)).toEqual({
      kind: 'build',
      build: { parts: { cpu: 'cpuA', gpu: 'gpuB' }, prices: { cpu: 200, gpu: 230 }, fanQty: 0, total: 430 },
    });
    expect(autoFor(file, 'gaming-1080p', 501)).toEqual({ kind: 'above' });
  });
});

describe('the texts of the automatic build (el + en)', () => {
  it('every use names its PC with the RAM of its minimum; every text has Greek and English', () => {
    for (const use of USE_KEYS) {
      expect(PC_FOR[use].en).toContain(`with ${USE_MINIMUMS[use].ramGb} GB`);
      expect(PC_FOR[use].el).toContain(`με ${USE_MINIMUMS[use].ramGb} GB`);
    }
    for (const t of [BUILDER.minimum, BUILDER.seeMinimum, BUILDER.overPlan, BUILDER.aboveRange]) expect(t.el && t.en).toBeTruthy();
    expect(BUILDER.minimum.en.replace('{pc}', PC_FOR['gaming-1440p'].en).replace('{x}', '1.234 €')).toBe('A 1440p gaming PC with 32 GB costs at least 1.234 € today.');
  });
});
