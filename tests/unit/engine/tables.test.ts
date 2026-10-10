// The engine's v1 tables are copies (src/engine stays free of React/v1 imports): they must equal v1's.
import { describe, expect, it } from 'vitest';
import { BOARD_BY_CASE_SIZE as V1_BOARD_BY_CASE_SIZE } from '../../../src/lib/categories';
import { gpuPsu } from '../../../src/lib/builder';
import { BOARD_BY_CASE_SIZE, V1_GPU_PSU } from '../../../src/engine/tables';
import type { GpuListing } from '../../../src/types';

describe('engine tables = v1 tables', () => {
  it('V1_GPU_PSU equals v1 gpuPsu() for every chip (card figure absent)', () => {
    const diff = Object.entries(V1_GPU_PSU).filter(([chip, w]) => gpuPsu({ chip, minPsu: null } as unknown as GpuListing) !== w);
    expect(diff).toEqual([]);
  });
  it('a chip v1 does not know has no figure in either', () => {
    expect(gpuPsu({ chip: 'Not A Chip', minPsu: null } as unknown as GpuListing)).toBeNull();
    expect(V1_GPU_PSU['Not A Chip']).toBeUndefined();
  });
  it('BOARD_BY_CASE_SIZE equals v1', () => expect(BOARD_BY_CASE_SIZE).toEqual({ ...V1_BOARD_BY_CASE_SIZE }));
});
