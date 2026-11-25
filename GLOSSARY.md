# Glossary

ipolashki is a tool for composing clean, mid-century-modern-style painting references: you build a design, then print it and paint from it.

## Language

**Design**:
One document the painter edits, auto-saved and filed among their other designs.
_Avoid_: mock-up, creation, project, file

**Canvas**:
The bounded area of a design, sized in physical units (inches or cm) to match a real painting surface. Resizing the canvas crops or pads the design; it never scales it.
_Avoid_: artboard, page

**Element**:
Any single thing placed on the canvas: a shape, line, path, text, or tracing image. Each element is one row in the layers list.
_Avoid_: object, aspect, layer (when meaning a single thing)

**Live shape**:
A shape that keeps its defining measurements (radius, sides, arc, wave count) so it can be adjusted by number; molding its points turns it into an ordinary custom path.
_Avoid_: primitive, parametric shape

**Region**:
A closed area of the canvas bounded by any lines, shape edges, or the canvas edge, which the painter can fill with one color.
_Avoid_: area, cell, face

**Layers**:
The ordered stack of elements (and groups) in a design, front to back, through which any element can be selected, edited, hidden, locked, or deleted on its own.

**Group**:
Several elements the painter deliberately bundled so they select, move, and edit as one, while each stays individually editable inside it. The app never groups elements on its own.

**Piece**:
A group saved to the painter's personal library so it can be placed into other designs.
_Avoid_: asset, component, symbol, aspect

**Library shape**:
A ready-made shape that ships with the app, picked from the built-in shape library. Placing it adds an independent copy, just as placing a piece does; the painter cannot change the library itself.
_Avoid_: stamp, clip art, template, preset

**Tracing image**:
An imported photo or picture placed on the canvas. Every imported image is a tracing image: usually a dimmed, locked guide to draw over and left out of the reference, but the painter can switch it on to appear in the reference as part of the artwork.
_Avoid_: background image, image element

**Reference**:
The printable output of a design (a PDF), optionally overlaid with a reference grid, that the painter works from at the easel.
_Avoid_: export, print, mock-up

**Reference grid**:
A grid of evenly spaced lines, measured in physical units, overlaid on a reference so the design can be transferred square-by-square onto the real canvas.

**Palette**:
A named, ordered set of colors to pick from. Some ship with the app (paint-tube sets, mid-century sets); the painter can create their own.
_Avoid_: swatch set, theme

**Current color**:
The one color the drawing tools use for whatever they make next: outlines, fills, and text all take it.
_Avoid_: active color, foreground/background color, stroke color or fill color (when meaning this)

**Paint color**:
A palette color that stands for a real acrylic or oil paint and carries that paint's name (e.g. "Cadmium Red Medium").

**Color key**:
A legend on a reference listing every color used in the design, with its swatch and name, so the painter knows which paints to set out.
_Avoid_: legend, color chart

## Relationships

- A **Design** has exactly one **Canvas** and any number of **Elements**, ordered in its **Layers**.
- A **Group** contains one or more **Elements** (or nested **Groups**). Groups come only from the painter grouping elements or placing a **Piece**.
- Only stroked **Elements** and the **Canvas** edge bound a **Region**; text, tracing images, and fill-only elements do not.
- A **Piece** is created from a **Group**; placing a **Piece** into a **Design** adds a copy of its elements as a new **Group**.
- Filling a **Region** adds a new filled **Element** behind the lines that bound it; it does not stay attached to them.
- Placing a **Library shape** adds a copy as a **Live shape** when its form is one, as a plain path otherwise, or as a new **Group** when it has several parts.
- An **Element** keeps its own copy of each color it uses (and the color's name, if any); changing a **Palette** never changes existing **Designs**.
- A **Reference** is produced from one **Design**, at the **Canvas**'s physical size or fitted to paper.
