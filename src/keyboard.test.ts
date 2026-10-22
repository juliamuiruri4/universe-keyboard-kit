import { describe, expect, it } from 'vitest';
import {
  buildReducer, currentStep, initialState, keycapOptions, keys, KEY_COUNT, parseBuild, primaryAction, progressCount, restoreBuild, SCREW_COUNT,
  secondaryAction, STABILIZER_COUNT, STORAGE_KEY, takeOutLabel, UNBOX_COUNT, unboxParts, type BuildAction, type BuildState,
} from './keyboard';
import { bumperPositions, stabilizers } from './layout';
import { galleryPhotos } from './gallery';
import { partVisibility } from './scene/visibility';

const run = (actions: BuildAction[], from: BuildState = initialState) => actions.reduce(buildReducer, from);
const finished = (): BuildState => run([
  { type: 'open' }, { type: 'fill' }, { type: 'fill' }, { type: 'dampener' }, { type: 'plate' }, { type: 'fill' },
  { type: 'bottom' }, { type: 'top' }, { type: 'fill' }, { type: 'fill' },
]);

describe('layout', () => {
  it('matches the verified hardware counts', () => {
    expect(KEY_COUNT).toBe(66);
    expect(STABILIZER_COUNT).toBe(3);
    expect(stabilizers.map((s) => s.keyCode).sort()).toEqual(['Enter', 'ShiftLeft', 'Space']);
    expect(SCREW_COUNT).toBe(4);
    expect(bumperPositions).toHaveLength(8);
  });

  it('has unique key codes, short Backspace and no Meta key', () => {
    const codes = keys.map((k) => k.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(keys.find((k) => k.code === 'Backspace')?.width).toBe(1);
    expect(codes).not.toContain('MetaLeft');
  });

  it('offers only the keycap options stated in the video', () => {
    expect(keycapOptions.map((o) => o.id)).toEqual(['dark', 'light']);
  });
});

describe('build reducer', () => {
  it('enforces the assembly order', () => {
    expect(buildReducer(initialState, { type: 'fill' })).toBe(initialState);
    expect(buildReducer(initialState, { type: 'plate' })).toBe(initialState);
    const opened = run([{ type: 'open' }]);
    expect(buildReducer(opened, { type: 'dampener' })).toBe(opened);
    expect(buildReducer(opened, { type: 'cap', index: 0 })).toBe(opened);
    expect(buildReducer(opened, { type: 'stabilizer', index: 0 })).toBe(opened);
  });

  it('unpacks the box in order before assembly starts', () => {
    expect(unboxParts.map((p) => p.id)).toEqual([
      'housing', 'white-box', 'pcb', 'dampener', 'stabilizers', 'switches', 'keycaps', 'screws',
    ]);
    expect(buildReducer(initialState, { type: 'unpack' })).toBe(initialState);
    expect(primaryAction(initialState)?.label).toBe('Open box');
    expect(secondaryAction(initialState)).toBeNull();
    const opened = run([{ type: 'open' }]);
    expect(buildReducer(opened, { type: 'open' })).toBe(opened);
    expect(primaryAction(opened)?.label).toBe('Take out housing and plate');
    expect(takeOutLabel('PCB')).toBe('Take out PCB');
    expect(secondaryAction(opened)?.label).toBe('Take out all');
    const two = run([{ type: 'unpack' }, { type: 'unpack' }], opened);
    expect(two.unboxed).toBe(2);
    expect(currentStep(two)).toBe(0);
    expect(progressCount(two)).toEqual({ done: 2, total: UNBOX_COUNT, noun: 'parts' });
    const all = buildReducer(two, { type: 'fill' });
    expect(all.unboxed).toBe(UNBOX_COUNT);
    expect(currentStep(all)).toBe(1);
    expect(buildReducer(all, { type: 'unpack' })).toBe(all);
  });

  it('seats single parts without duplicates or out-of-range indices', () => {
    const s = run([{ type: 'open' }, { type: 'fill' }, { type: 'stabilizer', index: 0 }, { type: 'stabilizer', index: 0 }]);
    expect(s.stabilizers).toEqual([0]);
    expect(buildReducer(s, { type: 'stabilizer', index: 3 })).toBe(s);
    expect(buildReducer(s, { type: 'stabilizer', index: -1 })).toBe(s);
  });

  it('walks every step to the key tester', () => {
    const stages: number[] = [];
    let s = initialState;
    for (let guard = 0; guard < 20 && primaryAction(s); guard += 1) {
      stages.push(currentStep(s));
      s = buildReducer(s, primaryAction(s)!.action);
    }
    expect(stages).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 3, 3, 4, 5]);
    expect(currentStep(s)).toBe(6);
    expect(s).toEqual(finished());
  });

  it('reports progress for counted steps only', () => {
    expect(progressCount(initialState)).toBeNull();
    const s = run([{ type: 'open' }, { type: 'fill' }, { type: 'stabilizer', index: 1 }]);
    expect(progressCount(s)).toEqual({ done: 1, total: 3, noun: 'stabilizers' });
  });

  it('changes keycaps at any time without touching progress', () => {
    const s = buildReducer(finished(), { type: 'keycaps', value: 'light' });
    expect(s.keycaps).toBe('light');
    expect(currentStep(s)).toBe(6);
  });
});

