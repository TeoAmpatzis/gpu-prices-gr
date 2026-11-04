import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { (globalThis as { window?: unknown }).window = { addEventListener: () => {}, removeEventListener: () => {} }; });
import { shareLink } from '../../src/lib/builderState';
import { decodeShare } from '../../src/lib/share';

describe('share URL retains unresolved canonical selections', () => {
  it('keeps gone and pending parts, qualified offers, names, second drive and fan quantity', () => {
    vi.stubGlobal('location', { origin: 'https://builddraft.gr' });
    const retained = { build: { parts: { cpu: { key: 'pending-cpu' }, fan: { key: 'old-fan' } }, storage2: { key: 'gone-drive' } }, names: { cpu: 'Pending CPU', fan: 'Old fans', storage2: 'Old drive' } };
    const link = shareLink({}, { use: 'gaming', res: '1440p', budget: 1000 }, { fanQty: 3, offers: { cpu: 'bd1:skroutz:123' } }, retained);
    expect(decodeShare(new URL(link).searchParams)).toMatchObject({ build: { parts: retained.build.parts, storage2: retained.build.storage2, fanQty: 3, offers: { cpu: 'bd1:skroutz:123' }, budget: 1000 }, names: retained.names });
    vi.unstubAllGlobals();
  });
});
