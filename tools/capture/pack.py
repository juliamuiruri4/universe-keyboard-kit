"""Crops the raw captures to their alpha bounds, downsizes them and writes optimized WebP sprites.

Usage: python3 tools/capture/pack.py   (needs Pillow and cwebp)
"""
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

RAW = Path('.work/sprites')
OUT = Path('public/images/parts')
OUT.mkdir(parents=True, exist_ok=True)
PROVENANCE = Path('provenance/images/parts')
PROVENANCE.mkdir(parents=True, exist_ok=True)
# Longest edge in px; sprites show at <= ~half of this, so they stay crisp at 2x.
SIZES = {
    'housing': 760, 'pcb': 520, 'dampener': 600, 'stabilizers': 400,
    'switches': 400, 'keycaps': 440, 'screws': 300, 'white-box': 400,
}
NOTE = (
    'Rendered from this project\'s own Three.js keyboard model (tools/capture) on a transparent '
    'background, cropped and optimized to WebP. Not a photograph. No image generation.'
)

for name, size in SIZES.items():
    src = RAW / f'{name}.png'
    if not src.exists():
        continue
    im = Image.open(src).convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    im = im.crop(box)
    scale = size / max(im.size)
    if scale < 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    png = RAW / f'{name}.crop.png'
    im.save(png)
    dest = OUT / f'{name}.webp'
    subprocess.run(['cwebp', '-q', '90', '-alpha_q', '100', '-m', '6', '-metadata', 'none', str(png), '-o', str(dest)],
                   check=True, capture_output=True)
    note = f'Part sprite "{name}". {NOTE}'
    (PROVENANCE / f'{name}.webp.json').write_text(json.dumps({
        'prompt': note,
        'createdAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z'),
    }, indent=2) + '\n')
    print(name, im.size, dest.stat().st_size)
