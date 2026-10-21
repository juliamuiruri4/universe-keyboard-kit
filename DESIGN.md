---
name: Universe Keyboard
description: A dark GitHub-branded workbench around one light stage, a sealed blind box, and a photo-faithful Omnitype Bauer Lite.
colors:
  n-50: "#f2f5f3"
  n-100: "#e4ebe6"
  n-300: "#b6bfb8"
  n-500: "#909692"
  n-800: "#232925"
  n-900: "#101411"
  g-300: "#5fed83"
  g-500: "#0fbf3e"
  g-700: "#08872b"
  g-900: "#0a241b"
  line: "#2f3631"
  bench: "#d3dcd6"
  danger-ground: "#3a1c1c"
  danger-line: "#7c3030"
  cardboard-lid: "#c9a06e"
  cardboard-front: "#b98a58"
  cardboard-side: "#a37646"
  cardboard-ink: "#2a2118"
  housing-red: "#e0345f"
  plate-blue: "#1b3f8f"
  accent-key: "#3283d9"
  accent-key-side: "#2566b0"
  cap-dark: "#6b6665"
  cap-dark-side: "#464241"
  cap-light: "#d8d4cf"
  cap-light-side: "#a9a49f"
typography:
  display:
    fontFamily: "Mona Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
  instruction:
    fontFamily: "Mona Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
  instruction-body:
    fontFamily: "Mona Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  headline:
    fontFamily: "Mona Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
  body:
    fontFamily: "Mona Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  action:
    fontFamily: "Mona Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
  navigation:
    fontFamily: "Mona Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  control:
    fontFamily: "Mona Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
  counter:
    fontFamily: "Mona Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
rounded:
  bar: "3px"
  control: "8px"
  tool: "10px"
  action: "12px"
  stage: "16px"
  bench: "18px"
  circle: "50%"
spacing:
  micro: "4px"
  compact: "8px"
  inline: "12px"
  standard: "16px"
  gutter: "20px"
  section: "32px"
  page: "64px"
components:
  button-primary:
    backgroundColor: "{colors.g-500}"
    textColor: "{colors.n-900}"
    typography: "{typography.action}"
    rounded: "{rounded.action}"
    padding: "0 20px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.g-300}"
  button-tool:
    backgroundColor: "{colors.n-800}"
    textColor: "{colors.n-50}"
    typography: "{typography.control}"
    rounded: "{rounded.tool}"
    padding: "0 12px"
    height: "40px"
  button-tool-danger:
    backgroundColor: "{colors.danger-ground}"
    textColor: "{colors.n-50}"
    rounded: "{rounded.tool}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.g-300}"
    typography: "{typography.control}"
    padding: "4px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.n-300}"
    typography: "{typography.navigation}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  nav-link-current:
    textColor: "{colors.n-50}"
  segment:
    backgroundColor: "#101411e6"
    textColor: "{colors.n-300}"
    typography: "{typography.control}"
    rounded: "{rounded.tool}"
    padding: "3px"
  segment-selected:
    backgroundColor: "{colors.n-50}"
    textColor: "{colors.n-900}"
    rounded: "{rounded.control}"
    height: "36px"
  stage:
    backgroundColor: "{colors.n-100}"
    textColor: "{colors.n-900}"
    rounded: "{rounded.stage}"
  step-mark-current:
    backgroundColor: "{colors.n-50}"
    textColor: "{colors.n-900}"
    rounded: "{rounded.circle}"
    width: "22px"
    height: "22px"
  step-mark-done:
    backgroundColor: "{colors.g-500}"
    textColor: "{colors.n-900}"
    rounded: "{rounded.circle}"
    width: "22px"
    height: "22px"
  progress-bar:
    backgroundColor: "{colors.n-800}"
    rounded: "3px"
    height: "6px"
  photo-tile:
    backgroundColor: "{colors.n-800}"
    rounded: "12px"
  keycap-dark:
    backgroundColor: "{colors.cap-dark}"
  keycap-light:
    backgroundColor: "{colors.cap-light}"
  keycap-accent:
    backgroundColor: "{colors.accent-key}"
---

# Design System: Universe Keyboard

## Overview

**Creative North Star: "The Workbench in the Dark"**

