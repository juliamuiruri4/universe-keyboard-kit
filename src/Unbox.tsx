import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { currentStep, takeOutLabel, unboxParts, type BuildAction, type BuildState } from './keyboard';
import {
  BOX_HULL, FREE_CLIP, LID_OPEN_DEG, RIM_CLIP, SCENE_H, SCENE_W, lidMatrix3d, lidQuad, lidShowsUnderside, partSlots, polygonCss, quadPoints,
  type Pt,
} from './unboxLayout';

interface Props {
  build: BuildState;
  onAction: (action: BuildAction) => void;
}

const px = (pts: readonly Pt[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const clipPx = (pts: readonly Pt[]) => `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(', ')})`;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

const QUAD_CSS = polygonCss(quadPoints());
const HULL_CSS = polygonCss(BOX_HULL);
const QUAD_PX = clipPx(quadPoints());
const [L, T, R] = quadPoints();
const WALL = 205;
const down = ([x, y]: Pt, d: number): Pt => [x, y + d];

export default function Unbox({ build, onAction }: Props) {
  const stage = currentStep(build);
  const [gone, setGone] = useState(stage > 0);
  if (stage === 0 && gone) setGone(false);
  const seen = useRef(build.unboxed);
  const was = seen.current;
  useEffect(() => { seen.current = build.unboxed; }, [build.unboxed]);

  const sceneRef = useRef<HTMLDivElement>(null);
  const lidRef = useRef<HTMLImageElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<SVGPolygonElement>(null);
  const insideRef = useRef<HTMLDivElement>(null);
  const lidWrapRef = useRef<HTMLDivElement>(null);
  const deg = useRef(build.opened ? LID_OPEN_DEG : 0);
  const frame = useRef(0);
  const open = build.opened;

  const paint = (d: number) => {
    deg.current = d;
    const lid = lidRef.current;
    if (!lid) return;
    const shown = d > 0.01;
    const m = lidMatrix3d(d);
    lid.style.transform = m;
    const under = backRef.current;
    if (under) {
      under.style.transform = m;
      const flipped = lidShowsUnderside(d);
      under.style.visibility = flipped ? 'visible' : 'hidden';
      lid.style.visibility = flipped ? 'hidden' : 'visible';
    }
    if (lidWrapRef.current) lidWrapRef.current.style.visibility = shown ? 'visible' : 'hidden';
    if (insideRef.current) insideRef.current.style.visibility = shown ? 'visible' : 'hidden';
    const shadow = shadowRef.current;
    if (shadow) {
      shadow.setAttribute('points', px(lidQuad(d).map(([x, y]): Pt => [x + 26, y + 22])));
      shadow.style.opacity = String(Math.sin((d * Math.PI) / 180) * 0.55);
    }
  };

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;
    const fit = () => scene.style.setProperty('--k', String(scene.clientWidth / SCENE_W));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(scene);
    return () => ro.disconnect();
  }, [gone]);

  useLayoutEffect(() => {
    cancelAnimationFrame(frame.current);
    const to = open ? LID_OPEN_DEG : 0;
    const from = deg.current;
    if (reduced() || from === to) {
      paint(to);
      return undefined;
    }
    const start = performance.now();
    const dur = 850;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      paint(from + (to - from) * ease(t));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [open, gone]);

  if (gone) return null;

  const done = stage > 0;
  const next = unboxParts[build.unboxed];
  const label = !open ? 'Open box' : done ? 'Box is empty' : takeOutLabel(next.name);
  const press = () => {
    if (done) return;
    onAction({ type: open ? 'unpack' : 'open' });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      press();
    }
  };

  const backWall = px([L, T, down(T, WALL), down(L, WALL)]);
  const endWall = px([T, R, down(R, WALL), down(T, WALL)]);
  const unit = 'calc(100cqw / 1500)';

  return (
    <div
      className="unbox"
      data-done={done || undefined}
      data-open={open}
      onAnimationEnd={(e) => { if (e.animationName === 'unbox-out') setGone(true); }}
      aria-hidden={done || undefined}
    >
      <div className="u-scene" ref={sceneRef}>
        <img className="u-photo" src="images/box/scene.webp" alt="" draggable={false} />
        <div className="u-vignette" aria-hidden="true" />

        <div className="u-inside" ref={insideRef} style={{ clipPath: QUAD_CSS, visibility: open ? 'visible' : 'hidden' }} aria-hidden="true">
          <svg className="u-cavity" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="u-floor" x1="0" y1="0" x2="0.35" y2="1">
                <stop offset="0" stopColor="#c99562" />
                <stop offset="1" stopColor="#b88252" />
              </linearGradient>
              <linearGradient id="u-back" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#bf8b5b" />
                <stop offset="1" stopColor="#a87649" />
              </linearGradient>
              <linearGradient id="u-end" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ad7b4e" />
                <stop offset="1" stopColor="#966540" />
              </linearGradient>
              <linearGradient id="u-near" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3a2410" stopOpacity="0" />
                <stop offset="1" stopColor="#3a2410" stopOpacity="0.32" />
              </linearGradient>
              <filter id="u-grain" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9 0.05" numOctaves="2" seed="4" />
                <feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.14  0 0 0 0 0.05  0 0 0 0.16 0" />
              </filter>
            </defs>
            <polygon points={px(quadPoints())} fill="url(#u-floor)" />
            <polygon points={backWall} fill="url(#u-back)" />
            <polygon points={endWall} fill="url(#u-end)" />
            <polygon points={px(quadPoints())} filter="url(#u-grain)" opacity="0.8" />
            <polygon points={px([down(L, 0), down(T, 0), down(T, 26), down(L, 26)])} fill="#3a2410" opacity="0.18" />
            <polygon points={px(quadPoints())} fill="url(#u-near)" />
            <polygon points={px(quadPoints())} fill="none" stroke="#dcab79" strokeWidth="14" />
          </svg>
          <div className="u-pile">
            {partSlots.map((slot, i) => {
              const inside = i >= build.unboxed;
              const returning = inside && i < was;
              return (
                <img
                  key={slot.id}
                  className={`u-in ${inside ? '' : 'is-gone'} ${returning ? 'is-returning' : ''}`}
                  data-in={slot.id}
                  src={slot.src}
                  alt=""
                  draggable={false}
                  style={{
                    left: pct(slot.box.x, SCENE_W), top: pct(slot.box.y, SCENE_H), width: pct(slot.box.w, SCENE_W),
                    '--irz': `${slot.box.rz}deg`, zIndex: partSlots.length - i,
                  } as CSSProperties}
                />
              );
            })}
          </div>
        </div>

        <svg className="u-lidshadow" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} aria-hidden="true">
          <defs><filter id="u-blur"><feGaussianBlur stdDeviation="14" /></filter></defs>
          <polygon ref={shadowRef} fill="#1d0f04" filter="url(#u-blur)" opacity="0" points={px(quadPoints())} />
        </svg>
        <div className="u-lidwrap" ref={lidWrapRef} style={{ visibility: open ? 'visible' : 'hidden' }} aria-hidden="true">
          <img ref={lidRef} className="u-lid" src="images/box/scene.webp" alt="" draggable={false} style={{ clipPath: QUAD_PX }} />
          <div ref={backRef} className="u-lid u-lidback" style={{ clipPath: QUAD_PX, visibility: 'hidden' }} />
        </div>

        {partSlots.map((slot, i) => {
          const out = i < build.unboxed;
          const lifting = out && i >= was;
          const style = {
            left: pct(slot.x, SCENE_W), top: pct(slot.y, SCENE_H), width: pct(slot.w, SCENE_W),
            '--dx': slot.box.x - slot.x, '--dy': slot.box.y - slot.y, '--s0': slot.box.w / slot.w,
            '--rz0': `${slot.box.rz}deg`, '--rz': `${slot.rz}deg`, '--rx': `${slot.rx}deg`, '--ry': `${slot.ry}deg`,
            '--u': unit,
            animationDelay: lifting ? `${(i - was) * 0.16}s` : undefined,
          } as CSSProperties;
          const name = unboxParts[i].name;
          return (
            <div
              key={slot.id}
              className={`u-pw ${lifting ? 'is-lifting' : ''}`}
              style={{ '--rim': RIM_CLIP, '--free': FREE_CLIP, animationDelay: style.animationDelay } as CSSProperties}
            >
              <div
                className={`u-part ${out ? 'is-out' : ''} ${lifting ? 'is-lifting' : ''}`}
                data-part={slot.id}
                style={style}
                role="img"
                aria-label={name}
                aria-hidden={out ? undefined : true}
              >
                <img src={slot.src} alt="" draggable={false} />
                <span className="u-label" data-h={slot.x < 300 ? 'start' : slot.x > 1250 ? 'end' : undefined} data-v={slot.y + slot.w / slot.ratio / 2 > 1180 ? 'above' : undefined} aria-hidden="true">{name}</span>
              </div>
            </div>
          );
        })}

        <div
          className="u-box"
          role="button"
          tabIndex={done ? -1 : 0}
          aria-label={label}
          data-open={open}
          style={{ clipPath: HULL_CSS }}
          onClick={press}
          onKeyDown={onKey}
        />
        <svg className="u-focus" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} aria-hidden="true">
          <polygon points={px(BOX_HULL)} fill="none" stroke="#0FBF3E" strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
