"""Exports the sealed-box photograph as the unbox stage.

Original R0002874 (the 3/4 view of the sealed box on the wooden floor) is read only. Its pixels are
untouched: the frame is only extended upward by PAD units so the lid has headroom when it hinges
open. The extension continues the floor's own grain (top rows, smeared upward) and fades to ink.
Run from the project root: python3 tools/box/make_scene.py [originals_dir]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '/Users/julia/Downloads/images')
OUT = Path('public/images/box')
OUT.mkdir(parents=True, exist_ok=True)
PROVENANCE = Path('provenance/images/box')
PROVENANCE.mkdir(parents=True, exist_ok=True)

UNIT = 4            # original pixels per scene unit (scene is 1500 units wide)
PAD = 250           # scene units added above the photo
EXPORT_W = 2400     # 1.6 px per unit
INK = np.array([16, 20, 17], dtype=np.float32)

photo = Image.open(SRC / 'R0002874.jpg').convert('RGB')
assert photo.size == (6000, 4000)
a = np.asarray(photo).astype(np.float32)
pad_px = PAD * UNIT

# Floor grain runs mostly vertically, so smearing the top rows upward continues it naturally.
top = a[0:24].mean(axis=0)
ext = np.empty((pad_px, a.shape[1], 3), np.float32)
base = Image.fromarray(np.clip(top[None], 0, 255).astype(np.uint8)).resize((a.shape[1], pad_px), Image.NEAREST)
ext[:] = np.asarray(base).astype(np.float32)
levels = []
for sigma in (0, 6, 18, 48):
    img = Image.fromarray(np.clip(ext, 0, 255).astype(np.uint8))
    levels.append(np.asarray(img.filter(ImageFilter.GaussianBlur(sigma))).astype(np.float32) if sigma else ext.copy())
d = np.linspace(1, 0, pad_px, dtype=np.float32)[:, None, None]  # 0 at the seam, 1 at the very top
blurred = np.where(d < 0.34, levels[1], np.where(d < 0.67, levels[2], levels[3]))
t = np.clip(d, 0, 1)
ext = levels[0] * (1 - np.clip(t * 3, 0, 1)) + blurred * np.clip(t * 3, 0, 1)
fade = (t ** 1.6) * 0.72
ext = ext * (1 - fade) + INK * fade
# Hide the seam: blend the last rows of the extension into the photo's first rows.
seam = 40
w = np.linspace(0, 1, seam, dtype=np.float32)[:, None, None]
ext[-seam:] = ext[-seam:] * (1 - w) + a[0:1] * w

full = np.concatenate([ext, a], axis=0)
scene = Image.fromarray(np.clip(full, 0, 255).astype(np.uint8))
height = round(EXPORT_W * (full.shape[0] / full.shape[1]))
scene = scene.resize((EXPORT_W, height), Image.LANCZOS)
scene.save(OUT / 'scene.webp', quality=88, method=6)
(PROVENANCE / 'scene.webp.json').write_text(json.dumps({
    'prompt': 'Source: photograph R0002874 (sealed Bauer Lite blind box, 3/4 view on a wooden floor), exported at 1.6 px per layout unit. The photo is not cropped, warped or recoloured; only a 250-unit strip is added above it, continuing the floor grain and fading to ink, so the lid has room to open. Original untouched. No image generation.',
    'createdAt': '2026-10-21T20:00:00.000Z',
}, indent=2) + '\n')
print(scene.size)
