export type IconId =
  | 'github' | 'omnitype' | 'duck' | 'checker' | 'prompt' | 'up' | 'down' | 'left' | 'right';

export type Legend =
  | { kind: 'alpha'; text: string }
  | { kind: 'dual'; top: string; bottom: string }
  | { kind: 'label'; text: string; corner?: string }
  | { kind: 'icon'; icon: IconId }
  | { kind: 'novelty'; text: string }
  | { kind: 'blank' };

export interface KeySpec {
  id: string;
  code: string;
  name: string;
  /** Left edge in key units, measured on photo R0002895. */
  x: number;
  row: number;
  width: number;
  legend: Legend;
  tone: 'base' | 'accent';
  stabilizer?: number;
}

export interface StabilizerSpec {
  name: string;
  keyCode: string;
  /** Distance of each housing from the key centre, in key units. */
  spread: number;
}

const k = (
  code: string, name: string, x: number, row: number, width: number, legend: Legend,
  tone: 'base' | 'accent' = 'base',
): KeySpec => ({ id: code, code, name, x, row, width, legend, tone });

const alpha = (letter: string, x: number, row: number) =>
  k(`Key${letter}`, letter, x, row, 1, { kind: 'alpha', text: letter });
const dual = (code: string, name: string, x: number, row: number, top: string, bottom: string) =>
  k(code, name, x, row, 1, { kind: 'dual', top, bottom });

const digits = '1234567890'.split('');
const digitShift = '!@#$%^&*()'.split('');

const row0: KeySpec[] = [
  k('Escape', 'Esc', 0, 0, 1, { kind: 'icon', icon: 'github' }, 'accent'),
  ...digits.map((d, i) => dual(`Digit${d}`, d, i + 1, 0, digitShift[i], d)),
  dual('Minus', '-', 11, 0, '_', '-'),
  dual('Equal', '=', 12, 0, '+', '='),
  dual('Backquote', '`', 13, 0, '~', '`'),
  k('Backspace', 'GitHub icon', 14, 0, 1, { kind: 'icon', icon: 'github' }),
  k('Delete', 'Omnitype icon', 15, 0, 1, { kind: 'icon', icon: 'omnitype' }, 'accent'),
];

const row1: KeySpec[] = [
  k('Tab', 'Tab', 0, 1, 1.5, { kind: 'label', text: 'Tab' }),
  ...'QWERTYUIOP'.split('').map((c, i) => alpha(c, 1.5 + i, 1)),
  dual('BracketLeft', '[', 11.5, 1, '{', '['),
  dual('BracketRight', ']', 12.5, 1, '}', ']'),
  k('Backslash', '\\', 13.5, 1, 1.5, { kind: 'dual', top: '|', bottom: '\\' }),
  k('PageUp', 'Duck icon', 15, 1, 1, { kind: 'icon', icon: 'duck' }),
];

const row2: KeySpec[] = [
  k('CapsLock', 'Caps', 0, 2, 1.75, { kind: 'label', text: 'Caps' }),
  ...'ASDFGHJKL'.split('').map((c, i) => alpha(c, 1.75 + i, 2)),
  dual('Semicolon', ';', 10.75, 2, ':', ';'),
  dual('Quote', "'", 11.75, 2, '"', "'"),
  { ...k('Enter', 'Enter', 12.75, 2, 2.25, { kind: 'novelty', text: 'UNIVERSE’26' }, 'accent'), stabilizer: 1 },
  k('PageDown', 'Checker icon', 15, 2, 1, { kind: 'icon', icon: 'checker' }),
];

const row3: KeySpec[] = [
  { ...k('ShiftLeft', 'Left Shift', 0, 3, 2.25, { kind: 'label', text: 'Shift' }), stabilizer: 0 },
  ...'ZXCVBNM'.split('').map((c, i) => alpha(c, 2.25 + i, 3)),
  dual('Comma', ',', 9.25, 3, '<', ','),
  dual('Period', '.', 10.25, 3, '>', '.'),
  dual('Slash', '/', 11.25, 3, '?', '/'),
  k('ShiftRight', 'Right Shift', 12.25, 3, 1.75, { kind: 'label', text: 'Shift' }),
  k('ArrowUp', 'Up', 14, 3, 1, { kind: 'icon', icon: 'up' }),
  k('End', 'Prompt icon', 15, 3, 1, { kind: 'icon', icon: 'prompt' }),
];

const row4: KeySpec[] = [
  k('ControlLeft', 'Control', 0, 4, 1.5, { kind: 'label', text: 'Control', corner: '^' }),
  k('AltLeft', 'Alt', 2.375, 4, 1.4, { kind: 'label', text: 'Alt', corner: '⌥' }),
  { ...k('Space', 'Space', 3.9, 4, 6.85, { kind: 'blank' }), stabilizer: 2 },
  k('Fn', 'Function', 10.85, 4, 1.35, { kind: 'label', text: 'Function' }),
  k('ArrowLeft', 'Left', 13, 4, 1, { kind: 'icon', icon: 'left' }),
  k('ArrowDown', 'Down', 14, 4, 1, { kind: 'icon', icon: 'down' }),
  k('ArrowRight', 'Right', 15, 4, 1, { kind: 'icon', icon: 'right' }),
];

export const rows: KeySpec[][] = [row0, row1, row2, row3, row4];
export const keys: KeySpec[] = rows.flat();
export const KEY_COUNT = keys.length;

export const stabilizers: StabilizerSpec[] = [
  { name: 'Left Shift', keyCode: 'ShiftLeft', spread: 0.625 },
  { name: 'Enter', keyCode: 'Enter', spread: 0.625 },
  { name: 'Space', keyCode: 'Space', spread: 2.62 },
];
export const STABILIZER_COUNT = stabilizers.length;

/** Corner case screws, in key units (x, z). The kit uses four. */
export const screwPositions: ReadonlyArray<readonly [number, number]> = [
  [-0.45, -0.62], [16.45, -0.62], [-0.45, 5.47], [16.45, 5.47],
];

/** Donut bumpers seen as red dots on the photographed board: six along the back, two at the front. */
export const bumperPositions: ReadonlyArray<readonly [number, number]> = [
  [1.4, -0.55], [4.1, -0.55], [6.6, -0.55], [9.3, -0.55], [11.9, -0.55], [14.4, -0.55],
  [2.0, 5.3], [12.6, 5.3],
];
export const SCREW_COUNT = screwPositions.length;

/** Housing outline: 331.7 × 124.8 mm (Omnitype Bauer Lite spec) at 19.05 mm per key unit. */
export const UNIT_MM = 19.05;
export const bounds = { minX: -0.705, maxX: 16.705, minZ: -0.85, maxZ: 5.7 };
export const TILT_DEG = 5;
export const centre = { x: 8, z: 2.425 };

export const keyCentre = (key: KeySpec) => ({
  x: key.x + key.width / 2 - centre.x,
  z: key.row + 0.5 - centre.z,
});

export const LAYER_LABELS: ReadonlyArray<{ id: string; text: string }> = [
  { id: 'screws', text: 'Screws' },
  { id: 'caps', text: 'Keycaps' },
  { id: 'frame', text: 'Top housing' },
  { id: 'switches', text: 'Switches' },
  { id: 'stabs', text: 'Stabilizers' },
  { id: 'plate', text: 'Plate' },
  { id: 'damper', text: 'Dampener' },
  { id: 'pcb', text: 'PCB' },
  { id: 'tray', text: 'Bottom housing' },
];
