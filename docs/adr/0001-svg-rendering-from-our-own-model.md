# Render the Canvas as SVG from our own model, not with a canvas engine

The Canvas is drawn as plain SVG, rendered by React from ipolashki's own Design model, and the Reference PDF is made from that same SVG (jsPDF + svg2pdf.js). A canvas engine like Konva would be faster with very heavy designs and comes with selection handles built in, but it can't export SVG. We'd need a second render path for printing, and screen and Reference could drift apart (text especially). For a tool whose whole point is printing exactly what you composed, one render path wins. We build our own handles and snapping as the price.

## Consequences

- The saved Design schema is ours, never an engine's, so swapping the renderer later only touches the rendering layer.
- Fallback: if the layout and pen prototypes show a dense Design (~300 paths) can't pan and draw smoothly on a mid-range phone, switch the on-screen renderer to Konva and keep SVG for the Reference.
- tldraw and Polotno were ruled out by their licenses, not on technical grounds.
