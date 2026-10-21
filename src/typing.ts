import type { KeySpec } from './layout';

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
