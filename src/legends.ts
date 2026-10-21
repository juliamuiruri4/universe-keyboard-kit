import type { IconId, KeySpec } from './layout';

const SANS = '"Mona Sans", system-ui, sans-serif';
const MONO = '"Mona Sans", ui-monospace, monospace';

export interface CapPaint {
  body: string;
  ink: string;
}

const GITHUB_MARK =
  'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z';
const githubPath = typeof Path2D === 'undefined' ? null : new Path2D(GITHUB_MARK);

function blockArrow(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(8, 1.5);
  ctx.lineTo(14, 9);
  ctx.lineTo(10, 9);
  ctx.lineTo(10, 14.5);
  ctx.lineTo(6, 14.5);
  ctx.lineTo(6, 9);
  ctx.lineTo(2, 9);
  ctx.closePath();
  ctx.fill();
}

/** Four chevrons pointing at a small centre square, on a 16-unit grid. */
export function drawOmnitypeMark(ctx: CanvasRenderingContext2D) {
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  for (let i = 0; i < 4; i += 1) {
    ctx.save();
    ctx.translate(8, 8);
    ctx.rotate((i * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(-4.2, -7);
    ctx.lineTo(0, -3.2);
    ctx.lineTo(4.2, -7);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillRect(6.9, 6.9, 2.2, 2.2);
}

/** Draws a 16-unit icon centred on (cx, cy) at the given pixel size. */
export function drawIcon(
  ctx: CanvasRenderingContext2D, icon: IconId, cx: number, cy: number, size: number, paint: CapPaint,
) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 16, size / 16);
  ctx.fillStyle = paint.ink;
  ctx.strokeStyle = paint.ink;
  switch (icon) {
    case 'github':
      if (githubPath) ctx.fill(githubPath);
      break;
    case 'omnitype':
      drawOmnitypeMark(ctx);
      break;
    case 'duck':
      ctx.beginPath();
      ctx.ellipse(7, 10.2, 5.6, 3.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10.4, 5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(12.8, 4.2); ctx.lineTo(15.8, 5.4); ctx.lineTo(12.8, 6.6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(1.2, 8.2); ctx.lineTo(3.2, 9.4); ctx.lineTo(1.6, 11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = paint.body;
      ctx.beginPath();
      ctx.arc(10.9, 4.4, 0.7, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'checker':
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          if ((r + c) % 2 === 0) ctx.fillRect(2.5 + c * 4, 2.5 + r * 4, 4, 4);
        }
      }
      break;
    case 'prompt':
      ctx.font = `700 13px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('>_', 8, 8.6);
      break;
    case 'up':
      blockArrow(ctx);
      break;
    case 'down':
      ctx.translate(8, 8); ctx.rotate(Math.PI); ctx.translate(-8, -8);
      blockArrow(ctx);
      break;
    case 'left':
      ctx.translate(8, 8); ctx.rotate(-Math.PI / 2); ctx.translate(-8, -8);
      blockArrow(ctx);
      break;
    case 'right':
      ctx.translate(8, 8); ctx.rotate(Math.PI / 2); ctx.translate(-8, -8);
      blockArrow(ctx);
      break;
  }
  ctx.restore();
}

/** Paints the keycap top. The canvas covers the flat top face only. */
export function drawLegend(
  ctx: CanvasRenderingContext2D, key: KeySpec, w: number, h: number, paint: CapPaint,
) {
  ctx.fillStyle = paint.body;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = paint.ink;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const pad = h * 0.1;
  const legend = key.legend;
  switch (legend.kind) {
    case 'alpha':
      ctx.font = `600 ${h * 0.46}px ${SANS}`;
      ctx.fillText(legend.text, pad, h * 0.5);
      break;
    case 'dual':
      ctx.font = `600 ${h * 0.34}px ${SANS}`;
      ctx.fillText(legend.top, pad, h * 0.4);
      ctx.fillText(legend.bottom, pad, h * 0.85);
      break;
    case 'label': {
      const size = legend.text.length > 5 ? h * 0.2 : h * 0.26;
      ctx.font = `600 ${size}px ${SANS}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(legend.text, pad, h * 0.3);
      if (legend.corner) {
        ctx.font = `600 ${h * 0.24}px ${SANS}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(legend.corner, w - pad, h * 0.9);
      }
      break;
    }
    case 'icon': {
      const arrow = ['up', 'down', 'left', 'right'].includes(legend.icon);
      drawIcon(ctx, legend.icon, w / 2, h / 2, h * (arrow ? 0.46 : 0.58), paint);
      break;
    }
    case 'novelty': {
      let size = h * 0.5;
      ctx.font = `800 ${size}px ${SANS}`;
      const width = ctx.measureText(legend.text).width;
      size = Math.min(size, size * ((w * 0.88) / width));
      ctx.font = `800 ${size}px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(legend.text, w / 2, h / 2 + size * 0.04);
      break;
    }
    case 'blank':
      break;
  }
}
