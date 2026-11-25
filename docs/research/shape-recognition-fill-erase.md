# Research: shape recognition, Region fill & vector erasing

Ticket: [#15](https://github.com/waaron5/ipolashki/issues/15) · Map: [#1](https://github.com/waaron5/ipolashki/issues/1) · Feature scope: [#3](https://github.com/waaron5/ipolashki/issues/3) · Engine lead: [#9](https://github.com/waaron5/ipolashki/issues/9) · Researched 2026-11-25

**Question.** How can the browser app (1) recognize a freehand stroke as a perfect shape, including even waves, with a "not a shape" answer; (2) find and fill the Region under the pointer, formed by open and closed paths plus the Canvas edge; and (3) cut a drawn loop out of many Elements and trim a line between its nearest crossings? All of it has to work on vector paths and fit the lead engine (plain SVG from our own Design model, with Paper.js headless for geometry).

## Answer (TL;DR)

**No new library is needed. Paper.js 0.17 (MIT, about 103 KB gzipped, already planned as a lazy-loaded headless dependency) plus roughly a thousand lines of our own code covers all three areas.**

| Area | Recommendation | Library | Confidence |
|---|---|---|---|
| **1. Shape recognition** | Our own **geometric fitters**, one per Live shape, in the PaleoSketch style: fit each candidate, score each fit with a normalized error, prefer the simpler shape on near-ties, and fall back to **As drawn** when the best error is over a threshold. Line by total least squares. Circle by algebraic (Kåsa/Taubin) fit. Ellipse by direct least squares (Fitzgibbon / Halíř–Flusser). Arc from a circle fit plus its angular span. Triangle and rectangle from **corner finding (ShortStraw)** plus a line fit per side. **Waves** from turning points along a fitted baseline (method below). | None. Hand-written, about 600–900 lines with no dependencies. Paper.js `simplify()` handles the As-drawn fallback. | High for line, circle, ellipse, arc, rectangle and triangle, which are textbook methods. **Medium for waves**: they look feasible on synthetic strokes, but the pen prototype has to confirm it on real ones. |
| **2. Region fill** | Build a **planar arrangement** (a half-edge graph) from every visible stroked path, open or closed, plus the Canvas edge. Split the curves at all intersections, prune dangling ends, trace the faces, find the face under the pointer, and subtract its holes. The result is an exact Bézier fill path that matches the print. **Cache** the arrangement while the Fill tool is active and rebuild it when the Design changes. Add **gap closing** so near-miss line ends don't leak. | Paper.js public API (`getIntersections`, `Curve#getPart`, `getArea`, `contains`, `subtract`) plus our own graph code (about 250 lines; a prototype works). | Medium-high. Measured feasible: 300 dense paths build in about 0.6 s on a 2019 laptop, and each hover lookup takes about 1 ms. Robustness at edge cases is the real work. |
| **3. Vector erasing** | **Loop:** recognize the eraser loop with the Pen's recognizer, then `subtract` it from every touched closed Element (area semantics) and `subtract(loop, { trace: false })` from every touched open path (split and drop the parts inside). **Scrub:** for each path the scrub crosses, cut between the nearest crossings before and after the scrub point, or to the path's ends, using the same arrangement as Fill. | Paper.js booleans (`subtract` with `trace: false` already does "trim the inside of an open path") | High. Measured: about 80 ms for a loop touching 95 Elements and about 4 ms per scrubbed path. |

**Rejected as the core of any area:** template gesture recognizers ($1/$P/$Q). They are BSD-licensed and fine to use, but they classify against templates without measuring geometry, and they can't say "not a shape". Clipper2: polygons only, and open paths can't act as boundaries. JSTS/Turf polygonize: polylines only, so curves would have to be flattened and refit. Raster flood-fill with Potrace in the Inkscape style: **GPL**, and only approximate. Paper.js's internal planar graph: private, and it closes open paths with a chord. All of these are covered below.

**Risks for the Pen prototype and the front-end decision:** wave thresholds can only be tuned on real strokes. Zigzag and smooth waves get confused about 15% of the time without a corner check. Waves along a *curved* baseline aren't covered. Gaps between line ends leak fills unless the Pen snaps endpoints and Fill closes small gaps. A dense Design on a phone needs the arrangement built off the main thread. Paper.js has one maintainer (already noted in #9). See [§5](#5-risks-and-what-the-pen-prototype-should-test).

---

## 1. Shape recognition

### What existing products do

| Product | Trigger | Shapes | Escape hatch | Source |
|---|---|---|---|---|
| **Procreate QuickShape** | Draw, then **keep holding** at the end of the stroke: "After a moment, QuickShape will invoke automatically." A second finger while holding makes "an oval into a circle", "a rectangle into a square", "an uneven triangle into an equilateral one". | "line, arc, poly-line, ellipse, triangle, or quadrilateral" | **Edit Shape** nodes. Settings under Actions → Prefs → Gesture Controls → QuickShape. | [Procreate Handbook: QuickShape](https://help.procreate.com/procreate/handbook/guides/quickshape) |
| **Apple Markup / Notes (PencilKit)** | "Draw a shape in one stroke with your finger or Apple Pencil, then pause." | "geometrically perfect shapes: lines, arcs, and more" | "If you prefer to keep the freehand shape, tap" Undo. | [iPad User Guide: draw in apps](https://support.apple.com/en-kz/guide/ipad/draw-in-apps-ipad6350b8dc/16.0/ipados) |
| **OneNote (iPad) Ink to Shape** | A **mode toggle** on the Draw tab; tap it again to turn recognition off. | Circles, ovals, squares, rectangles, triangles (some drawn with several strokes) | Undo | [Microsoft Support: shape recognition in OneNote](https://support.microsoft.com/en-gb/office/create-diagrams-with-shape-recognition-in-microsoft-onenote-11893c78-7e5a-4a07-93f5-b5caa46f75a9) |
| **Google AutoDraw** | Continuous. ML guesses the subject (the Quick, Draw! model) and offers artist-drawn clip art in a suggestion bar; tapping one replaces the sketch. | Objects (clip art), not geometry | Ignore the bar | [Google blog: Fast Drawing for Everyone](https://blog.google/technology/ai/fast-drawing-everyone/) |
| **Excalidraw** | None. "shape recognition" has been an open issue since 2022; a maintainer said it's "potentially not super simple, especially in conjunction with our current freedraw tool". A contributor prototype branch (March 2025) was never merged. | n/a | n/a | [excalidraw#5510](https://github.com/excalidraw/excalidraw/issues/5510) |
| **tldraw** | None found: no matching PRs or issues in `tldraw/tldraw` (searched "shape recognition", "recogni", "recognize shape"). (tldraw is ruled out on licence anyway, see #9.) | n/a | n/a | GitHub search, 2026-11-25 |

Take-aways for ipolashki:
- Every shipping geometric recognizer (Procreate, Apple) triggers on a **dwell (hold or pause)**, not on release. ipolashki's decided behavior, snapping on release when confident plus a chooser and a kept original stroke (#3), is **more aggressive than the market**. So the confidence threshold has to be conservative, and the "As drawn" escape has to be one tap away. A cheap addition worth testing in the prototype: **holding at the end of the stroke forces recognition** even below the threshold, the way Procreate and Apple do.
- Procreate's second-finger "make it regular" (circle, square, equilateral) maps onto our preference for simpler shapes on near-ties, and onto Shift on desktop.
- The open-source whiteboards (Excalidraw, tldraw) have no recognizer to borrow.

### Template recognizers ($1, $P, $Q): usable, but the wrong tool

- **$1** (Wobbrock, Wilson, Li, UIST 2007, [doi:10.1145/1294211.1294238](https://doi.org/10.1145/1294211.1294238)) and **$P** (Vatavu, Anthony, Wobbrock, ICMI 2012) are under the **New BSD License** ("This software is distributed under the New BSD License agreement", [ACE Lab $1 page](https://depts.washington.edu/acelab/proj/dollar/index.html), [$P page](https://depts.washington.edu/acelab/proj/dollar/pdollar.html)). That is compatible with an open-source app.
- They are the wrong fit for a beautifier:
  - $1 **scales every stroke non-uniformly into a square** before matching: `function ScaleTo(points, size) // non-uniform scale; assumes 2D gestures (i.e., no lines)` ([dollar.js](https://depts.washington.edu/acelab/proj/dollar/dollar.js), line 231). Aspect ratio is thrown away, so it can't tell a circle from an ellipse or a square from a rectangle, and it degenerates on straight lines.
  - `Recognize()` always returns the **nearest template**, a closed-world classification with no rejection class. A "not a shape" answer has to be bolted on with a score threshold.
  - The output is a label, not parameters. We would still need geometric fitting to get the radius, axes, corners and wave count a Live shape keeps.
  - $P/$Q add multistroke support and speed ("$Q … 142× speedup", [$P page](https://depts.washington.edu/acelab/proj/dollar/pdollar.html)). We don't need either, because Pen strokes are single strokes.
- **Verdict:** they could be a cheap second opinion, but they aren't needed.

### Geometric fitting: the recommended approach

The sketch-recognition literature's geometric recognizers, PaleoSketch among them, "focus on determining the error between a sketched shape and its ideal version using a series of geometric tests and formulas". They recognize "arc, line, curve, circle, ellipse, helix, spiral, polyline, and complex", with the original PaleoSketch at **98.56%** accuracy. Their known weakness: "the use of multiple error measures on a per shape basis makes ranking alternative interpretations difficult", which is exactly the chooser's problem. The fix in the same paper is to produce "normalized confidence values for alternative interpretations" ([Paulson, Rajan, Davalos, Gutierrez-Osuna, Hammond 2008, "What!?! No Rubine Features?"](https://psi.engr.tamu.edu/wp-content/uploads/2018/01/paulson2008no.pdf), which reports PaleoSketch: Paulson & Hammond, IUI 2008).

Recommended pipeline (all on the **raw coalesced pointer samples**, before smoothing):

1. **Resample** by arc length (for example 64–400 points) and run cheap pre-checks: is it closed (endpoint gap under about 10–15% of the stroke length, or a self-intersection near the ends), is it straight, does it backtrack.
2. **Fit every candidate** whose pre-checks pass:
   - **Line:** total least squares (PCA).
   - **Circle:** algebraic fit (Kåsa, [doi:10.1109/TIM.1976.6312298](https://doi.org/10.1109/TIM.1976.6312298); or Taubin for less bias on short arcs).
   - **Ellipse:** direct least-squares ellipse fit (Fitzgibbon, Pilu, Fisher, IEEE TPAMI 1999, [doi:10.1109/34.765658](https://doi.org/10.1109/34.765658)), in the numerically stable form of Halíř & Flusser (WSCG 1998). It needs only a 3×3 eigenproblem, so it can be hand-written without `ml-matrix`.
   - **Arc / half-circle:** circle fit on an open stroke, plus the swept angle. Snap to exactly 180° when within a few degrees.
   - **Triangle / rectangle:** corner finding with **ShortStraw** (Wolin, Eoff, Hammond, SBIM 2008, [doi:10.2312/SBM/SBM08/033-040](https://diglib.eg.org/handle/10.2312/SBM.SBM08.033-040)), "a simple and highly accurate polyline corner finder" with a fixed window. Then a line fit per side. A rectangle needs 4 corners at about 90°, with near-equal sides becoming a square and a near-axis rotation snapping to 0°.
   - **Wave:** below.
3. **Score** each fit with one **scale-free error**: RMS orthogonal distance from the samples to the fitted shape divided by the stroke's bounding-box diagonal, plus a cap on the worst single deviation so one stray hook vetoes a fit. This gives the PaleoSketch-style normalized confidence instead of per-shape heuristics.
4. **Decide:**
   - Best confidence ≥ *T_snap*: snap. Show the chooser with every candidate within a margin of it, always including **As drawn**.
   - Below *T_snap*: keep **As drawn** (Paper.js `simplify()`, as in #2).
   - On near-ties, **prefer the simpler shape**: line over arc, circle over ellipse (axis ratio > about 0.9), square over rectangle, arc over open curve.
5. **Store** the raw stroke with the Element. #3 already decided to keep the original stroke so the choice can be switched later.

Cost: each fitter is O(n) or a few small linear solves. Recognition finishes in **well under 1 ms per stroke**; the wave recognizer measured 0.26 ms (below). It can run on the main thread at `pointerup`.

### Waves: feasible, with caveats (measured)

**Method** (the throwaway experiment implemented and tested this):
1. Resample to 400 points by arc length.
2. Fit a **straight baseline** with PCA. Project each sample to (*s* along the baseline, *d* off it).
3. Reject the stroke if its *s* backtracks by more than 3% of the span (loops, curls). Remove a gentle bow with a quadratic fit of *d* over *s*.
4. Smooth *d* lightly. Find **turning points with hysteresis**: a peak or trough only counts after the signal reverses by more than 0.6 × the robust amplitude. Robust amplitude = half the 5th–95th percentile range, with a minimum of 3 px or 2% of the span.
5. Require **≥ 3 half-cycles** (1.5 periods).
6. **Regularity:** the coefficient of variation of the half-cycle widths (cvW) and heights (cvH).
7. **Kind:** normalize each half-cycle to a unit box and compare it with each kind's half-cycle (sine half, straight ramp, quarter-circle for scallops in both cusp orientations). The kind with the lowest mean RMS wins.
8. **Confidence** = `clamp(1 − max(cvW, cvH)/0.5) × clamp(1 − shapeError/0.25)`.
9. **Output:** kind, period = mean full-cycle width, amplitude = mean half-cycle height / 2, cycle count, and the baseline endpoints. These are exactly the Live shape's measurements, and the perfected wave is drawn **evenly** from them.

**Synthetic test:** 300 strokes per class, with 2–8 cycles and per-cycle period and amplitude jitter of 5–20%. Each stroke had a random rotation, a ±7.5% bow and 1.2 px Gaussian tremor. The negatives were wandering freehand lines, single S-curves, straight lines and "uneven bumps" (random widths and heights).

| Threshold | Smooth found (kind right) | Zigzag found (kind right) | Scallop found (kind right) | Freehand wrongly a wave | S-curve | Line | Uneven bumps |
|---|---|---|---|---|---|---|---|
| 0.2 | 90% (99%) | 93% (85%) | 93% (100%) | 2% | 0% | 0% | 3% |
| **0.3** | **88% (99%)** | **90% (85%)** | **80% (100%)** | **1%** | **0%** | **0%** | **2%** |
| 0.4 | 83% (99%) | 84% (84%) | 55% (100%) | 1% | 0% | 0% | 1% |
| 0.5 | 64% (99%) | 60% (85%) | 21% (100%) | 0% | 0% | 0% | 0% |

- Of the wave strokes, 51 of 900 were rejected before scoring (39 for backtracking on steep, tremulous waves; 12 as too flat).
- At threshold 0.4, the median period error was **0.9%** and the median amplitude error 9.8% (the amplitude error is mostly the injected jitter).
- **What this shows:** fitting a regular period and amplitude is **feasible and cheap**, and "not a wave" is reliable: 0–3% false positives, even on deliberately bumpy strokes.
- **What it doesn't show:**
  - These are **synthetic** strokes. Real hands differ (for example, people speed up and shrink later cycles), so thresholds must be tuned on strokes recorded in the pen prototype.
  - **Zigzag vs smooth** is the weak spot: about 15% of zigzags were labelled smooth. Adding a corner-sharpness test at each turning point (ShortStraw-style) should fix most of these, and the chooser covers the rest because Smooth, Zigzag and Scalloped sit in one tap.
  - Scallops need a lower threshold or better cusp handling. Recall falls off fast above 0.3.
  - **Curved baselines** (a wavy circle, a wave along an S) are not covered. That needs a low-pass "spine" of the stroke instead of a line, with *d* measured along its normals: doable, but a separate risk. **Suggestion: v1 waves run along a straight line**, and curved-baseline waves go to *later*. That matches #3's rule that waves drop to later if they aren't reliable.

### Licence and bundle (recognition)

Nothing to add: our own code, an estimated 10–20 KB minified. $1/$P code (BSD) may be borrowed if ever wanted.

---

## 2. Region fill (planar arrangement)

### How others do it

- **Illustrator Live Paint** treats the paths of a Live Paint group as dividing the artwork into faces and edges. It has **Gap Options**: *Gap Detection*, "Paint stops at" small/medium/large/custom gaps, a preview colour, a gaps-found counter, and "Close Gaps With Paths", which inserts unpainted paths. Adobe warns that "Turning on Gap Detection may slow down Adobe Illustrator when working on large, complex Live Paint groups". Shape Builder uses gap lengths of Small 3 pt, Medium 6 pt, Large 12 pt. ([Adobe: find and close gaps in Live Paint groups](https://helpx.adobe.com/illustrator/desktop/paint-and-fill/learn-painting-basics/find-and-close-gaps-in-live-paint-groups.html), [Shape Builder tool options](https://helpx.adobe.com/illustrator/desktop/draw-shapes-and-paths/draw-shapes/shape-builder-tool-options.html). Adobe's help pages returned HTTP 403 to automated fetching, so these quotes come from Adobe's own pages as surfaced by web search.)
- **Inkscape Paint Bucket** is raster-based: "Bucket fill drawing context, works by bitmap filling an area on a rendered version of the current display and then tracing the result using potrace" ([`src/ui/tools/flood-tool.cpp`](https://gitlab.com/inkscape/inkscape/-/raw/master/src/ui/tools/flood-tool.cpp), lines 4–5). Its options are a colour *Threshold*, *Close gaps* ("Size of gaps to ignore") and *Grow/shrink* to overlap the lines ([Inkscape wiki: Paintbucket Toolbar](https://wiki.inkscape.org/wiki/Paintbucket_Toolbar)). Inkscape and Potrace are **GPL**. The npm `potrace` and `esm-potrace-wasm` packages are GPL-2.0 too (npm registry), so the code can't be reused in a permissively licensed app.
- Both converge on **gap tolerance** as a first-class setting. The vector route (Illustrator) is exact. The raster route (Inkscape) is robust to gaps but only approximates the boundary, which is why it has a grow/shrink fudge.

### Library survey

| Option | What it gives | Fit | Licence | Size (min+gz) | Verdict |
|---|---|---|---|---|---|
| **Paper.js 0.17** public API | Exact Bézier/Bézier intersections across many paths (`CompoundPath#getIntersections()` uses its own sweep-and-prune collision detection), `Curve#getPart`, signed `getArea`, `contains`, booleans that accept arrays of paths | Already in the stack. Results are Bézier path data we write straight into our SVG Design model. | MIT ([LICENSE.txt](https://github.com/paperjs/paper.js/blob/develop/LICENSE.txt)) | **103 KB** for `paper-core.min.js` (measured: 311,756 B minified, 105,604 B gzip -9). Bundlephobia reports 119 KB for `paper-full`. | **Use**, plus our own face tracing |
| Paper.js internal `createGraph` | Since 0.15, booleans "trace the results … through a planar graph of the operands' curves", with snap rounding within one tolerance, merged coincident curves and faces ([CHANGELOG 0.15.0](https://github.com/paperjs/paper.js/blob/develop/CHANGELOG.md)). Reachable only as `PathItem._createGraph(path1, path2)` (underscore, undocumented). | It **closes open paths with a chord** (`getOperands` → `preparePath(path, true)` → `closePaths`), so a curved open line makes false faces. Verified: a straight line split a rectangle into 2 faces only because its closing chord lies on it, and a there-and-back path collapsed to no split. | MIT | (inside Paper) | **Don't call it.** It's worth reading and borrowing from (MIT) for robustness. It could also become a feature request upstream: a public "regions/planar graph" API with open-path support. |
| JSTS `Polygonizer` (port of JTS) | Faces from linework. "The processed edges must be correctly noded; that is, they must only meet at their endpoints". It reports dangles and cut edges ([JTS source](https://github.com/locationtech/jts/blob/master/modules/core/src/main/java/org/locationtech/jts/operation/polygonize/Polygonizer.java)). | Polylines only: curves must be flattened, noded (for example by a union), then refit, so the fills no longer sit exactly on the curves | EDL-1.0 or EPL-1.0 (npm) — EDL is BSD-style, OK | 100 KB (bundlephobia, v2.0.4; npm latest is 2.12.1, repo last pushed 2025-01) | No: big, and polyline-only |
| `@turf/polygonize` | Same GEOS algorithm. "Edges must be correctly noded" ([README](https://github.com/Turfjs/turf/tree/master/packages/turf-polygonize)). | Polylines in GeoJSON; we'd node them ourselves | MIT | 5 KB | No: we'd still do the noding (the hard half) and lose the curves |
| `planar-face-discovery` | Faces of a straight-edge planar graph | Straight edges only, last published 2022 | **CC-BY-4.0** (unusual for code; needs attribution) | 3.7 KB | No |
| Clipper2 (C++/C#/Delphi; TS ports) | Robust polygon booleans and offsetting | **Polygons only** (integer coordinates, no curves). Open paths can be *subjects* only: the engine has `AddOpenSubject` and no open clip ([clipper.engine.h](https://github.com/AngusJohnson/Clipper2/blob/main/CPP/Clipper2Lib/include/clipper2/clipper.engine.h), lines 473–475), so open lines can't bound faces | Boost 1.0 (OK) | `clipper2-js` 19 KB (stale since 2024); the README points to `countertype/clipper2-ts` (BSL-1.0, active) | No: Paper covers booleans |
| Raster flood fill + contour tracing | Render the strokes to an offscreen canvas, flood-fill from the pointer, trace with marching squares (`d3-contour`, ISC, 3.4 KB), then refit with Paper `simplify()` | Robust to near-gaps (a morphological close), aware of stroke width. The boundary is approximate and depends on resolution, so true-scale prints show it. | ISC/MIT parts are OK; **Potrace is GPL** | small | **Fallback only**, if vector robustness disappoints |

### Recommended algorithm (prototyped)

The arrangement is a pure function of the Design's geometry: `buildArrangement(paths, canvasEdge)` → faces, and `regionAt(arr, point)` → fill path. That makes it a good **deep module**, and the Eraser's scrub-trim can reuse it.

1. **Inputs:** every visible, unlocked or locked (but not hidden) Element with a **stroke**, both open and closed paths, in Canvas coordinates, plus the **Canvas rectangle**. Exclude Tracing images and Text. Exclude fill-only Elements, so old snapshot fills don't subdivide Regions.
2. **Gap closing (recommended addition, not prototyped):** for every *dangling* endpoint, cast its end tangent forward by the gap tolerance (screen px converted to Canvas units, like Illustrator's 3/6/12 pt). If it hits another curve, or comes within tolerance of another dangling end, add an invisible bridge edge. **Prevention matters more:** the Pen should snap a stroke's ends onto nearby lines and points (#2's snapping applies), so most gaps never exist.
3. **Noding:** put all paths into one `CompoundPath` and call `getIntersections()` once. Collect the curve times for both sides of every crossing. Cut every Bézier at its times with `Curve#getPart`. Merge endpoints closer than ε (1e-3 Canvas units) through a hash grid.
4. **Prune dangles:** repeatedly remove edges with a degree-1 vertex. Open strokes that end in mid-air don't bound anything.
5. **Half-edges and faces:** take the outgoing angle of each half-edge from a point slightly along the curve (more robust than the control-point tangent). Sort the outgoing half-edges at each vertex; set `next(h)` to the twin's clockwise neighbour; walk the cycles. Each cycle's signed area comes from `Curve.getArea` summed over its pieces.
6. **Point location (`regionAt`):** pick the smallest positive-area cycle whose bounds and outline contain the pointer. Then subtract the **holes**: negative-area cycles (outer boundaries of disconnected islands) that lie inside it and don't contain the pointer, using one `subtract([holes…])` call. Holes covered by islands inside islands drop out naturally, because each island's outer boundary is subtracted whole.
7. **Commit:** the fill path becomes a new filled Element placed **just behind the lowest bounding line** (#3). It runs along the **centrelines** of the bounding strokes, so the strokes cover the seam on screen and in print. No grow/shrink fudge is needed, unlike Inkscape.

**Correctness checks (passed):**
- A circle cut by a line across the Canvas: the upper half-circle came out at 15,712 against an expected 15,708 (the difference is Paper's 4-cubic circle approximation).
- The Canvas region below the line, minus the lower half-circle and minus a floating circle "hole": 476,431 against 476,438.
- A dangling open stroke was correctly ignored.
- The inside of the floating circle was found.

**Performance** (Node 22, the same V8 as Chrome, Intel i7-9750H 2019 laptop, Paper.js 0.17.0; synthetic Designs where half the paths are random closed shapes and half are Pen-like freehand strokes simplified at 2.5 px, deliberately dense):

| Paths (Bézier curves) | Intersections | Faces | Build arrangement | Build face outlines (first hover) | Each later hover lookup |
|---|---|---|---|---|---|
| 100 (1,101) | 907 | 869 | 109 ms | 31 ms | 0.2 ms |
| **300 (3,179)** | **7,514** | **7,385** | **438 ms** (292 ms of it intersections) | **128 ms** | **0.9 ms** |
| 600 (6,334) | 31,036 | 30,643 | 1,545 ms | 359 ms | 3.6 ms |

- These test Designs are denser than a typical painting reference: 7.5k crossings for 300 paths. Real Designs should come in faster.
- Hover highlighting is cheap once the arrangement is built. The **build** is the cost.
- So: build it when the Fill tool is chosen and after each edit while Fill is active, **in a Web Worker** (Paper.js runs without a DOM: these benchmarks ran in Node with `paper-core.js` + `paper.setup(size)`, and the worker-specific bugs [#2200](https://github.com/paperjs/paper.js/issues/2200)/[#2201](https://github.com/paperjs/paper.js/issues/2201) were fixed in October 2026). Show the highlight once the build is ready.
- Phone speed was **not measured**. Expect several times slower on low-end Android. If that's too slow, rebuild **incrementally**: re-node only the paths whose bounds touch the changed Element.

### Robustness work the prototype skipped

- Tangencies and coincident edges: two rectangles sharing a side, a line traced over another. Merge overlapping edges into one, as Paper's own graph does.
- Self-intersecting freehand strokes: noding handles them, but check for tiny slivers.
- Near-coincident crossings.
- Zero-length pieces.

Paper's internal graph already solves these with snap rounding ("hot pixels") and merging coincident curves. Its MIT source is the reference for hardening ours.

---

## 3. Vector erasing

### What others do

- **Illustrator Shape Builder:** Alt/Option switches to erase mode; "click the region you want to remove or click the path segment you want to remove", and Shift+Alt drags a marquee. This is the "delete an edge between crossings" behavior ([Adobe: Shape Builder](https://helpx.adobe.com/illustrator/using/building-new-shapes-using-shape.html)).
- **Illustrator Eraser** "lets you erase any area regardless of structure" (paths, compound paths, Live Paint, clipping paths). The separate **Path Eraser** removes segments by drawing along a path ([Adobe: Eraser tool](https://helpx.adobe.com/illustrator/using/tool-techniques/eraser-tool.html)). (Adobe pages via search; direct fetch was blocked.)

### Loop cut (draw a loop to cut that Region out)

- **Perfect the loop first** with the Pen's recognizer, restricted to closed shapes (circle, ellipse, rectangle, triangle). Otherwise use the `simplify()`'d As-drawn loop. That gives #3's "a rough half-circle becomes a perfect one".
- For each target Element (the selection, else every visible, unlocked Element whose bounds touch the loop; never Tracing images):
  - **Closed paths (filled or outline-only): `element.subtract(loop)`**, area semantics. The bite's edge becomes part of the outline. This keeps a line and its separate snapshot fill (#3) **cut identically**, because both are subtracted by the same loop.
  - **Open paths: `element.subtract(loop, { trace: false })`**. Paper documents `trace: false` as "the first path is only to be split at intersections, removing the parts of the curves that intersect with the area of any other path" (`paper.d.ts`, `subtract` options). Verified: a line through a rectangle came back as its two outside pieces.
  - **Text:** skip. It can't be cut without text-to-outlines, which is a *later* feature.
  - **Live shapes** become custom paths (#3's molding rule); undo brings them back.
  - Groups: apply to their children.
  - The whole erase is **one undo step**.
- **Measured:** a 300-px-wide loop through the 300-path test Design touched 95 Elements and took **80 ms** in total. At 600 paths it touched 202 Elements in 125 ms. Run it on the main thread.

### Scrub trim (scrub across a line to trim it to the nearest crossings)

- For each path the scrub crosses:
  1. `getNearestLocation(scrubCrossing)` gives the hit offset.
  2. Collect the offsets of its crossings with every other bounding path, its self-crossings, and the Canvas edge.
  3. Take the nearest one before and the nearest one after the hit (or the path's ends when there are none).
  4. `splitAt` both and drop the middle piece.
  - Closed paths become open. One with no crossings is removed entirely.
- **Measured: about 4 ms per path** (300-path Design, using public per-path calls).
- With the Fill arrangement already built, it's simpler and faster: **delete the arrangement edge under the scrub** and write each affected path back as its surviving pieces.

### Behavior questions this raises (for [#11](https://github.com/waaron5/ipolashki/issues/11), drawing tool set & behavior)

1. **Loop or scrub?** The Eraser has to classify its own stroke. Suggested rule: closed (ends within about 10–15% of the length, or self-crossing near the ends) means loop; anything else means scrub. Show the interpretation while drawing: a shaded bite for a loop, a red preview of the segments to delete for a scrub.
2. **Outline-only closed shapes:** area semantics (recommended) put an outline along the bite. Stroke semantics would just open a gap in the outline. Pick one, and test both in the prototype.
3. **Trimming an edge of a *filled* closed shape** makes the path open. SVG still fills an open path by implicitly closing it, so the fill shape changes. Either forbid scrub-trimming filled shapes, or trim only their stroke (that needs a stroke-only copy).

---

## 4. Fit with the stack, licences, bundle

- **Plain SVG + our Design model:** every result is Paper `pathData`, which is SVG path syntax. Live shapes store their parameters (center/radii/rotation; corners; wave baseline, period, amplitude, count, kind) and our renderer emits the path. Scalloped waves can use SVG `A` arcs; smooth waves use standard cubic approximations of sine. Nothing ties the Design schema to Paper.
- **Paper.js headless:** used only as a geometry kernel (as in #9), lazy-loaded with the first Pen stroke, Fill or Eraser use. `paper-core.min.js` is about **103 KB gzipped**. It needs no canvas for geometry, so it can live in a Worker.
- **Licences:** Paper.js MIT. Our code is ours. Optional borrowings: $1/$P (BSD-3), Paper internals (MIT). **Avoid:** Potrace and the Inkscape code (GPL-2.0+), and `planar-face-discovery` (CC-BY-4.0, attribution needed).
- **Front-end stack decision ([#4](https://github.com/waaron5/ipolashki/issues/4)):** nothing here favours one UI framework over another; it's all framework-agnostic TypeScript. Two requirements do follow:
  - Module Workers must be supported in the build. All target browsers support them; Vite bundles them.
  - Pointer Events with `getCoalescedEvents()` are needed for raw stroke samples (already in #2).

## 5. Risks and what the pen prototype should test

For the pen prototype ([#6](https://github.com/waaron5/ipolashki/issues/6)) and the front-end stack decision ([#4](https://github.com/waaron5/ipolashki/issues/4)).

1. **Recognition thresholds need real strokes.** Every number above comes from synthetic strokes. The prototype should **record anonymised raw strokes**, each labelled with the user's final chooser pick, and tune *T_snap* per shape on them. Snapping on release (no dwell) makes false positives costlier than in Procreate or Apple. Test "hold to force recognition" as an extra.
2. **Waves:** detection and the period fit look solid. Weak spots:
   - zigzag vs smooth (about 15% confused) → add a corner test;
   - scallop recall falls off above threshold 0.3;
   - steep waves drawn shakily trip the backtracking check;
   - **curved baselines are not covered.** Recommend straight-baseline waves for v1.
   - If real-stroke recall is under about 80% at a 1–2% false-positive rate, waves drop to *later*, per #3.
3. **Fill gaps:** near-miss line ends leak fills into neighbouring Regions. Mitigations: Pen endpoint snapping, Fill-time gap closing with a tolerance setting, and the hover highlight (already decided) so the painter sees the leak before clicking.
4. **Fill performance on phones:** about 0.6 s for a dense 300-path Design on a 2019 laptop, so expect it to be slower on phones. Build in a Worker on Fill-tool activation, cache it, and keep incremental rebuilds as the fallback. Measure in the #5/#6 prototypes.
5. **Arrangement robustness** (tangencies, overlaps, slivers) is where the engineering time goes. Use Paper's MIT `createGraph` as the reference, or ask upstream for a public planar-graph API with open-path support.
6. **Paper.js bus factor 1** (from #9). Mitigation: we use only a small, stable public surface (`getIntersections`, `Curve#getPart`/`getArea`, `contains`, `subtract`, `splitAt`, `simplify`). Pin the version.
7. **Eraser semantics:** loop vs scrub classification, area vs stroke cuts on outline-only shapes, and trimming filled shapes all need explicit decisions (§3).

## Method note

- Primary sources: library source and typings (Paper.js 0.17.0 `dist/paper-core.js`, `paper.d.ts`, CHANGELOG; `dollar.js`; Clipper2 headers; JTS and Turf sources; Inkscape `flood-tool.cpp`), official product documentation (Procreate, Apple, Microsoft, Adobe via search), papers ($1, PaleoSketch/Paulson et al., ShortStraw, Fitzgibbon, Kåsa), and the npm registry and bundlephobia for licences and sizes.
- The arrangement/erase benchmark and the wave experiment were throwaway Node scripts written for this research, not committed. Their algorithms are described above in enough detail to rebuild them in the pen prototype.
