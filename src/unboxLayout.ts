import type { unboxParts } from './keyboard';

export type PartId = (typeof unboxParts)[number]['id'];
export type Pt = readonly [number, number];

/**
 * The stage is the original photograph of the sealed box (R0002874, 1500 x 1000 layout units) plus
 * PAD units of floor added above it, so the lid has headroom when it hinges open. Every coordinate in
 * this file is in those scene units: x runs 0..1500, y runs 0..1250 down from the top of the stage.
 */
export const PAD = 250;
export const SCENE_W = 1500;
export const SCENE_H = 1000 + PAD;
export const SCENE_ASPECT = SCENE_W / SCENE_H;

const at = (x: number, y: number): Pt => [x, y + PAD];

/** The box's top face as photographed: far-left, far-right, near-right and near-left corners. */
export const QUAD = { L: at(232, 449), T: at(966, 58), R: at(1250, 238), B: at(505, 737) } as const;
export const quadPoints = (): Pt[] => [QUAD.L, QUAD.T, QUAD.R, QUAD.B];

/** Convex outline of the whole sealed box (all three visible faces), slightly generous. */
export const BOX_HULL: Pt[] = [
  at(195, 440), at(960, 45), at(1265, 225), at(1265, 440), at(1180, 500), at(540, 960), at(500, 955), at(290, 800), at(195, 630),
];

/**
 * The lid hinges up and back along the far long edge (L to T). Its two near corners swing on the
 * photo's own depth vector (rest position) towards the photo's up vector; the lid keeps its photo pixels.
 */
export const LID_OPEN_DEG = 100;
const UP: Pt = [-0.137, -0.99];
const LID_UP_NEAR = 280;
const LID_UP_FAR = 258;

export const lidQuad = (deg: number): Pt[] => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const swing = (base: Pt, rest: Pt, up: number): Pt => [
    base[0] + c * (rest[0] - base[0]) + s * up * UP[0],
    base[1] + c * (rest[1] - base[1]) + s * up * UP[1],
  ];
  return [QUAD.L, QUAD.T, swing(QUAD.T, QUAD.R, LID_UP_FAR), swing(QUAD.L, QUAD.B, LID_UP_NEAR)];
};

/** True once the lid has swung past edge-on, so the camera sees its plain underside instead of the print. */
export const lidShowsUnderside = (deg: number): boolean => {
  const p = lidQuad(deg);
  let area = 0;
  for (let i = 0; i < p.length; i += 1) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    area += x0 * y1 - x1 * y0;
  }
  return area < 0;
};

/** 3x3 homography (row-major, h33 = 1) that carries the four `src` points onto the four `dst` points. */
export const homography = (src: readonly Pt[], dst: readonly Pt[]): number[] => {
  const m: number[][] = [];
  for (let i = 0; i < 4; i += 1) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    m.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    m.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c += 1) {
    let p = c;
    for (let r = c + 1; r < 8; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < 8; r += 1) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k < 9; k += 1) m[r][k] -= f * m[c][k];
    }
  }
  const h = m.map((row, r) => row[8] / row[r]);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
};

export const applyHomography = (h: readonly number[], [x, y]: Pt): Pt => {
  const w = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
};

/** CSS matrix3d (px, origin 0 0) that lays the sealed lid onto its position at `deg` degrees open. */
export const lidMatrix3d = (deg: number): string => {
  const h = homography(quadPoints(), lidQuad(deg));
  const n = [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, h[8]];
  return `matrix3d(${n.map((v) => +v.toFixed(7)).join(',')})`;
};

export interface PartSlot {
  id: PartId;
  src: string;
  /** Centre of the landed part on the floor, in scene units. */
  x: number;
  y: number;
  /** Sprite width in scene units and its width / height ratio. */
  w: number;
  ratio: number;
  /** Resting rotation in degrees: flat spin, and a slight 3D tilt toward / away from the viewer. */
  rz: number;
  rx: number;
  ry: number;
  /** Where the part lies in the pile inside the open box: centre, sprite width and flat spin. */
  box: { x: number; y: number; w: number; rz: number };
}

/**
 * Fixed landing spots on the floor around the box, each tilted differently. The pile order is the
 * take-out order: the housing lies on top, so the next part is always the one on top.
 */
