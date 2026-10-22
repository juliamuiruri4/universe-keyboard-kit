import { currentStep, type BuildState } from '../keyboard';

export type SceneView = 'build' | 'exploded';

export interface PartVisibility {
  pcb: boolean;
  switches: boolean[];
  caps: boolean[];
  stabilizers: boolean[];
  screws: boolean[];
  dampener: boolean;
  plate: boolean;
  tray: boolean;
  frame: boolean;
  /** Assembled view only: the housing base is lifted aside while awaiting its add action. */
  pendingBottom: boolean;
}

/** Which parts exist in the scene. Both views share this build state. Components appear only after their own add action, never as a preview. */
export function partVisibility(s: BuildState, view: SceneView, counts: { keys: number; stabs: number; screws: number }): PartVisibility {
  const stage = currentStep(s);
  const build = view === 'build';
  const has = (list: number[], n: number) => Array.from({ length: n }, (_, i) => list.includes(i));
  return {
    pcb: stage > 0,
    switches: has(s.switches, counts.keys),
    caps: has(s.caps, counts.keys),
    stabilizers: has(s.stabilizers, counts.stabs),
    screws: has(s.screws, counts.screws),
    dampener: s.dampener,
    plate: s.plate,
    tray: s.bottom,
    frame: s.top,
    pendingBottom: build && stage === 3 && !s.bottom,
  };
}
