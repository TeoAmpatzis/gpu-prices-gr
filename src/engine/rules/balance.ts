// Rules about balance for gaming (Phase 4, docs/redesign-v2.md "Κανόνας ισορροπίας"): 27 CPU too weak for the card,
// 28 fewer than 6 cores, 29 card memory under the resolution's minimum, 30 CPU far above the card. They are advice,
// not compatibility: they speak only for a gaming build (Context.use), never give an error (nothing hides), and say
// nothing when a chip has no tier (no unknown note). A card tier borrowed from another resolution (tiers.ts, M4)
// makes the finding an estimate and the message says so.
import { tierOf, type TierHit } from '../data/tiers';
import { BALANCE, MIN_GAMING_CORES, MIN_VRAM_GB } from '../tables';
import type { Build, Context, Finding, Msg, Part, Resolution } from '../types';
import { finding, keys, msg, num, one, str } from '../util';

const label = (r: Resolution) => (r === '4k' ? '4K' : r);

/** The gaming resolution of the build, or null when the build is not for gaming (rules 27–30 then say nothing). */
function gamingRes(ctx: Context): Resolution | null {
  return ctx.use?.kind === 'gaming' ? (ctx.use.res ?? '1080p') : null;
}

/** Both tiers at the resolution, or null when either chip has none. */
function tiers(cpu: Part, gpu: Part, res: Resolution): { c: number; g: TierHit } | null {
  const cpuChip = str(cpu, 'chip') ?? cpu.name, gpuChip = str(gpu, 'chip'), vram = num(gpu, 'vram');
  const c = tierOf('cpu', cpuChip, res);
  const g = gpuChip && vram !== null ? tierOf('gpu', gpuChip, res, vram) : undefined;
  return c && g ? { c: c.tier, g } : null;
}

/** " This is an estimate: …" when the card's tier is borrowed from another resolution (M4); empty otherwise. */
function estimateNote(g: TierHit, res: Resolution): Msg {
  if (!g.borrowed) return msg('', '');
  const from = label(g.borrowed), at = label(res);
  return msg(` Είναι εκτίμηση: η κάρτα δεν έχει δικό της επίπεδο στα ${at}, οπότε χρησιμοποιήθηκε αυτό των ${from}.`,
    ` This is an estimate: the card has no ${at} tier of its own, so its ${from} tier is used.`);
}

export function rule27(b: Build, ctx: Context): Finding[] {
  const res = gamingRes(ctx), cpu = one(b, 'cpu'), gpu = one(b, 'gpu');
  if (!res || !cpu || !gpu) return [];
  const t = tiers(cpu, gpu, res);
  if (!t) return [];
  const at = label(res), lo = t.g.tier + BALANCE[res].min, est = estimateNote(t.g, res), basis = t.g.borrowed ? 'estimate' : 'stated';
  if (t.c >= lo) return [finding(27, 'pass', basis, keys(cpu, gpu),
    msg(`Ο επεξεργαστής (επίπεδο ${t.c}) ταιριάζει με την κάρτα (επίπεδο ${t.g.tier}) στα ${at}.${est.el}`,
      `The CPU (tier ${t.c}) suits the card (tier ${t.g.tier}) at ${at}.${est.en}`))];
  return [finding(27, 'warning', basis, keys(cpu, gpu),
    msg(`Ο επεξεργαστής (επίπεδο ${t.c}) είναι αδύναμος για την κάρτα (επίπεδο ${t.g.tier}) στα ${at}: θα την κρατά πίσω. Στα ${at} αυτή η κάρτα θέλει επεξεργαστή επιπέδου ${lo} ή πάνω.${est.el}`,
      `The CPU (tier ${t.c}) is too weak for the card (tier ${t.g.tier}) at ${at}: it will hold the card back. At ${at} this card wants a CPU of tier ${lo} or higher.${est.en}`),
    msg('Διάλεξε πιο γρήγορο επεξεργαστή ή πιο φθηνή κάρτα.', 'Choose a faster CPU or a cheaper card.'))];
}

export function rule28(b: Build, ctx: Context): Finding[] {
  const res = gamingRes(ctx), cpu = one(b, 'cpu');
  if (!res || !cpu) return [];
  const cores = num(cpu, 'cores');
  if (cores === null) return [];
  if (cores >= MIN_GAMING_CORES) return [finding(28, 'pass', 'stated', keys(cpu),
    msg(`${cores} πυρήνες: αρκετοί για gaming.`, `${cores} cores: enough for gaming.`))];
  return [finding(28, 'warning', 'stated', keys(cpu),
    msg(`Gaming με επεξεργαστή ${cores} πυρήνων: για gaming προτείνουμε τουλάχιστον ${MIN_GAMING_CORES} πυρήνες.`,
      `Gaming on a ${cores}-core CPU: for gaming we suggest at least ${MIN_GAMING_CORES} cores.`),
    msg(`Διάλεξε επεξεργαστή με ${MIN_GAMING_CORES} ή περισσότερους πυρήνες.`, `Choose a CPU with ${MIN_GAMING_CORES} or more cores.`))];
}

export function rule29(b: Build, ctx: Context): Finding[] {
  const res = gamingRes(ctx), gpu = one(b, 'gpu');
  if (!res || !gpu) return [];
  const vram = num(gpu, 'vram');
  if (vram === null) return [];
  const at = label(res), min = MIN_VRAM_GB[res];
  if (vram >= min) return [finding(29, 'pass', 'stated', keys(gpu),
    msg(`${vram} GB μνήμης κάρτας: αρκετή για ${at}.`, `${vram} GB of card memory: enough for ${at}.`))];
  return [finding(29, 'note', 'stated', keys(gpu),
    msg(`Η κάρτα έχει ${vram} GB μνήμης· για ${at} προτείνουμε τουλάχιστον ${min} GB.`, `The card has ${vram} GB of memory; for ${at} we suggest at least ${min} GB.`),
    msg('Σκέψου κάρτα με περισσότερη μνήμη ή χαμηλότερη ανάλυση.', 'Consider a card with more memory or a lower resolution.'))];
}

export function rule30(b: Build, ctx: Context): Finding[] {
  const res = gamingRes(ctx), cpu = one(b, 'cpu'), gpu = one(b, 'gpu');
  if (!res || !cpu || !gpu) return [];
  const t = tiers(cpu, gpu, res);
  if (!t) return [];
  const hi = t.g.tier + BALANCE[res].max;
  if (t.c <= hi) return []; // within the band: rule 27 already says it suits
  const at = label(res), est = estimateNote(t.g, res);
  return [finding(30, 'note', t.g.borrowed ? 'estimate' : 'stated', keys(cpu, gpu),
    msg(`Ο επεξεργαστής (επίπεδο ${t.c}) είναι πολύ πάνω από την κάρτα (επίπεδο ${t.g.tier}) στα ${at}: τα ίδια χρήματα στην κάρτα θα έδιναν περισσότερα FPS.${est.el}`,
      `The CPU (tier ${t.c}) is well above the card (tier ${t.g.tier}) at ${at}: the same money spent on the card would give more FPS.${est.en}`),
    msg('Σκέψου φθηνότερο επεξεργαστή και πιο γρήγορη κάρτα.', 'Consider a cheaper CPU and a faster card.'))];
}