export const partSlots: readonly PartSlot[] = [
  { id: 'housing', src: 'images/parts/housing.webp', x: 1040, y: 1105, w: 320, ratio: 760 / 456, rz: -6, rx: 14, ry: 8, box: { x: 700, y: 655, w: 560, rz: -26 } },
  { id: 'white-box', src: 'images/parts/white-box.webp', x: 1390, y: 560, w: 190, ratio: 400 / 273, rz: 9, rx: 10, ry: -14, box: { x: 960, y: 520, w: 200, rz: -12 } },
  { id: 'pcb', src: 'images/parts/pcb.webp', x: 140, y: 1130, w: 260, ratio: 520 / 251, rz: -9, rx: 12, ry: 10, box: { x: 585, y: 770, w: 430, rz: -36 } },
  { id: 'dampener', src: 'images/parts/dampener.webp', x: 1330, y: 880, w: 240, ratio: 600 / 309, rz: 4, rx: 14, ry: -9, box: { x: 790, y: 650, w: 330, rz: -20 } },
  { id: 'stabilizers', src: 'images/parts/stabilizers.webp', x: 1200, y: 150, w: 190, ratio: 400 / 226, rz: -7, rx: 8, ry: -10, box: { x: 520, y: 665, w: 170, rz: -46 } },
  { id: 'switches', src: 'images/parts/switches.webp', x: 88, y: 640, w: 164, ratio: 400 / 210, rz: 11, rx: -10, ry: 10, box: { x: 700, y: 590, w: 180, rz: -10 } },
  { id: 'keycaps', src: 'images/parts/keycaps.webp', x: 1370, y: 1100, w: 210, ratio: 440 / 230, rz: -3, rx: 12, ry: 6, box: { x: 600, y: 610, w: 210, rz: -24 } },
  { id: 'screws', src: 'images/parts/screws.webp', x: 1400, y: 300, w: 130, ratio: 300 / 172, rz: 12, rx: 14, ry: -6, box: { x: 790, y: 550, w: 120, rz: -30 } },
];

const rectOf = (x: number, y: number, w: number, ratio: number) => {
  const h = w / ratio;
  return { l: x - w / 2, t: y - h / 2, r: x + w / 2, b: y + h / 2 };
};
export const slotRect = (s: PartSlot) => rectOf(s.x, s.y, s.w, s.ratio);
/** Rectangle of a part while it lies in the pile. */
export const boxRect = (s: PartSlot) => rectOf(s.box.x, s.box.y, s.box.w, s.ratio);

export const rectCorners = (r: { l: number; t: number; r: number; b: number }): Pt[] => [[r.l, r.t], [r.r, r.t], [r.r, r.b], [r.l, r.b]];

/** Separating-axis test for two convex polygons; true when they overlap by more than `gap`. */
export const polygonsOverlap = (a: readonly Pt[], b: readonly Pt[], gap = 0): boolean => {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i += 1) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const nx = q[1] - p[1];
      const ny = p[0] - q[0];
      const len = Math.hypot(nx, ny) || 1;
      const span = (pts: readonly Pt[]) => {
        const d = pts.map(([x, y]) => (x * nx + y * ny) / len);
        return [Math.min(...d), Math.max(...d)] as const;
      };
      const [a0, a1] = span(a);
      const [b0, b1] = span(b);
      if (a1 + gap <= b0 || b1 + gap <= a0) return false;
    }
  }
  return true;
};

export const pointInPolygon = ([x, y]: Pt, poly: readonly Pt[]): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const pct = ([x, y]: Pt) => `${((x / SCENE_W) * 100).toFixed(3)}% ${((y / SCENE_H) * 100).toFixed(3)}%`;
export const polygonCss = (pts: readonly Pt[]) => `polygon(${pts.map(pct).join(', ')})`;

/**
 * A rising part may only show above the box's near rim until it has cleared it; these two polygons
 * (same vertex count, so they animate) are the clip at pick-up and the clip once it is clear.
 */
export const RIM_CLIP = polygonCss([
  [0, 0], [SCENE_W, 0], [SCENE_W, 320 + PAD], QUAD.R, QUAD.B, QUAD.L, [0, 454 + PAD],
]);
export const FREE_CLIP = polygonCss([
  [-300, -300], [SCENE_W + 300, -300], [SCENE_W + 300, 400], [SCENE_W + 300, SCENE_H + 300], [SCENE_W / 2, SCENE_H + 300], [-300, SCENE_H + 300], [-300, 400],
]);
