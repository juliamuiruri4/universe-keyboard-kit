import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Ref } from 'react';
import { bounds, centre, keyCentre, keys, LAYER_LABELS, screwPositions, stabilizers } from './layout';
import { currentStep, primaryAction, type BuildAction, type BuildState } from './keyboard';
import type { HotspotDef, KeyboardScene, Projection, Rect, SceneView } from './scene/KeyboardScene';

export interface BoardHandle {
  press: (index: number, down: boolean) => void;
}

interface Props {
  build: BuildState;
  view: SceneView;
  tested: Set<number>;
  onAction: (action: BuildAction) => void;
  onTest: (index: number) => void;
  ref?: Ref<BoardHandle>;
}

interface Spot {
  id: string;
  label: string;
  def: HotspotDef;
  action?: BuildAction;
  testIndex?: number;
  tabbable: boolean;
  /** Labels a fixed hardware part; it is not interactive. */
  decor?: boolean;
}

const BLOCKER_X = [1.9375, 12.6];

const CAP_TOP = 1.5;

function spotsFor(build: BuildState): Spot[] {
  const stage = currentStep(build);
  const spots: Spot[] = [];
  const whole = primaryAction(build);
  if (whole && (stage === 3 || (stage === 2 && !build.plate))) {
    spots.push({
      id: 'part', label: whole.label, action: whole.action, tabbable: false,
      def: { id: 'part', x: 0, z: 0, w: bounds.maxX - bounds.minX, d: bounds.maxZ - bounds.minZ, y: 0.5 },
    });
  } else if (stage === 1) {
    stabilizers.forEach((stab, i) => {
      if (build.stabilizers.includes(i)) return;
      const key = keys.find((k) => k.code === stab.keyCode)!;
      const c = keyCentre(key);
      spots.push({
        id: `stab-${i}`, label: `Seat ${stab.name} stabilizer`, action: { type: 'stabilizer', index: i }, tabbable: true,
        def: { id: `stab-${i}`, x: c.x, z: c.z, w: Math.min(key.width, 2.4), d: 1, y: 0.7 },
      });
    });
  } else if (stage === 2 && build.plate) {
    let first = true;
    keys.forEach((key, i) => {
      if (build.switches.includes(i)) return;
      const c = keyCentre(key);
      spots.push({
        id: `switch-${i}`, label: `Seat ${key.name} switch`, action: { type: 'switch', index: i }, tabbable: first,
        def: { id: `switch-${i}`, x: c.x, z: c.z, w: key.width, d: 1, y: 0.7 },
      });
      first = false;
    });
  } else if (stage === 4) {
    screwPositions.forEach(([x, z], i) => {
      if (build.screws.includes(i)) return;
      spots.push({
        id: `screw-${i}`, label: `Tighten case screw ${i + 1}`, action: { type: 'screw', index: i }, tabbable: true,
        def: { id: `screw-${i}`, x: x - centre.x, z: z - centre.z, w: 1.1, d: 1.1, y: 1.1 },
      });
    });
  } else if (stage === 5) {
    let first = true;
    keys.forEach((key, i) => {
      if (build.caps.includes(i)) return;
      const c = keyCentre(key);
      spots.push({
        id: `cap-${i}`, label: `Add ${key.name} keycap`, action: { type: 'cap', index: i }, tabbable: first,
        def: { id: `cap-${i}`, x: c.x, z: c.z, w: key.width, d: 1, y: CAP_TOP },
      });
      first = false;
    });
  } else if (stage === 6) {
    keys.forEach((key, i) => {
      const c = keyCentre(key);
      spots.push({
        id: `test-${i}`, label: `Test ${key.name}`, testIndex: i, tabbable: false,
        def: { id: `test-${i}`, x: c.x, z: c.z, w: key.width, d: 1, y: CAP_TOP },
      });
    });
  }
  if (stage >= 4) {
    BLOCKER_X.forEach((x, i) => {
      spots.push({
        id: `blocker-${i}`, label: 'Blocker', tabbable: false, decor: true,
        def: { id: `blocker-${i}`, x: x - centre.x, z: 4.5 - centre.z, w: 0.76, d: 0.86, y: 1.4 },
      });
    });
  }
  return spots;
}

