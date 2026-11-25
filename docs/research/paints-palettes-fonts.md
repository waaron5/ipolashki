# Research: real paint colors, mid-century palettes & fonts

Ticket: [#10](https://github.com/waaron5/ipolashki/issues/10) · Map: [#1](https://github.com/waaron5/ipolashki/issues/1) · Researched 2026-11-25

**Question.** What should the built-in **Paint color** palettes, mid-century-modern **Palettes**, and fonts contain, and where can we get them under licenses that allow an open-source app?

## TL;DR

- **Paint colors.** Ship one master list of about 35 **generic tube names** (for example "Cadmium Red Medium" or "Ultramarine Blue"), each with its usual Colour Index pigment code(s) and one approximate sRGB hex. Six built-in Paint-color **Palettes** are subsets of that list (see §1.4). Leave brand and product-line names out of the UI.
- **Hex values are stand-ins. The name is the real information.** On a **Color key** the painter sets out the tube by its name, and the swatch only reminds them what it looks like. Where a manufacturer has published a measured value, the hex is derived from it: GOLDEN's Munsell notations, converted Munsell → xyY → sRGB. Where it hasn't, the hex is an editorial pick, and each value says which it is (§1.3).
- **MCM Palettes.** There is no open, authoritative "mid-century palette" dataset. Pantone and Sherwin-Williams color data is proprietary or trademarked, so we should **write our own** six palettes of 7–8 colors with plain descriptive names (§2). The ones proposed here are original to this project, so the repo's own license covers them.
- **Fonts.** The shortlist is 12 Google Fonts families. Eleven are under the SIL OFL 1.1 and Yellowtail is under Apache 2.0. Both licenses allow embedding the fonts, in full or as subsets, in the Reference PDF (OFL FAQ 1.12, 1.13) and bundling them with an OSS app. Inter is the neutral UI font (§3).

---

## 1. Paint colors

### 1.1 What starter and student sets actually contain

| Set (manufacturer listing) | Contents |
|---|---|
| Liquitex Basics acrylic 12 × 22 ml | Primary Yellow, Primary Red, Primary Blue, Phthalocyanine Green, Mars Black, Titanium White, Cadmium Orange Hue, Alizarin Crimson Permanent Hue, Dioxazine Purple, Light Green Permanent, Burnt Sienna, Burnt Umber [S1] |
| GOLDEN Heavy Body Essentials (6 × 59 ml) | Benzimidazolone Yellow Medium, Quinacridone Magenta, Phthalo Blue (Green Shade), Phthalo Green (Blue Shade), Carbon Black, Titanium White [S3] |
| GOLDEN Heavy Body Mixing set (12) | "warm and cool choice of each primary" (split-primary). Per-tube list not retrieved [S4] |
| Winsor & Newton Winton oil 10 × 21 ml | Cadmium Yellow Pale Hue, Cadmium Red Deep Hue, French Ultramarine, Phthalo Blue, Burnt Umber, Viridian Hue, Yellow Ochre, Burnt Sienna, Ivory Black, Titanium White ("contents may vary") [S5] |
| Winsor & Newton Winton oil 10 × 12 ml | Titanium White, Cadmium Lemon Hue, Cadmium Red Deep Hue, Magenta, French Ultramarine, Cerulean Blue Hue, Viridian Hue, Burnt Sienna, Lamp Black (nine are named for a ten-tube set) [S5] |
| Winsor & Newton Galeria acrylic 10 × 20 ml | Lemon Yellow, Cadmium Yellow Medium Hue, Cadmium Red Hue, Permanent Rose, Ultramarine, Cerulean Blue Hue, Phthalo Green (Blue Shade), Yellow Ochre, Raw Umber, Titanium White [S7] |
| Gamblin 1980 oil Introductory set | Cadmium Yellow Light, Yellow Ochre, Cadmium Red Light, Alizarin Crimson, Ultramarine Blue, Phthalo Green, Ivory Black, Titanium White, plus gel and a panel [S8] |
| Grumbacher Academy oil 10 × 24 ml | Burnt Sienna, Burnt Umber, Cadmium Red Light Hue, Cadmium Yellow Medium Hue, Ivory Black, Thalo Blue, Thalo Green (Blue Shade), Thio Violet, Titanium White, Yellow Ochre [S9] |
| Amsterdam Standard acrylic General Selection 12 × 20 ml | **Not found.** Royal Talens says only "basic colors". The product page returned 429 [S10] |

**Pattern.** Almost every set has Titanium White, a black (Ivory, Mars or Lamp), a light-cadmium-style yellow, a red, Ultramarine and/or Phthalo Blue, a green (Phthalo or Viridian), and Burnt Sienna and/or Burnt Umber. Yellow Ochre is in almost every oil set. Student acrylic sets put a magenta-leaning "Primary Red" (PV19) and a purple in place of the earths.

### 1.2 Pigment codes (Colour Index Generic Names)

A Colour Index Generic Name such as **PR108** is short for "C.I. Pigment Red 108". The Colour Index is published jointly by the Society of Dyers and Colourists (SDC) and AATCC [S12]. The short codes are the industry's standard way to say which pigment is in a paint, so they are facts and fine to show. "Colour Index™" itself is a mark, so don't use it as a feature name. The codes below come from manufacturer pages:

- **Gamblin 1980 oil** [S8]: Cadmium Yellow Light PY35 (+PY3); Cadmium Yellow Medium PY37 (+PY74); Hansa Yellow Light PY3; Hansa Yellow Medium PY74; Cadmium Orange PO20 (+PO62); Cadmium Red Light PR108 (+PR188); Cadmium Red Medium PR108 (+PR112); Napthol Red PR112; Alizarin Crimson Permanent PR177; Quinacridone Red/Violet PV19; Quinacridone Magenta PR122; Dioxazine Purple PV23; Ultramarine Blue PB29; Phthalo Blue PB15:2; Cobalt Blue PB28 (+PB15:2); Cerulean Blue PB36 (+PB15:2); Prussian Blue PB27:1; Viridian PG18 (+PBk11, PG7); Phthalo Green PG7; Chromium Oxide Green PG17; Permanent Green Light PY74 + PG7; Sap Green PY83 + PB15:2; Yellow Ochre PY43; Raw/Burnt Sienna and Raw/Burnt Umber PBr7; Venetian Red and Transparent Red Oxide PR101; Payne's Grey PBr7 + PB29; Ivory Black PBk9; Mars Black PBk11; Titanium White PW6.
  - The 1980 line is Gamblin's budget line, and several of its "cadmium" colors are blends with organic pigments.
- **Winsor & Newton Winton oil** [S6]: Titanium White PW4 + PW6; Cadmium Yellow Pale Hue PY74; Lemon Yellow Hue PW6 + PY73; Cadmium Red Deep Hue PO36 + PR170; Magenta PB15:3 + PR122 + PW6; French Ultramarine PB29; Cerulean Blue Hue PB15:1 + PG7 + PW4; Phthalo Blue PB15; Viridian Hue PG7; Permanent Green Light PB15:3 + PW6 + PY74; Permanent Alizarin Crimson PR177; Yellow Ochre PY42; Burnt Sienna PR101; Burnt Umber PBr7; Ivory Black PBk9; Lamp Black PBk6.
- **Liquitex Basics acrylic** (educational poster, rev. 07.2023) [S2]: Primary Yellow PY74; Primary Red **PV19**; Primary Blue PB15:3; Phthalocyanine Green PG7; Light Green Permanent PG7 + PY74 + PW6; Cadmium Orange Hue PO73; Alizarin Crimson Hue Permanent PR206 + PR202; Dioxazine Purple PV23; Burnt Sienna PBk9 + PR101; Burnt Umber PBr7; Mars Black PBk11; Titanium White PW6.

**Takeaway.** A single tube name hides different pigments across brands and grades. "Hue" means a substitute pigment, and Burnt Sienna is PR101 at one maker and PBr7 at another. Pigment codes in the data should therefore be optional and labeled "typical". The tube name is what the painter acts on.

### 1.3 How the hex values were derived

No manufacturer publishes openly licensed sRGB values. GOLDEN does publish **Munsell notations** for Heavy Body acrylics, "developed using a Spectrophotometer and visual interpretation" against the Munsell Book of Color [S11]. Those values are **measurements, which are facts**, and they are the most credible primary data available.

**Method.**

1. Take GOLDEN's Munsell notation (Hue Value/Chroma).
2. Convert it to xyY with the Munsell Renotation data (Illuminant C) using `colour-science` 0.4.7 (`munsell_colour_to_xyY`, BSD-3).
3. Apply a Bradford chromatic adaptation to D65.
4. Encode as sRGB and round to hex. Out-of-gamut channels are **clipped**, as the cadmium yellows, oranges and reds are, so those hexes are less saturated than the paint.

The script is in §5.

**Caveats found while doing it:**

- **Masstone vs. film.** GOLDEN measured thick masstone. Transparent, high-tinting paints (Phthalo Blue/Green, Dioxazine Purple, Ultramarine, Quinacridone Magenta) come out nearly black, for example Dioxazine Purple `2.5P 1/0.5` → `#1D1C1F`. That is accurate for paint straight from the tube and useless as a swatch. For those paints the swatch is **editorial (E)**: a hand-picked value for a moderate film or light tint. The derived masstone is kept in the table for reference.
- **GOLDEN's listing has typos.** Raw Sienna is "19.0 YR", which is not a valid hue. Cadmium Red Dark is "73.92 4/14", Yellow Ochre is written "9,5 YR", and Alizarin Crimson Hue `10RP 2.8/1.2` has an implausibly low chroma. Those rows were treated as unusable, and the colors are editorial.
- **Proxies.** A GOLDEN measurement stands in for the generic name, not for every brand's tube.

Legend: **M** = derived from GOLDEN's Munsell notation [S11]. **M\*** = the same, but the GOLDEN color is a near-match proxy (named in the note). **E** = editorial.

### 1.4 Proposed master Paint-color list

| Paint color | Typical pigments | Swatch | Src | Note / derived masstone |
|---|---|---|---|---|
| Titanium White | PW6 (±PW4) | `#F8F8F8` | M | GOLDEN "White 10/1.1", treated as N9.75 |
| Ivory Black | PBk9 | `#1C1C1C` | M\* | GOLDEN Bone Black "Black 1/0.5" → N1 |
| Mars Black | PBk11 | `#1C1C1C` | M | GOLDEN "Black 1/0.7" → N1. On screen it matches Ivory Black |
| Carbon Black | PBk7 | `#1C1C1C` | M | GOLDEN "Black 1/0.3" → N1 |
| Cadmium Yellow Light | PY35 | `#F2E000` | M | 8.5Y 8.75/16, clipped |
| Cadmium Yellow Medium | PY35/PY37 | `#FBC000` | M | 3Y 8/16, clipped |
| Hansa Yellow Light (Lemon Yellow) | PY3 | `#F4E64A` | E | |
| Benzimidazolone Yellow Medium | (PY151/PY154; not verified) | `#FFC700` | M | 2.5Y 8.3/13.7 (GOLDEN product page), clipped |
| Primary Yellow | PY74 | `#FED500` | M\* | GOLDEN Primary Yellow 4.6Y 8.6/13 |
| Yellow Ochre | PY42/PY43 | `#A56F11` | M | 9.5YR 5/8.8 |
| Naples Yellow Hue | PW6 + PY42 (+PY83) | `#E5B66E` | M | 10YR 7.6/6.7 |
| Cadmium Orange | PO20 (hue: PO73) | `#FF6D00` | M | 2YR 6.25/17.5, clipped |
| Cadmium Red Light | PR108 | `#E74518` | M | 9R 5.25/15.9 |
| Cadmium Red Medium | PR108 | `#CD0B21` | M | 7R 4.25/16 |
| Cadmium Red Deep | PR108 (hue: PO36 + PR170) | `#A3161F` | E | GOLDEN value invalid |
| Naphthol Red | PR112/PR170 | `#D1001D` | M\* | Naphthol Red Light 7R 4.25/17, clipped |
| Primary Red | PV19 | `#C0283F` | E | |
| Alizarin Crimson | PR177 (hue: PR206 + PR202) | `#8B1E32` | E | GOLDEN value implausible |
| Quinacridone Magenta | PR122 | `#9C2160` | E | masstone `#79033E` (10RP 2.5/10) |
| Magenta | PR122 + PW6 (±PB15) | `#B64E8D` | M\* | GOLDEN Medium Magenta 3RP 4.8/11.6 |
| Permanent Rose | PV19 | `#D23A6E` | E | |
| Dioxazine Purple | PV23 | `#4A2A6A` | E | masstone `#1D1C1F` |
| Ultramarine Blue | PB29 | `#27358C` | E | masstone `#2D2E4E` (8PB 2/4.5) |
| Phthalo Blue | PB15:x | `#133A7C` | E | masstone `#161D4A` (7PB 1.25/6.5) |
| Primary Blue | PB15:3 | `#133A7C` | E | same pigment as Phthalo Blue |
| Cerulean Blue | PB36 (hue: PB15 + PG7 + PW) | `#006694` | M | Cerulean Blue, Chromium 1PB 4/7.9, clipped |
| Cobalt Blue | PB28 | `#0B4591` | M | 6PB 3/11 |
| Phthalo Green | PG7 | `#005A4B` | E | masstone `#002A2C` (5BG 1.25/5) |
| Viridian | PG18 (hue: PG7) | `#145F4D` | M\* | Viridian Green Hue 8.8G 3.5/5 |
| Permanent Green Light | PY74 + PG7 (±PW6) | `#2E8B3E` | E | thick masstone `#006F38` (4G 3.75/12) |
| Chromium Oxide Green | PG17 | `#466940` | M | 9GY 4/4.6 |
| Sap Green | PY83 + PB15 | `#4E6B24` | E | |
| Hooker's Green | PG7 + PBk9 + PY74 | `#2F5536` | E | |
| Raw Sienna | PBr7 (or PY42 + PR101) | `#A0622D` | E | GOLDEN value invalid |
| Burnt Sienna | PR101 / PBr7 | `#7E3D27` | E | masstone `#6D4332` (3YR 3.25/4) reads too dull |
| Red Oxide (Venetian Red) | PR101 | `#7D2D1F` | M | 10R 3/7.8 |
| Raw Umber | PBr7 | `#423B30` | M | 3Y 2.5/1.3 |
| Burnt Umber | PBr7 | `#433A34` | M | 9YR 2.5/1 |
| Payne's Gray | PBk + PB29 mixes | `#2A2C30` | M | 4PB 1.75/0.6 |
| Neutral Gray (N5) | mix | `#7C7C7C` | M | N5.1 |

### 1.5 Proposed built-in Paint-color Palettes

These are subsets of the master list, named generically.

| Palette | Colors | Grounded in |
|---|---|---|
| **Student acrylic 12** | Titanium White, Mars Black, Primary Yellow, Cadmium Orange (Hue), Primary Red, Alizarin Crimson (Hue), Dioxazine Purple, Primary Blue, Phthalo Green, Permanent Green Light, Burnt Sienna, Burnt Umber | Liquitex Basics 12 [S1] |
| **Classic oil 10** | Titanium White, Ivory Black, Cadmium Yellow Light, Yellow Ochre, Cadmium Red Light, Alizarin Crimson, Ultramarine Blue, Phthalo Green, Burnt Sienna, Burnt Umber | Gamblin 1980 intro set [S8] plus Winton's earths [S5] |
| **Modern primaries 6** | Titanium White, Carbon Black, Benzimidazolone Yellow Medium, Quinacridone Magenta, Phthalo Blue, Phthalo Green | GOLDEN Essentials [S3] |
| **Split primary 8** | Titanium White, Hansa Yellow Light, Cadmium Yellow Medium, Cadmium Red Light, Quinacridone Magenta, Ultramarine Blue, Phthalo Blue, Burnt Umber | the warm/cool primary idea of GOLDEN's Mixing set [S4] |
| **Earth tones 9** | Titanium White, Naples Yellow Hue, Yellow Ochre, Raw Sienna, Burnt Sienna, Red Oxide, Raw Umber, Burnt Umber, Payne's Gray | GOLDEN Earth Tones set (retailer listing) |
| **Limited 4** | Titanium White, Yellow Ochre, Cadmium Red Light, Ivory Black | the traditional "Zorn" limited palette (popular attribution, not verified here) |

### 1.6 Licensing and brand names

- **Hex values and measurements are not copyrightable** in the US. 37 CFR 202.1(a) excludes "mere variations of … coloring" and "words and short phrases such as names" [S13]. A handful of values derived from GOLDEN's published Munsell notations, with attribution in a source comment, is low risk. **Don't** copy a manufacturer's whole chart or swatch images, and don't sample hexes from their photos: the images are copyrighted, and they are not color-accurate anyway.
- **Generic tube names are fine**: "Cadmium Red Medium", "Ultramarine Blue", "Payne's Gray", "Hansa Yellow". **Leave out brand-coined color names**, for example Winsor & Newton's "Winsor Blue/Green/Yellow" and Grumbacher's "Thalo" and "Grumbacher Red". Use "Phthalo Blue" instead.
- **Brand and line names are trademarks**: Liquitex, Basics, GOLDEN, Winsor & Newton, Winton, Galeria, Gamblin, Grumbacher, Amsterdam. Don't put them in Palette names or the UI. Nominative use in docs ("based on a common 12-tube student set") is fine. Recommendation: **no brand names in v1 data.**
- **Pigment codes** are standard designations [S12] and fine to include.
- **Pantone and Sherwin-Williams: do not use.** Pantone licenses its color data to software vendors and asserts that it owns the copyright in that data [S14], which is the basis of the 2022 Adobe library removal. Sherwin-Williams' terms protect "data compilations" and bar use of its trademarks, and its color names and numbers are product identifiers [S15]. Do not ship their names, numbers or values, and do not describe our palettes as matching them.

---

## 2. Mid-century-modern Palettes

**Finding.** There is no primary, openly licensed MCM palette to adopt. The documented commercial ones are trademarked or proprietary data:

- Pantone and Sherwin-Williams retro collections [S14][S15].
- Le Corbusier's Polychromie colors, now sold under a trademark.
- Herman Miller / Eames shell colors. These are product names: Herman Miller lists Parchment, Red Orange, Dark Green, Gray and Black "archival colors" for the fiberglass chairs [S16], and the Eames Office spec lists Black, Dark Seafoam, Elephant Hide Grey, Navy Blue, Parchment, Terracotta and Red Orange (via search snippet; the page returned 403).

So the proposal is **original palettes** that evoke recognizable MCM looks. They use plain descriptive color words and no brand, product or designer names. The hexes are hand-picked, and each palette's colors are at least ΔE2000 ≥ 8 apart so they read as distinct swatches. These palettes are this project's own work and fall under the repo license.

| Palette | Colors |
|---|---|
| **Fiberglass** (1950s molded-shell furniture) | Parchment `#E8DCC0` · Elephant Grey `#8C877D` · Seafoam `#8DB5A2` · Lemon `#E6C34A` · Red Orange `#D4502A` · Terracotta `#A95C40` · Navy `#233049` · Black `#1F1F1F` |
| **Atomic Kitchen** (1950s pastels + chrome) | Cream `#F4EBD6` · Butter `#F2D27A` · Mint `#A9D4B8` · Turquoise `#3FA9A3` · Flamingo `#E8939E` · Cherry `#C3313B` · Chrome `#B7BBBE` |
| **Teak Lounge** (Danish modern) | Linen `#EFE6D2` · Mustard `#D19E32` · Burnt Orange `#C4602A` · Olive `#77763A` · Teak `#9A5B33` · Walnut `#593827` · Charcoal `#33302D` |
| **Bold Modern** (graphic primaries, textile-print style) | Paper `#F3EEE3` · Tomato `#E0482F` · Marigold `#F0B024` · Cobalt `#2B55A1` · Teal `#1D8585` · Magenta `#BF346C` · Ink `#1F2430` |
| **Desert Modern** (Palm Springs) | Sand `#E6D2AE` · Coral `#EE8667` · Desert Rose `#C98A79` · Sage `#A0AE88` · Aqua `#69C2C1` · Sky `#9AC4E2` · White Stucco `#FAF7F0` |
| **Harvest** (late-60s appliance tones) | Cream `#F1E6CC` · Harvest Gold `#D99C29` · Avocado `#6A7A2E` · Burnt Orange `#C2581D` · Rust `#8C3A1F` · Chocolate `#4D3423` · Coppertone `#B0703A` |

The minimum ΔE2000 within each palette is 9.1, 16.1, 9.6, 23.0, 8.2 and 9.2 respectively, computed with the same script. These are plain colors with no paint behind them, so their swatches carry no pigment data. A painter mixes them, or the app could later suggest the nearest Paint color.

---

## 3. Fonts

All metadata below was read from the `google/fonts` repository (`METADATA.pb`, `OFL.txt` and `DESCRIPTION.en_us.html` for each family) [S17].

| Font | Role | License | Styles | Why MCM (from the designer's description) |
|---|---|---|---|---|
| **Jost** | geometric sans (headline + body) | OFL | variable wght 100–900 + italic | "inspired by 1920s German sans-serifs" (Futura-like) |
| **League Spartan** | bold geometric sans | OFL | variable wght 100–900 | "early 20th century American geometric sans serifs" |
| **Josefin Sans** | elegant vintage geometric | OFL (RFN "Josefin Sans") | variable wght 100–700 + italic | "geometric, elegant, with a vintage feeling" |
| **Michroma** | space-age extended | OFL | 400 | reworks the Microgramma/Eurostile "1960s feeling of the future" |
| **Atomic Age** | 1950s display | OFL (RFN "Atomic Age") | 400 | "inspired by 1950s era connected scripts seen on nameplates of American cars" |
| **Righteous** | streamlined deco/retro display | OFL (RFN "Righteous") | 400 | geometric caps from deco posters |
| **Boogaloo** | 1960s lettering | OFL (RFN "Boogaloo") | 400 | "classic American lettering … old LP albums cover art from the 1960s" |
| **Shrikhand** | fat retro display | OFL | 400 | heavy, curvy display face (Latin + Gujarati) |
| **Pacifico** | 1950s brush script | OFL | 400 | "inspired by the 1950s American surf culture" |
| **Yellowtail** | sign-painter script | **Apache 2.0** | 400 | "classic 1930's typestyles … loose visual cadence of sign painter scripts" |
| **Damion** | casual mid-century script | OFL | 400 | "derived from some typical mid C20 casual typefaces … Max Kaufmann" |
| **DM Serif Display** | high-contrast display serif | OFL (RFN "Source", from Adobe) | 400 + italic | editorial serif counterpoint |

**App UI font (not in the library):** **Inter** (OFL, variable opsz + wght 100–900, plus italic), which keeps "the tool itself style-neutral".

**Alternates** (all OFL): Monoton (1931 "Prisma"-style inline, RFN), Limelight (deco, RFN), Poiret One (deco), Bebas Neue (condensed caps), Lobster (script, RFN), Questrial, Didact Gothic, Outfit, Fredoka, Orbitron.

### 3.1 License notes for PDF embedding and the web app

- **PDF embedding is explicitly allowed**, "either in full or a subset", and "the restrictions regarding font modification and redistribution do not apply" (OFL FAQ 1.12). Embedding does **not** put the document under the OFL (FAQ 1.13). So the Reference PDF can embed and subset any OFL font. Apache 2.0 places no restriction on embedding.
- **Serving to the browser.** Webfont use is not "embedding" (FAQ 2.10). **Reserved Font Names** matter here: subsetting a webfont counts as modification, and a modified font normally can't keep an RFN (FAQ 2.6) unless the optimization preserves "Functional Equivalence" (FAQ 2.7). The simplest compliant path is to serve the **unmodified** font files, self-hosted or from Google Fonts. Then let the PDF library subset at export, which FAQ 1.12 covers.
- **Bundling in the repo.** Keep each family's `OFL.txt` or `LICENSE.txt` next to its font files. The OFL requires the license and copyright notice to travel with the fonts.

---

## 4. Implications for other tickets and scope

- **A Paint color is name-first.** The Color key should print the **name** as the primary information, plus the swatch. It could also print the pigment code, and that is a cheap nicety: "PB29" tells a painter more than a hex does. The data model wants `{ name, hex, pigments?: string[] }`.
- **Swatches of transparent paints are inherently a choice.** If a "masstone vs tint" display is ever wanted, the model would need two hexes. Recommendation for v1: one hex, editorial where needed, as above.
- **Brand-specific palettes are out for v1.** "My Liquitex set" belongs in user-created Palettes.
- **Printed swatches won't match screens or paint.** Clipped cadmiums and printer gamut both reduce saturation. The Reference spec should not promise color accuracy.

## 5. Reproducing the hex derivation

```python
# pip install colour-science scipy  (colour-science 0.4.7, BSD-3)
import numpy as np, colour
C = colour.CCS_ILLUMINANTS["CIE 1931 2 Degree Standard Observer"]["C"]
def munsell_to_hex(spec):            # e.g. "7R 4.25/16" or "N5.1"
    XYZ = colour.xyY_to_XYZ(colour.munsell_colour_to_xyY(spec))
    rgb = colour.XYZ_to_sRGB(XYZ, illuminant=C, chromatic_adaptation_transform="Bradford")
    return "#" + "".join(f"{round(v*255):02X}" for v in np.clip(rgb, 0, 1))
```

## Gaps and open questions

- **Amsterdam Standard 12-color set contents**, the **GOLDEN Mixing and Traditional per-tube lists**, and the **pigment codes for GOLDEN Essentials** were not retrieved. Several manufacturer storefronts (liquitex.com, winsornewton.com, royaltalens.com) returned HTTP 429 to automated fetches, so some set lists above come from **search snippets of the manufacturer's own pages**, cross-checked against retailers. Check these by hand before data entry.
- GOLDEN appears to publish full **CIELAB** readings for its acrylics, at 10-mil drawdowns and 1/4″ discs, on justpaint.org. The site was down for maintenance during this research. A thin-film L\*a\*b\* would be a better, measured basis than the editorial (E) values for transparent paints, so retry later.
- Whether "Thalo" or "Colour Index" are registered marks was not checked in a trademark database. The recommendation is to avoid both regardless.

## Sources

- [S1] Liquitex, *Basics Acrylic Set 12×22ml* (UK product page; contents read via search snippet, page fetch 429): https://uk.liquitex.com/products/basics-acrylic-set-12x22ml
- [S2] Liquitex, *Basics Educational Poster* rev. 07.2023 (PDF; text extracted): https://cdn.shopify.com/s/files/1/0787/6971/7523/files/LQ-Basics-Educational-Poster-Diox-Purple-rev-07.2023.pdf
- [S3] GOLDEN Artist Colors, *Heavy Body Essentials Set*: https://goldenartistcolors.com/products/heavy-body-acrylics-essentials-set
- [S4] GOLDEN Artist Colors, *Heavy Body Acrylics* (sets overview): https://goldenartistcolors.com/products/golden-artist-acrylics/heavy-body
- [S5] Winsor & Newton, *Winton Oil Colour Set 10×21ml* and *10×12ml* (contents via search snippet, fetch 429): https://winsornewton.com/products/winton-oil-colour-10x21ml-tube-set · https://uk.winsornewton.com/products/winton-oil-colour-set-10x12ml
- [S6] Winsor & Newton, *Winton Oil Colour* (range and pigments): https://winsornewton.com/pages/winton-oil-colour
- [S7] Winsor & Newton, *Galeria 10×20ml tube set* (via search snippet): https://uk.winsornewton.com/products/galeria-acrylic-galeria-10x20ml-tube-set
- [S8] Gamblin, *1980 Oil Colors* (range, pigments, set contents): https://gamblincolors.com/1980-oil-colors/
- [S9] Grumbacher/Chartpak, *Academy oil 10-color set T1030*: https://grumbacher.chartpak.com/product/t1030/ (contents per Dick Blick listing https://www.dickblick.com/items/grumbacher-academy-oil-colors-sampler-set-assorted-colors-set-of-10-24-ml-tubes/)
- [S10] Royal Talens, *Amsterdam Standard Series General Selection Set 12×20ml*: https://www.royaltalens.com/products/amsterdam-standard-series-acrylic-paint-general-selection-set-12-x-20-ml
- [S11] GOLDEN Artist Colors, *Munsell Notation Listing – Heavy Body Acrylics*: https://goldenartistcolors.com/resources/munsell-notation-listing-heavy-body-acrylics · Benzimidazolone Yellow Medium notation: https://goldenartistcolors.com/products/heavy-body-acrylic-color-benzimidazolone-yellow-medium
- [S12] Colour Index International (SDC & AATCC), *Organisation of the Colour Index*: https://colour-index.com/organisation-colour-index
- [S13] 37 CFR § 202.1, *Material not subject to copyright*: https://www.law.cornell.edu/cfr/text/37/202.1
- [S14] Pantone, *Licensing*: https://www.pantone.com/license · example vendor terms (Foundry Colorway legal): https://learn.foundry.com/colorway/Content/legal.html
- [S15] Sherwin-Williams, *Terms of Use*: https://www.sherwin-williams.com/terms-of-use/ · *Corporate Identity Guidelines*: https://www.sherwin-williams.com/brand
- [S16] Herman Miller, *Eames Molded Fiberglass Chairs*: https://www.hermanmiller.com/products/seating/side-chairs/eames-molded-fiberglass-chairs/
- [S17] Google Fonts repository, per-family `METADATA.pb`, `OFL.txt`/`LICENSE.txt` and `DESCRIPTION.en_us.html`: https://github.com/google/fonts (e.g. `ofl/jost/`, `apache/yellowtail/`)
- [S18] SIL, *OFL-FAQ* (§1.11–1.13, 2.6–2.11): https://openfontlicense.org/ofl-faq/
- Conversion library: colour-science 0.4.7 (BSD-3), https://www.colour-science.org/
