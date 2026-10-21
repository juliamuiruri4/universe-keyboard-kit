import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bounds, centre, keys, keyCentre, stabilizers } from '../layout';
import { drawOmnitypeMark } from '../legends';

export const gx = (x: number) => x - centre.x;
export const gz = (z: number) => z - centre.z;

/** Heights in key units, measured from the bottom of the housing. */
export const Y = {
  trayFloor: 0.08,
  trayTop: 0.5,
  frameTop: 1.0,
  slab: 0.9,
  pcb: 0.16,
  pcbTop: 0.25,
  damper: 0.38,
  plate: 0.46,
  plateTop: 0.54,
  capBase: 1.02,
  press: 0.17,
} as const;

export const HOUSING = {
  w: bounds.maxX - bounds.minX,
  d: bounds.maxZ - bounds.minZ,
  radius: 0.5,
};

/** Rounded rectangle in the XY plane. After rotateX(-90°) shape y maps to world -z. */
export function roundedRect(cx: number, cz: number, w: number, d: number, r: number): THREE.Shape;
export function roundedRect(cx: number, cz: number, w: number, d: number, r: number, target: THREE.Path): THREE.Path;
export function roundedRect(cx: number, cz: number, w: number, d: number, r: number, target: THREE.Path = new THREE.Shape()): THREE.Path {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = -cz - d / 2;
  const y1 = -cz + d / 2;
  const rr = Math.min(r, w / 2, d / 2);
  target.moveTo(x0 + rr, y0);
  target.lineTo(x1 - rr, y0);
  target.absarc(x1 - rr, y0 + rr, rr, -Math.PI / 2, 0, false);
  target.lineTo(x1, y1 - rr);
  target.absarc(x1 - rr, y1 - rr, rr, 0, Math.PI / 2, false);
  target.lineTo(x0 + rr, y1);
  target.absarc(x0 + rr, y1 - rr, rr, Math.PI / 2, Math.PI, false);
  target.lineTo(x0, y0 + rr);
  target.absarc(x0 + rr, y0 + rr, rr, Math.PI, Math.PI * 1.5, false);
  return target;
}

export function extrude(shape: THREE.Shape, height: number, bevel = 0): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, height - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geometry.rotateX(-Math.PI / 2);
  if (bevel > 0) geometry.translate(0, bevel, 0);
  return geometry;
}

export function ring(
  outer: { w: number; d: number; r: number; cx?: number; cz?: number },
  inner: { w: number; d: number; r: number; cx?: number; cz?: number },
  height: number, bevel = 0,
) {
  const shape = roundedRect(outer.cx ?? 0, outer.cz ?? 0, outer.w, outer.d, outer.r);
  shape.holes.push(roundedRect(inner.cx ?? 0, inner.cz ?? 0, inner.w, inner.d, inner.r, new THREE.Path()));
  return extrude(shape, height, bevel);
}

/** Key opening in the top housing, in housing-local coordinates. */
export const opening = {
  w: 16 + 0.28,
  d: 5 + 0.28,
  r: 0.14,
  cx: gx(8),
  cz: gz(2.5),
};

export function trayGeometry() {
  const shell = ring(
    { w: HOUSING.w, d: HOUSING.d, r: HOUSING.radius },
    { w: HOUSING.w - 0.44, d: HOUSING.d - 0.44, r: HOUSING.radius - 0.2 },
    Y.trayTop, 0.025,
  );
  const floor = extrude(roundedRect(0, 0, HOUSING.w - 0.02, HOUSING.d - 0.02, HOUSING.radius), Y.trayFloor, 0.02);
  return mergeGeometries([shell, floor])!;
}

export function frameGeometries() {
  const outer = { w: HOUSING.w, d: HOUSING.d, r: HOUSING.radius };
  const wall = ring(outer, { w: HOUSING.w - 0.44, d: HOUSING.d - 0.44, r: HOUSING.radius - 0.2 }, Y.frameTop - Y.trayTop, 0.025);
  wall.translate(0, Y.trayTop, 0);
  const slab = ring(outer, opening, Y.frameTop - Y.slab, 0.02);
  slab.translate(0, Y.slab, 0);
  const lip = ring(
    opening, { ...opening, w: opening.w - 0.16, d: opening.d - 0.16, r: 0.08 },
    Y.slab - 0.7, 0.01,
  );
  lip.translate(0, 0.7, 0);
  return mergeGeometries([wall, slab, lip])!;
}

export function plateGeometry() {
  const width = 16.7;
  const depth = 5.7;
  const shape = roundedRect(gx(8), gz(2.5), width, depth, 0.25);
  for (const key of keys) {
    const c = keyCentre(key);
    shape.holes.push(roundedRect(c.x, c.z, 0.72, 0.72, 0.03, new THREE.Path()));
  }
  for (const stab of stabilizers) {
    const key = keys.find((k) => k.code === stab.keyCode)!;
    const c = keyCentre(key);
    for (const side of [-1, 1]) {
      shape.holes.push(roundedRect(c.x + side * stab.spread, c.z + 0.06, 0.34, 0.8, 0.03, new THREE.Path()));
    }
  }
  return extrude(shape, Y.plateTop - Y.plate, 0.012);
}

