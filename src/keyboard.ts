import { keys, KEY_COUNT, SCREW_COUNT, STABILIZER_COUNT } from './layout';

export { keys, KEY_COUNT, SCREW_COUNT, STABILIZER_COUNT };
export const VIDEO_ID = 'q3Jod8Xu8BY';
export const STORAGE_KEY = 'universe-keyboard-lab:v2';

/**
 * The walkthrough states one keycap choice: the kit ships with light or dark keycaps.
 * Housing, plate and accent keys are shown as photographed or demonstrated, not as options.
 */
export const keycapOptions = [
  { id: 'dark', name: 'Dark', cap: '#6b6665', capSide: '#464241', ink: '#0d0d0d' },
  { id: 'light', name: 'Light', cap: '#d8d4cf', capSide: '#a9a49f', ink: '#16181a' },
] as const;

export type KeycapId = typeof keycapOptions[number]['id'];

/** Box contents in the order the walkthrough takes them out. */
export const unboxParts = [
  { id: 'housing', name: 'Housing and plate' },
  { id: 'white-box', name: 'White box' },
  { id: 'pcb', name: 'PCB' },
  { id: 'dampener', name: 'Dampener and strips' },
  { id: 'stabilizers', name: 'Stabilizers' },
  { id: 'switches', name: 'Switches' },
  { id: 'keycaps', name: 'Keycaps' },
  { id: 'screws', name: 'Screws' },
] as const;
export const UNBOX_COUNT = unboxParts.length;

export interface BuildState {
  opened: boolean;
  unboxed: number;
  stabilizers: number[];
  dampener: boolean;
  plate: boolean;
  switches: number[];
  bottom: boolean;
  top: boolean;
  screws: number[];
  caps: number[];
  keycaps: KeycapId;
}

export const initialState: BuildState = {
  opened: false, unboxed: 0, stabilizers: [], dampener: false, plate: false, switches: [],
  bottom: false, top: false, screws: [], caps: [], keycaps: 'dark',
};

export interface StepInfo {
  name: string;
  instruction: string;
  guide: string;
}

export const steps: readonly StepInfo[] = [
  { name: 'Open your kit', instruction: 'Open the box and take out each part.', guide: 'Housing, plate, white box, PCB, dampener, stabilizers, switches, keycaps and screws.' },
  { name: 'Stabilizers', instruction: 'Seat the three stabilizers.', guide: 'Spacebar, Enter and left Shift get stabilizers. Backspace is short, so it needs none.' },
  { name: 'Switches', instruction: 'Add the dampener and plate, then seat the switches.', guide: 'Dampener first, then plate, then a switch in every socket.' },
  { name: 'Housing', instruction: 'Fit the bottom housing, then the top.', guide: 'The bottom housing is red and the top is clear.' },
  { name: 'Screws', instruction: 'Tighten the four case screws.', guide: 'Four screws close the case. Snug is enough.' },
  { name: 'Keycaps', instruction: 'Add a keycap to each switch.', guide: 'Light or dark keycaps. The blue accent keys come with the kit.' },
];

export function currentStep(s: BuildState): number {
  if (!s.opened || s.unboxed < UNBOX_COUNT) return 0;
  if (s.stabilizers.length < STABILIZER_COUNT) return 1;
  if (!s.dampener || !s.plate || s.switches.length < KEY_COUNT) return 2;
  if (!s.bottom || !s.top) return 3;
  if (s.screws.length < SCREW_COUNT) return 4;
  if (s.caps.length < KEY_COUNT) return 5;
  return 6;
}

export type BuildAction =
  | { type: 'open' | 'unpack' | 'dampener' | 'plate' | 'bottom' | 'top' | 'fill' }
  | { type: 'stabilizer' | 'switch' | 'screw' | 'cap'; index: number }
  | { type: 'keycaps'; value: KeycapId };

export interface PrimaryAction { label: string; action: BuildAction }

export const takeOutLabel = (name: string) => `Take out ${name.replace(/^([A-Z])([a-z])/, (_, a: string, b: string) => a.toLowerCase() + b)}`;

export function primaryAction(s: BuildState): PrimaryAction | null {
  switch (currentStep(s)) {
    case 0: return s.opened
      ? { label: takeOutLabel(unboxParts[s.unboxed].name), action: { type: 'unpack' } }
      : { label: 'Open box', action: { type: 'open' } };
    case 1: return { label: 'Seat all', action: { type: 'fill' } };
    case 2:
      if (!s.dampener) return { label: 'Add dampener', action: { type: 'dampener' } };
      if (!s.plate) return { label: 'Add plate', action: { type: 'plate' } };
      return { label: 'Seat all', action: { type: 'fill' } };
    case 3: return !s.bottom
      ? { label: 'Add bottom housing', action: { type: 'bottom' } }
      : { label: 'Add top housing', action: { type: 'top' } };
    case 4: return { label: 'Tighten all', action: { type: 'fill' } };
    case 5: return { label: 'Add all keycaps', action: { type: 'fill' } };
    default: return null;
  }
}

export function secondaryAction(s: BuildState): PrimaryAction | null {
  return currentStep(s) === 0 && s.opened ? { label: 'Take out all', action: { type: 'fill' } } : null;
}

