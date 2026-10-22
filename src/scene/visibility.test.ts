import { describe, expect, it } from 'vitest';
import { buildReducer, initialState, KEY_COUNT, SCREW_COUNT, STABILIZER_COUNT, type BuildAction, type BuildState } from '../keyboard';
import { partVisibility } from './visibility';

const counts = { keys: KEY_COUNT, stabs: STABILIZER_COUNT, screws: SCREW_COUNT };
const run = (...actions: BuildAction[]) => actions.reduce(buildReducer, initialState);
const count = (b: boolean[]) => b.filter(Boolean).length;
const unboxed = run({ type: 'open' }, { type: 'fill' });
const both = (s: BuildState) => (['build', 'exploded'] as const).map((v) => partVisibility(s, v, counts));

describe('exploded view mirrors assembly progress', () => {
  it('is empty before and during unboxing', () => {
    for (const s of [initialState, run({ type: 'open' }), run({ type: 'open' }, { type: 'unpack' })]) {
      for (const v of both(s)) {
        expect(v.pcb || v.dampener || v.plate || v.tray || v.frame).toBe(false);
        expect(count(v.switches) + count(v.caps) + count(v.screws) + count(v.stabilizers)).toBe(0);
      }
    }
  });

  it('shows only the PCB once unboxing finishes', () => {
    const s = unboxed;
    for (const v of both(s)) {
      expect(v.pcb).toBe(true);
      expect(count(v.stabilizers) + count(v.switches) + count(v.caps) + count(v.screws)).toBe(0);
    }
  });

  it('adds individual items one at a time', () => {
    const s = run({ type: 'open' }, { type: 'fill' }, { type: 'stabilizer', index: 1 });
    expect(partVisibility(s, 'exploded', counts).stabilizers).toEqual([false, true, false]);
  });

  it('adds bulk sets together and never exposes future parts or previews', () => {
    const afterStabs = run({ type: 'open' }, { type: 'fill' }, { type: 'fill' }, { type: 'dampener' });
    const v = partVisibility(afterStabs, 'exploded', counts);
    expect(count(v.stabilizers)).toBe(STABILIZER_COUNT);
    expect(v.dampener).toBe(true);
    expect(v.plate).toBe(false);
    expect(count(v.switches)).toBe(0);

    const withPlate = buildReducer(afterStabs, { type: 'plate' });
    const one = buildReducer(withPlate, { type: 'switch', index: 3 });
    const sw = partVisibility(one, 'exploded', counts);
    expect(count(sw.switches)).toBe(1);
    expect(sw.switches[3]).toBe(true);
    expect(sw.tray || sw.frame).toBe(false);
    const full = buildReducer(withPlate, { type: 'fill' });
    expect(count(partVisibility(full, 'exploded', counts).switches)).toBe(KEY_COUNT);
  });

  it('shows the same built parts in both views and never previews the next component', () => {
    const s = run({ type: 'open' }, { type: 'fill' }, { type: 'fill' }, { type: 'dampener' }, { type: 'plate' }, { type: 'fill' });
    const [build, exploded] = both(s);
    expect(build.tray).toBe(false);
    expect(build.frame).toBe(false);
    expect(build.pendingBottom).toBe(true);
    expect(exploded.pendingBottom).toBe(false);
    expect({ ...build, pendingBottom: false }).toEqual(exploded);
    expect(exploded.tray).toBe(false);
  });

  it('shows everything when complete, and nothing after start over', () => {
    let s = run({ type: 'open' }, { type: 'fill' });
    for (let i = 0; i < 12; i++) {
      s = buildReducer(s, { type: 'fill' });
      s = buildReducer(s, { type: 'dampener' });
      s = buildReducer(s, { type: 'plate' });
      s = buildReducer(s, { type: 'bottom' });
      s = buildReducer(s, { type: 'top' });
    }
    const v = partVisibility(s, 'exploded', counts);
    expect([v.pcb, v.dampener, v.plate, v.tray, v.frame]).toEqual([true, true, true, true, true]);
    expect(count(v.switches) + count(v.caps) + count(v.screws) + count(v.stabilizers)).toBe(KEY_COUNT * 2 + SCREW_COUNT + STABILIZER_COUNT);
    const reset = partVisibility(initialState, 'exploded', counts);
    expect(reset.pcb || reset.tray || count(reset.caps) > 0).toBe(false);
  });
});
