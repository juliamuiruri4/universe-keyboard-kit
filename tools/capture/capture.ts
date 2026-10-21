// Dev-only tool: renders each unboxing part from the real 3D scene on a transparent canvas.
// Driven by tools/capture/run.mjs. The PNGs it saves become public/images/parts/*.webp.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { KeyboardScene } from '../../src/scene/KeyboardScene';
import { initialState, keys } from '../../src/keyboard';

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = 1800;
const H = 1200;
const FOV = 26;

const canvas = document.getElementById('c') as HTMLCanvasElement;

async function setup() {
  const scene = await KeyboardScene.create(canvas, { reducedMotion: true, onFrame: () => {} });
  scene.resize(W, H);
  scene.setKeycaps('dark');
  scene.setView('exploded');
  scene.setBuild(initialState);
  const s = scene as any;
  s.step(0.1);
  s.step(0.1);
  s.updateTransforms();
  return s;
}

const ready = setup();

function hideAll(s: any) {
  for (const child of s.scene.children) if (child.isMesh) child.visible = false;
  for (const part of [s.tray, s.damper, s.plate, s.frame]) part.fade.group.visible = false;
  for (const g of [s.pcbGroup, s.stabLayer, s.switchLayer, s.capLayer, s.screwLayer]) {
    g.visible = false;
    g.position.set(0, 0, 0);
  }
  for (const item of s.keyItems) { item.sw.visible = false; item.cap.visible = false; }
  for (const item of [...s.stabItems, ...s.screwItems]) item.group.visible = false;
  s.tilt.rotation.x = 0;
}

const isBumper = (o: any) => o.isMesh && o.geometry.type === 'TorusGeometry';
const isStrip = (o: any) => o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.height === 0.1;

function frame(s: any, roots: THREE.Object3D[], yaw: number, elev: number): string {
  s.scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const r of roots) box.expandByObject(r);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.2, 200);
  const y = THREE.MathUtils.degToRad(yaw);
  const e = THREE.MathUtils.degToRad(elev);
  const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(FOV / 2))) * 1.02;
  cam.position.set(
    sphere.center.x + Math.sin(y) * Math.cos(e) * dist,
    sphere.center.y + Math.sin(e) * dist,
    sphere.center.z + Math.cos(y) * Math.cos(e) * dist,
  );
  cam.lookAt(sphere.center);
  cam.updateMatrixWorld();
  s.renderer.render(s.scene, cam);
  return canvas.toDataURL('image/png');
}

const capIndex = (code: string) => keys.findIndex((k) => k.code === code);

