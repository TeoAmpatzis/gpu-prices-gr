import { REGISTRY } from '../../src/lib/registry';

/** The published categories (registry `visible`): e2e checks follow it, so launching a category needs no list edits here. */
export const PUBLISHED: string[] = Object.entries(REGISTRY).filter(([, c]) => c.visible).map(([id]) => id);
