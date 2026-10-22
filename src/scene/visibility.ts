import type { BuildState } from '../keyboard';

export interface PartVisibility { damper: boolean; plate: boolean; bottom: boolean; top: boolean }

/** Components appear only once their own add action has run; never as a preview of the next step. */
export function partVisibility(s: BuildState, showAll: boolean): PartVisibility {
  return {
    damper: showAll || s.dampener,
    plate: showAll || s.plate,
    bottom: showAll || s.bottom,
    top: showAll || s.top,
  };
}
