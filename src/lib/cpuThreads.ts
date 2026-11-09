// Threads of a processor. The shops' data has cores only, so threads come from the chip: simultaneous multithreading
// (SMT / Hyper-Threading) is a property of the model line, and Intel's hybrid chips (12th gen on) have two threads
// per performance core and one per efficiency core. Where a title states them they win; where a rule is not sure
// (an unknown line, an exception we have not checked) the answer is null, shown as "—", never a guess.
// Checked against the titles that state threads and the tier table's sourced rows (tests/unit/cpuThreads.test.ts).

/** Performance cores of the hybrid desktop Core i3/i5/i7/i9 (12th–14th gen): the "P" in cores = P + E. */
const P_CORES = { 3: 4, 5: 6, 7: 8, 9: 8 } as const;

/** Threads a title states: "THREADS-12", "12 Threads", "12 νήματα". */
export function titleThreads(title: string): number | null {
  const m = /\bTHREADS?[-\s:]?(\d{1,3})\b/i.exec(title) ?? /\b(\d{1,3})\s*(?:threads?|νήματα)/i.exec(title);
  return m ? Number(m[1]) : null;
}

/** Threads by the chip's line and its core count; null when the line is not covered or the cores are unknown. */
export function threadsByRule(chip: string, cores: number | null): number | null {
  if (cores == null || cores < 1) return null;
  const smt = cores * 2;

  // AMD: SMT on every Zen 2+ part; the Zen/Zen+ quads without it are listed.
  if (/^Ryzen\b/.test(chip)) return /^Ryzen 3 (1200|1300X|2200G|2300X|3200G)$/.test(chip) ? cores : smt;
  if (/^Athlon (200|300|3000)/.test(chip)) return smt;
  if (/^(EPYC|Threadripper)\b/.test(chip)) return smt;

  // Intel Core Ultra series 2 (Arrow Lake): no Hyper-Threading.
  if (/^Core Ultra [3579] 2\d\d/.test(chip)) return cores;

  const core = /^Core i([3579])-(\d{4,5})/.exec(chip);
  if (core) {
    const tier = Number(core[1]) as 3 | 5 | 7 | 9;
    const digits = core[2];
    const gen = digits.length === 5 ? Number(digits.slice(0, 2)) : Number(digits[0]);
    if (gen >= 12) return cores >= P_CORES[tier] ? cores + P_CORES[tier] : null;
    if (gen >= 10) return smt;
    if (tier === 9) return smt;
    if (tier === 7) return gen === 9 ? cores : smt;
    if (tier === 3) return gen >= 8 ? cores : smt;
    return cores >= 4 ? cores : smt; // i5 up to 9th gen: quads and hexa-cores have none
  }

  // Pentium G4560 and Gold G5xxx–G68xx are 2 cores / 4 threads; older Pentiums and the Celeron G-line have none.
  // (G69xx is left out: the shops use the name for a Celeron.)
  const pentium = /^Pentium G(\d{4})[A-Z]{0,2}$/.exec(chip);
  if (pentium) return /^(4560|5\d{3}|6[0-8]\d{2}|7\d{3})$/.test(pentium[1]) ? smt : null;
  if (/^Celeron G\d{4}/.test(chip)) return cores;

  // Xeon.
  if (/^Xeon (Silver|Gold|Platinum) /.test(chip)) return smt;
  if (/^Xeon [4-6]\d{3}E$/.test(chip)) return cores; // Xeon 6 with efficiency cores
  if (/^Xeon [4-6]\d{3}(P|Y|PX)?$/.test(chip)) return smt;
  if (/^Xeon E-2/.test(chip)) return /^Xeon E-(2124G?|2224|2314|2324G|2414)$/.test(chip) ? cores : smt;
  if (/^Xeon E5-/.test(chip)) return /^Xeon E5-(2403|2407|2603|2609)\b/.test(chip) ? cores : smt;
  if (/^Xeon E7-/.test(chip)) return smt;
  if (/^Xeon (W-\d|w\d-)/.test(chip)) return smt;
  return null;
}

/** A model's threads: what a listing title states, else the rule. `cores` is the model's (most common) core count. */
export function cpuThreads(chip: string, cores: number | null, titles: readonly string[] = []): number | null {
  for (const t of titles) {
    const stated = titleThreads(t);
    if (stated != null) return stated;
  }
  return threadsByRule(chip, cores);
}