describe('saved builds', () => {
  it('round-trips a finished build', () => {
    expect(parseBuild(JSON.stringify(finished()))).toEqual(finished());
  });

  it('rejects out-of-order and invalid saves', () => {
    expect(() => parseBuild(JSON.stringify({ ...initialState, plate: true }))).toThrow();
    expect(() => parseBuild(JSON.stringify({ ...initialState, opened: true, stabilizers: [0, 0] }))).toThrow();
    expect(() => parseBuild(JSON.stringify({ ...initialState, opened: true, unboxed: 3, stabilizers: [0] }))).toThrow();
    expect(() => parseBuild(JSON.stringify({ ...initialState, unboxed: 2 }))).toThrow();
    expect(() => parseBuild(JSON.stringify({ ...initialState, opened: true, unboxed: 9 }))).toThrow();
    expect(() => parseBuild('null')).toThrow();
  });

  it('starts fresh when nothing is saved', () => {
    expect(restoreBuild(() => null)).toEqual({ state: initialState, notice: '', blocked: false });
  });

  it('blocks saving and explains a corrupt save instead of throwing', () => {
    const r = restoreBuild((key) => (key === STORAGE_KEY ? '{nope' : null));
    expect(r.state).toEqual(initialState);
    expect(r.blocked).toBe(true);
    expect(r.notice).toMatch(/Start over/);
  });

});

describe('gallery', () => {
  it('keeps all 34 photos with unique ids and alt text', () => {
    expect(galleryPhotos).toHaveLength(34);
    expect(new Set(galleryPhotos.map((p) => p.id)).size).toBe(34);
    expect(galleryPhotos.every((p) => p.alt.length > 10)).toBe(true);
  });
});

describe('component visibility at transition boundaries', () => {
  const vis = (s: BuildState, view: 'build' | 'exploded' = 'build') => {
    const v = partVisibility(s, view, { keys: KEY_COUNT, stabs: STABILIZER_COUNT, screws: SCREW_COUNT });
    return { damper: v.dampener, plate: v.plate, bottom: v.tray, top: v.frame };
  };
  const none = { damper: false, plate: false, bottom: false, top: false };
  const afterStabs = run([{ type: 'open' }, { type: 'fill' }, { type: 'fill' }]);

  it('does not preview the dampener after stabilizers finish', () => {
    expect(vis(afterStabs)).toEqual(none);
    expect(vis(afterStabs, 'exploded')).toEqual(none);
  });
  it('shows only the dampener after it is added, not the plate', () => {
    expect(vis(run([{ type: 'dampener' }], afterStabs))).toEqual({ ...none, damper: true });
  });
  it('keeps the bottom housing absent after Seat all', () => {
    const seated = run([{ type: 'dampener' }, { type: 'plate' }, { type: 'fill' }], afterStabs);
    expect(currentStep(seated)).toBe(3);
    expect(vis(seated)).toEqual({ ...none, damper: true, plate: true });
    expect(vis(seated, 'exploded')).toEqual({ ...none, damper: true, plate: true });
  });
  it('introduces bottom and top only via their add actions', () => {
    const seated = run([{ type: 'dampener' }, { type: 'plate' }, { type: 'fill' }], afterStabs);
    const bottom = run([{ type: 'bottom' }], seated);
    expect(vis(bottom)).toEqual({ damper: true, plate: true, bottom: true, top: false });
    expect(vis(run([{ type: 'top' }], bottom)).top).toBe(true);
  });
  it('exploded view of an empty build is empty; finished builds show everything', () => {
    expect(vis(initialState, 'exploded')).toEqual(none);
    const all = { damper: true, plate: true, bottom: true, top: true };
    expect(vis(finished())).toEqual(all);
    expect(vis(finished(), 'exploded')).toEqual(all);
  });
});
