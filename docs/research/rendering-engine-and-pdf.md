# Research: rendering engine & vector PDF export

Ticket: [#9](https://github.com/waaron5/ipolashki/issues/9) · Map: [#1](https://github.com/waaron5/ipolashki/issues/1) · Researched 2026-11-25

**Question.** Which rendering engine should power the ipolashki editor, and how do we export a **true-scale vector PDF** Reference from it?

## Answer (TL;DR)

**Recommend: plain SVG rendered by the UI framework from our own Design model, exported with jsPDF + svg2pdf.js in the browser.** The Canvas on screen and the Reference share one render path (the same SVG), so what you see is what prints. The stack is MIT-licensed with no engine dependency, the PDF code loads only on export (about 155 KB gzipped), and it works signed-out and offline.

Shortlist:

| # | Engine + PDF | Why choose it | Main cost |
|---|---|---|---|
| **A (recommended)** | **Plain SVG + UI framework** → jsPDF + svg2pdf.js | One render path, so screen = Reference. Browser-native hit-testing and pointer events. No engine lock-in. Smallest bundle. | We build selection/transform handles, snapping, and marquee select ourselves. The DOM gets slow past a few thousand nodes on phones. |
| B | **Konva (react-konva)** → our own model→SVG serializer → jsPDF + svg2pdf.js | Ready-made Transformer handles, groups, layers, hit-testing, and canvas speed. Best maintenance health of any option. | Konva has **no SVG export** ([konva#2072](https://github.com/konvajs/konva/issues/2072), open). That means two render paths (canvas on screen, SVG for print), and text can drift between them. Text editing is a DOM textarea overlay. |
| C | **Fabric.js v7** → `canvas.toSVG()` → jsPDF + svg2pdf.js | Built-in SVG export, in-canvas text editing (IText/Textbox), and a freehand PencilBrush. | 464 open issues and no release since May 2026. Its object model pulls toward becoming our file format. Pointer events are off by default. Its generic SVG output can use features svg2pdf.js doesn't support. |

Any engine needs **Paper.js as a headless geometry library** (lazy-loaded) for boolean ops and freehand path simplification. Don't use it as the editor.

**Rejected: tldraw, Polotno, Excalidraw, PixiJS, Paper.js-as-editor, headless Chrome as the main PDF path.** See below.

---

## 1. Engines

### Health snapshot (GitHub/npm, 2026-11-25)

| Library | License | Latest release | Last push | Open issues | Stars | min+gz (bundlephobia) | npm weekly dl |
|---|---|---|---|---|---|---|---|
| Konva | MIT | 10.11.0 (2026-11-23) | 2026-11-25 | 3 | 15.0k | 57.5 KB | 3.78 M |
| Fabric.js | MIT | 7.4.0 (2026-05-18) | 2026-11-24 | 464 | 31.6k | 91.9 KB | 1.34 M |
| Paper.js | MIT | 0.17.0 (2026-11-03) | 2026-11-25 | 3 | 15.2k | 122.0 KB | 345 k |
| PixiJS | MIT | 8.23.0 (2026-11-11) | 2026-11-24 | 455 | 48.9k | 282.4 KB | 2.00 M |
| tldraw | **Proprietary (source-available)** | 5.6.2 (2026-11-20) | 2026-11-25 | 629 | 51.6k | 555.1 KB | 751 k |
| Excalidraw | MIT | 0.18.1 (2026-04-21) | 2026-11-25 | 3,610 | 136k | 352.7 KB | 1.80 M |
| Polotno | **Proprietary (paid subscription)** | 4.23.0 | n/a (closed) | n/a | n/a | 864.3 KB | 42 k |
| Leafer UI | MIT | 2.3.4 (2026-11-10) | 2026-11-23 | 76 | 4.5k | 70.9 KB | 15 k |

Sources: `gh api repos/<owner>/<repo>` and `/releases/latest`, `registry.npmjs.org/<pkg>/latest`, `bundlephobia.com/api/size?package=<pkg>`, `api.npmjs.org/downloads/point/last-week/<pkg>`.

### Licenses for a public, open-source app that may charge later

- **tldraw: not usable.** The [LICENSE.md](https://github.com/tldraw/tldraw/blob/main/LICENSE.md) allows use only in Development Environments. You agree "Not to use the Software in Production Environments" and "Not to disable, change, or interfere with the Software's License Key enforcement". The license also says the SDK "may collect and transmit usage data to tldraw for license compliance purposes".
  - Per [tldraw.dev/community/license](https://tldraw.dev/community/license), "The tldraw SDK will not work in production without a valid license key".
  - The free **hobby license** is discretionary, "for personal projects and early experiments" and "pre-business ideas". It requires a **"made with tldraw" watermark on the canvas** ([hobby page](https://tldraw.dev/get-a-license/hobby)).
  - Commercial pricing is "value-based" through sales ([pricing](https://tldraw.dev/pricing)). There is a 100-day trial.
  - Open-source projects may include tldraw, but "the SDK itself must remain under its original license", and every downstream deployer needs their own key.
  - Result: forks of ipolashki couldn't run it, the app would carry a watermark, and paid tiers would need a commercial deal.
- **Polotno: not usable.** The [LICENSE.md in the npm package](https://unpkg.com/polotno@4.23.0/LICENSE.md) says "Production use requires a valid Polotno subscription at any time", forbids bypassing license checks, and covers its `@polotno/svg-export` and `@polotno/pdf-export` packages too. Worth knowing: Polotno is built **on Konva** by Konva's author, and sells exactly the Konva→SVG→vector-PDF pipeline we'd write ourselves for option B.
- Konva, Fabric.js, Paper.js, PixiJS, Excalidraw, and Leafer are all MIT. The Konva and Paper.js repos read `NOASSERTION` on GitHub only because their LICENSE files carry extra copyright lines; both are MIT ([Konva LICENSE](https://github.com/konvajs/konva/blob/master/LICENSE), [Paper.js LICENSE.txt](https://github.com/paperjs/paper.js/blob/develop/LICENSE.txt)).

### Per-engine notes

**Plain SVG + UI framework (React/Svelte/Solid)**
- Layers, Groups, and transforms map directly onto `<g transform>`. Hit-testing and pointer events (mouse, touch, pen via Pointer Events) are native per element. `isPointInFill`/`isPointInStroke` cover precise picks.
- Text editing uses a DOM `<textarea>`/contenteditable overlay, which is the same approach Konva and Excalidraw take.
- The screen SVG *is* the export input for svg2pdf.js, so the Reference matches the Canvas.
- Serialization is our own Design schema. Nothing ties it to an engine's object model.
- Cost: no ready-made transformer handles, snapping, or marquee selection.
- Performance ceiling: SVG DOM is fine for the hundreds of Elements a painting reference has. Freehand-heavy designs on phones need a check, which belongs to prototype [#5](https://github.com/waaron5/ipolashki/issues/5)/[#6](https://github.com/waaron5/ipolashki/issues/6). Mitigations: pan/zoom with a single root transform, and `vector-effect="non-scaling-stroke"` for UI chrome.

**Konva**
- Scene graph with Stage/Layer/Group, a built-in `Transformer` for handles, hit-testing, and Pointer Events handling (`Stage` listens for `pointerdown` and the rest, per `lib/Stage.js` in the 10.11.0 package). React bindings via `react-konva`.
- **No in-canvas text editor.** The docs say: "We recommend to edit the user input outside of your canvas with native DOM elements such as `input` or `textarea`" ([Editable Text demo](https://konvajs.org/docs/sandbox/Editable_Text.html)).
- **No vector export.** Only raster `toDataURL`/`toCanvas`; the feature request [#2072](https://github.com/konvajs/konva/issues/2072) (opened 2026-09-24) is unanswered. We would write a model→SVG serializer, which is straightforward because the Design model is ours anyway.
- Healthiest maintenance of the field: release 2 days ago, 3 open issues.

**Fabric.js v7**
- Object model with controls, in-canvas `IText`/`Textbox` editing (backed by a hidden textarea), `PencilBrush` freehand drawing that produces Paths, and `toSVG()`. It also has `fontPaths` config to emit `@font-face` in the SVG (seen in `dist/index.mjs` of 7.4.0).
- `enablePointerEvents: false` is the default (touch is handled through touch events instead), so it must be turned on for stylus pressure and pointer ids.
- 464 open issues. The last release was 7.4.0 on 2026-05-18, though commits continue (2026-11-24).
- No boolean ops.

**Paper.js**
- Strongest vector-geometry library: boolean ops (`unite`/`intersect`/`subtract`/`exclude`/`divide`), `path.simplify()` curve fitting for freehand strokes, SVG import/export, hit-testing.
- Weak as an editor: `PointText` only, with no wrapping and no text editing.
- Maintenance went dormant (0.12.18 in July 2024) and then burst back to life: 0.12.19 through 0.17.0 shipped between 2026-10-18 and 2026-11-03, all from a single maintainer (npm `time` field, commit log). Promising, but bus-factor 1.
- **Use it headless for geometry** (boolean ops on Elements, smoothing pen strokes into editable Bezier paths), lazy-loaded.

**Excalidraw**
- The hand-drawn look *can* be turned off per element: `ROUGHNESS = { architect: 0, artist: 1, cartoonist: 2 }`, with `artist` as the default ([constants.ts](https://github.com/excalidraw/excalidraw/blob/master/packages/common/src/constants.ts)). Strokes still go through rough.js, though.
- It is a whiteboard, not a vector editor:
  - Element types are fixed (rectangle, diamond, ellipse, line/arrow polylines, `freedraw` point lists, text, image, frame) with **no editable Bezier paths** ([types.ts](https://github.com/excalidraw/excalidraw/blob/master/packages/element/src/types.ts)).
  - Fonts are a fixed enum (`FONT_FAMILY`: Virgil, Excalifont, Nunito, …). Custom fonts are an open request ([#10184](https://github.com/excalidraw/excalidraw/issues/10184), [#9132](https://github.com/excalidraw/excalidraw/issues/9132)).
  - No layers panel.
- 3,610 open issues, 353 KB gz.
- **Rejected:** it would fight the mid-century font and Palette requirements and the vector-path pen.

**PixiJS v8**
- WebGL/WebGPU renderer built for games and large scenes. No vector export, no text editing, 282 KB gz.
- Overkill for a few hundred Elements, and it loses the SVG export path. **Rejected.**

**Leafer UI (newer option)**
- MIT canvas engine with MIT editor, text-editor, and export plugins (`@leafer-in/editor`, `@leafer-in/text-editor`, `@leafer-in/export` 2.3.4, all MIT). Claims 70 KB gz and "Figma-level editor" ambitions.
- The primary README is Chinese (an English README exists), adoption is small (15k weekly downloads), and the community is mostly Chinese-language.
- Worth a look if option B's handle-building looks costly, but it's a bus-factor and docs risk for a public English OSS project. Not shortlisted.

---

## 2. Vector PDF export

Requirements: vector (not rasterized), exact physical size, embedded fonts, multi-sheet tiling of large Canvases. PDF user space is 72 pt per inch, so a 24×36 in Canvas is a 1728×2592 pt page.

### Options

| Option | License / health | Size | Fonts | SVG input | Notes |
|---|---|---|---|---|---|
| **jsPDF + svg2pdf.js** (client) | MIT. jsPDF 4.2.1 (2026-03-17, 117 open issues, 21.6 M wk dl). svg2pdf.js 2.9.0 (2026-10-29, 38 open issues). Both maintained by yWorks. | 129.8 + 25.0 KB gz | **TTF only** ("jsPDF supports .ttf-files", [README](https://github.com/parallax/jsPDF#use-of-unicode-characters--utf-8)). **Subsets automatically** (`font.metadata.subset.encode(glyIdsUsed)` in `src/modules/utf8.js`). | Yes (`doc.svg(el, {x,y,width,height})`) | svg2pdf "supports only a limited part of the SVG specification" and needs a real DOM, not JSDOM ([README](https://github.com/yWorks/svg2pdf.js#purpose-and-security)). That's fine because we generate the SVG ourselves. Advanced API has FormObjects for drawing once and placing on many sheets. |
| **PDFKit + svg-to-pdfkit** | MIT. PDFKit 0.21.0 (2026-11-20, healthy). **svg-to-pdfkit last released 2019** (0.1.8). | 228.3 + 19.1 KB gz | TTF, OTF, WOFF, WOFF2, TTC, dfont ([docs/text.md](https://github.com/foliojs/pdfkit/blob/master/docs/text.md)) | Via a stale add-on | Node-first. Browser use needs bundling and stream shims. Good server-side choice. |
| **pdf-lib** (`@cantoo/pdf-lib` fork) | MIT. **Original `pdf-lib` unmaintained** (last release 1.17.1, 2021-11-06; 320 open issues). The fork `@cantoo/pdf-lib` 2.11.1 is active (pushed 2026-11-18). | 177–222 KB gz + fontkit 342 KB gz | Any font fontkit reads. `subset: true` option ("does not work for all fonts", [README](https://github.com/Hopding/pdf-lib#font-subsetting)). | Original: `drawSvgPath` only. Fork adds `drawSvg`/`embedSvg`. | Best at **post-processing**: `embedPage` places one big vector page onto many tile sheets with clipping. Heavy if fontkit is included. |
| **Headless Chrome** (`puppeteer-core` + `@sparticuz/chromium` on Vercel) | MIT. Sparticuz 1.7k stars, active. | Server-side | Anything CSS supports | Full SVG/CSS fidelity | Vercel docs: Chromium "uses more memory than most functions need", with 1,600 MB+ recommended, and the binary pushes toward the 250 MB bundle limit (otherwise "large functions" beta or `-min` with a self-hosted archive) ([Vercel limits](https://vercel.com/docs/functions/limitations)). Billed on active CPU plus provisioned memory, has cold starts, and **doesn't work signed-out or offline**. Conflicts with "costs at or near zero". |
| Browser print (`@page { size: 24in 36in }` + `window.print()`) | none | 0 | Browser | Full | The user controls the dialog (scale, margins, paper), and Safari/iOS handle custom sizes inconsistently. **Can't guarantee true scale.** Rejected as the primary path. |

### Pairings

- **jsPDF + svg2pdf.js pairs naturally with any engine that yields SVG**: plain SVG (A, directly), Fabric (C, via `toSVG()`), Konva (B, via our serializer). It runs client-side, so Reference export works signed-out and offline at zero server cost. Lazy-load it on the "Make Reference" action.
- PDFKit fits a Node/server pipeline. pdf-lib (cantoo fork) fits post-processing.
- Headless Chrome only makes sense if client-side fidelity fails, which is unlikely for SVG we generate ourselves.

### Implementation notes for the Reference

- **True scale:** build the SVG in physical units: `viewBox` in points (or inches×72), with `doc.svg(el, {x, y, width: wPt, height: hPt})` on a jsPDF document whose unit is `'pt'`. Print dialogs must be at "Actual size", so put a 1-inch check square on each sheet for the painter to verify with a ruler.
- **Tiling across sheets:** with jsPDF's advanced API, render the Design once as a FormObject (`beginFormObject`/`endFormObject`), then on each Letter/A4 sheet `doFormObject` it with a translate and a clip rectangle. That keeps the file small, and overlap and registration marks can go in the margin. Alternative: render one large page and tile it with pdf-lib `embedPage`. Note that the PDF 1.7 implementation limit for one page is 14,400 × 14,400 units (200 × 200 in), per Adobe *PDF Reference* 1.7, Appendix C. That covers any realistic painting Canvas, but it's another reason to prefer tiling sheets.
- **Fonts:** register the exact TTF used on screen with `addFileToVFS`/`addFont`. svg2pdf.js matches SVG `font-family` to jsPDF font names. **Text-layout parity is the main fidelity risk**: compute line breaks once in the editor and emit explicit `<tspan x y>` per line, so jsPDF never re-wraps. Fallback: convert text to outlines at export (e.g. opentype.js), giving exact glyphs with no embedding concerns. That's acceptable for a painting Reference, which needs no selectable text.
- **Avoid SVG features outside svg2pdf.js's subset** (filters, masks, CSS-only styling). The vector-only scope already rules most of these out.
- **Reference grid and Color key** are just extra SVG groups drawn into the same pipeline: grid lines in physical units, and swatches plus Paint color names.

---

## 3. Things that may affect other tickets

- **[#10 fonts](https://github.com/waaron5/ipolashki/issues/10):** with jsPDF, the built-in fonts must be available as **TTF** (not only WOFF2) and licensed to allow PDF embedding (OFL is fine). Ship both: WOFF2 for the screen, TTF for the Reference.
- **[#6 freehand pen](https://github.com/waaron5/ipolashki/issues/6):** "smooths into editable vector paths" maps to Paper.js `path.simplify()` (Schneider curve fitting), used headless. perfect-freehand produces filled outlines, not editable centerline paths.
- **[#4 front-end stack](https://github.com/waaron5/ipolashki/issues/4):** option A means the UI framework *is* the renderer, so pick a framework that is efficient with many SVG nodes and fine-grained updates. The choice between A and B is best settled by the #5/#6 prototypes measuring phone performance with a heavy freehand design.
- **Design file format:** under every shortlisted option the saved schema is ours, not an engine's (avoid persisting Fabric `toObject()` JSON). That keeps the engine swappable.
- **[#8](https://github.com/waaron5/ipolashki/issues/8)/[#12](https://github.com/waaron5/ipolashki/issues/12) backend:** client-side PDF means **no server needed for References**, which helps the near-zero-cost goal.
