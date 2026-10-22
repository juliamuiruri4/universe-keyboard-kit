import { test, expect, type Page } from '@playwright/test';
import { galleryPhotos } from '../src/gallery';
import { initialState, KEY_COUNT, STORAGE_KEY, VIDEO_ID } from '../src/keyboard';
import { BOX_HULL, polygonsOverlap, SCENE_H, SCENE_W } from '../src/unboxLayout';

test.use({ reducedMotion: 'reduce' });

const panel = (page: Page) => page.locator('.panel');
const readyBoard = async (page: Page) => {
  await page.goto('/');
  await expect(page.locator('.board[data-ready="true"]')).toBeAttached({ timeout: 30_000 });
};
const unpack = async (page: Page) => {
  await panel(page).getByRole('button', { name: 'Open box' }).click();
  await panel(page).getByRole('button', { name: 'Take out all' }).click();
  await expect(panel(page).getByRole('heading', { name: 'Stabilizers' })).toBeVisible();
};
const finish = async (page: Page) => {
  if (await panel(page).getByRole('heading', { name: 'Open your kit' }).count()) await unpack(page);
  const primary = panel(page).locator('.primary');
  while (await primary.count()) await primary.click();
  await expect(panel(page).getByRole('heading', { name: 'Test it' })).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => { throw error; });
});

test('first viewport shows the keyboard and the next action', async ({ page }) => {
  await readyBoard(page);
  const canvas = await page.locator('.board-canvas').boundingBox();
  expect(canvas!.height).toBeGreaterThan(180);
  await expect(panel(page).locator('.primary')).toBeInViewport();
  await expect(panel(page).getByRole('heading', { name: 'Open your kit' })).toBeVisible();
  await expect(page.locator('.unbox [role="button"]')).toBeInViewport();
  await expect(panel(page).locator('.primary')).toHaveText('Open box');
  await expect(page.locator('a[href*="youtu"]')).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('assembles with single parts, then with fill actions', async ({ page }) => {
  await readyBoard(page);
  await unpack(page);
  await expect(page.locator('.unbox')).toHaveCount(0);

  await page.getByRole('button', { name: 'Seat Enter stabilizer' }).click();
  await expect(panel(page).locator('.progress-text')).toHaveText('1 / 3 stabilizers');
  await panel(page).getByRole('button', { name: 'Seat all' }).click();

  await expect(panel(page).getByRole('button', { name: 'Add dampener' })).toBeVisible();
  await panel(page).getByRole('button', { name: 'Add dampener' }).click();
  await panel(page).getByRole('button', { name: 'Add plate' }).click();
  await page.getByRole('button', { name: 'Seat Q switch' }).click();
  await expect(panel(page).locator('.progress-text')).toHaveText(`1 / ${KEY_COUNT} switches`);
  await panel(page).getByRole('button', { name: 'Seat all' }).click();

  await panel(page).getByRole('button', { name: 'Add bottom housing' }).click();
  await panel(page).getByRole('button', { name: 'Add top housing' }).click();

  await page.getByRole('button', { name: 'Tighten case screw 1' }).click();
  await expect(panel(page).locator('.progress-text')).toHaveText('1 / 4 screws');
  await panel(page).getByRole('button', { name: 'Tighten all' }).click();

  await page.getByRole('button', { name: 'Add Q keycap' }).click();
  await expect(panel(page).locator('.progress-text')).toHaveText(`1 / ${KEY_COUNT} keycaps`);
  await panel(page).getByRole('button', { name: 'Add all keycaps' }).click();
  await expect(panel(page).getByRole('heading', { name: 'Test it' })).toBeVisible();
  await expect(panel(page).locator('.primary')).toHaveCount(0);
});

test('undo, start over and persistence', async ({ page }) => {
  await readyBoard(page);
  await expect(panel(page).getByRole('button', { name: 'Undo' })).toBeDisabled();
  await unpack(page);
  await panel(page).getByRole('button', { name: 'Seat all' }).click();
  await panel(page).getByRole('button', { name: 'Undo' }).click();
  await expect(panel(page).locator('.progress-text')).toHaveText('0 / 3 stabilizers');

  await page.reload();
  await expect(panel(page).getByRole('heading', { name: 'Stabilizers' })).toBeVisible();

  await finish(page);
  await page.reload();
  await expect(panel(page).getByRole('heading', { name: 'Test it' })).toBeVisible();

  await panel(page).getByRole('button', { name: 'Start over' }).click();
  await panel(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(panel(page).getByRole('heading', { name: 'Test it' })).toBeVisible();
  await panel(page).getByRole('button', { name: 'Start over' }).click();
  await panel(page).getByRole('button', { name: 'Erase build' }).click();
  await expect(panel(page).getByRole('heading', { name: 'Open your kit' })).toBeVisible();
  await page.reload();
  await expect(panel(page).getByRole('heading', { name: 'Open your kit' })).toBeVisible();
});

test('tests keys by touch or click and with the physical keyboard', async ({ page, isMobile }) => {
  await readyBoard(page);
  await finish(page);
  const readout = panel(page).locator('.tester');
  await expect(readout).toContainText(`0 / ${KEY_COUNT}`);
  await page.getByRole('button', { name: 'Test Q', exact: true }).click();
  await expect(readout).toContainText(`1 / ${KEY_COUNT}`);
  if (!isMobile) {
    await page.keyboard.press('a');
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('a');
    await expect(readout).toContainText(`4 / ${KEY_COUNT}`);
  }
  await readout.getByRole('button', { name: 'Clear' }).click();
  await expect(readout).toContainText(`0 / ${KEY_COUNT}`);
});

test('sound is off until switched on, then clicks on every step', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { clicks: number };
    w.clicks = 0;
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      w.clicks++;
      return create.call(this);
    };
  });
  await readyBoard(page);
  const clicks = () => page.evaluate(() => (window as unknown as { clicks: number }).clicks);
  const toggle = panel(page).getByRole('button', { name: /^Sound/ });
  await expect(toggle).toHaveText(/Sound off/);
  await panel(page).getByRole('button', { name: 'Open box' }).click();
  expect(await clicks()).toBe(0);
  await toggle.click();
  await expect(toggle).toHaveText(/Sound on/);
  await panel(page).getByRole('button', { name: 'Take out all' }).click();
  expect(await clicks()).toBe(1);
  await expect(panel(page).getByRole('heading', { name: 'Stabilizers' })).toBeVisible();
  await panel(page).locator('.primary').click();
  expect(await clicks()).toBe(2);
  await finish(page);
  await page.getByRole('button', { name: 'Test W', exact: true }).click();
  await expect.poll(clicks).toBeGreaterThan(3);
});