/** Progress counter for the current step, or null for single-action steps. */
export function progressCount(s: BuildState): { done: number; total: number; noun: string } | null {
  switch (currentStep(s)) {
    case 0: return s.opened ? { done: s.unboxed, total: UNBOX_COUNT, noun: 'parts' } : null;
    case 1: return { done: s.stabilizers.length, total: STABILIZER_COUNT, noun: 'stabilizers' };
    case 2: return s.plate ? { done: s.switches.length, total: KEY_COUNT, noun: 'switches' } : null;
    case 4: return { done: s.screws.length, total: SCREW_COUNT, noun: 'screws' };
    case 5: return { done: s.caps.length, total: KEY_COUNT, noun: 'keycaps' };
    default: return null;
  }
}

const add = (items: number[], index: number, limit: number) =>
  Number.isInteger(index) && index >= 0 && index < limit && !items.includes(index)
    ? [...items, index] : items;
const put = (s: BuildState, key: 'stabilizers' | 'switches' | 'screws' | 'caps', index: number, limit: number): BuildState => {
  const next = add(s[key], index, limit);
  return next === s[key] ? s : { ...s, [key]: next };
};
const all = (n: number) => Array.from({ length: n }, (_, i) => i);

export function buildReducer(s: BuildState, a: BuildAction): BuildState {
  const stage = currentStep(s);
  switch (a.type) {
    case 'open': return stage === 0 && !s.opened ? { ...s, opened: true } : s;
    case 'unpack': return stage === 0 && s.opened ? { ...s, unboxed: s.unboxed + 1 } : s;
    case 'stabilizer': return stage === 1 ? put(s, 'stabilizers', a.index, STABILIZER_COUNT) : s;
    case 'dampener': return stage === 2 && !s.dampener ? { ...s, dampener: true } : s;
    case 'plate': return stage === 2 && s.dampener && !s.plate ? { ...s, plate: true } : s;
    case 'switch': return stage === 2 && s.plate ? put(s, 'switches', a.index, KEY_COUNT) : s;
    case 'bottom': return stage === 3 && !s.bottom ? { ...s, bottom: true } : s;
    case 'top': return stage === 3 && s.bottom ? { ...s, top: true } : s;
    case 'screw': return stage === 4 ? put(s, 'screws', a.index, SCREW_COUNT) : s;
    case 'cap': return stage === 5 ? put(s, 'caps', a.index, KEY_COUNT) : s;
    case 'fill':
      if (stage === 0 && s.opened) return { ...s, unboxed: UNBOX_COUNT };
      if (stage === 1) return { ...s, stabilizers: all(STABILIZER_COUNT) };
      if (stage === 2 && s.plate) return { ...s, switches: all(KEY_COUNT) };
      if (stage === 4) return { ...s, screws: all(SCREW_COUNT) };
      if (stage === 5) return { ...s, caps: all(KEY_COUNT) };
      return s;
    case 'keycaps': return s.keycaps === a.value ? s : { ...s, keycaps: a.value };
  }
}

function validIndices(value: unknown, limit: number): value is number[] {
  return Array.isArray(value) && value.length <= limit &&
    value.every((n) => Number.isInteger(n) && n >= 0 && n < limit) &&
    new Set(value).size === value.length;
}

export function parseBuild(raw: string): BuildState {
  const s: unknown = JSON.parse(raw);
  if (!s || typeof s !== 'object') throw new Error('Saved build is not an object.');
  const b = s as Record<string, unknown>;
  if (typeof b.opened !== 'boolean' || typeof b.dampener !== 'boolean' ||
      typeof b.plate !== 'boolean' || typeof b.bottom !== 'boolean' ||
      typeof b.top !== 'boolean') throw new Error('Saved build contains an invalid setting.');
  if (!validIndices(b.stabilizers, STABILIZER_COUNT) || !validIndices(b.switches, KEY_COUNT) ||
      !validIndices(b.screws, SCREW_COUNT) || !validIndices(b.caps, KEY_COUNT)) {
    throw new Error('Saved build contains invalid parts.');
  }
  const keycaps = keycapOptions.find((c) => c.id === b.keycaps)?.id;
  if (!keycaps) throw new Error('Saved keycap color is not available.');
  const unboxed = b.unboxed;
  if (!Number.isInteger(unboxed) || (unboxed as number) < 0 || (unboxed as number) > UNBOX_COUNT ||
      (!b.opened && unboxed !== 0)) throw new Error('Saved build has an invalid unboxing count.');
  const state: BuildState = {
    opened: b.opened, unboxed: unboxed as number, dampener: b.dampener, plate: b.plate, bottom: b.bottom, top: b.top,
    keycaps, stabilizers: b.stabilizers, switches: b.switches, screws: b.screws, caps: b.caps,
  };
  if (
    (state.unboxed < UNBOX_COUNT && state.stabilizers.length > 0) ||
    (state.stabilizers.length < STABILIZER_COUNT && state.dampener) ||
    (!state.dampener && state.plate) ||
    (!state.plate && state.switches.length > 0) ||
    (state.switches.length < KEY_COUNT && state.bottom) ||
    (!state.bottom && state.top) ||
    (!state.top && state.screws.length > 0) ||
    (state.screws.length < SCREW_COUNT && state.caps.length > 0)
  ) throw new Error('Saved build has parts assembled out of order.');
  return state;
}

export interface RestoredBuild { state: BuildState; notice: string; blocked: boolean }

/** Restores the saved build. Never throws. */
export function restoreBuild(read: (key: string) => string | null): RestoredBuild {
  try {
    const saved = read(STORAGE_KEY);
    return { state: saved ? parseBuild(saved) : initialState, notice: '', blocked: false };
  } catch (error) {
    console.error('Could not restore the keyboard build:', error);
    return { state: initialState, notice: 'Your saved build could not be restored. Start over to replace it.', blocked: true };
  }
}
