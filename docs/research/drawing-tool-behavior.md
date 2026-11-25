# Research: drawing-tool behavior across mouse, touch & stylus

Ticket: [#2](https://github.com/waaron5/ipolashki/issues/2) · Map: [#1](https://github.com/waaron5/ipolashki/issues/1) · Researched 2026-11-25

**Question.** How do the best vector tools make precise drawing feel intuitive with a mouse, and how do those behaviors carry over to touch and stylus? The deliverable is a recommended baseline behavior for each tool category, the conventions users already expect, and touch and stylus adaptations that work on phones and tablets.

Terms follow `GLOSSARY.md`: Design, Canvas, Element, Layers, Group, Tracing image. Each claim cites its source. Lines marked **Recommendation** are this note's synthesis, not a fact from a source.

---

## TL;DR

1. **The modifier conventions are close to universal, so copy them.** On the desktop: Shift constrains (square or circle, angle snap, proportional resize, 15° rotation), Alt/Option works from the center or breaks a handle, and Ctrl/Cmd temporarily turns snapping off. For angles, a **15° step** is the modern default in tldraw, Excalidraw and Figma rotation, and it covers 45° and 90°.
2. **Touch has no keyboard, so every modifier needs an on-screen equivalent.** The shipped patterns are an on-screen modifier puck (Illustrator iPad "touch shortcut", Affinity "Command Controller") and a second finger to constrain (Procreate QuickShape). **The surprising part:** on iPad Safari, once Apple Pencil touches the screen, the OS stops sending finger events to the browser (tldraw blog). A web app therefore **cannot rely on "hold a finger on a modifier button while drawing with Pencil."** Modifiers must be **sticky toggles** (tap to latch), or the app must use snapping that needs no modifier.
3. **Freehand-to-vector: fit editable Béziers with Schneider's algorithm, and don't use perfect-freehand as the stored model.** perfect-freehand (used by tldraw and Excalidraw) outputs a filled *outline polygon* that you can't edit as a path. Inkscape's Pencil (via lib2geom) and Paper.js `simplify()` both use Schneider's 1990 least-squares cubic fitter. Pipeline: coalesced pointer samples, light stabilization, corner split, Schneider fit, then a normal editable path with a uniform stroke. Ship a **Smoothing** control: users complain loudly when smoothing is fixed and too strong (Figma forum, Procreate forum).
4. **The pen/Bézier tool is the main beginner pain point.** Adobe added a Curvature tool to address it. Keep the standard Pen conventions (click = corner, drag = smooth, click the first point to close, Esc to leave the path open), and add the curvature-style shortcuts: drag a segment to bend it, double-click a point to switch between corner and smooth.
5. **Touch geometry needs bigger targets and thresholds:** 44 pt (Apple) or 48 dp (Material) targets. tldraw's defaults are a useful reference: handle radius 12 → **20** on coarse pointers, drag threshold 4 → **6** px, toolbar drag threshold **25** px, long-press **500 ms**.

---

## 1. Selection, transform handles, rotation

**What tools do**

- Figma: holding **Shift** while rotating snaps to **15°** increments. Rotation pivots on the selection's center by default. **Option/Alt** resizes from the center, and Shift+Option/Alt resizes proportionally from the center. Cmd+Option+arrow keys rotate 1°, and adding Shift rotates 15°. ([Figma: Adjust alignment, rotation, position, and dimensions](https://help.figma.com/hc/en-us/articles/360039956914-Adjust-alignment-rotation-position-and-dimensions); [Figma: Shape tools](https://help.figma.com/hc/en-us/articles/360040450133-Shape-tools))
- Figma enters path editing (vector edit mode) with **Enter**. Inside it, a **Lasso** (Q) selects points. ([Figma: Edit vector layers](https://help.figma.com/hc/en-us/articles/360039957634-Edit-vector-layers))
- Affinity on iPad: **double-tap a curve** with the Move tool to switch to the Node tool, and double-tap the selection area to switch back. ([Affinity: Edit lines, curves and shapes](https://www.affinity.studio/help/curves-shapes-edit-lines-and-shapes/))
- tldraw ships separate defaults for coarse (touch) pointers: `handleRadius: 12` vs `coarseHandleRadius: 20`, `dragDistanceSquared: 16` (4 px) vs `coarseDragDistanceSquared: 36` (6 px), `uiCoarseDragDistanceSquared: 625` (25 px), with the source comment "it's really easy to accidentally drag from the toolbar on mobile". It also sets `longPressDurationMs: 500` and `doubleClickDurationMs: 450`. ([tldraw `options.ts`](https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/options.ts))

**Recommendation (baseline)**

- Click selects an Element, drag on empty Canvas draws a marquee, and Shift-click adds to or removes from the selection. Double-click (or Enter) on a path enters point editing, and Esc exits. Clicking selects the top-level Group, and double-clicking enters the Group.
- The selection box has 8 resize handles plus a rotation zone just outside each corner. Shift = proportional resize and 15° rotation steps. Alt/Option = resize from the center.
- Touch: handles about 20 px radius (hit area of at least 44 pt), a larger drag threshold so taps don't turn into nudges, long-press (500 ms) for the context menu, and double-tap for the double-click actions. Use a visible rotation handle on touch, because a "hover just outside the corner" rotation zone can't be discovered without hover.

## 2. Constrained shapes (rectangle, ellipse, polygon) and arcs

**What tools do**

- Figma: you drag to draw. "Hold down Shift when dragging to create perfect squares, circles and polygons." "Hold down Option / Alt to create and resize shapes from their center." Both together combine the two behaviors. ([Figma: Shape tools](https://help.figma.com/hc/en-us/articles/360040450133-Shape-tools))
- Figma arcs: an ellipse has an **arc handle** (sweep, shown as a percentage), a **Start** handle and a **Ratio** handle (inner radius, which turns a pie into a ring). The same values are in the properties panel. The arc stays parametric until flattened. ([Figma: Arc tool](https://help.figma.com/hc/en-us/articles/360040450173-Arc-tool-create-arcs-semi-circles-and-rings); [Figma: Turn an ellipse into an arc](https://help.figma.com/hc/en-us/articles/31130312631191-FD4B-Turn-an-ellipse-into-an-arc))
- Procreate **QuickShape** (touch-first): draw a stroke and *hold*, and it snaps to a line, arc, polyline, ellipse, triangle or quadrilateral. "Place a second finger" while still holding to turn an oval into a circle or a rectangle into a square. Dragging with the second finger rotates in **15°** increments. On release, an **Edit Shape** button offers nodes to adjust. ([Procreate Handbook: QuickShape](https://help.procreate.com/procreate/handbook/guides/quickshape))

**Recommendation (baseline)**

- Rectangle, ellipse and polygon tools work by drag. Shift = 1:1, Alt = from the center. Corner radius, polygon side count, and the ellipse **arc parameters (start, sweep, inner ratio)** stay live and editable as properties. Arcs and rings are central to mid-century-modern compositions, so making them parametric ellipse properties gives "perfectly round" curves without the Pen tool.
- Touch: the same one-finger or stylus drag. Constrain and from-center come from sticky on-screen modifier toggles (see §8). A second finger during the drag can also constrain when the input is touch, Procreate style. The second-finger gesture is **not available while Apple Pencil is down** in Safari (see §8), so the toggles are the reliable path.
- Optional later: QuickShape-style "draw and hold to recognize" inside the freehand pen. This is a loved feature in Procreate, but it isn't needed for v1.

## 3. Straight lines and polylines

**What tools do**

- tldraw draw tool: "Hold Shift while drawing to create straight line segments". Angles snap to **15°** increments, Ctrl temporarily disables the angle snap, and Shift-click extends the stroke from the last endpoint with a straight segment. ([tldraw: Draw shape](https://tldraw.dev/sdk-features/draw-shape))
- Excalidraw: `SHIFT_LOCKING_ANGLE = Math.PI / 12`, which is 15°. ([Excalidraw `constants.ts`](https://github.com/excalidraw/excalidraw/blob/master/packages/common/src/constants.ts))
- Figma Pencil: "To draw a straight line, hold Shift as you move your cursor." ([Figma: Draw with illustration tools](https://help.figma.com/hc/en-us/articles/31440438150935-Draw-with-illustration-tools))
- Illustrator on iPad, Pencil tool: the *primary* touch modifier gives straight lines at 45°/90°, the *secondary* modifier gives freeform straight lines, and pausing then continuing creates a corner. ([Adobe: Draw and edit paths in Illustrator on the iPad](https://helpx.adobe.com/illustrator/using/draw-edit-on-ipad.html), via search excerpt; helpx.adobe.com blocks automated fetches)
- Inkscape Pen: each click adds a node joined by straight segments, and right-click ends the path. It also has a **Paraxial** mode that allows only horizontal and vertical segments. ([Inkscape Beginners' Guide: Pen tool](https://inkscape-manuals.readthedocs.io/en/latest/pen-tool.html))

**Recommendation (baseline)**

- Line/polyline behavior lives in the Pen tool: click, click, click. Finish with Enter, Esc, double-click, or a click on the first point (which closes the path). Shift snaps the segment angle to 15° steps relative to the previous point. Ctrl/Cmd suspends snapping.
- Touch: tap, tap, tap, plus an explicit on-screen **Done** and **Close path** button. Double-tap and Enter are unreliable or absent on a phone.

## 4. Pen / Bézier tool vs simpler curve tools

**What tools do**

- Figma Pen: a click places a point, and "click and drag your cursor to determine the length and slope of the curve". To close, "position the Pen tool over another point". Escape leaves the path open. ([Figma: Vector networks](https://help.figma.com/hc/en-us/articles/360040450213-Vector-networks))
- Figma handle modes: **No mirroring / Mirror angle / Mirror angle and length**. The **Bend** tool adds Bézier handles to a point or segment after the fact. ([Figma: Edit vector layers](https://help.figma.com/hc/en-us/articles/360039957634-Edit-vector-layers))
- Illustrator **Curvature tool**, Adobe's simpler curve tool: you only click, and a rubber-band preview shows the next segment. **Alt/Option-click** places a corner point, **double-click** a point to toggle smooth or corner, and selecting a point and pressing Delete removes it "while maintaining the curve". ([Adobe: Curvature tool](https://helpx.adobe.com/illustrator/using/tool-techniques/curvature-tool.html), via search excerpt)
- Affinity: you can edit with the Node tool, or "hold a modifier while drawing with the Pen Tool". "Use the former for more prolonged editing operations, the latter for fine tuning." On iPad, the modifier is the ⌘ on the on-screen Command Controller. ([Affinity: Edit lines, curves and shapes](https://www.affinity.studio/help/curves-shapes-edit-lines-and-shapes/))
- Inkscape's beginner guide advises sketching roughly and refining with the Node tool, and warns that too many nodes make a path hard to work with. ([Inkscape: Pen tool](https://inkscape-manuals.readthedocs.io/en/latest/pen-tool.html))

**Recommendation (baseline)**

- **One Pen tool with the standard conventions:** click = corner, drag = smooth point with mirrored handles, Alt/Option-drag on a handle breaks the mirroring, click the first point to close, Esc leaves the path open. A rubber-band preview shows the next segment.
- **Point-editing mode adds the curvature-tool shortcuts that beginners need:** drag a *segment* to bend it (Figma Bend and Illustrator Curvature both let you shape without touching handles), double-click a point to toggle corner and smooth, and delete a point while keeping the curve ("delete and heal"). Handle mirroring is a per-point property (none / angle / angle and length).
- Touch: dragging out handles works as-is with a finger or stylus. Handles get coarse-pointer sizing, and Alt is a sticky toggle. Show handles only on the selected point or segment so a phone screen doesn't fill up with targets.
- **Recommendation:** skip Figma-style *vector networks*, where branching paths share points. They add file-format and boolean complexity, and Figma itself notes features that break on them (stroke width profiles "can't be applied to vector networks with branching paths": [Figma: Apply and adjust stroke properties](https://help.figma.com/hc/en-us/articles/360049283914-Apply-and-adjust-stroke-properties)). Use ordinary paths (subpaths allowed).

## 5. Freehand vector pen: smoothing and curve fitting

### What the tools do with a freehand stroke

| Tool | Stored result | Smoothing control | Source |
|---|---|---|---|
| Figma Pencil | Vector network; points auto-placed "depend[ing] on the path's length and complexity", editable in vector edit mode | None documented; "delete and heal" to clean up | [Figma: illustration tools](https://help.figma.com/hc/en-us/articles/31440438150935-Draw-with-illustration-tools) |
| Illustrator Pencil | Bézier path | **Fidelity** slider, Accurate ↔ Smooth (5 steps); "Close paths when ends are within"; "Edit selected paths within" (redraw over a path to reshape it); separate **Smooth tool** | [Adobe: Pencil tool options](https://helpx.adobe.com/illustrator/desktop/draw-shapes-and-paths/draw-shapes/pencil-tool-options.html) (search excerpt) |
| Illustrator iPad Pencil | Bézier path | Smoothing 0–10 in the toolbar | [Adobe: iPad paths](https://helpx.adobe.com/illustrator/using/draw-edit-on-ipad.html) (search excerpt) |
| Inkscape Pencil | Bézier path, fitted with **Schneider's algorithm** (lib2geom `bezier_fit_cubic_r`, tolerance taken from the Smoothing preference) | **Smoothing** slider: low = "rough lines with many nodes", high = smooth with few. Mouse users need a higher value than tablet users. Modes: Bézier / Spiro / BSpline | [Inkscape guide: Pencil](https://inkscape-manuals.readthedocs.io/en/latest/pencil-tool.html); [`pencil-tool.cpp`](https://gitlab.com/inkscape/inkscape/-/blob/master/src/ui/tools/pencil-tool.cpp); [lib2geom `bezier-utils.cpp`](https://gitlab.com/inkscape/lib2geom/-/blob/master/src/2geom/bezier-utils.cpp) |
| Affinity Pencil / brushes | Bézier path | Stabiliser: **Rope** (drag the stroke end on a rope) or **Window** (average samples over a window). Sculpt mode continues or edits existing curves | [Affinity: Vector Blob Brush](https://www.affinity.studio/help/tools-tools-vector-blob-brush/); [Affinity key features](https://www.affinity.studio/help/introduction-key-features-vectordesign/) |
| tldraw draw | Raw delta-encoded points (with pressure for pens) rendered as a freehand outline; **no Bézier conversion**. Auto-closes when the end is near the start | Fixed | [tldraw: Draw shape](https://tldraw.dev/sdk-features/draw-shape) |
| Excalidraw freedraw | Raw points rendered with **perfect-freehand** `getStroke` (dependency `perfect-freehand@1.2.0`) | Fixed (tuned constants) | [Excalidraw `shape.ts`](https://github.com/excalidraw/excalidraw/blob/master/packages/element/src/shape.ts); [`package.json`](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/package.json) |
| Procreate (raster, for UX only) | n/a | Per-brush StreamLine plus global Stabilization and **Motion Filtering** (built for hand tremor) with an "Expression" slider | [Procreate: Brush Studio Settings](https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings); [Procreate: Accessibility](https://help.procreate.com/procreate/handbook/interface-gestures/accessibility) |

### The three algorithm families

1. **perfect-freehand** (Steve Ruiz): `getStroke(points, opts)` "will generate the points for a polygon" that surrounds the input. The options are `size`, `thinning` (pressure → width), `smoothing`, `streamline` (input smoothing), `simulatePressure` (from velocity), `start`/`end` taper, and `last`. Its output is filled, not stroked, and "the polygon's paths include self-crossings" unless they are unioned. ([perfect-freehand README](https://github.com/steveruizok/perfect-freehand)) **It is a renderer for ink-like strokes.** Its output is a closed outline, not a centerline you can edit with the Pen tool.
2. **Schneider (1990), "An Algorithm for Automatically Fitting Digitized Curves"**, *Graphics Gems*, pp. 612–626. A least-squares cubic Bézier fit with Newton–Raphson reparameterization. When the maximum error exceeds the tolerance, it splits at the worst point and recurses. ([original `FitCurves.c`](https://github.com/erich666/GraphicsGems/blob/master/gems/FitCurves.c)) Used by **Paper.js `PathFitter`**: "An Algorithm for Automatically Fitting Digitized Curves by Philip J. Schneider … Modifications and optimizations … by Jürg Lehni" ([`PathFitter.js`](https://github.com/paperjs/paper.js/blob/develop/src/path/PathFitter.js)). `Path#simplify({ tolerance })` uses it with a default **tolerance of 2.5** and can refit a sub-range (`from`/`to`) tangent-continuous with its neighbours ([`PathItem.js`](https://github.com/paperjs/paper.js/blob/develop/src/path/PathItem.js)). Inkscape's Pencil uses it too (above).
3. **Input stabilizers** (applied before fitting or rendering): rope/lazy-mouse (Affinity Rope, perfect-freehand `streamline`, tldraw "pulling each point toward the previous one"), moving-window average (Affinity Window), and extreme-removal (Procreate Motion Filtering).

### What users say

- **Smoothing that is fixed and too strong draws complaints.** Figma forum threads ask for less pencil and marker smoothing ("nearly unusable" for quick icons and handwriting). Figma staff said one FigJam smoothing change came from an engineering change that was later reverted. Users also asked to turn pressure off, and a quick action was added for that. ([Improve drawing pencil tool](https://forum.figma.com/suggest-a-feature-11/improve-drawing-pencil-tool-34558); [Marker tool changing what I'm drawing](https://forum.figma.com/ask-the-community-7/marker-tool-in-figjam-is-changing-what-i-m-drawing-11609); [Disable pen pressure](https://forum.figma.com/ask-the-community-7/how-can-i-disable-pen-pressure-in-pencil-tool-45313)). User forum, anecdotal.
- Procreate users report that Motion Filtering smooths strokes too much to draw quickly, and that StreamLine at max still is not smooth enough for others. Both directions of complaint argue for a user-tunable control. ([Procreate Folio forum threads](https://folio.procreate.com/help-support/63207)). Anecdotal.
- Affinity users report that Rope stabilisation can "pull the stroke end" unexpectedly, and that Window gives smoother lines. ([Affinity forum](https://forum.affinity.serif.com/index.php?%2Ftopic%2F200220-i-have-some-misunderstandings-about-the-stabilization-of-the-pen-tool-and-some-of-its-functions%2F=)). Anecdotal.
- Inkscape users accidentally left in Spiro mode found the tool "drawing circles". In other words, clever interpolation modes confuse people. ([Inkscape forum](https://alpha.inkscape.org/vectors/www.inkscapeforum.com/viewtopicce74.html?t=17656)). Anecdotal.

### Recommendation (freehand pen pipeline)

1. **Capture:** Pointer Events, reading `getCoalescedEvents()` for the full sample rate. The spec describes it as a way to "access associated coalesced events, for a more precise handling of pointer movement data" ([W3C Pointer Events 3](https://www.w3.org/TR/pointerevents3/)). Optionally use `getPredictedEvents()` to cut perceived latency in the live preview.
2. **Live preview:** draw the stabilized polyline, or perfect-freehand at uniform width, while the pointer is down.
3. **Stabilize lightly:** a streamline/rope-style low-pass. Keep it weak by default, because over-smoothing is the main complaint.
4. **Split at corners:** detect sharp turns (angle threshold) and dwell (a pause, as on Illustrator iPad), then fit each run separately so corners stay sharp. Schneider's fitter assumes smooth data between its endpoints.
5. **Fit:** Schneider, with the tolerance in **screen pixels** (scaled by zoom) so precision feels the same at any zoom. Paper.js's default of 2.5 px is a sensible start. The **Smoothing** slider maps to this tolerance (Inkscape and Illustrator Fidelity do the same). Paper.js can be used directly (`simplify`) or the fitter can be ported. It is about 300 lines and MIT-licensed in Paper.js.
6. **Result:** an ordinary editable path Element with a **uniform-width stroke**, the same type the Pen tool makes. Auto-close (with fill) when the end lands within a few px of the start, as in tldraw and Illustrator's "Close paths when ends are within". Shift during the stroke gives straight 15°-snapped segments. Starting a stroke on an endpoint of a selected open path continues that path (Inkscape behavior).
7. **Pressure:** ignore it in v1. Variable width would need either an outline (non-editable) or a width-profile model, and the clean mid-century style doesn't call for it. Revisit only if users ask.

## 6. Snapping, smart guides, alignment and distribution

**What tools do**

- Figma: when moving, resizing or editing points, snapping aligns to other elements and a **red guide** appears. Holding **Control** temporarily disables snapping. **Option/Alt-hover** over a second element shows red distance measurements. ([Figma: Add guides](https://help.figma.com/hc/en-us/articles/360040449713-Add-guides-to-the-canvas-or-frames); [Figma: Measure distances](https://help.figma.com/hc/en-us/articles/360039956974-Measure-distances-between-layers))
- Figma **Smart selection:** equally spaced elements get pink spacing handles you can drag to change the gap for all of them. ([Figma: Smart selection](https://help.figma.com/hc/en-us/articles/360040450233-Arrange-objects-with-Smart-Selection))
- Illustrator **Smart Guides:** temporary snap-to guides that align and transform relative to other elements and the artboard, and that snap Pen and Shaper anchor points to preset angles such as 45° and 90°. ([Adobe: Smart Guides](https://helpx.adobe.com/illustrator/desktop/measure-and-align/grids-and-guides/work-with-smart-guides.html), search excerpt)
- tldraw: Ctrl toggles snapping to existing straight segments within **8 screen px**. ([tldraw: Draw shape](https://tldraw.dev/sdk-features/draw-shape))

**Recommendation (baseline)**

- Snap targets: Canvas edges and center, other Elements' edges and centers, equal spacing (show the gap), path points, and optionally the Reference grid lines (physical units). Show a guide line in a single accent color whenever a snap is active. The threshold is in **screen px** (about 6–8 on mouse, larger on coarse pointers). Ctrl/Cmd held = snapping suspended. Add a toolbar toggle to turn snapping off.
- Align (left / center / right / top / middle / bottom) and Distribute (horizontal / vertical) buttons in the properties panel. Align to the selection when two or more Elements are selected, or to the Canvas when one is. *Which reference you align to is a common confusion, so make it visible.*
- Touch: snapping matters *more* on touch because there is no fine nudge, so it should be on by default. The "hold Ctrl to suspend" gesture becomes a toolbar toggle.

## 7. Boolean shape operations

**What tools do**

- Figma has **Union, Subtract, Intersect, Exclude**. Boolean groups are **non-destructive**: children stay editable for position and size, but not for fill or stroke. **Subtract:** "Layers at the top of the hierarchy cut out the area where they overlap with the layer at the bottom." Intersect on non-overlapping shapes makes them disappear. **Flatten** is the destructive bake. ([Figma: Boolean operations](https://help.figma.com/hc/en-us/articles/360039957534-Boolean-operations); [Figma: Flatten layers](https://help.figma.com/hc/en-us/articles/30101373312279-Flatten-layers))
- Shape Builder (Illustrator and Figma): drag across regions to merge, and **Alt/Option-click or drag** to remove regions. Figma's version is explicitly **destructive**. ([Figma: Shape builder](https://help.figma.com/hc/en-us/articles/31616004109847-Create-custom-shapes-with-the-shape-builder-tool); [Adobe: Shape Builder](https://helpx.adobe.com/illustrator/using/creating-shapes-shape-builder-tool.html), search excerpt)
- Paper.js implements `unite`, `intersect`, `subtract`, `exclude` and `divide` on paths. ([`PathItem.Boolean.js`](https://github.com/paperjs/paper.js/blob/develop/src/path/PathItem.Boolean.js))

**Recommendation (baseline)**

- Four buttons: Union / Subtract / Intersect / Exclude, enabled when two or more shape Elements are selected. **Destructive** (the result replaces the inputs with one path), with undo. This keeps the file format simple (no live boolean tree). Subtract uses **front-most minus the rest**, with "top cuts bottom" spelled out in the tooltip, because order confusion is the classic beginner trap. Show a hover preview of the result before committing if cheap. Non-destructive boolean groups and Shape Builder can wait until after v1.
- Touch: the same buttons. There's nothing gesture-specific to add.

## 8. Touch & stylus adaptations

**Platform facts**

- Pointer Events give mouse, pen and touch one pipeline (`pointerType` is `mouse` | `pen` | `touch`). For hardware without pressure, `pressure` **MUST be 0.5** while buttons are active. Browser panning and zooming "cannot be suppressed by canceling a pointer event", so the Canvas needs CSS **`touch-action: none`**. ([W3C Pointer Events 3](https://www.w3.org/TR/pointerevents3/))
- **iPad Safari:** "once the pencil is touching the screen, the OS stops sending finger events to the browser entirely". tldraw's only workaround (a hidden scroller that turns a swipe into Shift) was called "slightly cursed" and not shipped. ([tldraw blog: A touchy subject](https://tldraw.dev/blog/a-touchy-subject))
- tldraw **pen mode** "ignores non-pen input to prevent accidental touch interactions while using a stylus". It turns on automatically only for direct-display pens (Apple Pencil, Surface Pen), not graphics tablets. ([tldraw: Input handling](https://tldraw.dev/sdk-features/input-handling))
- Apple HIG: "Let people make a mark the moment Apple Pencil touches the screen … avoid requiring people to tap a button or enter a special mode." "Let people choose when to switch between Apple Pencil and finger input", and controls should respond to Pencil too. Use hover to *preview*, never to *act*. Respect the user's system double-tap/squeeze setting. ([Apple HIG: Apple Pencil and Scribble](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble))
- Target sizes: Apple iOS/iPadOS default control **44×44 pt** (minimum 28×28), macOS 28×28 (minimum 20×20) ([Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). Material: **48×48 dp** (about 9 mm), with 8 dp spacing ([Material accessibility](https://m2.material.io/design/usability/accessibility.html), [Android: Touch target size](https://support.google.com/accessibility/android/answer/7101858)). Apple also says to "avoid custom multifinger and multihand gestures" for frequent actions and to offer alternatives to gestures.
- On-screen modifiers in shipped apps: **Illustrator iPad touch shortcut**: hold for the primary modifier, slide to the outer ring for the secondary, **double-tap to lock** ([Adobe: Touch shortcuts and gestures](https://helpx.adobe.com/illustrator/ipad/get-started/shortcuts-and-gestures/touch-shortcuts-gestures.html), search excerpt). **Affinity Command Controller**: a radial on-screen modifier with ⌘ etc. ([Affinity: Quick Menu](https://www.affinity.studio/help/workspace-quick-menu-ipad/)). Affinity V2 changed its multi-finger gestures and users found them confusing ([Affinity forum](https://forum.affinity.serif.com/index.php?%2Ftopic%2F184067-difficulties-with-gesture-modifiers%2F=), anecdotal).

**Recommendation (adaptations)**

| Desktop convention | Touch / stylus adaptation |
|---|---|
| Shift / Alt / Ctrl held | A small **modifier puck** near the thumb: tap = latch for the next gesture, double-tap = lock (Illustrator pattern). It must not depend on holding a finger during a Pencil stroke on iPad |
| Second-finger constrain | Supported for finger-only drawing, as a bonus. Never the only route |
| Hover feedback (snap preview, pen rubber band) | Show the preview *during* the drag. Use Pencil hover where available, for preview only |
| Right-click menu | Long-press (500 ms) or a "…" button on the selection |
| Space-drag / wheel to pan and zoom | Two-finger pan and pinch zoom. When a pen is detected, single-finger touch pans (pen mode) and the pen draws |
| Double-click to edit / finish | Double-tap, plus explicit **Edit points**, **Done** and **Close** buttons |
| Fine nudge with arrow keys | Numeric fields (see §9) and snapping on by default |
| Tiny handles | 44 pt hit areas, about 20 px handle radius, larger drag thresholds |

Phones: the same model in a compact layout. Hide handles you can't use at that size behind "Edit points". The properties panel becomes a bottom sheet, and the modifier puck sits at the bottom-left/right edge, configurable for handedness (HIG: avoid controls hidden by either hand).

## 9. Numeric precision inputs

**What tools do**

- Figma: position, dimension and rotation fields accept math (`+10`, `*2`, `^2`). Selecting the field and typing *replaces* the value, so to apply an expression you must append it to the existing number. ([Figma: Adjust alignment, rotation, position, and dimensions](https://help.figma.com/hc/en-us/articles/360039956914-Adjust-alignment-dimensions-rotation-and-position))

**Recommendation (baseline)**

- Properties panel: X, Y, W, H, rotation (°), corner radius, stroke width, and the arc fields (start, sweep, ratio). Values are in the Canvas's **physical unit** (in or cm) and accept unit suffixes ("2cm" in an inch Design converts) and simple arithmetic. Constrain-proportions lock on W/H. On touch, use `inputmode="decimal"` keyboards and scrub-by-drag on the label.

## 10. What tends to confuse beginners

- **The Bézier Pen tool's handle model**, which is why the Curvature tool and Bend exist. Mitigation: segment-drag bending and double-click to toggle the point type (§4).
- **Too many or too few points from freehand,** and smoothing they can't control (§5). Mitigation: a Smoothing slider with a sensible default.
- **Boolean operand order** (which shape cuts which) and Intersect on non-overlapping shapes making everything vanish (§7). Mitigation: tooltips and a preview.
- **Selecting inside Groups** (click selects the Group, double-click enters it). Mitigation: Layers panel sync and a breadcrumb.
- **Hidden modes:** Spiro mode "drawing circles", modifier gestures changing between versions, and in-path editing mode not obviously active. Mitigation: show the current mode visibly, and avoid clever interpolation modes.
- **Align target ambiguity** (to the selection vs to the Canvas) (§6).
- **On touch:** handles too small to hit, and accidental drags when tapping. Mitigation: coarse-pointer sizing and thresholds (§1).

---

## Gaps and caveats

- Adobe helpx pages refuse automated fetches (HTTP 403). Adobe claims are quoted from search-engine excerpts of the official pages, linked above. They should be verified by hand if any becomes load-bearing.
- Figma's help center doesn't document Shift-for-45° or Alt-to-break-handle on the **Pen** tool. Those are widely assumed conventions, but they aren't confirmed here.
- The Affinity iPad gesture → modifier mapping (one/two/three-finger holds) wasn't available from an official page (the affinity.help gesture page returned 403).
- The iPad "no finger events while Pencil is down" behavior comes from one first-party tldraw engineering blog post, not from Apple documentation. A prototype ticket should confirm it on current iPadOS before the modifier puck design is final.
