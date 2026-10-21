# Universe keyboard

An interactive build of the GitHub Universe Omnitype Bauer Lite keyboard kit. React, TypeScript, Vite and Three.js. Static output; no backend.

## Run

```sh
npm install
npm run dev -- --port 4173
```

Open `http://127.0.0.1:4173`. Routes are hash-based (`#/`, `#/guide`, `#/photos`), so they work on GitHub Pages.

```sh
npm test          # unit tests (34)
npm run build     # type check and production build
npm run test:e2e  # Playwright (Chromium; run `npx playwright install chromium` once)
```

## What it does

1. **Open your kit.** Starts from the sealed blind box. Open it, then take the parts out one at a time: housing and plate, white box, PCB, dampener and strips, stabilizers, switches, keycaps, screws. "Take out all" skips ahead.
2. **Assemble.** Stabilizers, dampener and plate, switches, bottom and top housing, screws, keycaps. Place parts one by one or fill the step.
3. **Test.** Press physical keys or tap the board. A typing preview shows what you type (Shift, Caps, Backspace, Enter, Tab); Clear resets it. Keys that don't print still count as tested. Sound (off by default, available on every step) adds a synthesized mechanical key click to each build action and key press.

Also: undo (30 steps), start over, assembled and exploded views, Dark and Light keycaps, and saving in local storage. Motion is skipped with `prefers-reduced-motion`. The simulator never talks to hardware.

## Sources and facts used

- Layout, key spacing and special-key shapes follow the supplied photographs (`R0002873` packaging, front and oblique shots).
- Geometry: 331.7 × 124.8 mm, 5° typing angle ([omnitype.com/products/bauer-lite](https://omnitype.com/products/bauer-lite)).
- From the [walkthrough video](https://www.youtube.com/watch?v=q3Jod8Xu8BY) transcript: Light or Dark keycaps, blue accent keycaps, blue plate, clear top housing, red bottom housing, short Backspace with no stabilizer, three stabilizers (Space, Enter, left Shift), bottom row Ctrl and Alt on the left with Function on the right, eight donut bumpers, six isolation strips, four case screws.
- Brand: GitHub colors and Mona Sans (self-hosted in `public/fonts`, with its OFL license) from brand.github.com.

## Limits

- **Colors.** The video does not give a full list of kit colors, so only Dark and Light keycaps are selectable. The housing is the photographed translucent pink-red; its official name is unknown. The plate is shown as deep blue (the video says blue; the exact shade is a judgement call).
- **Icon keys.** Which physical key carries which icon is an assumption: GitHub mark on Backspace, Omnitype on Delete, duck on Page Up, checker on Page Down, prompt on End.
- **Unboxing art.** The stage is the original sealed-box photo R0002874 as is (`images/box/scene.webp`, 2400 px wide, made by `tools/box/make_scene.py`; originals are never modified). R0002874 is the true 3/4 view; R0002871 is straight-on with no top face, so it can't show the lid opening. The only addition is a 250-unit synthetic floor strip above the frame so the stage is not cropped. The lid is a perspective warp (matrix3d) of the photo's own top-face pixels, hinged up along the far edge; once past edge-on it shows plain kraft instead of the mirrored print. The cavity, inner walls, lid underside and lid shadow are drawn in SVG/CSS with colours sampled from the photo, and their depth is estimated, not photographed. Parts are piled in the opening with the next part to take out on top (so the housing, the first step, sits above the small parts), clipped by the near rim; each one arcs out to a fixed spot on the wooden floor and the box ends empty. The parts (`images/parts/*.webp`) are transparent renders of this project's own 3D model, not photographs, and the white box is illustrative: no photo of it exists. Pile and landing positions are fixed in `src/unboxLayout.ts`. Part order follows the video.
- **Blockers.** The two gaps beside Alt and Function are the kit's 0.75u clear blockers (photo R0002895 shows them), not missing keycaps. All 66 keys render and test.
- **Likeness.** The 3D board is a hand-built model checked against photos. It is not a CAD model or photoreal.
- **Touch.** Small keys are hard to hit on a phone. The main button is the reliable path.
- **Saves.** Your build is kept in local storage. If a save cannot be read, the app says so and keeps it until you start over.
- **Image provenance.** `provenance/images/` holds a note for each exported WebP (kept out of `public/` so it isn't shipped).

## Photos

34 photographs supplied by the project owner. `public/images/` holds optimized, metadata-stripped WebP copies; originals are untouched. Titles and alt text are in `src/gallery.ts`.

## GitHub Pages

Nothing is pushed or deployed. This folder is not a Git repository. `.github/workflows/pages.yml` is manual-only (`workflow_dispatch`). Do not publish the photos before the owner approves the preview and confirms publication rights.