export default function KeyboardBoard({ build, view, tested, onAction, onTest, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<KeyboardScene | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const spotEls = useRef(new Map<string, HTMLButtonElement>());
  const labelEls = useRef(new Map<string, HTMLSpanElement>());
  const rects = useRef(new Map<string, Rect>());
  const labelPos = useRef<Projection['labels']>([]);
  const spots = useMemo(() => (view === 'build' ? spotsFor(build) : []), [build, view]);
  const latest = useRef({ build, view, tested, spots });
  latest.current = { build, view, tested, spots };
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const place = () => {
    for (const [id, el] of spotEls.current) {
      const r = rects.current.get(id);
      if (!r) continue;
      el.style.transform = `translate(${r.l}px, ${r.t}px)`;
      el.style.width = `${r.w}px`;
      el.style.height = `${r.h}px`;
    }
    for (const [id, el] of labelEls.current) {
      const p = labelPos.current.find((l) => l.id === id);
      el.style.opacity = p ? '1' : '0';
      if (p) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
  };

  useImperativeHandle(ref, () => ({
    press: (index, down) => sceneRef.current?.setPressed(index, down),
  }), []);

  useEffect(() => {
    let cancelled = false;
    let created: KeyboardScene | null = null;
    let observer: ResizeObserver | null = null;
    const canvas = canvasRef.current!;
    const host = hostRef.current!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    import('./scene/KeyboardScene').then(async ({ KeyboardScene }) => {
      if (cancelled) return;
      try {
        const scene = await KeyboardScene.create(canvas, {
          reducedMotion: reduced,
          onFrame: (p) => {
            rects.current = p.rects;
            labelPos.current = p.labels;
            place();
          },
          onReady: () => setReady(true),
        });
        if (cancelled) { scene.dispose(); return; }
        created = scene;
        sceneRef.current = scene;
        scene.attachPointer();
        const fit = () => scene.resize(host.clientWidth, host.clientHeight);
        fit();
        observer = new ResizeObserver(fit);
        observer.observe(host);
        scene.setView(latest.current.view);
        scene.setBuild(latest.current.build);
        scene.setTested(latest.current.tested);
        scene.setHotspots(latest.current.spots.map((s) => s.def));
      } catch (error) {
        console.error('The 3D keyboard could not start:', error);
        setFailed(true);
      }
    }).catch((error) => {
      console.error('The 3D keyboard could not load:', error);
      setFailed(true);
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      created?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => { sceneRef.current?.setBuild(build); }, [build]);
  useEffect(() => { sceneRef.current?.setView(view); }, [view]);
  useEffect(() => { sceneRef.current?.setTested(tested); }, [tested]);
  useEffect(() => { sceneRef.current?.setHotspots(spots.map((s) => s.def)); }, [spots]);
  useLayoutEffect(place);

  const stage = currentStep(build);

  return (
    <div className="board" ref={hostRef} data-ready={ready ? 'true' : 'false'} data-view={view} data-stage={stage}>
      <canvas
        ref={canvasRef}
        className="board-canvas"
        role="img"
        aria-label="Omnitype Bauer Lite keyboard with transparent red case, gray keycaps and blue Escape and Enter keys"
      />
      {failed && (
        <img className="board-fallback" src="images/R0002895.webp" alt="The finished Universe keyboard, seen from above" />
      )}
      <div className="board-spots">
        {spots.map((s) => (s.decor ? (
          <span
            key={s.id}
            className="spot spot-blocker"
            data-spot={s.id}
            role="img"
            aria-label={s.label}
            title={s.label}
            ref={(el) => {
              if (el) spotEls.current.set(s.id, el as unknown as HTMLButtonElement); else spotEls.current.delete(s.id);
            }}
          />
        ) : (
          <button
            key={s.id}
            type="button"
            className={`spot ${s.testIndex !== undefined ? 'spot-test' : ''} ${tested.has(s.testIndex ?? -1) ? 'is-tested' : ''}`}
            data-spot={s.id}
            aria-label={s.label}
            tabIndex={s.tabbable ? 0 : -1}
            ref={(el) => {
              if (el) spotEls.current.set(s.id, el); else spotEls.current.delete(s.id);
            }}
            onPointerDown={() => {
              if (s.testIndex !== undefined) {
                sceneRef.current?.setPressed(s.testIndex, true);
                onTest(s.testIndex);
              }
            }}
            onPointerUp={() => { if (s.testIndex !== undefined) sceneRef.current?.setPressed(s.testIndex, false); }}
            onPointerLeave={() => { if (s.testIndex !== undefined) sceneRef.current?.setPressed(s.testIndex, false); }}
            onClick={() => { if (s.action) onAction(s.action); }}
          />
        )))}
      </div>
      <div className="board-labels" aria-hidden="true">
        {LAYER_LABELS.map((l) => (
          <span
            key={l.id}
            className="layer-label"
            ref={(el) => {
              if (el) labelEls.current.set(l.id, el); else labelEls.current.delete(l.id);
            }}
          >
            {l.text}
          </span>
        ))}
      </div>
    </div>
  );
}