A near-black GitHub chrome (`#101411`) holds one large, pale stage (`#E4EBE6`). The keyboard is the page: the dark shell recedes, the light stage makes the hardware read like an object photographed on a bench, and GitHub Green appears only where something is done or about to be done. Mona Sans carries all text in one family. The interface is flat; there is no UI shadow anywhere.

The world is the kit itself. A sealed cardboard blind box sits on a wooden desk (the real photo); opening it lifts each part out of a messy pile onto the desk around the box; the parts become a photo-faithful Omnitype Bauer Lite (red bottom housing, blue plate, clear top housing, Dark or Light keycaps, blue accent keys). Hardware and cardboard colors are product material and live only on the stage. The shell never borrows them.

**Key Characteristics:**
- Dark chrome, light stage: two grounds, no mid-tones between them.
- GitHub Green `#0FBF3E` on the primary action, progress, completed steps and the current-page underline. Nowhere else.
- One family, Mona Sans, self-hosted variable (200–900, width 75–125%). Hierarchy comes from size and weight only.
- Flat surfaces separated by 1px `#2F3631` lines and tonal steps. Rounded 8–16px containers.
- One instruction and one primary action at a time; everything else is quiet.

Evidence: `src/styles.css` (tokens and rules), `src/App.tsx` (shell, stepper, panel), `src/Unbox.tsx` (box art and motion), `src/KeyboardBoard.tsx` and `src/scene/KeyboardScene.ts` (hardware colors), `src/keyboard.ts` (keycap options). The shipped build is the authority; the direction contract in `.impeccable/surfaces/src-app-tsx.md` matches it.

## Colors

The shell is a green-tinted neutral scale (hue ≈ 153–157°, chroma ≤ 0.014) with one saturated green. Tokens are the root custom properties in `src/styles.css`.

### Primary
- **GitHub Green** (`g-500`, `#0FBF3E`): primary button, progress fill, completed step marks, current-nav underline. Text on it is `n-900`.
- **Green hover** (`g-300`, `#5FED83`): primary hover, keyboard focus ring on the dark shell, text-button color, guide step numerals.
- **Green deep** (`g-700`, `#08872B`): focus ring and hotspot outlines on the light stage, where `g-300` would vanish.
- **Green ink** (`g-900`, `#0A241B`): declared in `:root`, not referenced by any rule in the shipped build.

### Neutral
- **Ink** (`n-900`, `#101411`): page and header ground; text on the light stage and on green.
- **Raised** (`n-800`, `#232925`): tool buttons, progress track, photo and video grounds, lightbox buttons.
- **Line** (`line`, `#2F3631`): 1px header rule, tool borders, guide row dividers.
- **Muted** (`n-500`, `#909692`): future steps, disabled controls, counts.
- **Soft** (`n-300`, `#B6BFB8`): secondary text, nav at rest, instruction body.
- **Stage** (`n-100`, `#E4EBE6`): the stage and unbox ground.
- **Paper** (`n-50`, `#F2F5F3`): primary text on dark, selected segment, current step mark.
- **Bench** (`bench`, `#D3DCD6`): legacy token, no longer drawn; the unbox desk is the photo's own wood.

### Hardware and packaging (product material, stage only)
- **Keycaps:** Dark `#6B6665` (side `#464241`) and Light `#D8D4CF` (side `#A9A49F`) are the only two colorways, from the walkthrough. Accent keys `#3283D9` (side `#2566B0`).
- **Housing and plate:** red bottom housing `#E0345F` (translucent), clear top housing, blue plate `#1B3F8F`.
- **Cardboard:** lid `#C9A06E`, front `#B98A58`, side `#A37646`, print ink `#2A2118`.
- **Danger:** `#3A1C1C` ground with `#7C3030` border, used once, for "Erase build".

### Named Rules
**The Green Is Earned Rule.** Green means act, progress, or done. It is never a background for text blocks, never decoration, never a status color for anything unverified. Completion pairs a check glyph with the green mark.

**The Hardware Stays on the Stage Rule.** Red, blue, cardboard and keycap colors never appear in the header, panel, buttons or pages. The shell has exactly one chromatic color.

**The No Purple, No Blue UI Rule.** GitHub's purple and blue brand colors are not used for interface. Blue exists only as the product's accent keys and plate.

## Typography

**Font:** Mona Sans (`public/fonts/MonaSans.woff2`, `font-display: swap`), falling back to `system-ui, -apple-system, 'Segoe UI', sans-serif`. Ligatures off, antialiased.