export function damperGeometry() {
  const shape = roundedRect(gx(8), gz(2.5), 16.5, 5.5, 0.2);
  for (const key of keys) {
    const c = keyCentre(key);
    shape.holes.push(roundedRect(c.x, c.z, 0.78, 0.78, 0.04, new THREE.Path()));
  }
  for (const stab of stabilizers) {
    const key = keys.find((k) => k.code === stab.keyCode)!;
    const c = keyCentre(key);
    for (const side of [-1, 1]) {
      shape.holes.push(roundedRect(c.x + side * stab.spread, c.z + 0.06, 0.4, 0.86, 0.04, new THREE.Path()));
    }
  }
  return extrude(shape, 0.07);
}

export function switchGeometries() {
  const lower = new THREE.BoxGeometry(0.7, 0.31, 0.7);
  lower.translate(0, Y.pcbTop + 0.155, 0);
  const upper = new THREE.BoxGeometry(0.6, 0.24, 0.6);
  upper.translate(0, Y.pcbTop + 0.31 + 0.12, 0);
  const tabs = new THREE.BoxGeometry(0.72, 0.05, 0.2);
  tabs.translate(0, Y.pcbTop + 0.31, 0);
  const housing = mergeGeometries([lower, upper, tabs])!;

  const base = new THREE.BoxGeometry(0.3, 0.1, 0.3);
  base.translate(0, 0.78, 0);
  const armA = new THREE.BoxGeometry(0.22, 0.14, 0.075);
  armA.translate(0, 0.9, 0);
  const armB = new THREE.BoxGeometry(0.075, 0.14, 0.22);
  armB.translate(0, 0.9, 0);
  const stem = mergeGeometries([base, armA, armB])!;
  return { housing, stem };
}

export function stabilizerGeometries(spread: number) {
  const housings = [-1, 1].map((side) => {
    const body = new THREE.BoxGeometry(0.3, 0.62, 0.56);
    body.translate(side * spread, Y.pcbTop + 0.31, 0.06);
    return body;
  });
  const wire = new THREE.CylinderGeometry(0.022, 0.022, spread * 2, 8);
  wire.rotateZ(Math.PI / 2);
  wire.translate(0, Y.pcbTop + 0.17, 0.34);
  const hooks = [-1, 1].map((side) => {
    const hook = new THREE.CylinderGeometry(0.022, 0.022, 0.2, 8);
    hook.translate(side * spread, Y.pcbTop + 0.27, 0.34);
    return hook;
  });
  return { housing: mergeGeometries(housings)!, wire: mergeGeometries([wire, ...hooks])! };
}

export function pcbTexture(): THREE.CanvasTexture {
  const S = 80;
  const w = 16.8;
  const d = 5.8;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * S);
  canvas.height = Math.round(d * S);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#12261f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const px = (x: number) => (x - gx(8) + w / 2) * S;
  const pz = (z: number) => (z - gz(2.5) + d / 2) * S;

  ctx.strokeStyle = 'rgba(196,164,92,0.5)';
  ctx.lineWidth = 2;
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 90; i += 1) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() > 0.5 ? 1 : 0) * (20 + rand() * 90), y);
    ctx.lineTo(x + (rand() - 0.5) * 20, y + (rand() > 0.5 ? 1 : -1) * (10 + rand() * 40));
    ctx.stroke();
  }
  for (const key of keys) {
    const c = keyCentre(key);
    const cx = px(c.x);
    const cy = pz(c.z);
    ctx.fillStyle = '#e9e2cf';
    ctx.fillRect(cx - 0.35 * S, cy - 0.5 * S, 0.7 * S, 0.14 * S);
    ctx.fillStyle = '#2a2d2b';
    ctx.fillRect(cx - 0.28 * S, cy + 0.12 * S, 0.56 * S, 0.2 * S);
    ctx.fillStyle = '#c9a85b';
    ctx.beginPath();
    ctx.arc(cx - 0.2 * S, cy - 0.2 * S, 0.1 * S, 0, Math.PI * 2);
    ctx.arc(cx + 0.2 * S, cy - 0.3 * S, 0.1 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(cx + 0.18 * S, cy + 0.36 * S, 0.22 * S, 0.1 * S);
  }
  ctx.fillStyle = '#c9a85b';
  for (const [x, z] of [[-0.3, -0.3], [16.3, -0.3], [-0.3, 5.3], [16.3, 5.3]]) {
    ctx.beginPath();
    ctx.arc(px(x), pz(z), 0.16 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#050807';
    ctx.beginPath();
    ctx.arc(px(x), pz(z), 0.09 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c9a85b';
  }
  ctx.fillStyle = '#b9bdb9';
  ctx.fillRect(px(7.4), pz(-0.38), 1.2 * S, 0.34 * S);
  ctx.fillStyle = 'rgba(240,245,242,0.8)';
  ctx.font = `600 ${0.2 * S}px "Mona Sans", sans-serif`;
  ctx.fillText('CORE PCB', px(2.2), pz(5.45));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function wordmarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(255,236,240,0.92)';
  ctx.strokeStyle = ctx.fillStyle;
  ctx.save();
  ctx.translate(250, 20);
  ctx.scale(8.5, 8.5);
  drawOmnitypeMark(ctx);
  ctx.restore();
  ctx.font = '800 112px "Mona Sans", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('OMNITYPE', 410, 84);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function shadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  for (let i = 0; i < 14; i += 1) {
    const grow = i * 1.5;
    ctx.globalAlpha = 0.045;
    ctx.beginPath();
    ctx.roundRect(120 - grow, 76 - grow, 272 + grow * 2, 104 + grow * 2, 30 + grow);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