test('types into the preview from the physical keyboard and by click', async ({ page, isMobile }) => {
  await readyBoard(page);
  await finish(page);
  const preview = panel(page).getByRole('textbox', { name: 'Typing preview' });
  const typed = () => preview.inputValue();
  await expect(panel(page).locator('.tester [aria-live], .tester [role="status"]')).toHaveCount(0);
  expect(await typed()).toBe('');

  await page.getByRole('button', { name: 'Test H', exact: true }).click();
  await page.getByRole('button', { name: 'Test I', exact: true }).click();
  expect(await typed()).toBe('hi');
  await page.getByRole('button', { name: 'Test Left Shift' }).click();
  await expect(panel(page).locator('.chip')).toHaveText('Shift');
  await page.getByRole('button', { name: 'Test 1', exact: true }).click();
  await page.getByRole('button', { name: 'Test Space' }).click();
  await page.getByRole('button', { name: 'Test Left Shift' }).click();
  await page.getByRole('button', { name: 'Test H', exact: true }).click();
  expect(await typed()).toBe('hi! H');
  await expect(panel(page).locator('.chip')).toHaveCount(0);
  await page.getByRole('button', { name: 'Test GitHub icon' }).click();
  await page.getByRole('button', { name: 'Test Omnitype icon' }).click();
  expect(await typed()).toBe('hi! ');
  await expect(panel(page).locator('.tester')).toContainText(`7 / ${KEY_COUNT}`);

  if (!isMobile) {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Shift+g');
    await page.keyboard.press('i');
    await page.keyboard.press('t');
    await page.keyboard.press('Shift+1');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Delete');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('x');
    expect(await typed()).toBe('hi! Git\nx');
    await expect(page.locator('.board [data-spot^="test-"].is-tested').first()).toBeAttached();
  }

  await expect.poll(() => page.locator('.caret').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await panel(page).locator('.tester').getByRole('button', { name: 'Clear' }).click();
  expect(await typed()).toBe('');
  await expect(panel(page).locator('.tester')).toContainText(`0 / ${KEY_COUNT}`);
});

test('software keyboard input types into the preview and maps keys without duplicates', async ({ page }) => {
  await readyBoard(page);
  await finish(page);
  const tester = panel(page).locator('.tester');
  const preview = tester.getByRole('textbox', { name: 'Typing preview' });
  await tester.locator('.typed').click();
  await expect(preview).toBeFocused();
  expect(await preview.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');

  // Software keyboards deliver text without key codes, so insertText fires only input events.
  await page.keyboard.insertText('h');
  await page.keyboard.insertText('i');
  await expect(preview).toHaveValue('hi');
  await expect(tester).toContainText(`2 / ${KEY_COUNT}`);
  await page.keyboard.insertText(' ');
  await page.keyboard.insertText('\n');
  await page.keyboard.insertText('!');
  await expect(preview).toHaveValue('hi \n!');
  await expect(tester).toContainText(`5 / ${KEY_COUNT}`);

  // Unsupported characters reach the text but count no key; autocorrect-style replacements count none either.
  await page.keyboard.insertText('é');
  await expect(preview).toHaveValue('hi \n!é');
  await expect(tester).toContainText(`5 / ${KEY_COUNT}`);
  await preview.fill('hi \n!hello');
  await expect(preview).toHaveValue('hi \n!hello');
  await expect(tester).toContainText(`5 / ${KEY_COUNT}`);

  await preview.press('Backspace');
  await preview.press('Backspace');
  await preview.press('Backspace');
  await expect(preview).toHaveValue('hi \n!he');
  await expect(tester).toContainText(`6 / ${KEY_COUNT}`);
  await expect(tester.locator('.tester-last')).toHaveText('GitHub icon');

  // Simulated keys keep working and stay in sync with the field.
  await page.getByRole('button', { name: 'Test Q', exact: true }).click();
  await expect(preview).toHaveValue('hi \n!heq');
  await preview.press('Backspace');
  await expect(preview).toHaveValue('hi \n!he');

  // Composition is credited once, when committed; pasted single characters are not credited.
  await preview.evaluate((el: HTMLTextAreaElement) => {
    const set = (v: string) => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, v);
      el.setSelectionRange(v.length, v.length);
    };
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    set(el.value + 'z');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }));
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    set(el.value + 'w');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
  });
  await expect(preview).toHaveValue('hi \n!hezw');
  await expect(tester).toContainText(`8 / ${KEY_COUNT}`);
  await preview.press('Backspace');
  await preview.press('Backspace');

  // A physical keypress is handled once, not also as input.
  await page.keyboard.press('a');
  await expect(preview).toHaveValue('hi \n!hea');

  // A single character committed at the text limit still earns its key.
  await preview.fill('a'.repeat(2000));
  const compose = (chars: string[]) => preview.evaluate(async (el: HTMLTextAreaElement, steps: string[]) => {
    const base = el.value;
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    for (const c of steps) {
      setValue.call(el, base + c);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  }, chars);
  await compose(['x', 'y']);
  await expect(tester).toContainText(`10 / ${KEY_COUNT}`);

  // A simulated-key tap during composition is kept when the composition ends.
  await preview.evaluate((el: HTMLTextAreaElement) => {
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, el.value + 'm');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }));
  });
  await page.getByRole('button', { name: 'Test Q', exact: true }).click();
  await preview.evaluate((el) => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
  expect(await preview.inputValue()).toMatch(/mq$/);

  await tester.getByRole('button', { name: 'Clear' }).click();
  await expect(preview).toHaveValue('');
  await expect(tester).toContainText(`0 / ${KEY_COUNT}`);
});