**Character:** Plainspoken and exact. Bold sentence-case headings, regular descriptions, tabular numerals wherever a count appears.

### Hierarchy
- **Display** (`display`, 2.25rem/1.1, 700): page titles on Guide and Photos; 1.75rem at ≤520px. The Build page has no visible headline (its `h1` is screen-reader only).
- **Instruction** (`instruction`, 1.75rem/1.15, 700, `font-stretch: 100%`): the current step; 1.375rem at ≤960px.
- **Instruction body** (1.0625rem/1.5, 400, `n-300`): one sentence under the instruction; 1rem at ≤960px.
- **Headline** (`headline`, 1.125rem, 700): guide section labels (`n-300`) and step titles.
- **Body** (1rem/1.5, 400).
- **Action** (`action`, 1.0625rem, 700): the primary button.
- **Navigation** (`navigation`, 0.9375rem, 600): nav links and stepper names.
- **Control** (`control`, 0.875rem, 600): tool buttons, segment buttons, progress text. Segments drop to 0.8125rem at ≤520px.
- **Counter** (`counter`, 1.75rem, 700, tabular): the keys-tested count.

The box printing ("BLIND BOX", "GitHub", "OMNITYPE") is part of the photograph, not UI type. Part labels on the desk are 13px Mona Sans on `n-800`.

### Named Rules
**The One Family Rule.** Hierarchy is size and weight in Mona Sans. No second face, no monospace, no letter-spacing tricks, no all-caps UI labels.

## Layout

A 56px header (`--head`) with a 1px `line` rule. Below it the Build page is a two-column grid: stage `minmax(0, 1fr)` and a 360px panel, 16px gap and padding, filling `100dvh − 56px` with a 600px floor. Pages (Guide, Photos) are centered at max 1120px with 32px top and 64px bottom padding. Spacing steps in use: 4, 8, 12, 16, 20, 32, 64px.

The panel stacks top to bottom with a 20px gap: stepper, instruction, progress, primary action, text action, tester, and a tool row pinned to the bottom (`margin-top: auto`). The stage holds the board canvas and, above it, the unbox scene (inset `0 0 52px`, leaving the bottom strip to the view and keycap segments).

Responsive:
- **≤960px:** one column; stage height `min(64vw + 52px, 490px)`, floor 290px; panel becomes in-flow. The stepper collapses to six equal circles with only the current step's name visible. Primary button grows to 56px. Bench slot labels hide. Guide columns stack.
- **≤520px:** brand wordmark hides (mark only); stage `70vw + 52px`; segment buttons tighten; photo grid is two columns with 8px gap.

Guide uses a 2fr/1fr column split with a 48px gap and hairline-divided rows; no cards. Photos use `auto-fill, minmax(220px, 1fr)` with 12px gaps and 3:2 crops; the video is 16:9.

## Elevation & Depth

None in the UI. Separation is tonal (`n-900` → `n-800` → `n-100`) and by 1px `line` borders. There are no `box-shadow` declarations on interface chrome. The current nav link uses `inset 0 -2px 0` in green as an underline, and swatch dots a 1px inset ring.

Depth belongs to the hardware and the box. The three.js board lights its own parts; the box depth comes from the photograph, with a drawn lid shadow, cavity shading and soft contact shadows under each part on the wood.

### Named Rules
**The Flat Shell Rule.** Do not add shadows, glows, glass or gradients to buttons, panels or the header. Depth is the object's job.

## Shapes

Radii scale with the surface: 3px for hotspot bars and the progress track, 8px nav links and selected segments, 10px tool buttons and segment trays, 12px primary button and photo tiles, 16px stage, video and lightbox, 18px for the SVG bench slab. Circles are step marks, swatches and screw hotspots only. No pill buttons.

Hotspots on the stage are 1.5px outlines in `g-700` at 55% over a 10% green wash, so each installable part is visible without a label.

## Components

