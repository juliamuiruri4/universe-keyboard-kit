---
version: 2
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/KeyboardBoard.tsx","src/Unbox.tsx","src/scene/KeyboardScene.ts","src/styles.css"]
---

# Build surface

Scope: build page (sealed box, unboxing, assembly, key test), guide, photos. Mode: product UI built around one interactive object.

## Direction contract

THESIS: The keyboard is the page. A GitHub-branded, neutral, precise workbench: one large stage, one short instruction, one primary action.

WORLD: GitHub brand foundations. Neutral scale (#F2F5F3 to #101411), dark chrome and a light stage, GitHub Green #0FBF3E only for the primary action, progress and completion. Mona Sans, self-hosted. Hardware colors appear only on the product.

STORY: Sealed blind box, then open it and take the parts out one at a time, then assemble, then test the keys.

FIRST VIEWPORT: Slim nav (Build, Guide, Photos). Stage is the real sealed-box photo (R0002874) on its wooden floor, faded into the ink page chrome. The box opens on click, Enter or Space: the lid is the photo's own pixels, hinged up along the far edge in the photo's perspective. Beside it, the six-step rail, one instruction and the primary button. On mobile the stage is on top and the primary button sits directly below, within the first screen.

MOTION: Lid hinges up over a pile of parts (next part on top); each part arcs out of the pile to its own fixed spot around the box and the box ends empty (1 s, 0.16 s stagger), never overlapping the box or each other. Three.js scene renders on demand. `prefers-reduced-motion` gives instant states.

COPY: Short labels ("Open box", "Take out PCB", "Seat all"). No headlines, slogans or repeated warnings. One video embed, in the guide only.

CONSTRAINTS: Light/Dark keycaps only. No invented colorways. No push or deploy before manual review. Photos and originals untouched.
