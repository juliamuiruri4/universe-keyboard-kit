import * as THREE from 'three';

/** Sculpted row profile: height at the top-face centre and the angle the top faces the typist. */
export const rowProfile = [
  { height: 0.74, tilt: 11 },
  { height: 0.68, tilt: 6 },
  { height: 0.64, tilt: 1 },
  { height: 0.66, tilt: -4 },
  { height: 0.7, tilt: -9 },
] as const;

export interface CapShape {
  geometry: THREE.BufferGeometry;
  /** Flat top face size in key units, used to size the legend canvas. */
  topWidth: number;
  topDepth: number;
}

const SEGMENTS = 4;

function roundedRect(hw: number, hd: number, radius: number): Array<[number, number]> {
  const r = Math.min(radius, hw - 0.001, hd - 0.001);
  const corners: Array<[number, number, number]> = [
    [hw - r, hd - r, 0], [-(hw - r), hd - r, Math.PI / 2],
    [-(hw - r), -(hd - r), Math.PI], [hw - r, -(hd - r), Math.PI * 1.5],
  ];
  const points: Array<[number, number]> = [];
  for (const [cx, cz, start] of corners) {
    for (let i = 0; i <= SEGMENTS; i += 1) {
      const a = start + (i / SEGMENTS) * (Math.PI / 2);
      points.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  }
  return points;
}

const cache = new Map<string, CapShape>();

/** Lofted keycap: rounded body, bevel, then a cylindrically dished top face. Group 0 is the body, group 1 the top. */
export function capShape(width: number, row: number): CapShape {
  const id = `${width}:${row}`;
  const hit = cache.get(id);
  if (hit) return hit;

  const { height, tilt } = rowProfile[row];
  const slope = -Math.tan((tilt * Math.PI) / 180);
  const bw = width - 0.055;
  const bd = 0.945;
  const dish = 0.034;
  const rings = [
    { inset: 0, fy: 0, radius: 0.1 },
    { inset: 0.014, fy: 0.55, radius: 0.1 },
    { inset: 0.098, fy: 0.9, radius: 0.09 },
    { inset: 0.15, fy: 1, radius: 0.08 },
  ];
  const topHw = bw / 2 - rings[3].inset;
  const topHd = bd / 2 - rings[3].inset;
  const topY = (x: number, z: number) =>
    height + slope * z - dish * (1 - (x / topHw) ** 2);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const bodyCount = rings.length;
  let perRing = 0;

  rings.forEach((ring, j) => {
    const pts = roundedRect(bw / 2 - ring.inset, bd / 2 - ring.inset, ring.radius);
    perRing = pts.length;
    for (const [x, z] of pts) {
      const y = j === bodyCount - 1 ? topY(x, z) : ring.fy * (height + slope * z);
      positions.push(x, y, z);
      uvs.push(0, 0);
    }
  });
  for (let j = 0; j < bodyCount - 1; j += 1) {
    for (let i = 0; i < perRing; i += 1) {
      const a = j * perRing + i;
      const b = j * perRing + ((i + 1) % perRing);
      indices.push(a, a + perRing, b, b, a + perRing, b + perRing);
    }
  }
  const bodyIndexCount = indices.length;

  const topRings = 6;
  const topStart = positions.length / 3;
  const edge = roundedRect(topHw, topHd, rings[3].radius);
  for (let k = 0; k <= topRings; k += 1) {
    const s = 1 - k / (topRings + 1);
    for (const [ex, ez] of edge) {
      const x = ex * s;
      const z = ez * s;
      positions.push(x, topY(x, z), z);
      uvs.push((x + topHw) / (2 * topHw), 1 - (z + topHd) / (2 * topHd));
    }
  }
  const centreIndex = positions.length / 3;
  positions.push(0, topY(0, 0), 0);
  uvs.push(0.5, 0.5);
  for (let k = 0; k <= topRings; k += 1) {
    for (let i = 0; i < perRing; i += 1) {
      const a = topStart + k * perRing + i;
      const b = topStart + k * perRing + ((i + 1) % perRing);
      if (k < topRings) {
        indices.push(a, a + perRing, b, b, a + perRing, b + perRing);
      } else {
        indices.push(a, centreIndex, b);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.addGroup(0, bodyIndexCount, 0);
  geometry.addGroup(bodyIndexCount, indices.length - bodyIndexCount, 1);
  geometry.computeVertexNormals();

  const shape = { geometry, topWidth: topHw * 2, topDepth: topHd * 2 };
  cache.set(id, shape);
  return shape;
}