### Buttons
- **Primary** (`button-primary`): `g-500` ground, `n-900` text, 700 at 1.0625rem, 52px tall (56px ≤960px), 12px radius, no border, 1px press shift. Hover `g-300`. One per screen state; label is the action ("Open box", "Take out PCB", "Seat all").
- **Tool** (`button-tool`): `n-800` ground, 1px `line` border, 10px radius, 40px tall, icon + label. Hover brightens the border to `n-500`. Disabled is `n-500` text.
- **Danger tool:** same shape on `#3A1C1C` with `#7C3030` border; only "Erase build".
- **Text button:** no ground, `g-300` underlined 600. For secondary and Clear.
- **Icon button:** 44px square, `n-800`, 1px `line`, 10px radius (lightbox).
- **Focus:** 2px `g-300` outline, 2px offset; on the stage `g-700`.

### Navigation
Dark header: GitHub mark (26px) and "Universe keyboard" wordmark at 700 on the left; Build, Guide, Photos on the right, 40px tall hit areas, `n-300` at rest, `n-50` on hover with an `n-800` ground, current page `n-50` with a 2px green underline and `aria-current="page"`.

### Segmented controls
View (Assembled, Exploded) and Keycaps (Dark, Light) sit on the stage's lower edge in `rgba(16,20,17,0.9)` trays, 3px padding, 10px radius. Selected segment is `n-50` with `n-900` text, 36px tall. Keycap segments carry a 12px swatch of the actual cap color with an inset ring.

### Stepper
Six circular numbered marks, 22px, 1.5px `n-500` ring and `n-500` label for future steps; completed steps fill `g-500` with a check; the current step is a filled `n-50` mark with `n-50` label. A 6px progress bar (`n-800` track, `g-500` fill) and tabular count line appear when a step has countable parts.

### Stage and box
The stage is `n-100`, 16px radius, clipped, with `n-900` ink. While unboxing it shows the real sealed-box photo (R0002874, `images/box/scene.webp`) as is, with the wooden floor as the desk and a soft vignette blending its edges into the dark chrome. Click, Enter or Space opens it: the photo's own lid pixels hinge up along the far edge (matrix3d), revealing a kraft cavity. The parts sit in a messy pile with the next one on top. Each take-out arcs the part (1s) to a fixed spot on the wood and gains an `n-800` 13px label. The box ends visibly empty. The overlay then fades out (0.6s after a 1.4s delay) and the 3D board shows through. Reduced motion shows each state instantly.

### Photo grid and lightbox
Tiles are borderless 12px-radius images on `n-800`, hover scales the image 1.03. The lightbox is a native dialog on `n-900`, 16px radius, with an `rgba(16,20,17,0.88)` backdrop, a caption in `n-300` and a tabular count.

### Procedural keyboard
Rendered by Three.js on demand; hotspots are real buttons laid over the canvas. Layer labels are 0.8125rem 600 in `n-900` with a leader line. Tested keycaps take a `0FBF3E` emissive tint at 0.28 intensity; the count is also stated in text.

## Do's and Don'ts

### Do:
- **Do** keep the shell to `n-*` neutrals plus `g-500`; put the one green on the primary action.
- **Do** keep the stage light and the chrome dark.
- **Do** use `g-700` for focus and outlines on the stage and `g-300` on the dark shell.
- **Do** show one instruction, one primary action, and keep the primary button above the fold on mobile.
- **Do** keep Dark and Light as the only keycap options; use hardware colors only on the object and box.
- **Do** keep controls at least 40px tall (44px for icon buttons, 52–56px for primary) and honor `prefers-reduced-motion`.

### Don't:
- **Don't** use purple or blue brand colors for interface, and don't tint the shell with hardware colors.
- **Don't** add shadows, glows, glassmorphism or gradient fills to chrome.
- **Don't** add kickers, eyebrows, slogans, repeated warnings, or all-caps UI labels.
- **Don't** introduce a second typeface or a display face.
- **Don't** add video links beyond the single click-to-play embed in the guide.
- **Don't** invent colorways or recolor the supplied photographs.
- **Don't** replace SVG icons with glyph characters.

**Not canonized or repaired:** (1) in `src/Unbox.tsx` a 9px ink bar at `y + 54` crosses the "BLIND BOX" front print and reads as a strikethrough in all three captures; it is a drawing defect, not a rule. (2) At ≤960px the current stepper label ("Open your kit") wraps to two lines in `mobile.png`. (3) `g-900` is declared but unused. (4) The danger red pair is off-palette and used once. (5) The brand wordmark and nav are sentence-case as specified; no uppercase UI labels exist. Source and assets are outside this documentation write boundary.
