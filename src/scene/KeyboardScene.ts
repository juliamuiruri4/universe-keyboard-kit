import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  bumperPositions, keyCentre, keys, LAYER_LABELS, screwPositions, stabilizers, TILT_DEG,
} from '../layout';
import { currentStep, keycapOptions, type BuildState, type KeycapId } from '../keyboard';
import { drawLegend, type CapPaint } from '../legends';
import { capShape } from './caps';
import { partVisibility } from './visibility';
import {
  damperGeometry, extrude, frameGeometries, gx, gz, HOUSING, plateGeometry, pcbTexture, roundedRect,
  shadowTexture, stabilizerGeometries, switchGeometries, trayGeometry, wordmarkTexture, Y,
} from './parts';

export type SceneView = 'build' | 'exploded';

export interface HotspotDef {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
}

export interface Rect { l: number; t: number; w: number; h: number }

export interface Projection {
  rects: Map<string, Rect>;
  labels: Array<{ id: string; x: number; y: number }>;
}

const EXPLODE = { pcb: 1.3, damper: 2.3, plate: 3.3, stabs: 4.2, switches: 5.1, frame: 6.5, caps: 8, screws: 9.1 };
const FLOAT = { damper: 1.8, plate: 2.1, frame: 2.8 };
const LABEL_Y: Record<string, number> = {
  tray: 0.25, pcb: EXPLODE.pcb + 0.2, damper: EXPLODE.damper + 0.41, plate: EXPLODE.plate + 0.5,
  stabs: EXPLODE.stabs + 0.55, switches: EXPLODE.switches + 0.6, frame: EXPLODE.frame + 0.95,
  caps: EXPLODE.caps + 1.3, screws: EXPLODE.screws + 1.1,
};

const ACCENT: CapPaint = { body: '#3283d9', ink: '#0a1220' };
const ACCENT_SIDE = '#2566b0';
const LEGEND_PX = 220;
const FOV = 26;

class Anim {
  constructor(public value = 0, public target = 0, public delay = 0) {}
}

function advance(a: Anim, dt: number, instant: boolean, rate: number): boolean {
  if (instant) {
    const moved = a.value !== a.target;
    a.value = a.target;
    a.delay = 0;
    return moved;
  }
  if (a.delay > 0) {
    a.delay -= dt;
    return true;
  }
  const d = a.target - a.value;
  if (Math.abs(d) < 0.0015) {
    const moved = d !== 0;
    a.value = a.target;
    return moved;
  }
  a.value += d * (1 - Math.exp(-rate * dt));
  return true;
}

interface FadePart {
  group: THREE.Object3D;
  mats: Array<{ mat: THREE.Material; base: number; transparent: boolean }>;
}

function makeFade(group: THREE.Object3D): FadePart {
  const seen = new Set<THREE.Material>();
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) seen.add(m);
  });
  return { group, mats: [...seen].map((mat) => ({ mat, base: mat.opacity, transparent: mat.transparent })) };
}

function setFade(part: FadePart, alpha: number) {
  part.group.visible = alpha > 0.01;
  for (const m of part.mats) {
    m.mat.opacity = m.base * alpha;
    m.mat.transparent = m.transparent || alpha < 0.999;
  }
}

interface SinglePart {
  fade: FadePart;
  inst: Anim;
  vis: Anim;
}

interface KeyItem {
  index: number;
  sw: THREE.Group;
  stem: THREE.Mesh;
  cap: THREE.Mesh;
  topMat: THREE.MeshStandardMaterial;
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  swInst: Anim;
  capInst: Anim;
  press: Anim;
}

interface SlotItem {
  group: THREE.Group;
  inst: Anim;
}

export interface SceneOptions {
  reducedMotion: boolean;
  onFrame: (projection: Projection) => void;
  onReady?: () => void;
}

