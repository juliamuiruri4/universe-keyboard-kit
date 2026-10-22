import { useCallback, useEffect, useRef, useState } from 'react';
import Gallery from './PhotoGrid';
import Guide from './Guide';
import Icon, { GitHubMark } from './Icon';
import KeyboardBoard, { type BoardHandle } from './KeyboardBoard';
import Unbox from './Unbox';
import { keyClick } from './sound';
import { applyKeyToText, diffText, isShiftKey, keyIndexForEdit, clampText, type Mods } from './typing';
import {
  buildReducer, currentStep, initialState, KEY_COUNT, keycapOptions, keys, primaryAction, progressCount,
  restoreBuild, secondaryAction, steps, STORAGE_KEY,
  type BuildAction, type BuildState, type KeycapId,
} from './keyboard';

type Route = 'build' | 'guide' | 'photos';

function routeFromHash(): Route {
  const route = window.location.hash.replace('#/', '');
  if (route === 'guide') return 'guide';
  if (route === 'photos' || route === 'gallery') return 'photos';
  return 'build';
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Local storage is unavailable:', error);
    return null;
  }
}

const noisy = ['Tab', 'F5', 'F12'];

export default function App() {
  const [restored] = useState(() => restoreBuild(readStorage));
  const [build, setBuild] = useState<BuildState>(restored.state);
  const [history, setHistory] = useState<BuildState[]>([]);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [view, setView] = useState<'build' | 'exploded'>('build');
  const [notice, setNotice] = useState(restored.notice);
  const [confirmReset, setConfirmReset] = useState(false);
  const [tested, setTested] = useState<Set<number>>(new Set());
  const [lastKey, setLastKey] = useState('');
  const [text, setText] = useState('');
  const [sound, setSound] = useState(false);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const [sticky, setSticky] = useState<Mods>({ shift: false, caps: false });
  const stickyRef = useRef(sticky);
  const typedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  const rawRef = useRef('');
  const compositionStartRef = useRef('');
  const textRef = useRef(text);
  textRef.current = text;
  const boardRef = useRef<BoardHandle>(null);
  const saveBlocked = useRef(restored.blocked);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stage = currentStep(build);
  const primary = primaryAction(build);
  const secondary = secondaryAction(build);
  const progress = progressCount(build);

  useEffect(() => {
    const onHash = () => {
      setRoute(routeFromHash());
      window.scrollTo({ top: 0, behavior: 'instant' });
      requestAnimationFrame(() => headingRef.current?.focus());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (saveBlocked.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(build));
    } catch (error) {
      console.error('Could not save the keyboard build:', error);
      setNotice('This browser could not save your build.');
    }
  }, [build]);

  const act = useCallback((action: BuildAction) => {
    const next = buildReducer(build, action);
    if (next === build) return;
    if (soundRef.current) keyClick();
    setHistory((h) => [...h.slice(-29), build]);
    setBuild(next);
    setNotice('');
  }, [build]);

  const markKey = useCallback((index: number) => {
    if (soundRef.current) keyClick();
    setTested((before) => (before.has(index) ? before : new Set(before).add(index)));
    setLastKey(keys[index].name);
  }, []);

  const testKey = useCallback((index: number, physical?: Mods) => {
    const key = keys[index];
    markKey(index);
    const held = stickyRef.current;
    const mods = physical ? { shift: physical.shift || held.shift, caps: physical.caps || held.caps } : held;
    let nextSticky = held;
    if (!physical && isShiftKey(key)) nextSticky = { ...held, shift: !held.shift };
    else if (!physical && key.code === 'CapsLock') nextSticky = { ...held, caps: !held.caps };
    else if (held.shift && applyKeyToText('', key, mods) !== '') nextSticky = { ...held, shift: false };
    if (nextSticky !== held) {
      stickyRef.current = nextSticky;
      setSticky(nextSticky);
    }
    const nextText = applyKeyToText(textRef.current, key, mods);
    textRef.current = nextText;
    rawRef.current = nextText;
    setText(nextText);
  }, [markKey]);

  // Software keyboards report text, not key codes, so the edit itself is the source of truth.
  const creditEdit = (before: string, after: string) => {
    const index = keyIndexForEdit(diffText(before, after));
    if (index < 0) return;
    markKey(index);
    boardRef.current?.press(index, true);
    window.setTimeout(() => boardRef.current?.press(index, false), 120);
  };
  const onSoftwareInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    rawRef.current = raw;
    const before = textRef.current;
    const next = composingRef.current ? raw : clampText(raw);
    textRef.current = next;
    setText(next);
    const type = (e.nativeEvent as InputEvent).inputType;
    if (!composingRef.current && (type === 'insertText' || type === 'insertLineBreak' || type === 'deleteContentBackward')) {
      creditEdit(before, raw);
    }
  };
  const onCompositionStart = () => {
    composingRef.current = true;
    compositionStartRef.current = textRef.current;
    rawRef.current = textRef.current;
  };
  const onCompositionEnd = () => {
    composingRef.current = false;
    creditEdit(compositionStartRef.current, rawRef.current);
    const clamped = clampText(rawRef.current);
    textRef.current = clamped;
    setText(clamped);
  };
  const keepCaretAtEnd = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const end = el.value.length;
    if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end);
  };

  const clearTest = () => {
    setTested(new Set());
    setLastKey('');
    setText('');
    stickyRef.current = { shift: false, caps: false };
    setSticky(stickyRef.current);
  };

  useEffect(() => {
    const el = typedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);

  useEffect(() => {
    if (route !== 'build' || stage !== 6) return;
    const index = (code: string) => keys.findIndex((k) => k.code === code);
    const down = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (noisy.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
      const i = index(e.code);
      if (i < 0) return;
      const target = e.target as HTMLElement;
      if (!e.repeat) {
        boardRef.current?.press(i, true);
        testKey(i, { shift: e.shiftKey, caps: e.getModifierState('CapsLock') });
      }
      if (!target.closest('button, a, input, dialog')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const i = index(e.code);
      if (i >= 0) boardRef.current?.press(i, false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [route, stage, testKey]);

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setBuild(previous);
    setHistory((h) => h.slice(0, -1));
    clearTest();
    setNotice('');
  };

  const reset = () => {
    saveBlocked.current = false;
    setBuild({ ...initialState, keycaps: build.keycaps });
    setHistory([]);
    clearTest();
    setView('build');
    setConfirmReset(false);
    setNotice('');
  };

  const chooseKeycaps = (value: KeycapId) => setBuild((b) => (b.keycaps === value ? b : { ...b, keycaps: value }));

  const hasProgress = build.opened;
  const step = steps[Math.min(stage, 5)];

  return (
    <>
      <header className="top">
        <a className="brand" href="#/" aria-label="Universe keyboard, build">
          <GitHubMark size={26} />
          <span>Universe '26 keyboard</span>
        </a>
        <nav aria-label="Sections">
          {([['build', '#/', 'Build'], ['guide', '#/guide', 'Guide'], ['photos', '#/photos', 'Photos']] as const).map(([id, href, label]) => (
            <a key={id} href={href} aria-current={route === id ? 'page' : undefined}>{label}</a>
          ))}
        </nav>
      </header>

      <main>
        {route === 'build' && (
          <section className="bench" aria-labelledby="bench-title">
            <h1 id="bench-title" className="sr-only" ref={headingRef} tabIndex={-1}>Build the keyboard</h1>
            <div className="stage">
              <KeyboardBoard ref={boardRef} build={build} view={view} tested={tested} onAction={act} onTest={testKey} />
              {view === 'build' && <Unbox build={build} onAction={act} />}
              <div className="stage-tools">
                <div className="segment" role="group" aria-label="View">
                  <button type="button" aria-pressed={view === 'build'} onClick={() => setView('build')}>Assembled</button>
                  <button type="button" aria-pressed={view === 'exploded'} onClick={() => setView('exploded')}>Exploded</button>
                </div>
                <div className="segment" role="group" aria-label="Keycaps">
                  {keycapOptions.map((o) => (
                    <button key={o.id} type="button" aria-pressed={build.keycaps === o.id} onClick={() => chooseKeycaps(o.id)}>
                      <span className="swatch" style={{ background: o.cap }} aria-hidden="true" />{o.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <aside className="panel" aria-label="Assembly">
              <ol className="stepper">
                {steps.map((s, i) => (
                  <li key={s.name} className={i < stage ? 'is-done' : i === stage ? 'is-current' : ''} aria-current={i === stage ? 'step' : undefined}>
                    <span className="step-mark" aria-hidden="true">{i < stage ? <Icon name="check" size={12} /> : i + 1}</span>
                    <span className="step-name">{s.name}</span>
                  </li>
                ))}
              </ol>

              <div className="instruction">
                {stage < 6 ? (
                  <>
                    <h2>{step.name}</h2>
                    <p>{step.instruction}</p>
                  </>
                ) : (
                  <>
                    <h2>Test it</h2>
                    <p>Type on your keyboard or tap a key.</p>
                  </>
                )}
              </div>

              {progress && (
                <div className="progress" role="status">
                  <div className="progress-bar" aria-hidden="true"><span style={{ transform: `scaleX(${progress.done / progress.total})` }} /></div>
                  <span className="progress-text">{progress.done} / {progress.total} {progress.noun}</span>
                </div>
              )}

              {primary && (
                <button type="button" className="primary" onClick={() => act(primary.action)}>{primary.label}</button>
              )}

              {secondary && (
                <button type="button" className="text-btn" onClick={() => act(secondary.action)}>{secondary.label}</button>
              )}

              {stage === 6 && (
                <section className="tester" aria-label="Key test">
                  <div
                    ref={typedRef}
                    className="typed"
                    data-empty={text === '' || undefined}
                    onClick={() => inputRef.current?.focus()}
                  >
                    <span aria-hidden="true">{text}</span><span className="caret" aria-hidden="true" />
                    <textarea
                      ref={inputRef}
                      className="typed-input"
                      aria-label="Typing preview"
                      value={text}
                      onChange={onSoftwareInput}
                      onFocus={keepCaretAtEnd}
                      onSelect={keepCaretAtEnd}
                      onCompositionStart={onCompositionStart}
                      onCompositionEnd={onCompositionEnd}
                      rows={1}
                      enterKeyHint="enter"
                      autoCapitalize="off"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="tester-meta">
                    <strong>{tested.size} / {KEY_COUNT}</strong>
                    <span className="tester-last">{lastKey}</span>
                    {sticky.shift && <span className="chip">Shift</span>}
                    {sticky.caps && <span className="chip">Caps</span>}
                    {(tested.size > 0 || text !== '') && (
                      <button type="button" className="text-btn" onClick={clearTest}>Clear</button>
                    )}
                  </div>
                </section>
              )}

              <div className="actions">
                <button type="button" className="tool" onClick={undo} disabled={history.length === 0}><Icon name="undo" />Undo</button>
                <button type="button" className="tool" aria-pressed={sound} onClick={() => setSound((on) => !on)}>
                  <Icon name={sound ? 'volume' : 'mute'} />Sound {sound ? 'on' : 'off'}
                </button>
                {confirmReset ? (
                  <span className="confirm" role="group" aria-label="Confirm start over">
                    <button type="button" className="tool danger" onClick={reset}>Erase build</button>
                    <button type="button" className="tool" onClick={() => setConfirmReset(false)}>Cancel</button>
                  </span>
                ) : (
                  <button type="button" className="tool" onClick={() => setConfirmReset(true)} disabled={!hasProgress && !restored.blocked}><Icon name="reset" />Start over</button>
                )}
              </div>

              <p className="notice" role="status">{notice}</p>
            </aside>
          </section>
        )}
        {route === 'guide' && <Guide headingRef={headingRef} />}
        {route === 'photos' && <Gallery headingRef={headingRef} />}
      </main>
    </>
  );
}