const shots: Record<string, (s: any) => string> = {
  housing(s) {
    hideAll(s);
    s.tilt.rotation.x = THREE.MathUtils.degToRad(5);
    const groups = [s.tray.fade.group, s.plate.fade.group, s.frame.fade.group];
    for (const g of groups) g.visible = true;
    s.belly.visible = true;
    s.tray.fade.group.position.y = 0;
    s.plate.fade.group.position.y = 2.1;
    s.frame.fade.group.position.y = 4.0;
    s.frame.fade.group.traverse((o: any) => { if (isBumper(o) || isStrip(o)) o.visible = false; });
    return frame(s, [...groups, s.belly], -26, 30);
  },
  pcb(s) {
    hideAll(s);
    s.pcbGroup.visible = true;
    return frame(s, [s.pcbGroup], -22, 46);
  },
  dampener(s) {
    hideAll(s);
    const damper = s.damper.fade.group as THREE.Group;
    damper.visible = true;
    damper.position.y = 0;
    const bumpers: THREE.Object3D[] = [];
    const strips: THREE.Object3D[] = [];
    s.frame.fade.group.traverse((o: any) => { if (isBumper(o)) bumpers.push(o); else if (isStrip(o)) strips.push(o); });
    strips.forEach((o, i) => {
      damper.add(o);
      o.visible = true;
      o.scale.set(1, 2.4, 2.4);
      o.position.set(-5.6 + (i % 3) * 5.6, 0.12, 4.2 + Math.floor(i / 3) * 0.75);
    });
    bumpers.forEach((o, i) => {
      damper.add(o);
      o.visible = true;
      o.scale.setScalar(2.4);
      o.position.set(-7.3 + i * 2.1, 0.16, 6.1);
    });
    return frame(s, [damper], -14, 44);
  },
  stabilizers(s) {
    hideAll(s);
    s.stabLayer.visible = true;
    // Left Shift, Enter, Space.
    const at: Array<[number, number]> = [[2.1, 0.3], [-2.1, 0.5], [0, -1.6]];
    s.stabItems.forEach((item: any, i: number) => {
      item.group.visible = true;
      item.group.position.set(at[i][0], 0, at[i][1]);
      item.group.rotation.y = [0.12, -0.1, 0][i];
    });
    return frame(s, s.stabItems.map((i: any) => i.group), -20, 44);
  },
  switches(s) {
    hideAll(s);
    s.switchLayer.visible = true;
    const picks = ['KeyQ', 'KeyW', 'KeyE', 'KeyA', 'KeyS', 'KeyD'].map(capIndex);
    const spin = [0.35, -0.2, 0.1, -0.4, 0.25, -0.1];
    const groups = picks.map((idx, i) => {
      const sw = s.keyItems[idx].sw as THREE.Group;
      sw.visible = true;
      sw.position.set(-1.5 + (i % 3) * 1.5 + (i > 2 ? 0.45 : 0), 0, -0.85 + Math.floor(i / 3) * 1.7);
      sw.rotation.y = spin[i];
      return sw;
    });
    return frame(s, groups, -18, 40);
  },
  keycaps(s) {
    hideAll(s);
    s.capLayer.visible = true;
    const layout: Array<[string, number, number, number]> = [
      ['Escape', -2.5, -1.3, 0.18], ['KeyW', -0.9, -1.45, -0.12], ['KeyA', 0.7, -1.2, 0.2],
      ['Enter', 2.3, -1.2, -0.1], ['KeyS', -2.1, 0.7, -0.16], ['KeyD', -0.5, 0.95, 0.1], ['KeyF', 1.1, 0.75, -0.2],
    ];
    const meshes = layout.map(([code, x, z, r]) => {
      const cap = s.keyItems[capIndex(code)].cap as THREE.Mesh;
      cap.visible = true;
      cap.position.set(x, 0, z);
      cap.rotation.y = r;
      return cap;
    });
    return frame(s, meshes, -16, 42);
  },
  screws(s) {
    hideAll(s);
    s.screwLayer.visible = true;
    const spots: Array<[number, number, number]> = [[-0.8, -0.55, 0.3], [0.7, -0.7, 1.1], [-0.55, 0.7, 0.8], [0.95, 0.6, 0.1]];
    s.screwItems.forEach((item: any, i: number) => {
      item.group.visible = true;
      item.group.position.set(spots[i][0], 0, spots[i][1]);
      item.group.rotation.y = spots[i][2];
    });
    return frame(s, s.screwItems.map((i: any) => i.group), -15, 38);
  },
  'white-box'(s) {
    hideAll(s);
    const mat = new THREE.MeshStandardMaterial({ color: 0xe3e7e3, roughness: 0.78 });
    const band = new THREE.MeshStandardMaterial({ color: 0xb9c1bb, roughness: 0.8 });
    const group = new THREE.Group();
    const base = new THREE.Mesh(new RoundedBoxGeometry(4.4, 1.15, 2.7, 4, 0.06), mat);
    base.position.y = 0.575;
    const lid = new THREE.Mesh(new RoundedBoxGeometry(4.5, 0.5, 2.8, 4, 0.06), mat);
    lid.position.y = 1.4;
    const seam = new THREE.Mesh(new RoundedBoxGeometry(4.36, 0.07, 2.66, 2, 0.02), band);
    seam.position.y = 1.14;
    const tab = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.08, 0.42, 2, 0.03), band);
    tab.position.set(0, 0.2, 1.4);
    group.add(base, lid, seam, tab);
    group.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.rotation.y = 0.1;
    s.scene.add(group);
    const url = frame(s, [group], -24, 30);
    s.scene.remove(group);
    return url;
  },
};

declare global {
  interface Window {
    __shot: (name: string) => Promise<string>;
    __names: string[];
  }
}
window.__names = Object.keys(shots);
window.__shot = async (name) => shots[name](await ready);
