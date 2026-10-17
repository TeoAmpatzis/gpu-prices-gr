// C5: shortTitles keeps the maker and the part that tells offers apart.
import { describe, expect, it } from 'vitest';
import { GPU_SPEC, GPU_WORDS, RAM_TITLE, shortTitles, titleKey, titleOptions } from '../../src/lib/titles';

const gpu = { known: GPU_WORDS, spec: GPU_SPEC };

describe('shortTitles', () => {
  it('drops the chip, VRAM, memory type and brand words; keeps the maker', () => {
    const t = [
      'Asus GeForce RTX 5060 8GB GDDR7 Dual OC',
      'PNY GeForce RTX 5060 8GB GDDR7 Single Fan',
      'MSI GeForce RTX 5060 Ventus 2X OC',
    ];
    expect(shortTitles(t, 'RTX 5060', gpu)).toEqual(['Asus Dual OC', 'PNY Single Fan', 'MSI Ventus 2X OC']);
  });
  it('shared words in the middle go only with 4+ offers, and never the maker nor a KEEP word (OC)', () => {
    const t = [
      'Asus RTX 5060 Dual OC Edition',
      'Asus RTX 5060 Prime OC Edition',
      'Asus RTX 5060 TUF OC Edition',
      'Asus RTX 5060 Phoenix OC Edition',
      'MSI RTX 5060 Ventus OC Edition',
    ];
    expect(shortTitles(t, 'RTX 5060', gpu)).toEqual(['Asus Dual OC', 'Asus Prime OC', 'Asus TUF OC', 'Asus Phoenix OC', 'MSI Ventus OC']);
  });
  it('keeps what differs with 2-3 offers ("Asus Dual OC" + "Asus Dual")', () => {
    expect(shortTitles(['Asus GeForce RTX 5060 Dual OC', 'Asus GeForce RTX 5060 Dual'], 'RTX 5060', gpu)).toEqual(['Asus Dual OC', 'Asus Dual']);
  });
  it('keeps a single title whole', () => {
    expect(shortTitles(['Lenovo GeForce RTX 5060 8GB'], 'RTX 5060', gpu)).toEqual(['Lenovo GeForce RTX 5060 8GB']);
  });
  it('never empties a title: the maker stays', () => {
    const t = ['Samsung 990 PRO 1TB', 'Samsung 990 PRO 1TB NVMe'];
    expect(shortTitles(t, 'Samsung 990 PRO 1TB')).toEqual(['Samsung', 'Samsung NVMe']);
  });
  it('is case-insensitive', () => {
    expect(shortTitles(['MSI rtx 5060 Ventus', 'Zotac RTX 5060 Twin'], 'RTX 5060')).toEqual(['MSI Ventus', 'Zotac Twin']);
  });
  it('RAM: "2×16GB" matches "2x16GB" and "2 x 16GB"', () => {
    const t = ['Corsair Vengeance 32GB (2x16GB) DDR5 6000MHz CL30', 'G.Skill Trident Z5 32GB 2 x 16GB DDR5 6000MHz', 'Kingston Fury Beast 32GB Kit 2×16GB DDR5 6000MHz'];
    expect(shortTitles(t, 'DDR5 32GB (2×16GB) 6000MHz')).toEqual(['Corsair Vengeance CL30', 'G.Skill Trident Z5', 'Kingston Fury Beast Kit']);
  });
  it('a two-word maker keeps both words; a title that would be only the maker keeps its shared words', () => {
    const t = ['Be Quiet! Pure Base 500 Black', 'Be Quiet! Pure Base 500 RGB Black', 'Be Quiet! Pure Base 500 Black', 'Be Quiet! Pure Base 500 Window Black'];
    expect(shortTitles(t, 'Be Quiet! Pure Base 500')).toEqual(['Be Quiet! Black', 'Be Quiet! RGB', 'Be Quiet! Black', 'Be Quiet! Window']);
  });
  it('PSU: the spec words of "850W Gold" go', () => {
    const t = ['Corsair RM850x 850W 80 Plus Gold', 'Seasonic Focus GX-850 850W Gold'];
    expect(shortTitles(t, '850W Gold')).toEqual(['Corsair RM850x 80 Plus', 'Seasonic Focus GX-850']);
  });

  describe('RAM titles', () => {
    const kf = 'Kingston Fury Beast 32GB DDR4 με 2 Modules 2x16GB & Ταχύτητα 3200 για Desktop';
    it('drops "με N Modules" so no lone 2 is left', () => {
      const out = shortTitles([kf, 'Kingston Fury Beast Black 32GB DDR4 2x16GB 3200'], 'DDR4 32GB (2×16GB) 3200MHz', RAM_TITLE);
      expect(out.some((s) => /\s2$/.test(s))).toBe(false);
      expect(out[0]).not.toMatch(/modules/i);
    });
    it('keeps a digit that is part of the series name', () => {
      const out = shortTitles(['Patriot Viper Elite 5 16GB DDR5', 'Patriot Viper Elite 5 RGB 16GB DDR5'], 'DDR5 16GB 6000MHz', RAM_TITLE);
      expect(out[0]).toContain('Elite 5');
    });
    it('titleKey ignores "με N Modules"', () => {
      const a = 'Kingston Fury Beast 32GB DDR4 3200';
      expect(titleKey(kf.replace(/ με 2 Modules/, ''), 'x', RAM_TITLE)).toBe(titleKey(kf, 'x', RAM_TITLE));
      expect(titleKey(a + ' με 2 Modules', 'x', RAM_TITLE)).toBe(titleKey(a, 'x', RAM_TITLE));
    });
    it('titleOptions picks the options per category', () => {
      expect(titleOptions('ram')).toBe(RAM_TITLE);
      expect(titleOptions('gpu').known).toBe(GPU_WORDS);
      expect(titleOptions('cpu')).toEqual({});
    });
  });
});
