# PROTOTYPE — freehand vector pen feel (throwaway)

Answers **Prototype the freehand vector pen feel** (waaron5/ipolashki#6): how the smart Pen should feel.
It covers smoothing, when shapes snap (confidence threshold, hold vs release), the chooser, waves, endpoint
joining, the Eraser's loop vs scrub, pressure, and whether mouse, finger and stylus need different tuning.
Phone performance of plain SVG was already settled by the app layout prototype (#5), so it isn't repeated here.

Run: `pnpm --dir prototype/pen-feel install && pnpm --dir prototype/pen-feel dev` (serves on your LAN too, so a phone or tablet on the same Wi-Fi can open it).

- **Pen (P)**, **Eraser (E)**, **Select (V)**: tap a stroke to switch its shape later. Ctrl/Cmd+Z undoes.
- **Tune** panel: shows the last stroke's recognition (confidence bars against the threshold), sliders per input type, and a
  scoreboard that re-scores every recorded stroke with the current settings against what you finally kept.
- Recorded strokes and settings live in this browser's localStorage (`PROTOTYPE-pen-feel-*`). Use **Export** to save them as JSON.

Liftable parts: `src/recognize.ts` (pure recognizer) and `src/ops.ts` (Paper.js smoothing, joining, erasing). `App.tsx` is the throwaway shell.
Never merged.