test('every key has a cap and a test spot, and the two blockers are labelled hardware', async ({ page }) => {
  await readyBoard(page);
  await unpack(page);
  while (!(await panel(page).getByRole('heading', { name: 'Keycaps' }).count())) await panel(page).locator('.primary').click();
  await expect(page.locator('.board [data-spot^="cap-"]')).toHaveCount(KEY_COUNT);
  await expect(page.getByRole('img', { name: 'Blocker' })).toHaveCount(2);
  await panel(page).getByRole('button', { name: 'Add all keycaps' }).click();
  await expect(page.locator('.board [data-spot^="test-"]')).toHaveCount(KEY_COUNT);
  await expect(page.getByRole('img', { name: 'Blocker' })).toHaveCount(2);
  await expect(page.getByRole('img', { name: 'Blocker' }).first()).toHaveAttribute('title', 'Blocker');
});

test('unbox shows the real box photo and lands each part at its own spot', async ({ page }) => {
  await readyBoard(page);
  await expect(page.locator('.u-photo')).toHaveAttribute('src', /images\/box\/scene\.webp$/);
  await expect(page.locator('.u-lid')).toHaveCount(2);
  const imagesLoad = await page.locator('.unbox img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0));
  expect(imagesLoad.every(Boolean)).toBe(true);

  await panel(page).getByRole('button', { name: 'Open box' }).click();
  for (let i = 0; i < 7; i += 1) await panel(page).locator('.primary').click();
  await expect(panel(page).locator('.progress-text')).toHaveText('7 / 8 parts');
  const parts = page.locator('.u-part');
  await expect(parts).toHaveCount(8);
  await expect(page.locator('.u-part.is-out')).toHaveCount(7);
  const names = await parts.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(names.every((n) => n && n.length > 2)).toBe(true);

  const snapshot = () => page.evaluate(() => {
    const rect = (el: Element) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    return {
      scene: rect(document.querySelector('.u-scene')!),
      imgs: [...document.querySelectorAll('.u-part img')].map(rect),
    };
  });
  const measure = async () => {
    let last = JSON.stringify(await snapshot());
    for (let i = 0; i < 40; i += 1) {
      await page.waitForTimeout(150);
      const now = JSON.stringify(await snapshot());
      if (now === last) break;
      last = now;
    }
    return snapshot();
  };
  const hit = (a: { l: number; t: number; r: number; b: number }, b: { l: number; t: number; r: number; b: number }) =>
    a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  for (const [w, h] of [[1440, 1000], [854, 900], [390, 664]]) {
    await page.setViewportSize({ width: w, height: h });
    const m = await measure();
    const k = (m.scene.r - m.scene.l) / SCENE_W;
    expect((m.scene.b - m.scene.t) / k, `scene aspect at ${w}`).toBeCloseTo(SCENE_H, -1);
    const hull = BOX_HULL.map(([x, y]) => [m.scene.l + x * k, m.scene.t + y * k] as [number, number]);
    m.imgs.forEach((r, i) => {
      const corners: [number, number][] = [[r.l, r.t], [r.r, r.t], [r.r, r.b], [r.l, r.b]];
      expect(polygonsOverlap(corners, hull), `part ${i} overlaps the box at ${w}`).toBe(false);
      expect(r.l, `part ${i} inside scene at ${w}`).toBeGreaterThanOrEqual(m.scene.l - 1);
      expect(r.r, `part ${i} right at ${w}`).toBeLessThanOrEqual(m.scene.r + 1);
      expect(r.t, `part ${i} top at ${w}`).toBeGreaterThanOrEqual(m.scene.t - 1);
      expect(r.b, `part ${i} bottom at ${w}`).toBeLessThanOrEqual(m.scene.b + 1);
      m.imgs.slice(i + 1).forEach((o, j) => expect(hit(r, o), `parts ${i} and ${i + 1 + j} overlap at ${w}`).toBe(false));
    });
  }

  await page.setViewportSize({ width: 390, height: 664 });
  await expect.poll(async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    return page.evaluate(() => {
      const fits = (sel: string) => { const r = document.querySelector(sel)!.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; };
      return fits('.u-box') && fits('.panel .primary');
    });
  }, { message: 'box and primary button fit in the 390x664 first viewport', timeout: 15_000 }).toBe(true);

  const placed = async () => { const m = await measure(); return m.imgs.map((r) => [r.l - m.scene.l, r.t - m.scene.t].map(Math.round)); };
  const before = await placed();
  await page.reload();
  await expect(page.locator('.u-part.is-out')).toHaveCount(7);
  const after = await placed();
  expect(after).toEqual(before);
});

