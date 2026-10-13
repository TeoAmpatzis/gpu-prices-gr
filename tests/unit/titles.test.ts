// C5: shortTitles keeps the part that tells offers apart.
import { describe, expect, it } from 'vitest';
import { shortTitles } from '../../src/lib/titles';

describe('shortTitles', () => {
  it('drops the chip name and the words every title shares', () => {
    const t = [
      'Asus GeForce RTX 5060 8GB GDDR7 Dual OC',
      'PNY GeForce RTX 5060 8GB GDDR7 Single Fan',
      'Inno3D GeForce RTX 5060 8GB GDDR7 Twin X2 OC V2',
    ];
    expect(shortTitles(t, 'RTX 5060')).toEqual(['Asus Dual OC', 'PNY Single Fan', 'Inno3D Twin X2 OC V2']);
  });
  it('keeps a single title whole', () => {
    expect(shortTitles(['Lenovo GeForce RTX 5060 8GB'], 'RTX 5060')).toEqual(['Lenovo GeForce RTX 5060 8GB']);
  });
  it('never returns an empty title', () => {
    const t = ['Samsung 990 PRO 1TB', 'Samsung 990 PRO 1TB'];
    expect(shortTitles(t, 'Samsung 990 PRO 1TB')).toEqual(t);
    const u = ['Samsung 990 PRO 1TB', 'Samsung 990 PRO 1TB NVMe'];
    expect(shortTitles(u, 'Samsung 990 PRO 1TB')).toEqual(['Samsung 990 PRO 1TB', 'NVMe']);
  });
  it("ignores a shop's odd wording when most titles share a word", () => {
    const t = ["Asus GeForce RTX 5060 Dual", "PNY GeForce RTX 5060 Single", "Palit GeForce RTX 5060 White", "MSI GeForce RTX 5060 Ventus", "ASUS DUAL OC NVIDIA RTX 5060"];
    expect(shortTitles(t, "RTX 5060")).toEqual(["Asus Dual", "PNY Single", "Palit White", "MSI Ventus", "ASUS DUAL OC NVIDIA"]);
  });
  it('is case-insensitive', () => {
    expect(shortTitles(['MSI rtx 5060 Ventus', 'Zotac RTX 5060 Twin'], 'RTX 5060')).toEqual(['MSI Ventus', 'Zotac Twin']);
  });
});
