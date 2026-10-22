import { keys, type KeySpec } from './layout';

export interface Mods {
  shift: boolean;
  caps: boolean;
}

export const TAB_WIDTH = 4;
export const MAX_TEXT = 2000;

/** What one key press does to the typed text. Keys without a printed character leave it unchanged. */
export function applyKeyToText(text: string, key: KeySpec, mods: Mods): string {
  let next = text;
  switch (key.code) {
    case 'Backspace':
      return Array.from(text).slice(0, -1).join('');
    case 'Space':
      next = `${text} `;
      break;
    case 'Enter':
      next = `${text}\n`;
      break;
    case 'Tab':
      next = text + ' '.repeat(TAB_WIDTH);
      break;
    default: {
      const { legend } = key;
      if (legend.kind === 'alpha') {
        const upper = mods.shift !== mods.caps;
        next = text + (upper ? legend.text.toUpperCase() : legend.text.toLowerCase());
      } else if (legend.kind === 'dual') {
        next = text + (mods.shift ? legend.top : legend.bottom);
      } else {
        return text;
      }
    }
  }
  return next.length > MAX_TEXT ? next.slice(next.length - MAX_TEXT) : next;
}

export const isShiftKey = (key: KeySpec) => key.code === 'ShiftLeft' || key.code === 'ShiftRight';

export interface TextEdit {
  added: string;
  removed: string;
}

/** The smallest edit that turns `before` into `after`, so autocorrect and composition never double-count. */
export function diffText(before: string, after: string): TextEdit {
  const a = Array.from(before);
  const b = Array.from(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  return { removed: a.slice(start, endA).join(''), added: b.slice(start, endB).join('') };
}

/** The key that prints exactly this character, or -1. Characters the layout cannot print never map. */
export function keyIndexForChar(char: string): number {
  if (char === ' ') return keys.findIndex((k) => k.code === 'Space');
  if (char === '\n') return keys.findIndex((k) => k.code === 'Enter');
  return keys.findIndex(({ legend }) => {
    if (legend.kind === 'alpha') return char === legend.text.toLowerCase() || char === legend.text.toUpperCase();
    if (legend.kind === 'dual') return legend.top === char || legend.bottom === char;
    return false;
  });
}

/** The single key a software-keyboard edit reliably came from, or -1 for replacements, pastes and unknown characters. */
export function keyIndexForEdit({ added, removed }: TextEdit): number {
  if (removed === '' && Array.from(added).length === 1) return keyIndexForChar(added);
  if (added === '' && Array.from(removed).length === 1) return keys.findIndex((k) => k.code === 'Backspace');
  return -1;
}
