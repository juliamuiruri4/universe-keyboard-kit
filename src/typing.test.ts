import { describe, expect, it } from 'vitest';
import { keys, unboxParts } from './keyboard';
import { applyKeyToText, isShiftKey, MAX_TEXT, TAB_WIDTH } from './typing';
import {
  applyHomography, BOX_HULL, boxRect, homography, LID_OPEN_DEG, lidMatrix3d, lidQuad, lidShowsUnderside, partSlots, pointInPolygon,
  polygonsOverlap, QUAD, quadPoints, rectCorners, SCENE_H, SCENE_W, slotRect,
} from './unboxLayout';

const key = (code: string) => {
  const found = keys.find((k) => k.code === code);
  if (!found) throw new Error(`No key ${code}`);
  return found;
};
const off = { shift: false, caps: false };
const type = (codes: string[], mods = off) => codes.reduce((text, c) => applyKeyToText(text, key(c), mods), '');

describe('typing preview', () => {
  it('prints letters with Shift and Caps', () => {
    expect(type(['KeyH', 'KeyI'])).toBe('hi');
    expect(type(['KeyH', 'KeyI'], { shift: true, caps: false })).toBe('HI');
    expect(type(['KeyH', 'KeyI'], { shift: false, caps: true })).toBe('HI');
    expect(type(['KeyH', 'KeyI'], { shift: true, caps: true })).toBe('hi');
  });

  it('prints digits and shifted symbols from the dual legends', () => {
    expect(type(['Digit1', 'Digit9', 'Minus', 'Slash'])).toBe('19-/');
    expect(type(['Digit1', 'Digit9', 'Minus', 'Slash'], { shift: true, caps: false })).toBe('!(_?');
    expect(type(['Digit1'], { shift: false, caps: true })).toBe('1');
  });

  it('handles space, enter and tab', () => {
    expect(type(['KeyA', 'Space', 'KeyB', 'Enter', 'KeyC'])).toBe('a b\nc');
    expect(applyKeyToText('', key('Tab'), off)).toBe(' '.repeat(TAB_WIDTH));
  });

  it('removes one character on Backspace and ignores Delete', () => {
    expect(type(['KeyA', 'KeyB', 'Backspace'])).toBe('a');
    expect(type(['Backspace'])).toBe('');
    expect(type(['KeyA', 'Delete'])).toBe('a');
    expect(applyKeyToText('a😀', key('Backspace'), off)).toBe('a');
  });

  it('does not print modifiers, arrows, function or icon keys', () => {
    const silent = ['ShiftLeft', 'ControlLeft', 'AltLeft', 'Fn', 'CapsLock', 'ArrowUp', 'ArrowLeft', 'Escape', 'PageUp', 'PageDown', 'End', 'Delete'];
    silent.forEach((c) => expect(applyKeyToText('x', key(c), { shift: true, caps: true })).toBe('x'));
    expect(isShiftKey(key('ShiftRight'))).toBe(true);
    expect(isShiftKey(key('KeyA'))).toBe(false);
  });

  it('keeps the text bounded', () => {
    const long = 'a'.repeat(MAX_TEXT);
    expect(applyKeyToText(long, key('KeyB'), off)).toHaveLength(MAX_TEXT);
    expect(applyKeyToText(long, key('KeyB'), off).endsWith('b')).toBe(true);
  });
});

describe('unbox landing spots', () => {
  const rects = partSlots.map((s) => ({ id: s.id, ...slotRect(s) }));
  const gap = 12;

  it('has one slot per part, in unpacking order', () => {
    expect(partSlots.map((s) => s.id)).toEqual(unboxParts.map((p) => p.id));
    expect(new Set(partSlots.map((s) => `${s.x},${s.y}`)).size).toBe(partSlots.length);
  });

  it('keeps every part inside the scene', () => {
    rects.forEach((r) => {
      expect(r.l, r.id).toBeGreaterThanOrEqual(0);
      expect(r.t, r.id).toBeGreaterThanOrEqual(0);
      expect(r.r, r.id).toBeLessThanOrEqual(SCENE_W);
      expect(r.b, r.id).toBeLessThanOrEqual(SCENE_H - 30);
    });
  });

  it('never overlaps the box, the open lid or another part', () => {
    const lid = lidQuad(LID_OPEN_DEG);
    rects.forEach((r, i) => {
      const poly = rectCorners(r);
      expect(polygonsOverlap(poly, BOX_HULL, gap), `${r.id} vs box`).toBe(false);
      expect(polygonsOverlap(poly, lid, gap), `${r.id} vs lid`).toBe(false);
      rects.slice(i + 1).forEach((o) => expect(polygonsOverlap(poly, rectCorners(o), gap), `${r.id} vs ${o.id}`).toBe(false));
    });
  });

  it('varies the resting tilt so parts do not look stacked', () => {
    expect(new Set(partSlots.map((s) => Math.sign(s.rz))).size).toBe(2);
    expect(new Set(partSlots.map((s) => Math.sign(s.ry))).size).toBe(2);
  });
});

describe('unbox pile', () => {
  const rects = partSlots.map((s) => ({ id: s.id, ...boxRect(s) }));

  it('keeps every part centre inside the opening of the box', () => {
    partSlots.forEach((s) => expect(pointInPolygon([s.box.x, s.box.y], quadPoints()), s.id).toBe(true));
  });

  it('piles parts on top of each other rather than spacing them out', () => {
    const touching = rects.filter((r, i) => rects.some((o, j) => i !== j && r.l < o.r && r.r > o.l && r.t < o.b && r.b > o.t));
    expect(touching.length).toBeGreaterThanOrEqual(7);
  });

  it('tilts the pile differently part to part', () => {
    expect(new Set(partSlots.map((s) => s.box.rz)).size).toBe(partSlots.length);
  });
});

describe('unbox lid', () => {
  it('starts as the photo and ends hinged up and back along the far edge', () => {
    const rest = lidQuad(0);
    quadPoints().forEach((p, i) => expect(rest[i][0]).toBeCloseTo(p[0], 6));
    const open = lidQuad(LID_OPEN_DEG);
    expect(open[0]).toEqual(QUAD.L);
    expect(open[1]).toEqual(QUAD.T);
    expect(open[2][1]).toBeLessThan(QUAD.T[1]);
    expect(open[3][1]).toBeLessThan(QUAD.L[1]);
  });

  it('maps the sealed lid exactly onto its corners and stays finite', () => {
    const h = homography(quadPoints(), lidQuad(LID_OPEN_DEG));
    lidQuad(LID_OPEN_DEG).forEach((q, i) => {
      const [x, y] = applyHomography(h, quadPoints()[i]);
      expect(x).toBeCloseTo(q[0], 3);
      expect(y).toBeCloseTo(q[1], 3);
    });
    for (let d = 0; d <= LID_OPEN_DEG; d += 10) expect(lidMatrix3d(d)).not.toMatch(/NaN|Infinity/);
  });

  it('shows the printed face first and the plain underside once past edge-on', () => {
    expect(lidShowsUnderside(0)).toBe(false);
    expect(lidShowsUnderside(LID_OPEN_DEG)).toBe(true);
  });
});