test('switches between assembled and exploded views', async ({ page }) => {
  await readyBoard(page);
  await page.getByRole('button', { name: 'Exploded', exact: true }).click();
  await expect(page.locator('.board')).toHaveAttribute('data-view', 'exploded');
  await expect(page.getByRole('button', { name: 'Exploded', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.board [data-spot]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Assembled', exact: true }).click();
  await expect(page.locator('.board')).toHaveAttribute('data-view', 'build');
  await expect(page.locator('.unbox [role="button"]')).toBeVisible();
});

test('unboxes from the sealed box in order, by keyboard, with undo and persistence', async ({ page }) => {
  await readyBoard(page);
  const packed = () => page.evaluate(() => [...document.querySelectorAll('.u-in')]
    .filter((e) => { const c = getComputedStyle(e); return c.visibility === 'visible' && Number(c.opacity) > 0.9; })
    .map((e) => e.getAttribute('data-in')));
  const box = page.locator('.unbox [role="button"]');
  await expect.poll(packed, { message: 'sealed box shows no parts', timeout: 15_000 }).toEqual([]);
  await expect(box).toHaveAccessibleName('Open box');
  await expect(page.locator('.u-part.is-out, .u-part.is-lifting')).toHaveCount(0);
  await expect(panel(page).locator('.progress-text')).toHaveCount(0);

  await box.focus();
  await page.keyboard.press('Enter');
  await expect(panel(page).locator('.progress-text')).toHaveText('0 / 8 parts');
  await expect(box).toHaveAccessibleName('Take out housing and plate');
  await expect(panel(page).getByRole('button', { name: 'Seat all' })).toHaveCount(0);
  await expect.poll(packed, { message: 'open box holds all 8 parts', timeout: 15_000 }).toHaveLength(8);

  await page.keyboard.press('Space');
  await expect(box).toHaveAccessibleName('Take out white box');
  await expect.poll(packed, { timeout: 15_000 }).toEqual(['white-box', 'pcb', 'dampener', 'stabilizers', 'switches', 'keycaps', 'screws']);
  await panel(page).locator('.primary').click();
  await expect(panel(page).locator('.progress-text')).toHaveText('2 / 8 parts');
  await expect.poll(packed, { timeout: 15_000 }).toHaveLength(6);
  await expect(page.locator('.u-part.is-out, .u-part.is-lifting')).toHaveCount(2);
  await expect(panel(page).locator('.primary')).toHaveText('Take out PCB');

  await panel(page).getByRole('button', { name: 'Undo' }).click();
  await expect(panel(page).locator('.progress-text')).toHaveText('1 / 8 parts');
  await expect(page.locator('.u-part.is-out')).toHaveCount(1);
  await expect.poll(packed, { message: 'undo puts the part back in the box', timeout: 15_000 }).toHaveLength(7);
  await panel(page).locator('.primary').click();

  await page.reload();
  await expect(panel(page).locator('.progress-text')).toHaveText('2 / 8 parts');
  await expect(page.locator('.u-part.is-out')).toHaveCount(2);
  await expect.poll(packed, { message: 'reload restores what is still inside', timeout: 15_000 }).toEqual(['pcb', 'dampener', 'stabilizers', 'switches', 'keycaps', 'screws']);

  for (let i = 2; i < 8; i += 1) await panel(page).locator('.primary').click();
  await expect(panel(page).getByRole('heading', { name: 'Stabilizers' })).toBeVisible();
  await expect(page.locator('.unbox')).toHaveCount(0);
  await page.reload();
  await expect(panel(page).getByRole('heading', { name: 'Stabilizers' })).toBeVisible();
  await expect(page.locator('.unbox')).toHaveCount(0);

  await panel(page).getByRole('button', { name: 'Start over' }).click();
  await panel(page).getByRole('button', { name: 'Erase build' }).click();
  await expect(box).toHaveAccessibleName('Open box');
});

test('keycap colors are limited to Dark and Light and persist', async ({ page }) => {
  await readyBoard(page);
  const group = page.getByRole('group', { name: 'Keycaps' });
  await expect(group.getByRole('button')).toHaveText(['Dark', 'Light']);
  await expect(group.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'Light' }).click();
  await page.reload();
  await expect(group.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/lilac|mint|peach|daydream/i);
});

test('a corrupt save is explained and replaced only after Start over', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((k) => localStorage.setItem(k, '{broken'), STORAGE_KEY);
  await page.reload();
  await expect(panel(page).locator('.notice')).toContainText('could not be restored');
  await panel(page).getByRole('button', { name: 'Open box' }).click();
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBe('{broken');
  await panel(page).getByRole('button', { name: 'Start over' }).click();
  await panel(page).getByRole('button', { name: 'Erase build' }).click();
  await expect(panel(page).getByRole('heading', { name: 'Open your kit' })).toBeVisible();
  const saved = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
  expect(JSON.parse(saved!)).toEqual(initialState);
});

test('guide has exactly one click-to-play video and no other video links', async ({ page }) => {
  await page.goto('/#/guide');
  await expect(page.getByRole('heading', { name: 'Guide', level: 1 })).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play video' }).click();
  const frame = page.locator('iframe');
  await expect(frame).toHaveCount(1);
  await expect(frame).toHaveAttribute('src', new RegExp(VIDEO_ID));
  await expect(page.locator('a[href*="youtu"]')).toHaveCount(0);
  await expect(page.getByText(/watch this step|chapter/i)).toHaveCount(0);
  await expect(page.locator('.guide-steps li')).toHaveCount(6);
});

test('no route links to the video and only the guide embeds it', async ({ page }) => {
  for (const hash of ['#/', '#/photos', '#/guide']) {
    await page.goto(`/${hash}`);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('a[href*="youtu"]')).toHaveCount(0);
    await expect(page.locator('iframe[src*="youtu"]')).toHaveCount(0);
  }
});