export class KeyboardScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200);
  private tilt = new THREE.Group();
  private board = new THREE.Group();
  private stack = new THREE.Group();
  private belly: THREE.Mesh;
  private pinkMat: THREE.MeshPhysicalMaterial;
  private tray: SinglePart;
  private damper: SinglePart;
  private plate: SinglePart;
  private frame: SinglePart;
  private pcbGroup = new THREE.Group();
  private stabLayer = new THREE.Group();
  private switchLayer = new THREE.Group();
  private capLayer = new THREE.Group();
  private screwLayer = new THREE.Group();
  private keyItems: KeyItem[] = [];
  private stabItems: SlotItem[] = [];
  private screwItems: SlotItem[] = [];
  private bodyMats: { base: THREE.MeshStandardMaterial; accent: THREE.MeshStandardMaterial };
  private tiltAnim = new Anim();
  private explodeAnim = new Anim();
  private liftAnim = new Anim(-0.14, -0.14);
  private yaw = new Anim();
  private elev = new Anim(52, 52);
  private dist = new Anim(30, 30);
  private focusY = new Anim(0.5, 0.5);
  private focusX = new Anim();
  private userYaw = 0;
  private userPitch = 0;
  private state: BuildState | null = null;
  private view: SceneView = 'build';
  private keycaps: KeycapId | null = null;
  private hotspots: HotspotDef[] = [];
  private width = 1;
  private height = 1;
  private raf = 0;
  private lastTime = 0;
  private disposed = false;
  private first = true;
  private readonly instant: boolean;
  private readonly tmp = new THREE.Vector3();
  private readonly onFrame: SceneOptions['onFrame'];
  private readonly onReady?: () => void;
  private dragging: { x: number; y: number; id: number } | null = null;
  private cleanup: Array<() => void> = [];

  private constructor(private canvas: HTMLCanvasElement, options: SceneOptions) {
    this.instant = options.reducedMotion;
    this.onFrame = options.onFrame;
    this.onReady = options.onReady;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.9;
    pmrem.dispose();

    const sun = new THREE.DirectionalLight(0xfff4ee, 2.4);
    sun.position.set(-7, 15, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -14; sc.right = 14; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 50;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6c4650, 0.35));

    const groundShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 11),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.55, depthWrite: false, color: 0x000000 }),
    );
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.y = 0.002;
    groundShadow.renderOrder = -2;
    this.scene.add(groundShadow);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), new THREE.ShadowMaterial({ opacity: 0.24 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.tilt.position.z = HOUSING.d / 2;
    this.board.position.z = -HOUSING.d / 2;
    this.tilt.add(this.board);
    this.board.add(this.stack);
    this.scene.add(this.tilt);

    this.pinkMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0345f, roughness: 0.16, metalness: 0, transparent: true, opacity: 0.56,
      clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide, depthWrite: false,
      envMapIntensity: 1.3,
    });
    const clearMat = new THREE.MeshPhysicalMaterial({
      color: 0xfff1f4, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.24,
      clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide, depthWrite: false,
      envMapIntensity: 1.6,
    });

    const trayGroup = new THREE.Group();
    const tray = new THREE.Mesh(trayGeometry(), this.pinkMat);
    tray.renderOrder = 1;
    trayGroup.add(tray, this.buildBackDetail());
    this.board.add(trayGroup);
    this.tray = { fade: makeFade(trayGroup), inst: new Anim(), vis: new Anim() };

    const bellyGeometry = extrude(roundedRect(0, 0, HOUSING.w - 0.04, HOUSING.d - 0.04, HOUSING.radius), 1);
    const pos = bellyGeometry.getAttribute('position');
    const tan = Math.tan((TILT_DEG * Math.PI) / 180);
    for (let i = 0; i < pos.count; i += 1) {
      pos.setY(i, pos.getY(i) * (HOUSING.d / 2 - pos.getZ(i)) * tan * 0.985);
    }
    bellyGeometry.computeVertexNormals();
    this.belly = new THREE.Mesh(bellyGeometry, this.pinkMat);
    this.belly.renderOrder = 1;
    this.scene.add(this.belly);

    this.buildPcb();
    const damperMesh = new THREE.Mesh(damperGeometry(), new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.95 }));
    damperMesh.position.y = Y.damper;
    damperMesh.castShadow = true;
    damperMesh.receiveShadow = true;
    const damperGroup = new THREE.Group();
    damperGroup.add(damperMesh);
    this.stack.add(damperGroup);
    this.damper = { fade: makeFade(damperGroup), inst: new Anim(), vis: new Anim() };

    const plateMesh = new THREE.Mesh(plateGeometry(), new THREE.MeshStandardMaterial({
      color: 0x1b3f8f, roughness: 0.42, metalness: 0.5,
    }));
    plateMesh.position.y = Y.plate;
    plateMesh.castShadow = true;
    plateMesh.receiveShadow = true;
    const plateGroup = new THREE.Group();
    plateGroup.add(plateMesh);
    this.stack.add(plateGroup);
    this.plate = { fade: makeFade(plateGroup), inst: new Anim(), vis: new Anim() };

    this.bodyMats = {
      base: new THREE.MeshStandardMaterial({ roughness: 0.62 }),
      accent: new THREE.MeshStandardMaterial({ color: ACCENT_SIDE, roughness: 0.55 }),
    };

    this.buildStabilizers();
    this.buildSwitchesAndCaps();
    const frameGroup = this.buildFrame(clearMat);
    this.stack.add(frameGroup);
    this.frame = { fade: makeFade(frameGroup), inst: new Anim(), vis: new Anim() };
    this.buildScrews();
    this.stack.add(this.pcbGroup, this.stabLayer, this.switchLayer, this.capLayer, this.screwLayer);
  }

  static async create(canvas: HTMLCanvasElement, options: SceneOptions): Promise<KeyboardScene> {
    try {
      await Promise.all([
        document.fonts.load('600 40px "Mona Sans"'),
        document.fonts.load('800 40px "Mona Sans"'),
      ]);
    } catch (error) {
      console.error('Mona Sans did not load; keycap legends use a fallback.', error);
    }
    return new KeyboardScene(canvas, options);
  }

  private buildBackDetail(): THREE.Group {
    const group = new THREE.Group();
    const wordmark = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.5),
      new THREE.MeshBasicMaterial({ map: wordmarkTexture(), transparent: true, depthWrite: false, toneMapped: false }),
    );
    wordmark.rotation.y = Math.PI;
    wordmark.position.set(0, 0.7, -HOUSING.d / 2 - 0.03);
    wordmark.renderOrder = 3;
    const port = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.085, 0.3, 4, 12),
      new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.4, metalness: 0.6 }),
    );
    port.rotation.z = Math.PI / 2;
    port.position.set(0, 0.26, -HOUSING.d / 2 - 0.12);
    const boss = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.3, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xd9dcde, roughness: 0.3, metalness: 0.7 }),
    );
    boss.position.set(0, 0.26, -HOUSING.d / 2 - 0.05);
    group.add(wordmark, boss, port);
    return group;
  }

  private buildPcb() {
    const pcb = new THREE.Mesh(
      extrude(roundedRect(gx(8), gz(2.5), 16.8, 5.8, 0.2), Y.pcbTop - Y.pcb),
      new THREE.MeshStandardMaterial({ map: pcbTexture(), roughness: 0.45, metalness: 0.15 }),
    );
    pcb.position.y = Y.pcb;
    pcb.receiveShadow = true;
    pcb.castShadow = true;
    const uv = pcb.geometry.getAttribute('uv');
    const pos = pcb.geometry.getAttribute('position');
    for (let i = 0; i < uv.count; i += 1) {
      uv.setXY(i, (pos.getX(i) - gx(8)) / 16.8 + 0.5, 0.5 - (pos.getZ(i) - gz(2.5)) / 5.8);
    }
    uv.needsUpdate = true;
    const standoffs = [[-0.3, -0.3], [16.3, -0.3], [-0.3, 5.3], [16.3, 5.3]].map(([x, z]) => {
      const post = new THREE.CylinderGeometry(0.17, 0.17, Y.pcb - Y.trayFloor, 8);
      post.translate(gx(x), Y.trayFloor + (Y.pcb - Y.trayFloor) / 2, gz(z));
      return post;
    });
    const posts = new THREE.Mesh(
      mergeGeometries(standoffs)!,
      new THREE.MeshStandardMaterial({ color: 0xc9cdd0, roughness: 0.3, metalness: 0.9 }),
    );
    this.pcbGroup.add(pcb, posts);
  }

  private buildStabilizers() {
    const housingMat = new THREE.MeshPhysicalMaterial({
      color: 0xf1f2f4, roughness: 0.25, transparent: true, opacity: 0.8, clearcoat: 0.5,
    });
    const wireMat = new THREE.MeshStandardMaterial({ color: 0xcfd3d6, roughness: 0.25, metalness: 1 });
    for (const stab of stabilizers) {
      const key = keys.find((k) => k.code === stab.keyCode)!;
      const c = keyCentre(key);
      const parts = stabilizerGeometries(stab.spread);
      const group = new THREE.Group();
      const housing = new THREE.Mesh(parts.housing, housingMat);
      const wire = new THREE.Mesh(parts.wire, wireMat);
      housing.castShadow = true;
      wire.castShadow = true;
      group.add(housing, wire);
      group.position.set(c.x, 0, c.z);
      this.stabLayer.add(group);
      this.stabItems.push({ group, inst: new Anim() });
    }
  }

  private buildSwitchesAndCaps() {
    const { housing, stem } = switchGeometries();
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x2b2c31, roughness: 0.3, metalness: 0.05 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xd8262a, roughness: 0.3 });
    for (const key of keys) {
      const index = this.keyItems.length;
      const c = keyCentre(key);
      const sw = new THREE.Group();
      const housingMesh = new THREE.Mesh(housing, housingMat);
      housingMesh.castShadow = true;
      const stemMesh = new THREE.Mesh(stem, stemMat);
      sw.add(housingMesh, stemMesh);
      sw.position.set(c.x, 0, c.z);
      this.switchLayer.add(sw);

      const shape = capShape(key.width, key.row);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(shape.topWidth * LEGEND_PX);
      canvas.height = Math.round(shape.topDepth * LEGEND_PX);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      const topMat = new THREE.MeshStandardMaterial({
        map: texture, roughness: 0.5, emissive: new THREE.Color(0x0fbf3e), emissiveIntensity: 0,
      });
      const cap = new THREE.Mesh(shape.geometry, [
        key.tone === 'accent' ? this.bodyMats.accent : this.bodyMats.base, topMat,
      ]);
      cap.castShadow = true;
      cap.receiveShadow = true;
      cap.position.set(c.x, Y.capBase, c.z);
      this.capLayer.add(cap);
      this.keyItems.push({
        index, sw, stem: stemMesh, cap, topMat, texture, canvas,
        swInst: new Anim(), capInst: new Anim(), press: new Anim(),
      });
    }
  }

  private buildFrame(clearMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();
    const shell = new THREE.Mesh(frameGeometries(), clearMat);
    shell.renderOrder = 2;
    group.add(shell);

    // The kit's 0.75u clear blockers fill the two gaps in the bottom row (photo R0002895): frosted blocks with a red screw.
    const blockerMat = new THREE.MeshPhysicalMaterial({
      color: 0xeef3f1, roughness: 0.55, transparent: true, opacity: 0.62, clearcoat: 0.5, clearcoatRoughness: 0.35,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const blockerGeo = new THREE.BoxGeometry(0.76, 0.5, 0.86);
    const blockerEdges = new THREE.EdgesGeometry(blockerGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xc9d2ce, transparent: true, opacity: 0.85 });
    const screwMat = new THREE.MeshStandardMaterial({ color: 0xe5303c, roughness: 0.35 });
    const screwGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.1, 20);
    for (const x of [1.9375, 12.6]) {
      const y = Y.capBase + 0.15;
      const block = new THREE.Mesh(blockerGeo, blockerMat);
      block.position.set(gx(x), y, gz(4.5));
      block.renderOrder = 2;
      const edges = new THREE.LineSegments(blockerEdges, edgeMat);
      edges.position.copy(block.position);
      const screw = new THREE.Mesh(screwGeo, screwMat);
      screw.position.set(gx(x), y + 0.27, gz(4.5));
      screw.castShadow = true;
      group.add(block, edges, screw);
    }

    const bumperMat = new THREE.MeshStandardMaterial({ color: 0xe5303c, roughness: 0.5 });
    const bumperGeo = new THREE.TorusGeometry(0.12, 0.065, 10, 20);
    bumperGeo.rotateX(Math.PI / 2);
    for (const [x, z] of bumperPositions) {
      const bumper = new THREE.Mesh(bumperGeo, bumperMat);
      bumper.position.set(gx(x), 0.68, gz(z - 0.05));
      bumper.castShadow = true;
      group.add(bumper);
    }

    const stripMat = new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.7 });
    const strips: Array<[number, number, number]> = [
      [2.75, -0.3, 2.2], [5.55, -0.3, 2.2], [10.4, -0.3, 2.2], [13.2, -0.3, 2.2], [5.4, 5.4, 2.4], [10.6, 5.4, 2.4],
    ];
    for (const [x, z, length] of strips) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(length, 0.1, 0.2), stripMat);
      strip.position.set(gx(x), 0.78, gz(z));
      group.add(strip);
    }
    return group;
  }

  private buildScrews() {
    const head = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 24);
    head.translate(0, 0.1, 0);
    const collar = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 24);
    collar.translate(0, 0.025, 0);
    const socket = new THREE.CylinderGeometry(0.065, 0.065, 0.02, 6);
    socket.translate(0, 0.155, 0);
    const steel = new THREE.MeshStandardMaterial({ color: 0xd4d7da, roughness: 0.22, metalness: 1 });
    const pink = new THREE.MeshStandardMaterial({ color: 0xe0345f, roughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.6 });
    for (const [x, z] of screwPositions) {
      const group = new THREE.Group();
      const parts = [new THREE.Mesh(head, steel), new THREE.Mesh(collar, pink), new THREE.Mesh(socket, dark)];
      for (const part of parts) part.castShadow = true;
      group.add(...parts);
      group.position.set(gx(x), Y.frameTop, gz(z));
      this.screwLayer.add(group);
      this.screwItems.push({ group, inst: new Anim() });
    }
  }

  private paintCaps() {
    const option = keycapOptions.find((o) => o.id === this.keycaps) ?? keycapOptions[0];
    this.bodyMats.base.color.set(option.capSide);
    for (const item of this.keyItems) {
      const key = keys[item.index];
      const paint: CapPaint = key.tone === 'accent' ? ACCENT : { body: option.cap, ink: option.ink };
      drawLegend(item.canvas.getContext('2d')!, key, item.canvas.width, item.canvas.height, paint);
      item.texture.needsUpdate = true;
    }
  }

  setKeycaps(id: KeycapId) {
    if (this.keycaps === id) return;
    this.keycaps = id;
    this.paintCaps();
    this.invalidate();
  }

  setBuild(state: BuildState) {
    this.state = state;
    this.setKeycaps(state.keycaps);
    this.applyTargets();
    this.invalidate();
  }

  setView(view: SceneView) {
    if (this.view === view) return;
    this.view = view;
    this.userYaw = 0;
    this.userPitch = 0;
    this.applyTargets();
    this.invalidate();
  }

  setHotspots(defs: HotspotDef[]) {
    this.hotspots = defs;
    this.invalidate();
  }

  setPressed(index: number, down: boolean) {
    const item = this.keyItems[index];
    if (!item) return;
    item.press.target = down ? 1 : 0;
    this.invalidate();
  }

  setTested(indices: Set<number>) {
    this.keyItems.forEach((item, i) => {
      item.topMat.emissiveIntensity = indices.has(i) ? 0.28 : 0;
    });
    this.invalidate();
  }

  private applyTargets() {
    const s = this.state;
    if (!s) return;
    const stage = currentStep(s);
    const showAll = this.view === 'exploded' || stage === 0;
    let order = 0;
    const set = (anim: Anim, on: boolean, stagger = false) => {
      const target = on ? 1 : 0;
      if (anim.target === target) return;
      anim.target = target;
      anim.delay = !this.instant && stagger && on ? Math.min(order++ * 0.014, 0.7) : 0;
    };
    this.keyItems.forEach((item, i) => {
      set(item.swInst, showAll || s.switches.includes(i), true);
      set(item.capInst, showAll || s.caps.includes(i), true);
    });
    this.stabItems.forEach((item, i) => set(item.inst, showAll || s.stabilizers.includes(i), true));
    this.screwItems.forEach((item, i) => set(item.inst, showAll || s.screws.includes(i), true));

    const pendingBottom = stage === 3 && !s.bottom;
    const show = partVisibility(s, showAll);
    set(this.damper.inst, show.damper);
    set(this.damper.vis, show.damper);
    set(this.plate.inst, show.plate);
    set(this.plate.vis, show.plate);
    set(this.tray.inst, show.bottom);
    set(this.tray.vis, show.bottom);
    set(this.frame.inst, show.top);
    set(this.frame.vis, show.top);

    this.liftAnim.target = showAll ? 0 : pendingBottom ? 1.1 : s.bottom ? 0 : -0.14;
    this.tiltAnim.target = showAll || s.bottom ? 1 : 0;
    this.explodeAnim.target = this.view === 'exploded' ? 1 : 0;
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  /** Drag to look around. Vertical drag is mouse-only so touch can still scroll the page. */
  attachPointer() {
    const el = this.canvas;
    const down = (e: PointerEvent) => {
      this.dragging = { x: e.clientX, y: e.clientY, id: e.pointerId };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!this.dragging || e.pointerId !== this.dragging.id) return;
      this.userYaw = THREE.MathUtils.clamp(this.userYaw + (e.clientX - this.dragging.x) * 0.25, -40, 40);
      if (e.pointerType === 'mouse') {
        this.userPitch = THREE.MathUtils.clamp(this.userPitch + (e.clientY - this.dragging.y) * 0.2, -18, 18);
      }
      this.dragging.x = e.clientX;
      this.dragging.y = e.clientY;
      this.invalidate();
    };
    const up = (e: PointerEvent) => {
      if (this.dragging?.id === e.pointerId) this.dragging = null;
    };
    const reset = () => {
      this.userYaw = 0;
      this.userPitch = 0;
      this.invalidate();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('dblclick', reset);
    this.cleanup.push(() => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('dblclick', reset);
    });
  }

  invalidate() {
    if (this.disposed || this.raf) return;
    this.raf = requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number) {
    this.raf = 0;
    if (this.disposed) return;
    const dt = this.lastTime ? Math.min(0.05, (now - this.lastTime) / 1000) : 0.016;
    this.lastTime = now;
    const moving = this.step(dt);
    this.render();
    if (moving) {
      this.invalidate();
    } else {
      this.lastTime = 0;
    }
  }

  private step(dt: number): boolean {
    const instant = this.instant;
    let active = false;
    const run = (anim: Anim, rate: number) => {
      if (advance(anim, dt, instant, rate)) active = true;
    };
    run(this.tiltAnim, 5);
    run(this.explodeAnim, 5);
    run(this.liftAnim, 7);
    for (const part of [this.tray, this.damper, this.plate, this.frame]) {
      run(part.inst, 7);
      run(part.vis, 9);
    }
    for (const item of this.keyItems) {
      run(item.swInst, 12);
      run(item.capInst, 12);
      run(item.press, 45);
    }
    for (const item of [...this.stabItems, ...this.screwItems]) run(item.inst, 12);

    const exploded = this.view === 'exploded';
    const tanHalf = Math.tan((FOV * Math.PI) / 360);
    // Exploded labels sit to the right of the board, so the board shifts left to make room.
    const labelPx = this.width > 640 ? 120 : 104;
    const labelUnits = exploded ? (17.4 * labelPx) / Math.max(1, this.width - labelPx) : 0;
    const halfW = (17.4 + labelUnits) / 2 + 0.5;
    const halfH = exploded ? 6.6 : 3.4;
    this.yaw.target = this.userYaw;
    this.elev.target = (exploded ? 30 : 58) + this.userPitch;
    this.dist.target = Math.max(halfH / tanHalf, halfW / (tanHalf * this.camera.aspect)) * (exploded ? 1.04 : 0.98) + (exploded ? 5 : 3);
    this.focusY.target = exploded ? 4.1 : 0.5;
    this.focusX.target = labelUnits / 2;
    for (const a of [this.yaw, this.elev, this.dist, this.focusY, this.focusX]) run(a, 6);
    return active || Boolean(this.dragging);
  }

  private updateTransforms() {
    const e = this.explodeAnim.value;
    this.stack.position.y = this.liftAnim.value;
    this.tilt.rotation.x = THREE.MathUtils.degToRad(TILT_DEG) * this.tiltAnim.value;

    setFade(this.tray.fade, this.tray.vis.value);
    this.belly.visible = this.tray.fade.group.visible && this.tiltAnim.value > 0.01;
    this.belly.scale.y = this.tiltAnim.value;

    this.pcbGroup.position.y = e * EXPLODE.pcb;
    for (const [part, name] of [[this.damper, 'damper'], [this.plate, 'plate'], [this.frame, 'frame']] as const) {
      part.fade.group.position.y = (1 - part.inst.value) * FLOAT[name] + e * EXPLODE[name];
      setFade(part.fade, part.vis.value);
    }
    this.stabLayer.position.y = e * EXPLODE.stabs;
    this.switchLayer.position.y = e * EXPLODE.switches;
    this.capLayer.position.y = e * EXPLODE.caps;
    this.screwLayer.position.y = e * EXPLODE.screws;

    for (const item of [...this.stabItems, ...this.screwItems]) {
      item.group.visible = item.inst.value > 0.02;
      item.group.position.y = (1 - item.inst.value) * 1.3 + (item.group.userData.base ?? 0);
    }
    for (const item of this.keyItems) {
      item.sw.visible = item.swInst.value > 0.02;
      item.sw.position.y = (1 - item.swInst.value) * 0.9;
      item.stem.position.y = -item.press.value * 0.14;
      item.cap.visible = item.capInst.value > 0.02;
      item.cap.position.y = Y.capBase + (1 - item.capInst.value) * 1.1 - item.press.value * Y.press;
    }
  }

  private updateCamera() {
    const yaw = THREE.MathUtils.degToRad(this.yaw.value);
    const el = THREE.MathUtils.degToRad(this.elev.value);
    const d = this.dist.value;
    this.camera.position.set(
      this.focusX.value + Math.sin(yaw) * Math.cos(el) * d,
      this.focusY.value + Math.sin(el) * d,
      Math.cos(yaw) * Math.cos(el) * d,
    );
    this.camera.lookAt(this.focusX.value, this.focusY.value, 0);
    this.camera.updateMatrixWorld();
  }

  private screen(world: THREE.Vector3): [number, number] {
    this.tmp.copy(world).project(this.camera);
    return [((this.tmp.x + 1) / 2) * this.width, ((1 - this.tmp.y) / 2) * this.height];
  }

  private render() {
    this.updateTransforms();
    this.updateCamera();
    this.scene.updateMatrixWorld(true);
    this.renderer.render(this.scene, this.camera);

    const rects = new Map<string, Rect>();
    const corner = new THREE.Vector3();
    for (const h of this.hotspots) {
      let l = Infinity; let t = Infinity; let r = -Infinity; let b = -Infinity;
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        corner.set(h.x + (sx * h.w) / 2, h.y + this.stack.position.y, h.z + (sz * h.d) / 2);
        this.board.localToWorld(corner);
        const [px, py] = this.screen(corner);
        l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py);
      }
      rects.set(h.id, { l, t, w: r - l, h: b - t });
    }
    const labels: Projection['labels'] = [];
    if (this.explodeAnim.value > 0.6) {
      for (const label of LAYER_LABELS) {
        corner.set(HOUSING.w / 2 + 0.1, LABEL_Y[label.id], HOUSING.d / 2 - 0.4);
        this.board.localToWorld(corner);
        const [px, py] = this.screen(corner);
        labels.push({ id: label.id, x: px, y: py });
      }
    }
    this.onFrame({ rects, labels });
    if (this.first) {
      this.first = false;
      this.onReady?.();
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    for (const fn of this.cleanup) fn();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
