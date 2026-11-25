# What people love and hate in design & drawing apps

Research for [#7](https://github.com/waaron5/ipolashki/issues/7), feeding the map [#1](https://github.com/waaron5/ipolashki/issues/1). Written 2026-11-25. Uses `GLOSSARY.md` terms (Design, Canvas, Element, Layers, Group, Piece, Tracing image, Reference, Reference grid, Palette, Paint color, Color key).

**Question:** What do people love and hate about the leading design and drawing apps, and which features does a deliberately minimal tool for composing painting references need to keep or cut?

## Answer in one paragraph

People love tools that **start instantly with no account** (Excalidraw, tldraw), **cost once or nothing and never hold work hostage** (Procreate, Affinity v1/v2, Inkscape), **smooth a shaky hand into clean lines** (Procreate StreamLine, tldraw's perfect-freehand) and **stay uncluttered** ("just enough features but not so many that it gets confusing", from a Value Study review). The loudest hates are about **who owns your work**: export behind a paywall (Linearity Curve, Kittl, Canva watermarks), forced cloud storage or login (Curve, Affinity 3 under Canva), and **lost work** (Procreate galleries wiped, Illustrator crashes without recovery, Excalidraw's browser-only storage overwritten or evicted). After that come cluttered, hard-to-learn UIs (Inkscape) and surprise billing (Figma seats, Kittl AI credits). For ipolashki this supports almost every standing decision in the map. It also adds four things that aren't on the owner's list: a **value (grayscale/notan) preview**, an **eyedropper that samples from the Tracing image**, **diagonal Reference grid lines**, and **design-file export/backup as a defence against lost local work**. It also argues for **cutting generative AI, sketchy/hand-drawn rendering, templates/premium assets and onboarding tours**.

## Sources and trust

| Tier | Sources | Notes |
|---|---|---|
| High (first-party user voices, read directly) | Hacker News threads, pulled in full through the HN Algolia API; Apple App Store review pages; vendor-run community forums (Procreate Folio, Linearity forum, Adobe Community, Figma forum, Inkscape forum); GitHub issue trackers | Quoted verbatim where possible. |
| Medium (aggregated user reviews) | Trustpilot, G2, Capterra | Read through search-engine summaries or partial fetches. Treat individual quotes as anecdotes. |
| Gap | **Reddit** | Reddit blocks automated fetching from this environment (HTTP 302 to a login wall for the JSON API, and the search tool refused the domain). No Reddit threads were read directly. Reddit sentiment shows up only where other sites quote it (an r/Vectornator mirror, an r/assholedesign thread about Canva). |

Marketing pages were used only for facts such as price and feature names, never for sentiment.

## Recurring loves

### 1. Zero-friction start: no signup, straight into the canvas
- The HN thread "Why is Excalidraw so good?" ([HN 29109995](https://news.ycombinator.com/item?id=29109995), 738 points, 267 comments) is built around this. Its article says: "There's no onboarding. No signup. No confirmation email. No OAuth. You're just in the product." Commenters agree: "the app itself has great UX, especially onboarding. Just straight to drawing mode." ([29115959](https://news.ycombinator.com/item?id=29115959)). One contrasts Miro, where "each new action resulted in another 'tour'… I've now formed my first impression of Miro as being 'infested'" ([29116644](https://news.ycombinator.com/item?id=29116644)).
- tldraw launch ([HN 29261733](https://news.ycombinator.com/item?id=29261733)): "Nice, clean, fast. No need of a sign in." ([29262998](https://news.ycombinator.com/item?id=29262998)); "Starts immediately and works on my phone as well as my laptop. No sign up or anything - just straight to business as it should be." ([29263666](https://news.ycombinator.com/item?id=29263666))
- **ipolashki already has this:** "works fully signed-out (local-only)". The evidence says to keep that path the default, with no tour and no upsell modal.

### 2. Pay once (or free) and own your tools and files
- Procreate App Store reviews: "I deeply appreciate that it is one time purchase"; "Procreate has always been single-purchase with free updates" ([App Store](https://apps.apple.com/us/app/procreate/id425073498?see-all=reviews), 4.4 from about 51K ratings).
- Affinity's whole following came from this: "The entire popularity of Affinity was licenses you could buy once and use forever and not have subscriptions or anything over you" ([HN 45762246](https://news.ycombinator.com/item?id=45762246)). Capterra reviewers who left Illustrator cite the subscription ([Capterra](https://www.capterra.com/p/110533/WebPlus-X4/reviews/)).
- Inkscape: "I love Inkscape for being a great 'learn once run anywhere/anytime' vector drawing tool. No searching/cracking/paying" ([HN 19768867](https://news.ycombinator.com/item?id=19768867)).

### 3. Smoothing that turns a shaky hand into clean lines
- Procreate review: "The automatic line smoothing tool also makes my least favorite part of art— the dreaded lineart— a breeze" ([App Store](https://apps.apple.com/us/app/procreate/id425073498?see-all=reviews)). QuickShape (hold at the end of a stroke and it snaps to a clean line, ellipse or rectangle) is a signature feature, and users ask for more control over it, such as editable points ([Folio: More Intuitive QuickShape](https://folio.procreate.com/ideas-suggestions/34428)).
- tldraw's freehand comes from Steve Ruiz's perfect-freehand library. On HN, people point others to it: "Use tldraw. Steve rolled the perfect freehand library into tldraw… you can get the same experience and easily grab an SVG." ([HN 44956716](https://news.ycombinator.com/item?id=44956716)). One user prefers it over lazy-brush smoothing: "it makes it impossible to do natural scribbles… Perfect freehand is the right way to solve this" ([HN 44951653](https://news.ycombinator.com/item?id=44951653)).
- Linearity Curve users want smoothing they can change after drawing. Staff reply that a path's smoothness can be adjusted after drawing in the Inspector (paraphrased from a search summary; the forum would not load directly) ([Linearity forum: Smoothing tool](https://forum.linearity.io/t/smoothing-tool-not-available/1777)), and users ask for a "Smooth Pen" and blob brush for organic shapes ([forum](https://forum.linearity.io/t/blob-brush-smooth-pen-tool/2780)).
- Procreate users have asked for vector shapes and a node tool for years (one thread has about 190 votes). Staff said "We won't be developing any vector tools for Procreate for now" ([Folio: Will vector ever be explored?](https://folio.procreate.com/ideas-suggestions/25362)). **That is the gap ipolashki targets:** Procreate-feel strokes that become editable vectors.

### 4. Uncluttered, "just enough" UI
- Procreate: "a wonderfully elegant and streamlined UI that lacks clutter" ([App Store](https://apps.apple.com/us/app/procreate/id425073498?see-all=reviews)).
- Value Study (a painter's tool): "Just right. Just enough features but not so many that it gets confusing" ([App Store](https://apps.apple.com/us/app/value-study/id1546616127?see-all=reviews), 4.8 from about 3.4K ratings).
- Boxy SVG's main praise is "a nice, clean, simple SVG editor" ([AlternativeTo](https://alternativeto.net/software/boxy-svg/about)).
- Excalidraw is praised for shipping a small MVP and growing it carefully: "They had a vision… Their MVP was functional… Since then, they've been adding features which only make it more awesome" ([HN 29119928](https://news.ycombinator.com/item?id=29119928)).

### 5. Painter-specific: grids, values and canvas-sized output
- CopyIt, the oldest grid app (since 2010), is "the only art grid app available that actually does what it's supposed to do!" and "The developer has to be an artist." Its features include six grid types, adjustable rows, columns, colour and opacity, a Value Map, a tonal strip, a B/W posterize filter, and **media sizes including standard canvas sizes that set the grid and image ratio** ([App Store](https://apps.apple.com/us/app/-/id377185812), 4.7 from 297 ratings).
- Value Study reviews: "The value decomposition is a crucial tool for learning how to see what matters in a photo"; "I also like that that secondary grid is **diagonal** (a feature I haven't seen anywhere else)"; "My favorite new feature is Simplify Shapes" ([App Store](https://apps.apple.com/us/app/value-study/id1546616127?see-all=reviews)).
- A Color Study reviewer liked having one app replace "Notanizer, color picker, value study, cropping, etc." ([App Store](https://apps.apple.com/us/app/color-study/id6755313672)). Painters currently stitch several single-purpose apps together.
- WetCanvas painters say printing gridlines over a picture is fiddly. GIMP's guide-grid "is visible on the screen but not on the printout", and printer size limits mean you need tiling ([WetCanvas: Printing a set of gridlines over a picture](https://www.wetcanvas.com/forums/topic/printing-a-set-of-gridlines-over-a-picture/), [Grid drawing](https://www.wetcanvas.com/forums/topic/grid-drawing/)).

### 6. Layers list, even in minimal tools
- tldraw's creator, on a request for a layers list: "You don't often see layers lists for these kinds of minimal whiteboarding apps, but personally I reach for the list every time I use tldraw." ([HN 29264218](https://news.ycombinator.com/item?id=29264218)); another user: "Layers and pasting images… would make this a lot more useful" ([29263211](https://news.ycombinator.com/item?id=29263211)).

### 7. Boolean shape operations (Inkscape)
- "the more I am impressed by how they implemented advanced techniques like shape union and intersection, clipping and masking" ([HN 41873413](https://news.ycombinator.com/item?id=41873413)). These are the core moves for flat, geometric mid-century shapes.

### 8. "No generative AI" as a feature
- Procreate's anti-AI pledge "attracts praise from digital creatives" ([HN 41295957](https://news.ycombinator.com/item?id=41295957)). Affinity's AI-behind-subscription model drew the opposite: "The entire Affinity Suite is now reduced to bait on a hook for an AI subscription service" ([HN 45763253](https://news.ycombinator.com/item?id=45763253)).

## Recurring hates and frustrations

### A. Paywalls on your own output (strongest signal)
- **Linearity Curve (formerly Vectornator):** "I used to love this app. But now you have to pay a subscription to be able to export anything"; "Do you want to export your files to use them instead of just staring at them in the app? You can't, unless you pay"; "they holding those files hostage by not allowing a .svg export" ([App Store](https://apps.apple.com/us/app/linearity-curve-graphic-design/id1219074514?see-all=reviews), 2023 to 2024). Forum: "Forcing someone to buy a subscription just to extend more project files…" ([Linearity forum: The Subscription Model](https://forum.linearity.io/t/the-subscription-model/3163)); a school complained "new export features locked behind paywall" ([forum](https://forum.linearity.io/t/urgent-new-export-features-locked-behind-paywall-is-extorting-an-entire-school-of-students/3691)).
- **Kittl:** "Great tool, but the paywall experience feels like blackmail… I went to export it only to learn that a proper export requires a payment"; "no downgrade option… cancel and lose all your work"; AI credits that "do not accrue" and are charged on failed generations ([Trustpilot 1 to 2 star](https://uk.trustpilot.com/review/kittl.com?stars=1&stars=2)). The free tier exports only 800px/72dpi with a watermark ([fritz.ai review](https://fritz.ai/kittl-ai-review/), secondary).
- **Canva:** premium elements are watermarked for free users ([Canva help](https://www.canva.com/help/article/watermarks-design/)); "a lot of premium products and no way to filter them out" ([Trustpilot](https://www.trustpilot.com/review/canva.com?page=9)); r/assholedesign accused Canva of adding white backgrounds to transparent uploads to push its paid background remover ([mirror](https://reddit.rtrace.io/r/assholedesign/comments/1cz2rkr/canva_adds_a_white_background_to_images_with/)).

### B. Forced cloud or login, and loss of trust
- **Curve:** "Not on iCloud, not offline, nothing"; "Curve forces use of their LinCloud… will not give Curve stewardship over my documents"; "First they kidnapped our files by attempting to migrate them to their own cloud environment" ([App Store](https://apps.apple.com/us/app/linearity-curve-graphic-design/id1219074514?see-all=reviews)); [Forum: Forced Cloud Upload: Goodbye Curve](https://forum.linearity.io/t/forced-cloud-upload-goodbye-curve/3430), [Please give me my files back](https://forum.linearity.io/t/please-give-me-my-files-back/3600).
- **Affinity under Canva** (made free in Oct 2025, but needs a Canva account): "It requiring an account (and thus, internet connectivity) to use is offputting" ([HN 45761563](https://news.ycombinator.com/item?id=45761563)); "Any app that requires an account just to run a totally-local app, is also a company that can unilaterally deny your ability to run said software" ([45763668](https://news.ycombinator.com/item?id=45763668)); "why can't they give us a truly free binary that will work locally forever?" ([45776161](https://news.ycombinator.com/item?id=45776161)). Thread: [HN 45761445](https://news.ycombinator.com/item?id=45761445) (1217 points, 793 comments).
- **Figma:** "I'm willing to pay the 'performance tax'… if it means my design files aren't held hostage in a proprietary cloud silo" ([HN 46069831](https://news.ycombinator.com/item?id=46069831)).

### C. Lost work
- **Procreate** support forum is full of it: "Lost all my artwork", "Lost Artwork after update!!!!", "LOST ARTWORK AFTER REINSTALLING THE APP!" ([Folio help](https://folio.procreate.com/help-support/57347), [16682](https://folio.procreate.com/help-support/16682), [15956](https://folio.procreate.com/help-support/15956)). Support says that without a backup "there is no way to recover the projects". App Store review: "I've had to delete a year worth of artwork because of this storage or backup issues" ([App Store](https://apps.apple.com/us/app/procreate/id425073498?see-all=reviews)).
- **Illustrator:** "Illustrator crash: two hour of work gone", "Constant Illustrator Crashes with no Recovery", "Adobe must fix the .ai auto-save problem". Staff say recovery is not autosave and that true autosave exists only for cloud documents ([Adobe Community](https://community.adobe.com/questions-652/illustrator-crash-two-hour-of-work-gone-813166), [815419](https://community.adobe.com/questions-652/constant-illustrator-crashes-with-no-recovery-815419), [817162](https://community.adobe.com/questions-652/adobe-must-fix-the-ai-auto-save-problem-817162)).
- **Excalidraw (browser-local storage, the same model as ipolashki signed-out):** "Going over the local storage limit… can lead to unintended data loss" ([#8395](https://github.com/excalidraw/excalidraw/issues/8395)); "Saving to the same file leads to data loss" ([#8841](https://github.com/excalidraw/excalidraw/issues/8841)); "Accidental overwrite with no way to recover" ([#10567](https://github.com/excalidraw/excalidraw/issues/10567)); "Changes reverted to the initial version" ([#7488](https://github.com/excalidraw/excalidraw/issues/7488)). On HN: "You should probably show a confirmation box when leaving the page" ([29116245](https://news.ycombinator.com/item?id=29116245)).
- **tldraw:** a confusing destructive dialog: "'New Project' asks if you want to 'Save your current project' and the options are 'Yes' and 'Cancel'… would expect a 'No' option" ([HN 29264051](https://news.ycombinator.com/item?id=29264051)).

### D. Complexity and learning curve
- **Inkscape:** "Is it only me that, when I open Inkscape, I really cannot get anything done without watching a tutorial" ([HN 41877652](https://news.ycombinator.com/item?id=41877652)); command palette "5+ seconds to show, freezes, crashes… Finding the name of an action and how to trigger it… is a pain point" ([41842159](https://news.ycombinator.com/item?id=41842159)); laggy on macOS ([41832790](https://news.ycombinator.com/item?id=41832790)); calligraphy pen "laggy and jaggy" ([41882767](https://news.ycombinator.com/item?id=41882767)). Capterra and G2 reviewers call the UI "overwhelming and unorganized" with a "significant learning curve" ([G2](https://www.g2.com/products/inkscape/reviews), [Capterra](https://www.capterra.com/p/178240/Inkscape/reviews/)). A Launchpad blueprint calls the interface "visual noise" ([blueprint](https://blueprints.launchpad.net/inkscape/+spec/inkscape-ui-update)).
- **Affinity 3:** "I don't like the new UI. It feels dumbed down" ([HN 45762728](https://news.ycombinator.com/item?id=45762728)). Simplifying a pro tool also annoys people; ipolashki avoids this by being small from the start rather than cutting features from a big tool.
- **Procreate:** "Give me proper shape tools and text tools!"; "the auto shape function doesn't create perfect shapes about 80 percent of the time" ([App Store](https://apps.apple.com/us/app/procreate/id425073498?see-all=reviews)).
- **Canva** feels limiting for precise vector work ([G2 discussion](https://www.g2.com/discussions/where-does-canva-start-to-feel-limiting-for-advanced-design-work), not fetched in full; 403).

### E. Billing surprises and price creep
- **Figma** forum: "From $15/mo. to $200/mo. - Unapproved Design Seats Billed to My Account"; "Why is 1 AI Credit 6x more expensive than a Full Seat Credit?" ([Figma forum](https://forum.figma.com/ask-the-community-7/from-15-mo-to-200-mo-unapproved-design-seats-billed-to-my-account-how-40461), [49944](https://forum.figma.com/share-your-feedback-26/why-is-1-ai-credit-6x-more-expensive-than-a-full-seat-credit-49944)).
- **Adobe:** "we've canceled Adobe Creative Cloud this month as we can't stomach the jump from £400 to £800/yr" ([HN 45765008](https://news.ycombinator.com/item?id=45765008)).

### F. Print and export pain
- **Canva print:** turquoise "printed grey", photos printed darker, a common 5.5×8.5 size not offered, exports "blurry" and below print resolution ([Trustpilot](https://ca.trustpilot.com/review/canva.com?page=3), [G2 Canva Print](https://www.g2.com/products/canva/subofferings/canva-print/reviews)).
- **Excalidraw** users ask for PDF export, direct printing and page sizes: [#1800 Export PDF](https://github.com/excalidraw/excalidraw/issues/1800), [#411 Print directly](https://github.com/excalidraw/excalidraw/issues/411), [#4411 Page Template and Size](https://github.com/excalidraw/excalidraw/issues/4411). Infinite-canvas tools don't do physical output well.
- **Gridding by hand** is tedious, and printers are smaller than canvases ([WetCanvas](https://www.wetcanvas.com/forums/topic/grid-drawing/)).

### G. Aesthetic lock-in and readability
- Excalidraw's sketchy style divides people: "What I dislike about Excalidraw is the handwriting font… it hurts readability" ([HN 29115978](https://news.ycombinator.com/item?id=29115978)); "My dyslexia makes it really difficult for me to read it… Defaults matter a lot" ([29116526](https://news.ycombinator.com/item?id=29116526)); "stuff that looks like this just annoys me" ([29120811](https://news.ycombinator.com/item?id=29120811)).

### H. Distrust of "free" tools that later turn paid
- "It being free means it'll eventually get enshittified" ([HN 45761664](https://news.ycombinator.com/item?id=45761664)); "Won't this end up how Draftsight did? (Free for years… then… require a subscription)" ([45765385](https://news.ycombinator.com/item?id=45765385)); "I'm done with this. Open source only from here on out" ([45762470](https://news.ycombinator.com/item?id=45762470)). For a free public app this trust problem is real. ipolashki's answers to it are open source, working with no account, and files the painter can export.

## Keep / maybe / cut, mapped onto the owner's must-haves (map #1 Notes)

**Keep:** the evidence supports keeping these in v1.

| Owner must-have | Evidence | Note for spec |
|---|---|---|
| Minimal: only the bare necessities plus niceties people love | Loves 4, Hates D | Keep tools in context (Procreate) and avoid Inkscape-style panels everywhere. |
| Works fully signed-out, local-only; sign-in adds sync | Loves 1, Hates B | No tour, no upsell modal, no account wall before drawing. Sign-in must never be needed to *export*. |
| Freehand pen that smooths into editable vector paths | Loves 3 | Smoothing strength should be adjustable **after** drawing (Curve users asked for this). Use perfect-freehand-style input, then fit Béziers. |
| Vector-only, no raster brushes | Procreate users ask for vector and get "not planned" | This is ipolashki's opening. |
| Canvas in physical units with stretched-canvas presets | CopyIt's canvas-size presets are praised; Excalidraw users ask for page sizes | Keep. |
| Tracing image import | Grid and value apps are all built around an imported photo | Keep. Dimmed and locked by default. |
| Reference (PDF) plus Reference grid | WetCanvas gridding pain; GIMP grid not printing | The grid must print exactly as shown, in physical units. Always free; no watermark, ever. |
| Layers, Group | Loves 6 | Keep a layers list even though the tool is minimal. |
| Palette, Paint color names, Color key | Canva colours print grey or dark | The printed colour won't match the screen. A **Color key that names the paints** gives painters what they need without relying on printed colour accuracy. |
| Pointer-agnostic | Excalidraw iPad lag and missing tablet pan complaints ([29115687](https://news.ycombinator.com/item?id=29115687), [29116852](https://news.ycombinator.com/item?id=29116852)); Inkscape pen-button complaints ([41877891](https://news.ycombinator.com/item?id=41877891)) | Test stylus latency on long strokes. Pan must work with pen and touch. |
| Hard per-user limits, near-zero cost | Curve "project file limits" backlash | Limits should apply to **cloud sync**, never to local designs or exports. |
| Built-in libraries | Canva premium-element hate | Every shipped shape, palette and font is free. No locked items. |

**Keep, newly flagged:** niceties people love that are *not* on the owner's list.

1. **Value / notan preview.** A toggle that shows the Design (and the Tracing image) in grayscale, optionally posterized to 2 to 5 values. Painters love this (Value Study, CopyIt Value Map, Paintsight, Color Study), and it is cheap to build (a render-time filter). Fits the "Reference" story: it lets the painter check value structure before printing.
2. **Eyedropper that samples from the Tracing image into a Palette.** The step from a photo to a clean flat shape needs colour picking. Color Study users praise having a picker built in, and Procreate reviewers care about eyedropper accuracy.
3. **Diagonal Reference grid lines.** Singled out as loved and rare (Value Study). Belongs in "Reference grid options" (already Not yet specified).
4. **Backup and export of the design file, plus leave-page safety.** Not a "nicety" but the single biggest hate is lost work, and local browser storage is exactly where Excalidraw loses it. See Surprises.

**Maybe:** worth deciding explicitly; each has some demand but also costs.

- **QuickShape-style "draw and hold to snap to a clean ellipse, rectangle or line."** Loved in Procreate, criticised when it guesses wrong ("80 percent of the time"). Could follow the freehand pen if it is cheap.
- **Boolean shape ops (union, subtract, intersect).** Valued by Inkscape users, and very useful for flat mid-century shapes. Path-ops libraries make it moderate in cost.
- **Tiling a large Reference across several sheets.** Painters' printers are small (WetCanvas). Already listed under "Reference PDF layout".
- **SVG/PNG export of a Design** alongside the PDF Reference. Curve's backlash shows people want their work in an open format. Low cost.
- **Command palette or searchable shortcuts.** Inkscape shows that discoverability problems pile up. Probably post-v1.
- **Curved text / text on a path.** Kittl's main draw, but out of character for minimal v1. Already listed under "Text styling depth".

**Cut:** the evidence supports leaving these out.

- **Generative AI** of any kind: images, text, "magic" fills. Procreate's no-AI pledge was praised. Paid AI credits are among the most hated features (Kittl, Figma, Affinity). Suggest adding "generative AI features" to the map's Out of scope.
- **Templates marketplace, premium or locked assets, watermarks.** The core of the Canva and Kittl complaints.
- **Hand-drawn / sketchy rendering style** (Excalidraw's signature). Divisive, hurts readability, and clashes with the clean mid-century look.
- **Onboarding tours, upsell modals, "what's new" popups.** Cited as the opposite of what people love.
- **Real-time collaboration, comments, sharing** (already out of scope). Figma's big draw, but not this product's.
- **Prototyping, auto layout, components or linked instances, dev handoff** (Figma territory). Linked Pieces are already out of scope.
- **Connectors and arrows that stick to shapes** (whiteboard territory, Excalidraw/tldraw).
- **Animation and time-lapse replay** (Procreate loves). Beloved, but nothing to do with making a printed reference.
- **Raster brushes, textures, photo editing** (already out of scope). Posterize/grayscale as a *view* of the Tracing image is fine. Editing its pixels is not.

## Surprises that may affect other tickets or scope

1. **Signed-out local storage is the most common way web drawing tools lose work** (Excalidraw [#8395](https://github.com/excalidraw/excalidraw/issues/8395), [#8841](https://github.com/excalidraw/excalidraw/issues/8841), [#10567](https://github.com/excalidraw/excalidraw/issues/10567)). Browsers can evict storage, and users clear site data. Implications for "Signed-out and offline behavior" and "Design file format":
   - a downloadable design file (export and import) in v1;
   - request persistent storage (`navigator.storage.persist()`) and show when it was denied;
   - nudge the painter to back up, or sign in, once they have several designs;
   - make destructive dialogs explicit (tldraw's Yes/Cancel confusion); add trash/restore ("Organizing designs").
2. **Never gate export or the Reference behind sign-in or limits.** Paywalled or login-gated export is the most hated pattern in the survey (Curve, Kittl, Canva, Affinity). Hard per-user limits should cap *cloud* usage only. This matters for the hosting and limits ticket.
3. **Value/notan preview** is a beloved painter feature that isn't on the owner's list (see Keep, newly flagged). It may need its own line in the spec or a small prototype.
4. **Eyedropper from the Tracing image** isn't on the list and is the natural bridge from photo to Palette.
5. **Generative AI should be explicitly out of scope.** Saying so publicly is itself a selling point to artists (Procreate pledge).
6. **Printed colour won't match the screen** (Canva complaints). That raises the value of the named Color key and lowers the value of colour-accurate PDF output. The Reference PDF ticket shouldn't spend effort on colour management.
7. **People distrust "free" apps that need an account** (Affinity/Canva). Open source plus working with no account is a real trust advantage for a public resume piece. Worth stating on the landing page.

## Coverage notes

- Apps covered with direct user voices: Excalidraw, tldraw, Inkscape, Affinity, Procreate, Linearity Curve/Vectornator, Kittl, Canva, Figma, Illustrator, CopyIt, Value Study, Color Study.
- Covered thinly: **Boxy SVG** (few reviews; liked as "clean, simple"; drops Inkscape/Illustrator-specific data on import, per [Wikipedia](https://en.wikipedia.org/wiki/Boxy_SVG)), and generic grid apps (Gridy, Art Grid Drawing; few ratings).
- Not covered: Reddit directly (blocked; see Sources and trust).
