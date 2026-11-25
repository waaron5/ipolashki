// PROTOTYPE (throwaway): mock data. Hexes are rough stand-ins, not the researched values.

export type Color = { hex: string; name?: string }
export type Kind = 'tracing' | 'path' | 'text'
export type El = {
  id: string
  name: string
  kind: Kind
  d?: string
  text?: string
  x?: number
  y?: number
  size?: number
  font?: string
  stroke?: Color
  fill?: Color
  sw?: number // inches
  opacity?: number
  hidden?: boolean
  locked?: boolean
  group?: string
  live?: string // e.g. "Circle · r 2.4 in"
  inReference?: boolean
}

export const CANVAS = { w: 16, h: 20, label: '16 × 20 in' }

export const ellipse = (cx: number, cy: number, rx: number, ry = rx) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`
export const star = (cx: number, cy: number, r: number, ri: number, n: number) => {
  let d = ''
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2
    const rr = i % 2 ? ri : r
    d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(3)} ${(cy + rr * Math.sin(a)).toFixed(3)}`
  }
  return d + 'Z'
}
export const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`
const scallops = (x: number, y: number, n: number, w: number) => {
  let d = `M${x} ${y}`
  for (let i = 0; i < n; i++) d += `a${w / 2} ${w / 2} 0 0 1 ${w} 0`
  return d
}

const INK: Color = { hex: '#1F2430', name: 'Ink' }

export const SAMPLE: El[] = [
  { id: 'trace', name: 'Photo – palm springs house.jpg', kind: 'tracing', locked: true, opacity: 0.35 },
  { id: 'sky', name: 'Fill', kind: 'path', d: rect(0, 0, 16, 12), fill: { hex: '#9AC4E2', name: 'Sky' } },
  { id: 'sun', name: 'Circle', kind: 'path', d: ellipse(11, 5.5, 2.4), fill: { hex: '#F0B024', name: 'Marigold' }, stroke: INK, sw: 0.0625, live: 'Circle · r 2.4 in' },
  { id: 'burst', name: 'Star', kind: 'path', d: star(4, 4.6, 1.6, 0.55, 8), stroke: { hex: '#E0482F', name: 'Tomato' }, sw: 0.125, live: 'Star · 8 points' },
  { id: 'hills', name: 'Path', kind: 'path', d: 'M0 12 C3 9.5 6 9.5 9 11.5 S14 10 16 10.5 L16 20 L0 20 Z', fill: { hex: '#A0AE88', name: 'Sage' }, stroke: INK, sw: 0.0625 },
  { id: 'trunk', name: 'Rectangle', kind: 'path', d: rect(12.85, 10, 0.3, 5), fill: { hex: '#593827', name: 'Walnut' }, stroke: INK, sw: 0.0625, group: 'Tree', live: 'Rectangle · 0.3 × 5 in' },
  { id: 'canopy', name: 'Ellipse', kind: 'path', d: ellipse(13, 9, 1.3, 2), fill: { hex: '#77763A', name: 'Olive' }, stroke: INK, sw: 0.0625, group: 'Tree', live: 'Ellipse · 1.3 × 2 in' },
  { id: 'front', name: 'Path', kind: 'path', d: 'M0 15 C4 12.5 8 13 11 14.5 S15 14 16 13.5 L16 20 L0 20Z', fill: { hex: '#1D8585', name: 'Teal' }, stroke: INK, sw: 0.0625 },
  { id: 'boomerang', name: 'Boomerang', kind: 'path', d: 'M3 17.2 C5 15.6 7.2 16.3 8.2 17.6 C8.8 18.4 7.8 18.9 7.1 18.3 C6 17.4 4.8 17.4 3.8 18.2 C3.1 18.8 2.4 17.9 3 17.2Z', fill: { hex: '#EE8667', name: 'Coral' }, stroke: INK, sw: 0.0625 },
  { id: 'wave', name: 'Wave', kind: 'path', d: scallops(9.5, 18.6, 6, 0.9), stroke: { hex: '#F3EEE3', name: 'Paper' }, sw: 0.125, live: 'Wave · 6 scallops' },
  { id: 'title', name: 'Palm Springs', kind: 'text', text: 'Palm Springs', x: 1.2, y: 2.3, size: 1.1, font: 'Jost', fill: INK },
]

export const TOOLS = ['select', 'pen', 'line', 'shape', 'text', 'fill', 'eraser'] as const
export type Tool = (typeof TOOLS)[number]
export const TOOL_LABEL: Record<Tool, string> = {
  select: 'Select (V)', pen: 'Pen (P)', line: 'Line (L)', shape: 'Shape (S)', text: 'Text (T)', fill: 'Fill (F)', eraser: 'Eraser (E)',
}
export const COLOR_TOOLS: Tool[] = ['pen', 'line', 'shape', 'text', 'fill']

// ~ master list of generic tube names (hexes approximate)
export const PAINTS: Color[] = [
  ['Titanium White', '#F4F2EC'], ['Mars Black', '#24221F'], ['Ivory Black', '#2A2826'], ['Primary Yellow', '#F2C618'],
  ['Cadmium Yellow Light', '#F7D23E'], ['Cadmium Yellow Medium', '#F2B21C'], ['Hansa Yellow Light', '#F5DA3A'], ['Naples Yellow Hue', '#EBCB86'],
  ['Yellow Ochre', '#C89A3C'], ['Raw Sienna', '#B9773A'], ['Cadmium Orange (Hue)', '#EC7A24'], ['Cadmium Red Light', '#DC4127'],
  ['Cadmium Red Medium', '#C8302A'], ['Primary Red', '#C2224A'], ['Alizarin Crimson (Hue)', '#8E1F2E'], ['Quinacridone Magenta', '#A1245E'],
  ['Dioxazine Purple', '#4B2C6B'], ['Ultramarine Blue', '#2C3E92'], ['Primary Blue', '#1F6FB4'], ['Phthalo Blue', '#123D78'],
  ['Cerulean Blue (Hue)', '#2A86C2'], ['Cobalt Blue (Hue)', '#2E55A6'], ["Payne's Gray", '#3A4350'], ['Phthalo Green', '#0F6B55'],
  ['Viridian', '#1F7A63'], ['Permanent Green Light', '#5BAE45'], ['Sap Green', '#4E6B2B'], ['Burnt Sienna', '#8E4424'],
  ['Burnt Umber', '#5A3A27'], ['Raw Umber', '#6B5236'], ['Red Oxide', '#8F3A28'],
].map(([name, hex]) => ({ name, hex }))
const pick = (names: string[]) => names.map((n) => PAINTS.find((p) => p.name === n)!)

export type Palette = { id: string; name: string; section: 'Paint sets' | 'Mid-century' | 'Yours'; colors: Color[] }
const mcm = (s: string) => s.split(' · ').map((t) => { const m = t.match(/^(.*) (#\w+)$/)!; return { name: m[1], hex: m[2] } })

export const PALETTES: Palette[] = [
  { id: 'student12', name: 'Student acrylic 12', section: 'Paint sets', colors: pick(['Titanium White', 'Mars Black', 'Primary Yellow', 'Cadmium Orange (Hue)', 'Primary Red', 'Alizarin Crimson (Hue)', 'Dioxazine Purple', 'Primary Blue', 'Phthalo Green', 'Permanent Green Light', 'Burnt Sienna', 'Burnt Umber']) },
  { id: 'oil10', name: 'Classic oil 10', section: 'Paint sets', colors: pick(['Titanium White', 'Ivory Black', 'Cadmium Yellow Light', 'Yellow Ochre', 'Cadmium Red Light', 'Alizarin Crimson (Hue)', 'Ultramarine Blue', 'Phthalo Green', 'Burnt Sienna', 'Burnt Umber']) },
  { id: 'limited4', name: 'Limited 4', section: 'Paint sets', colors: pick(['Titanium White', 'Yellow Ochre', 'Cadmium Red Light', 'Ivory Black']) },
  { id: 'earth9', name: 'Earth tones 9', section: 'Paint sets', colors: pick(['Titanium White', 'Naples Yellow Hue', 'Yellow Ochre', 'Raw Sienna', 'Burnt Sienna', 'Red Oxide', 'Raw Umber', 'Burnt Umber', "Payne's Gray"]) },
  { id: 'fiberglass', name: 'Fiberglass', section: 'Mid-century', colors: mcm('Parchment #E8DCC0 · Elephant Grey #8C877D · Seafoam #8DB5A2 · Lemon #E6C34A · Red Orange #D4502A · Terracotta #A95C40 · Navy #233049 · Black #1F1F1F') },
  { id: 'atomic', name: 'Atomic Kitchen', section: 'Mid-century', colors: mcm('Cream #F4EBD6 · Butter #F2D27A · Mint #A9D4B8 · Turquoise #3FA9A3 · Flamingo #E8939E · Cherry #C3313B · Chrome #B7BBBE') },
  { id: 'teak', name: 'Teak Lounge', section: 'Mid-century', colors: mcm('Linen #EFE6D2 · Mustard #D19E32 · Burnt Orange #C4602A · Olive #77763A · Teak #9A5B33 · Walnut #593827 · Charcoal #33302D') },
  { id: 'bold', name: 'Bold Modern', section: 'Mid-century', colors: mcm('Paper #F3EEE3 · Tomato #E0482F · Marigold #F0B024 · Cobalt #2B55A1 · Teal #1D8585 · Magenta #BF346C · Ink #1F2430') },
  { id: 'desert', name: 'Desert Modern', section: 'Mid-century', colors: mcm('Sand #E6D2AE · Coral #EE8667 · Desert Rose #C98A79 · Sage #A0AE88 · Aqua #69C2C1 · Sky #9AC4E2 · White Stucco #FAF7F0') },
  { id: 'harvest', name: 'Harvest', section: 'Mid-century', colors: mcm('Cream #F1E6CC · Harvest Gold #D99C29 · Avocado #6A7A2E · Burnt Orange #C2581D · Rust #8C3A1F · Chocolate #4D3423 · Coppertone #B0703A') },
  { id: 'mine1', name: 'Palm Springs piece', section: 'Yours', colors: [...mcm('Sky #9AC4E2 · Marigold #F0B024 · Sage #A0AE88 · Teal #1D8585 · Coral #EE8667'), { hex: '#1F2430', name: 'Ink' }] },
]

// Library shapes: [name, path in a 0..1 box]
export const SHAPES: { group: 'Basics' | 'Mid-century' | 'Nature'; name: string; d: string }[] = [
  { group: 'Basics', name: 'Circle', d: ellipse(0.5, 0.5, 0.42) },
  { group: 'Basics', name: 'Square', d: rect(0.1, 0.1, 0.8, 0.8) },
  { group: 'Basics', name: 'Triangle', d: 'M0.5 0.08L0.92 0.88H0.08Z' },
  { group: 'Basics', name: 'Half circle', d: 'M0.08 0.7A0.42 0.42 0 0 1 0.92 0.7Z' },
  { group: 'Basics', name: 'Ring', d: ellipse(0.5, 0.5, 0.42) + ellipse(0.5, 0.5, 0.22) },
  { group: 'Basics', name: 'Hexagon', d: star(0.5, 0.5, 0.44, 0.44, 3) },
  { group: 'Basics', name: 'Star', d: star(0.5, 0.52, 0.45, 0.18, 5) },
  { group: 'Basics', name: 'Diamond', d: 'M0.5 0.06L0.86 0.5L0.5 0.94L0.14 0.5Z' },
  { group: 'Basics', name: 'Quarter circle', d: 'M0.12 0.88V0.12A0.76 0.76 0 0 1 0.88 0.88Z' },
  { group: 'Basics', name: 'Pill', d: 'M0.3 0.3H0.7A0.2 0.2 0 0 1 0.7 0.7H0.3A0.2 0.2 0 0 1 0.3 0.3Z' },
  { group: 'Basics', name: 'Arch', d: 'M0.15 0.92V0.5A0.35 0.35 0 0 1 0.85 0.5V0.92Z' },
  { group: 'Basics', name: 'Cross', d: 'M0.38 0.1H0.62V0.38H0.9V0.62H0.62V0.9H0.38V0.62H0.1V0.38H0.38Z' },
  { group: 'Mid-century', name: 'Boomerang', d: 'M0.1 0.55C0.3 0.2 0.7 0.25 0.9 0.55C0.95 0.65 0.85 0.72 0.78 0.65C0.6 0.48 0.4 0.48 0.22 0.65C0.15 0.72 0.05 0.65 0.1 0.55Z' },
  { group: 'Mid-century', name: 'Kidney', d: 'M0.2 0.3C0.4 0.1 0.9 0.15 0.88 0.5C0.86 0.85 0.4 0.92 0.2 0.75C0.1 0.65 0.35 0.55 0.3 0.45C0.25 0.38 0.12 0.4 0.2 0.3Z' },
  { group: 'Mid-century', name: 'Starburst', d: star(0.5, 0.5, 0.46, 0.14, 10) },
  { group: 'Mid-century', name: 'Atom', d: ellipse(0.5, 0.5, 0.45, 0.15) + ellipse(0.5, 0.5, 0.06) },
  { group: 'Mid-century', name: 'Sputnik', d: ellipse(0.5, 0.5, 0.16) + 'M0.5 0.05V0.95M0.05 0.5H0.95M0.18 0.18L0.82 0.82M0.82 0.18L0.18 0.82' },
  { group: 'Mid-century', name: 'Amoeba', d: 'M0.3 0.15C0.5 0.05 0.65 0.3 0.8 0.25C0.95 0.22 0.95 0.55 0.8 0.65C0.65 0.75 0.7 0.95 0.45 0.9C0.2 0.85 0.3 0.65 0.15 0.55C0.02 0.45 0.12 0.22 0.3 0.15Z' },
  { group: 'Mid-century', name: 'Diamond cluster', d: 'M0.3 0.1L0.45 0.3L0.3 0.5L0.15 0.3ZM0.65 0.35L0.85 0.6L0.65 0.85L0.45 0.6Z' },
  { group: 'Mid-century', name: 'Scallop band', d: scallops(0.05, 0.6, 4, 0.225) + 'V0.8H0.05Z' },
  { group: 'Mid-century', name: 'Zigzag', d: 'M0.05 0.6L0.2 0.4L0.35 0.6L0.5 0.4L0.65 0.6L0.8 0.4L0.95 0.6' },
  { group: 'Mid-century', name: 'Eye', d: 'M0.05 0.5Q0.5 0.05 0.95 0.5Q0.5 0.95 0.05 0.5Z' + ellipse(0.5, 0.5, 0.12) },
  { group: 'Nature', name: 'Leaf', d: 'M0.15 0.85Q0.15 0.15 0.85 0.15Q0.85 0.85 0.15 0.85Z' },
  { group: 'Nature', name: 'Sun', d: star(0.5, 0.5, 0.46, 0.32, 12) },
  { group: 'Nature', name: 'Cloud', d: 'M0.2 0.7A0.15 0.15 0 0 1 0.25 0.45A0.2 0.2 0 0 1 0.6 0.35A0.17 0.17 0 0 1 0.85 0.55A0.12 0.12 0 0 1 0.8 0.7Z' },
  { group: 'Nature', name: 'Hill', d: 'M0.02 0.85C0.3 0.3 0.7 0.3 0.98 0.85Z' },
  { group: 'Nature', name: 'Mountain', d: 'M0.05 0.85L0.38 0.25L0.55 0.55L0.68 0.4L0.95 0.85Z' },
  { group: 'Nature', name: 'Palm frond', d: 'M0.5 0.9Q0.45 0.5 0.15 0.2M0.5 0.9Q0.55 0.5 0.85 0.2M0.5 0.9V0.15' },
  { group: 'Nature', name: 'Wave', d: 'M0.05 0.55Q0.175 0.35 0.3 0.55T0.55 0.55T0.8 0.55T1 0.55' },
  { group: 'Nature', name: 'Drop', d: 'M0.5 0.08Q0.85 0.55 0.75 0.7A0.27 0.27 0 0 1 0.25 0.7Q0.15 0.55 0.5 0.08Z' },
  { group: 'Nature', name: 'Moon', d: 'M0.6 0.1A0.42 0.42 0 1 0 0.9 0.7A0.33 0.33 0 1 1 0.6 0.1Z' },
  { group: 'Nature', name: 'Flower', d: star(0.5, 0.5, 0.44, 0.25, 6) + ellipse(0.5, 0.5, 0.1) },
]

export const PIECES = [
  { name: 'Palm tree', d: rect(0.47, 0.4, 0.06, 0.55) + ellipse(0.5, 0.3, 0.25, 0.18) },
  { name: 'Atomic clock', d: ellipse(0.5, 0.5, 0.3) + star(0.5, 0.5, 0.48, 0.32, 12) },
  { name: 'Sunset stripes', d: rect(0.1, 0.3, 0.8, 0.1) + rect(0.1, 0.5, 0.8, 0.1) + rect(0.1, 0.7, 0.8, 0.1) },
]

export type DesignMeta = { id: string; name: string; edited: string; size: string; thumb: string[]; trashed?: boolean }
export const DESIGNS: DesignMeta[] = [
  { id: 'd1', name: 'Palm Springs', edited: '2 min ago', size: '16 × 20 in', thumb: ['#9AC4E2', '#F0B024', '#A0AE88', '#1D8585'] },
  { id: 'd2', name: 'Kitchen boomerangs', edited: 'Yesterday', size: '12 × 12 in', thumb: ['#F4EBD6', '#3FA9A3', '#E8939E', '#C3313B'] },
  { id: 'd3', name: 'Desert dusk', edited: 'Nov 21', size: '24 × 36 in', thumb: ['#E6D2AE', '#EE8667', '#C98A79', '#69C2C1'] },
  { id: 'd4', name: 'Teak study', edited: 'Nov 14', size: '11 × 14 in', thumb: ['#EFE6D2', '#D19E32', '#9A5B33', '#33302D'] },
  { id: 'd5', name: 'Starburst clock', edited: 'Nov 2', size: '18 × 24 in', thumb: ['#F3EEE3', '#2B55A1', '#E0482F', '#F0B024'] },
  { id: 'd6', name: 'Harvest hills', edited: 'Oct 30', size: '9 × 12 in', thumb: ['#F1E6CC', '#6A7A2E', '#C2581D', '#4D3423'] },
  { id: 'd7', name: 'Old test', edited: 'Oct 2', size: '8 × 10 in', thumb: ['#ddd', '#999', '#555', '#222'], trashed: true },
]

export const FONTS = ['Jost', 'Josefin Sans', 'Michroma', 'Atomic Age', 'Righteous', 'Boogaloo', 'Shrikhand', 'Pacifico', 'Yellowtail', 'Damion', 'DM Serif Display', 'Outfit']