test('photos page shows all photos and a keyboard-operable viewer', async ({ page }) => {
  await page.goto('/#/photos');
  const tiles = page.getByRole('button', { name: /^Open photo \d+:/ });
  await expect(tiles).toHaveCount(galleryPhotos.length);
  await tiles.first().click();
  const viewer = page.getByRole('dialog', { name: 'Photo viewer' });
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText(`1 / ${galleryPhotos.length}`);
  await viewer.getByRole('button', { name: 'Next photo' }).click();
  await expect(viewer).toContainText(`2 / ${galleryPhotos.length}`);
  await viewer.getByRole('button', { name: 'Previous photo' }).click();
  await expect(viewer).toContainText(`1 / ${galleryPhotos.length}`);
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await expect(tiles.first()).toBeFocused();
});

test('navigation reaches every page', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Sections' });
  await nav.getByRole('link', { name: 'Guide' }).click();
  await expect(page.getByRole('heading', { name: 'Guide', level: 1 })).toBeVisible();
  await nav.getByRole('link', { name: 'Photos' }).click();
  await expect(page.getByRole('heading', { name: /Photos/, level: 1 })).toBeVisible();
  await nav.getByRole('link', { name: 'Build' }).click();
  // The WebGL board is rebuilt on return; software rendering can stall the page for several seconds.
  await expect(panel(page).getByRole('heading', { name: 'Open your kit' })).toBeVisible({ timeout: 20_000 });
});
