// The site's sections, in one place: names (docs/phase1/glossary.md), icons, the "Εξαρτήματα" menu groups
// (plan, "Αρχική σελίδα, πλοήγηση και URLs") and the words global search matches categories by.
// Σύγκριση and Προσφορές are not listed until their pages exist (owner, 2026-10-04; backlog #11, #12).
import { Box, CircuitBoard, Cpu, Fan, HardDrive, MemoryStick, Microchip, Plug, Snowflake, Wrench, type LucideIcon } from 'lucide-react';
import type { Text } from '../lib/i18n';
import type { Category } from '../types';

export interface Section {
  name: Text;
  /** One of them, for a builder slot ("Κάρτα γραφικών"). */
  one?: Text;
  icon: LucideIcon;
  /** Extra words search matches this section by (both languages, common abbreviations). */
  words: string[];
}

export const CATS: Record<Category, Section> = {
  cpu: { name: { el: 'Επεξεργαστές', en: 'Processors' }, one: { el: 'Επεξεργαστής', en: 'Processor' }, icon: Cpu, words: ['επεξεργαστής', 'cpu', 'processor'] },
  mobo: { name: { el: 'Μητρικές', en: 'Motherboards' }, one: { el: 'Μητρική', en: 'Motherboard' }, icon: Microchip, words: ['μητρική', 'motherboard', 'mobo', 'mainboard'] },
  ram: { name: { el: 'Μνήμη RAM', en: 'Memory (RAM)' }, one: { el: 'Μνήμη RAM', en: 'Memory' }, icon: MemoryStick, words: ['μνήμες', 'ram', 'memory'] },
  gpu: { name: { el: 'Κάρτες γραφικών', en: 'Graphics cards' }, one: { el: 'Κάρτα γραφικών', en: 'Graphics card' }, icon: CircuitBoard, words: ['κάρτα γραφικών', 'gpu', 'vga'] },
  storage: { name: { el: 'Δίσκοι', en: 'Storage' }, one: { el: 'Δίσκος', en: 'Storage drive' }, icon: HardDrive, words: ['δίσκος', 'ssd', 'hdd', 'nvme', 'σκληρός'] },
  case: { name: { el: 'Κουτιά', en: 'Cases' }, one: { el: 'Κουτί', en: 'Case' }, icon: Box, words: ['κουτί', 'case', 'tower', 'πύργος'] },
  psu: { name: { el: 'Τροφοδοτικά', en: 'Power supplies' }, one: { el: 'Τροφοδοτικό', en: 'Power supply' }, icon: Plug, words: ['τροφοδοτικό', 'psu', 'power supply'] },
  cooler: { name: { el: 'Ψύκτρες CPU', en: 'CPU coolers' }, one: { el: 'Ψύκτρα CPU', en: 'CPU cooler' }, icon: Snowflake, words: ['ψύκτρα', 'cooler', 'aio', 'υδρόψυξη'] },
  fan: { name: { el: 'Ανεμιστήρες', en: 'Case fans' }, one: { el: 'Ανεμιστήρες', en: 'Case fans' }, icon: Fan, words: ['ανεμιστήρας', 'fan', 'fans'] },
};

export const BUILDER: Section = { name: 'PC Builder', icon: Wrench, words: ['builder', 'συναρμολόγηση', 'build', 'σύνθεση'] };

export const GROUPS: { title: Text; cats: Category[] }[] = [
  { title: { el: 'Βασικά', en: 'Core parts' }, cats: ['cpu', 'mobo', 'ram', 'gpu', 'storage'] },
  { title: { el: 'Κουτί, ρεύμα και ψύξη', en: 'Case, power and cooling' }, cats: ['case', 'psu', 'cooler', 'fan'] },
];
export const TOOLS_TITLE: Text = { el: 'Εργαλεία', en: 'Tools' };

/** Phase 1 links (real URLs; the model pages come in Phase 3, so a model opens its category searched). */
export const href = {
  home: '/',
  parts: '/parts',
  builder: '/builder',
  category: (c: Category) => `/${c}`,
  model: (c: Category, name: string) => `/${c}?q=${encodeURIComponent(name)}`,
  search: (c: Category, q: string) => `/${c}?q=${encodeURIComponent(q.trim())}`,
  maker: (c: Category, maker: string) =>
    `/${c}?${c === 'gpu' ? 'partner' : 'brand'}=${encodeURIComponent(maker.toLowerCase().replace(/[^\p{L}\p{N}.+×]+/gu, '-'))}`,
};
