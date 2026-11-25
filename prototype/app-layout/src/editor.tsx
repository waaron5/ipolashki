// PROTOTYPE (throwaway): shared editor state + content widgets. Variants own the layout.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CANVAS, COLOR_TOOLS, DESIGNS, FONTS, PAINTS, PALETTES, PIECES, SAMPLE, SHAPES, TOOLS, TOOL_LABEL,
  ellipse, rect, star, type Color, type El, type Palette, type Tool,
} from './data'

/* ---------------- state ---------------- */

export type ShapeKind = 'rectangle' | 'ellipse' | 'polygon' | 'star'
export function useEditor() {
  const [tool, setToolRaw] = useState<Tool>('select')
  const [color, setColor] = useState<Color>({ hex: '#1F2430', name: 'Ink' })
  const [els, setEls] = useState<El[]>(SAMPLE)
  const [sel, setSel] = useState<string[]>([])
  const [palettes, setPalettes] = useState<Palette[]>(PALETTES)
  const [paletteId, setPaletteId] = useState('student12')
  const [valueBands, setValueBands] = useState(0) // 0 off, 1 grayscale, 2..5 bands
  const [grid, setGrid] = useState(false)
  const [diagonals, setDiagonals] = useState(false)
  const [snapGrid, setSnapGrid] = useState(true)
  const [recognize, setRecognize] = useState(true)
  const [smoothing, setSmoothing] = useState(50)
  const [width, setWidth] = useState(0.0625)
  const [shape, setShape] = useState<ShapeKind>('rectangle')
  const [showHandles, setShowHandles] = useState(false)
  const [editPoints, setEditPoints] = useState(false)
  const [mods, setMods] = useState({ shift: false, alt: false, nosnap: false })
  const [toast, setToast] = useState<string | null>(null)
  const [undo, setUndo] = useState(0)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const setTool = (t: Tool) => { setToolRaw(t); setEditPoints(false); if (t !== 'select') setSel([]) }
  const palette = palettes.find((p) => p.id === paletteId)!

  // Group-aware select: clicking a grouped Element selects its whole Group.
  const select = (id: string | null, additive = false) => {
    if (!id) return setSel([])
    const el = els.find((e) => e.id === id)!
    const ids = el.group ? els.filter((e) => e.group === el.group).map((e) => e.id) : [id]
    setSel((s) => (additive ? [...new Set([...s, ...ids])] : ids))
  }
  const patch = (ids: string[], p: Partial<El>) => { setEls((xs) => xs.map((e) => (ids.includes(e.id) ? { ...e, ...p } : e))); setUndo((u) => u + 1) }
  const add = (e: El) => { setEls((xs) => [...xs, e]); setUndo((u) => u + 1) }
  const remove = (ids: string[]) => { setEls((xs) => xs.filter((e) => !ids.includes(e.id))); setSel([]); setUndo((u) => u + 1) }
  const placeShape = (name: string, d: string) => {
    // scale 0..1 box to a 4in square at Canvas centre
    const s = 4, ox = CANVAS.w / 2 - 2, oy = CANVAS.h / 2 - 2
    add({ id: 'p' + Date.now(), name, kind: 'path', d, stroke: color, sw: width, live: undefined, x: ox, y: oy, size: s })
    toast_(`Placed “${name}” at the Canvas centre`)
  }
  const toast_ = (m: string) => setToast(m)
  const duplicatePalette = (p: Palette) => {
    const np = { ...p, id: 'mine' + Date.now(), name: p.name + ' copy', section: 'Yours' as const, colors: [...p.colors] }
    setPalettes((ps) => [...ps, np]); setPaletteId(np.id); toast_(`Duplicated “${p.name}” into Yours`)
  }
  const newPalette = () => {
    const np: Palette = { id: 'mine' + Date.now(), name: 'New palette', section: 'Yours', colors: [] }
    setPalettes((ps) => [...ps, np]); setPaletteId(np.id)
  }
  const editPalette = (fn: (p: Palette) => Palette) => setPalettes((ps) => ps.map((p) => (p.id === paletteId ? fn(p) : p)))

  const selected = els.filter((e) => sel.includes(e.id))
  return {
    tool, setTool, color, setColor, els, sel, selected, select, patch, add, remove, placeShape,
    palettes, palette, paletteId, setPaletteId, duplicatePalette, newPalette, editPalette,
    valueBands, setValueBands, grid, setGrid, diagonals, setDiagonals, snapGrid, setSnapGrid,
    recognize, setRecognize, smoothing, setSmoothing, width, setWidth, shape, setShape,
    showHandles, setShowHandles, editPoints, setEditPoints, mods, setMods, toast, toast_, undo, setUndo,
  }
}
export type Ed = ReturnType<typeof useEditor>

/* ---------------- measuring the container (so phone frame works too) ---------------- */

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(1200)
  useLayoutEffect(() => {
    const el = ref.current!
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/* ---------------- icons ---------------- */

export function ToolIcon({ tool, color, size = 22 }: { tool: Tool; color?: string; size?: number }) {
  const c = color ?? 'currentColor'
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {tool === 'select' && <path {...p} d="M5 3l14 8-6 1.5L10 19z" />}
      {tool === 'pen' && <><path {...p} d="M3 18c3-6 6 2 9-4s5-8 9-6" stroke={c} strokeWidth={2.6} /></>}
      {tool === 'line' && <><path {...p} d="M4 19L20 5" stroke={c} strokeWidth={2.6} /><circle cx="4" cy="19" r="2" fill="currentColor" /><circle cx="20" cy="5" r="2" fill="currentColor" /></>}
      {tool === 'shape' && <><rect x="3" y="9" width="10" height="10" rx="1" {...p} stroke={c} strokeWidth={2.4} /><circle cx="15.5" cy="8.5" r="5.5" {...p} stroke={c} strokeWidth={2.4} /></>}
      {tool === 'text' && <><path {...p} d="M5 5h14M12 5v15" stroke={c} strokeWidth={2.6} /></>}
      {tool === 'fill' && <><path {...p} d="M5 11l7-7 7 7-7 7z" /><path d="M12 7l4 4H8z" fill={c} /><path d="M20 15c1.2 2 1.2 3 0 4" stroke={c} strokeWidth={2.4} fill="none" strokeLinecap="round" /></>}
      {tool === 'eraser' && <><path {...p} d="M8 20h12M4 15l9-9 6 6-7 7H8z" /><path d="M8.5 10.5l6 6" {...p} /></>}
    </svg>
  )
}
export const toolColor = (ed: Ed, t: Tool) => (COLOR_TOOLS.includes(t) ? ed.color.hex : undefined)

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const d: Record<string, ReactNode> = {
    menu: <path {...p} d="M4 7h16M4 12h16M4 17h16" />,
    undo: <path {...p} d="M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-2" />,
    redo: <path {...p} d="M15 7l5 5-5 5M20 12H9a5 5 0 000 10h2" />,
    layers: <path {...p} d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" />,
    library: <><rect x="4" y="4" width="7" height="7" rx="1" {...p} /><circle cx="17" cy="7.5" r="3.5" {...p} /><path {...p} d="M4 20l3.5-6 3.5 6zM14 14h6v6h-6z" /></>,
    sliders: <path {...p} d="M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6" />,
    palette: <><path {...p} d="M12 3a9 9 0 100 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2.5-1.5H18a3 3 0 003-3c0-5-4-9-9-9z" /><circle cx="7.5" cy="11" r="1.3" fill="currentColor" /><circle cx="10" cy="7" r="1.3" fill="currentColor" /><circle cx="15" cy="7" r="1.3" fill="currentColor" /></>,
    grid: <path {...p} d="M4 4h16v16H4zM4 10h16M4 15h16M10 4v16M15 4v16" />,
    value: <><circle cx="12" cy="12" r="8" {...p} /><path d="M12 4a8 8 0 010 16z" fill="currentColor" /></>,
    magnet: <path {...p} d="M6 4v8a6 6 0 0012 0V4h-4v8a2 2 0 01-4 0V4zM6 8h4M14 8h4" />,
    print: <><path {...p} d="M7 9V3h10v6M7 17H4v-7h16v7h-3" /><path {...p} d="M7 14h10v7H7z" /></>,
    designs: <><rect x="3" y="4" width="8" height="7" rx="1" {...p} /><rect x="13" y="4" width="8" height="7" rx="1" {...p} /><rect x="3" y="13" width="8" height="7" rx="1" {...p} /><rect x="13" y="13" width="8" height="7" rx="1" {...p} /></>,
    plus: <path {...p} d="M12 5v14M5 12h14" />,
    eye: <><path {...p} d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" {...p} /></>,
    eyeoff: <path {...p} d="M3 3l18 18M10.5 5.2A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-3 3.7M6.5 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 004.5-1.1" />,
    lock: <><rect x="5" y="11" width="14" height="9" rx="1.5" {...p} /><path {...p} d="M8 11V8a4 4 0 018 0v3" /></>,
    unlock: <><rect x="5" y="11" width="14" height="9" rx="1.5" {...p} /><path {...p} d="M8 11V8a4 4 0 017.5-2" /></>,
    dropper: <path {...p} d="M14 4l6 6-2 2-6-6zM12 6l-8 8v4h4l8-8" />,
    close: <path {...p} d="M6 6l12 12M18 6L6 18" />,
    back: <path {...p} d="M15 5l-7 7 7 7" />,
    more: <><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></>,
    search: <><circle cx="11" cy="11" r="6" {...p} /><path {...p} d="M20 20l-4.5-4.5" /></>,
    trash: <path {...p} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
    cloud: <path {...p} d="M7 18a4 4 0 01-.5-8A6 6 0 0118 9a4.5 4.5 0 01-.5 9z" />,
    chevron: <path {...p} d="M6 9l6 6 6-6" />,
    zoomfit: <path {...p} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{d[name]}</svg>
}

/* ---------------- canvas ---------------- */

function ElView({ e, sel, onDown }: { e: El; sel: boolean; onDown: (ev: React.PointerEvent) => void }) {
  if (e.hidden) return null
  if (e.kind === 'tracing')
    return (
      <g opacity={e.opacity ?? 0.35} style={{ pointerEvents: 'none' }}>
        <rect width={CANVAS.w} height={CANVAS.h} fill="url(#photo)" />
        <path d="M1 13 L4 9 L9 9 L9 13 Z M9.5 13 L9.5 10 L14.5 10 L14.5 13 Z" fill="#6b6257" />
        <circle cx="13" cy="8" r="1.8" fill="#4d5c3a" />
      </g>
    )
  if (e.kind === 'text')
    return <text x={e.x} y={e.y} fontSize={e.size} fontFamily={e.font} fill={e.fill?.hex} onPointerDown={onDown} style={{ cursor: 'default' }}>{e.text}</text>
  const tr = e.size ? `translate(${e.x} ${e.y}) scale(${e.size})` : undefined
  return (
    <path d={e.d} transform={tr} fill={e.fill?.hex ?? 'none'} stroke={e.stroke?.hex ?? 'none'} strokeWidth={e.size ? (e.sw ?? 0.06) / e.size : e.sw}
      strokeLinecap="round" strokeLinejoin="round" opacity={e.opacity} onPointerDown={onDown}
      style={{ pointerEvents: e.locked ? 'none' : 'visiblePainted' }} data-sel={sel || undefined} />
  )
}

export function CanvasView({ ed, compact }: { ed: Ed; compact?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [vp, setVp] = useState({ s: 30, x: 0, y: 0 })
  const [draft, setDraft] = useState<[number, number][] | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ d: number; cx: number; cy: number; vp: typeof vp } | null>(null)
  const space = useRef(false)
  const panStart = useRef<{ x: number; y: number; vp: typeof vp } | null>(null)
  const [bbox, setBbox] = useState<DOMRect | null>(null)

  const fit = () => {
    const r = wrap.current!.getBoundingClientRect()
    const pad = compact ? 16 : 48
    const s = Math.min((r.width - pad * 2) / CANVAS.w, (r.height - pad * 2) / CANVAS.h)
    setVp({ s, x: (r.width - CANVAS.w * s) / 2, y: (r.height - CANVAS.h * s) / 2 })
  }
  useLayoutEffect(() => {
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap.current!)
    return () => ro.disconnect()
  }, [compact])
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select')) return
      if (e.code === 'Space') space.current = true
      const map: Record<string, Tool> = { v: 'select', p: 'pen', l: 'line', s: 'shape', t: 'text', f: 'fill', e: 'eraser' }
      if (map[e.key] && !e.metaKey && !e.ctrlKey) ed.setTool(map[e.key])
      if (e.key === 'Escape') ed.setTool('select')
      if ((e.key === 'Delete' || e.key === 'Backspace') && ed.sel.length) ed.remove(ed.sel)
      if (e.key === '1' && e.shiftKey) fit()
    }
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') space.current = false }
    addEventListener('keydown', kd); addEventListener('keyup', ku)
    return () => { removeEventListener('keydown', kd); removeEventListener('keyup', ku) }
  })
  useLayoutEffect(() => {
    const g = svg.current?.querySelectorAll<SVGGraphicsElement>('[data-sel]')
    if (!g || !g.length) return setBbox(null)
    const bs = [...g].map((n) => n.getBoundingClientRect())
    const x = Math.min(...bs.map((b) => b.left)), y = Math.min(...bs.map((b) => b.top))
    const w = wrap.current!.getBoundingClientRect()
    setBbox(new DOMRect(x - w.x, y - w.y, Math.max(...bs.map((b) => b.right)) - x, Math.max(...bs.map((b) => b.bottom)) - y))
  }, [ed.sel, ed.els, vp])

  const toCanvas = (e: React.PointerEvent | PointerEvent): [number, number] => {
    const r = wrap.current!.getBoundingClientRect()
    return [(e.clientX - r.x - vp.x) / vp.s, (e.clientY - r.y - vp.y) / vp.s]
  }
  const onWheel = (e: React.WheelEvent) => {
    const r = wrap.current!.getBoundingClientRect()
    if (e.ctrlKey || e.metaKey) {
      const k = Math.exp(-e.deltaY * 0.01)
      const mx = e.clientX - r.x, my = e.clientY - r.y
      setVp((v) => ({ s: v.s * k, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k }))
    } else setVp((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
  }
  const down = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      setDraft(null)
      const [a, b] = [...pointers.current.values()]
      gesture.current = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, vp }
      return
    }
    if (space.current || e.button === 1) { panStart.current = { x: e.clientX, y: e.clientY, vp }; return }
    if (ed.tool === 'pen' || ed.tool === 'eraser') setDraft([toCanvas(e)])
    else if (ed.tool === 'select' && e.target === e.currentTarget) ed.select(null)
    else if (ed.tool === 'shape' || ed.tool === 'line' || ed.tool === 'text') {
      const [x, y] = toCanvas(e)
      if (ed.tool === 'text') ed.add({ id: 't' + Date.now(), name: 'Text', kind: 'text', text: 'Text', x, y, size: 0.8, font: 'Jost', fill: ed.color })
      else if (ed.tool === 'shape') {
        const d = ed.shape === 'ellipse' ? ellipse(x, y, 1.5) : ed.shape === 'star' ? star(x, y, 1.6, 0.65, 5) : ed.shape === 'polygon' ? star(x, y, 1.5, 1.5, 3) : rect(x - 1.5, y - 1, 3, 2)
        ed.add({ id: 's' + Date.now(), name: ed.shape[0].toUpperCase() + ed.shape.slice(1), kind: 'path', d, stroke: ed.color, sw: ed.width, live: `${ed.shape} · drag sets size` })
      } else ed.toast_('Line: click-click to build a polyline (not wired in prototype)')
    }
  }
  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (gesture.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const g = gesture.current, r = wrap.current!.getBoundingClientRect()
      const k = Math.hypot(a.x - b.x, a.y - b.y) / g.d
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
      const ox = g.cx - r.x, oy = g.cy - r.y
      setVp({ s: g.vp.s * k, x: ox - (ox - g.vp.x) * k + (cx - g.cx), y: oy - (oy - g.vp.y) * k + (cy - g.cy) })
      return
    }
    if (panStart.current) {
      const p = panStart.current
      setVp({ ...p.vp, x: p.vp.x + e.clientX - p.x, y: p.vp.y + e.clientY - p.y }); return
    }
    if (draft) setDraft((d) => [...d!, toCanvas(e)])
  }
  const up = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) gesture.current = null
    panStart.current = null
    if (draft && draft.length > 2) {
      if (ed.tool === 'pen') {
        ed.add({ id: 'pen' + Date.now(), name: 'Path', kind: 'path', d: 'M' + draft.map((p) => p.map((n) => n.toFixed(3)).join(' ')).join('L'), stroke: ed.color, sw: ed.width })
        if (ed.recognize) ed.toast_('As drawn · Circle · Ellipse   (chooser lives here)')
      } else ed.toast_('Eraser: scrub trims, loops cut (not wired in prototype)')
    }
    setDraft(null)
  }
  const elDown = (id: string) => (ev: React.PointerEvent) => {
    if (ed.tool === 'select') { ev.stopPropagation(); ed.select(id, ev.shiftKey || ed.mods.shift) }
    if (ed.tool === 'fill') { ev.stopPropagation(); ed.patch([id], { fill: ed.color }); ed.toast_(`Filled with ${ed.color.name ?? ed.color.hex}`) }
  }

  const bands = ed.valueBands
  const table = bands > 1 ? Array.from({ length: bands }, (_, i) => (i / (bands - 1)).toFixed(3)).join(' ') : ''
  const gridLines = useMemo(() => {
    const L: string[] = []
    for (let x = 2; x < CANVAS.w; x += 2) L.push(`M${x} 0V${CANVAS.h}`)
    for (let y = 2; y < CANVAS.h; y += 2) L.push(`M0 ${y}H${CANVAS.w}`)
    return L.join('')
  }, [])
  const diag = useMemo(() => {
    let d = ''
    for (let x = 0; x < CANVAS.w; x += 2) for (let y = 0; y < CANVAS.h; y += 2) d += `M${x} ${y}l2 2M${x + 2} ${y}l-2 2`
    return d
  }, [])

  return (
    <div ref={wrap} className="relative h-full w-full overflow-hidden touch-none" onWheel={onWheel} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      style={{ background: '#d9d5cc', cursor: ed.tool === 'select' ? 'default' : 'crosshair' }}
      onPointerOver={(e) => ed.tool === 'fill' && setHover((e.target as Element).getAttribute('data-id'))}>
      <svg ref={svg} className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="photo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9cbd6" /><stop offset=".55" stopColor="#d8c8a8" /><stop offset="1" stopColor="#8a8a70" /></linearGradient>
          <filter id="value" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            {bands > 1 && <feComponentTransfer><feFuncR type="discrete" tableValues={table} /><feFuncG type="discrete" tableValues={table} /><feFuncB type="discrete" tableValues={table} /></feComponentTransfer>}
          </filter>
          <clipPath id="clip"><rect width={CANVAS.w} height={CANVAS.h} /></clipPath>
          <filter id="shadow"><feDropShadow dx="0" dy="0.08" stdDeviation="0.15" floodOpacity=".25" /></filter>
        </defs>
        <g transform={`translate(${vp.x} ${vp.y}) scale(${vp.s})`}>
          <rect width={CANVAS.w} height={CANVAS.h} fill="#fff" filter="url(#shadow)" />
          <g clipPath="url(#clip)" filter={bands ? 'url(#value)' : undefined}>
            {ed.els.map((e) => <ElView key={e.id} e={e} sel={ed.sel.includes(e.id)} onDown={elDown(e.id)} />)}
          </g>
          {hover && ed.tool === 'fill' && <path d={ed.els.find((e) => e.id === hover)?.d} fill={ed.color.hex} opacity={0.35} style={{ pointerEvents: 'none' }} />}
          {ed.grid && <path d={gridLines + (ed.diagonals ? diag : '')} stroke="#c3313b" strokeWidth={1 / vp.s} opacity={0.6} fill="none" style={{ pointerEvents: 'none' }} />}
          {draft && <path d={'M' + draft.map((p) => p.join(' ')).join('L')} fill="none" stroke={ed.tool === 'eraser' ? '#c3313b' : ed.color.hex} strokeDasharray={ed.tool === 'eraser' ? `${4 / vp.s}` : undefined} strokeWidth={ed.tool === 'eraser' ? 2 / vp.s : ed.width} strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      </svg>
      {bbox && ed.tool === 'select' && (
        <div className="pointer-events-none absolute border border-sky-600" style={{ left: bbox.x - 4, top: bbox.y - 4, width: bbox.width + 8, height: bbox.height + 8 }}>
          {[[0, 0], [50, 0], [100, 0], [0, 50], [100, 50], [0, 100], [50, 100], [100, 100]].map(([x, y]) => (
            <div key={x + '-' + y} className="absolute rounded-sm border border-sky-600 bg-white" style={{ left: `calc(${x}% - ${compact ? 7 : 4}px)`, top: `calc(${y}% - ${compact ? 7 : 4}px)`, width: compact ? 14 : 8, height: compact ? 14 : 8 }} />
          ))}
          <div className="absolute left-1/2 -top-6 h-3 w-3 -translate-x-1/2 rounded-full border border-sky-600 bg-white" />
        </div>
      )}
      <div className="pointer-events-none absolute bottom-1 right-2 text-[10px] text-stone-500">{Math.round((vp.s / 96) * 100)}% · {CANVAS.label}</div>
      {ed.toast && <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-stone-900/85 px-3 py-1.5 text-xs text-white shadow">{ed.toast}</div>}
    </div>
  )
}

/* ---------------- small widgets ---------------- */

export const Swatch = ({ c, size = 24, active, onClick, ring }: { c: Color; size?: number; active?: boolean; onClick?: () => void; ring?: boolean }) => (
  <button title={c.name ?? c.hex} onClick={onClick} className={`shrink-0 rounded-full ${active ? 'ring-2 ring-offset-2 ring-stone-900' : ring ? 'ring-1 ring-black/15' : ''}`}
    style={{ width: size, height: size, background: c.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)' }} />
)

export const Seg = <T extends string | number>({ value, options, onChange, big }: { value: T; options: [T, ReactNode][]; onChange: (v: T) => void; big?: boolean }) => (
  <div className="inline-flex rounded-md bg-stone-200/80 p-0.5">
    {options.map(([v, l]) => (
      <button key={String(v)} onClick={() => onChange(v)} className={`rounded px-2 ${big ? 'min-h-10 text-sm' : 'py-0.5 text-xs'} ${v === value ? 'bg-white shadow-sm' : 'text-stone-600'}`}>{l}</button>
    ))}
  </div>
)

export const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs whitespace-nowrap">
    <span className={`relative h-4 w-7 rounded-full transition ${on ? 'bg-stone-900' : 'bg-stone-300'}`} onClick={() => onChange(!on)}>
      <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition ${on ? 'left-3.5' : 'left-0.5'}`} />
    </span>
    {label}
  </label>
)

export function StrokeWidth({ ed, big }: { ed: Ed; big?: boolean }) {
  return <Seg big={big} value={ed.width} onChange={ed.setWidth} options={[[0.03125, 'Fine'], [0.0625, 'Medium'], [0.125, 'Bold']]} />
}

/** Contextual options for the active tool. `big` = touch sizing. */
export function ToolOptions({ ed, big }: { ed: Ed; big?: boolean }) {
  const btn = `rounded-md border border-stone-300 bg-white px-2.5 ${big ? 'min-h-10 text-sm' : 'py-1 text-xs'} whitespace-nowrap`
  const n = ed.selected.length
  const grouped = ed.selected.some((e) => e.group)
  switch (ed.tool) {
    case 'select':
      if (!n) return <span className="text-xs text-stone-500 whitespace-nowrap">Click to select · drag to marquee · double-click to edit points</span>
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 whitespace-nowrap">{grouped ? `Group “${ed.selected[0].group}”` : n > 1 ? `${n} selected` : ed.selected[0].name}</span>
          {n === 1 && !grouped && <button className={btn} onClick={() => ed.setEditPoints(!ed.editPoints)}>{ed.editPoints ? 'Done' : 'Edit points'}</button>}
          {ed.editPoints && <Toggle on={ed.showHandles} onChange={ed.setShowHandles} label="Show handles" />}
          {grouped && <button className={btn} onClick={() => ed.toast_('Inside the Group now (prototype)')}>Enter group</button>}
          {n > 1 && !grouped && <><button className={btn}>Merge</button><button className={btn}>Cut out</button><button className={btn}>Overlap</button><button className={btn}>Group</button></>}
        </div>
      )
    case 'pen':
      return <div className="flex items-center gap-3"><Toggle on={ed.recognize} onChange={ed.setRecognize} label="Recognize shapes" /><label className="flex items-center gap-1.5 text-xs whitespace-nowrap">Smoothing<input type="range" value={ed.smoothing} onChange={(e) => ed.setSmoothing(+e.target.value)} className="w-20" /></label><StrokeWidth ed={ed} big={big} /></div>
    case 'line':
      return <div className="flex items-center gap-2"><StrokeWidth ed={ed} big={big} /><button className={btn}>Done</button><span className="text-xs text-stone-500 whitespace-nowrap">Shift = 15° steps</span></div>
    case 'shape':
      return (
        <div className="flex items-center gap-2">
          <Seg big={big} value={ed.shape} onChange={ed.setShape} options={[['rectangle', '▭'], ['ellipse', '◯'], ['polygon', '⬡'], ['star', '☆']]} />
          {ed.shape === 'rectangle' && <label className="flex items-center gap-1 text-xs whitespace-nowrap">Corner <input className="w-12 rounded border border-stone-300 px-1" defaultValue="0 in" /></label>}
          {ed.shape === 'polygon' && <label className="flex items-center gap-1 text-xs">Sides <input className="w-10 rounded border border-stone-300 px-1" defaultValue={6} /></label>}
          {ed.shape === 'star' && <label className="flex items-center gap-1 text-xs">Points <input className="w-10 rounded border border-stone-300 px-1" defaultValue={5} /></label>}
          <StrokeWidth ed={ed} big={big} />
        </div>
      )
    case 'text':
      return (
        <div className="flex items-center gap-2">
          <select className="rounded border border-stone-300 bg-white px-1 py-0.5 text-xs">{FONTS.map((f) => <option key={f}>{f}</option>)}</select>
          <input className="w-14 rounded border border-stone-300 px-1 text-xs" defaultValue="48 pt" />
          <Seg big={big} value="l" onChange={() => {}} options={[['l', '⟸'], ['c', '≡'], ['r', '⟹']]} />
        </div>
      )
    case 'fill':
      return <span className="text-xs text-stone-500 whitespace-nowrap">Hover a Region to preview, click to fill with the Current color</span>
    case 'eraser':
      return <span className="text-xs text-stone-500 whitespace-nowrap">Draw a loop to cut a bite · scrub across a line to trim it</span>
  }
}

export function SnapMenu({ ed }: { ed: Ed }) {
  return (
    <div className="space-y-2 p-1 text-xs">
      <div className="font-semibold">Snapping</div>
      <Toggle on label="Snap to Elements" onChange={() => {}} />
      <Toggle on={ed.snapGrid} onChange={ed.setSnapGrid} label="Snap to Reference grid (when shown)" />
      <div className="pt-1 font-semibold">Reference grid</div>
      <Toggle on={ed.grid} onChange={ed.setGrid} label="Show on screen" />
      <Toggle on={ed.diagonals} onChange={ed.setDiagonals} label="Diagonal lines" />
      <div className="text-stone-500">Spacing 2 in</div>
    </div>
  )
}

export function ValueMenu({ ed }: { ed: Ed }) {
  return <Seg value={ed.valueBands} onChange={ed.setValueBands} options={[[0, 'Color'], [1, 'Gray'], [2, '2'], [3, '3'], [4, '4'], [5, '5']]} />
}

/** Sticky modifier puck for touch: tap to latch. */
export function ModPuck({ ed, vertical }: { ed: Ed; vertical?: boolean }) {
  const k = [['shift', '⇧'], ['alt', '⌥'], ['nosnap', '⌁̸']] as const
  return (
    <div className={`flex ${vertical ? 'flex-col' : ''} gap-1 rounded-full bg-white/90 p-1 shadow-md ring-1 ring-black/10`}>
      {k.map(([key, l]) => (
        <button key={key} title={key} onClick={() => ed.setMods({ ...ed.mods, [key]: !ed.mods[key] })}
          className={`h-10 w-10 rounded-full text-base ${ed.mods[key] ? 'bg-stone-900 text-white' : 'text-stone-700'}`}>{l}</button>
      ))}
    </div>
  )
}

export function LayersList({ ed, big }: { ed: Ed; big?: boolean }) {
  const rows = [...ed.els].reverse()
  const h = big ? 'min-h-11' : 'min-h-7'
  let lastGroup: string | undefined
  return (
    <div className="text-xs">
      {rows.map((e) => {
        const header = e.group && e.group !== lastGroup
        lastGroup = e.group
        const on = ed.sel.includes(e.id)
        return (
          <div key={e.id}>
            {header && <div className={`flex ${h} items-center gap-1 px-2 font-medium text-stone-700`}>▾ ▣ {e.group}</div>}
            <div onClick={() => ed.select(e.id)} className={`group flex ${h} items-center gap-2 px-2 ${e.group ? 'pl-6' : ''} ${on ? 'bg-sky-100' : 'hover:bg-stone-100'}`}>
              <svg width="18" height="18" viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`} className="shrink-0 rounded-sm bg-white ring-1 ring-black/10">
                {e.kind === 'path' && <path d={e.d} fill={e.fill?.hex ?? 'none'} stroke={e.stroke?.hex} strokeWidth={0.6} transform={e.size ? `translate(${e.x} ${e.y}) scale(${e.size})` : undefined} />}
                {e.kind === 'text' && <text x="1" y="15" fontSize="14">T</text>}
                {e.kind === 'tracing' && <rect width="16" height="20" fill="url(#photo)" />}
              </svg>
              <span className={`flex-1 truncate ${e.hidden ? 'text-stone-400' : ''}`}>{e.kind === 'tracing' ? '🖼 ' : ''}{e.name}{e.live ? ' ◆' : ''}</span>
              <button className={`${e.hidden ? '' : 'opacity-0 group-hover:opacity-60'} ${big ? 'p-2 opacity-60' : ''}`} onClick={(ev) => { ev.stopPropagation(); ed.patch([e.id], { hidden: !e.hidden }) }}><Icon name={e.hidden ? 'eyeoff' : 'eye'} size={14} /></button>
              <button className={`${e.locked ? '' : 'opacity-0 group-hover:opacity-60'} ${big ? 'p-2 opacity-60' : ''}`} onClick={(ev) => { ev.stopPropagation(); ed.patch([e.id], { locked: !e.locked }) }}><Icon name={e.locked ? 'lock' : 'unlock'} size={14} /></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex min-h-8 items-center justify-between gap-2 text-xs"><span className="text-stone-500">{label}</span><div className="flex items-center gap-1.5">{children}</div></div>
)
const ColorChip = ({ c, onClick }: { c?: Color; onClick?: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 rounded border border-stone-300 bg-white px-1.5 py-0.5">
    <span className="h-3.5 w-3.5 rounded-sm" style={{ background: c?.hex ?? 'repeating-linear-gradient(45deg,#fff 0 3px,#e33 3px 4px)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }} />
    <span className="max-w-24 truncate">{c ? c.name ?? c.hex : 'None'}</span>
  </button>
)

/** Properties: the selection's own colors, or the Design/Canvas when nothing is selected. */
export function Properties({ ed }: { ed: Ed }) {
  const e = ed.selected[0]
  if (!e)
    return (
      <div className="space-y-1">
        <div className="text-xs font-semibold">Design</div>
        <Row label="Canvas"><button className="rounded border border-stone-300 bg-white px-1.5 py-0.5 text-xs">{CANVAS.label} ▾</button></Row>
        <Row label="Units"><Seg value="in" onChange={() => {}} options={[['in', 'in'], ['cm', 'cm']]} /></Row>
        <Row label="Current color"><ColorChip c={ed.color} /></Row>
        <Row label="Value preview"><ValueMenu ed={ed} /></Row>
        <Row label="Reference grid"><Toggle on={ed.grid} onChange={ed.setGrid} label="" /></Row>
      </div>
    )
  if (e.kind === 'tracing')
    return (
      <div className="space-y-1">
        <div className="text-xs font-semibold">Tracing image</div>
        <Row label="Opacity"><input type="range" className="w-24" defaultValue={35} /></Row>
        <Row label="Locked"><Toggle on={!!e.locked} onChange={(v) => ed.patch([e.id], { locked: v })} label="" /></Row>
        <Row label="Include in Reference"><Toggle on={!!e.inReference} onChange={(v) => ed.patch([e.id], { inReference: v })} label="" /></Row>
        <Row label=""><button className="text-xs text-sky-700"><Icon name="dropper" size={12} /> Pick colors from image</button></Row>
      </div>
    )
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold"><span>{e.group ? `Group · ${e.group}` : e.name}</span>{ed.selected.length > 1 && <span className="font-normal text-stone-500">{ed.selected.length} items</span>}</div>
      {e.live && <div className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">◆ Live shape — {e.live}</div>}
      <Row label="Stroke"><ColorChip c={e.stroke} onClick={() => ed.patch(ed.sel, { stroke: ed.color })} /><input className="w-14 rounded border border-stone-300 px-1 text-xs" defaultValue='1/16"' /></Row>
      <Row label="Fill"><ColorChip c={e.fill} onClick={() => ed.patch(ed.sel, { fill: ed.color })} /><button className="text-xs text-stone-500" onClick={() => ed.patch(ed.sel, { fill: undefined })}>none</button></Row>
      <Row label="Opacity"><input type="range" className="w-24" defaultValue={100} /></Row>
      <Row label="Position"><input className="w-14 rounded border border-stone-300 px-1 text-xs" defaultValue="3 in" /><input className="w-14 rounded border border-stone-300 px-1 text-xs" defaultValue="4 1/2 in" /></Row>
      <Row label="Flip"><button className="text-xs">↔</button><button className="text-xs">↕</button></Row>
      {e.kind === 'path' && <Row label="Shape"><button className="text-xs text-sky-700">As drawn ▾</button></Row>}
      <div className="pt-1 text-[11px] text-stone-400">Tip: click a stroke/fill chip to set it to the Current color.</div>
    </div>
  )
}

/** Palette picker + builder. layout: 'chips' compact grid, 'list' big named rows. */
export function PalettePanel({ ed, layout = 'chips', big }: { ed: Ed; layout?: 'chips' | 'list'; big?: boolean }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const p = ed.palette
  const mine = p.section === 'Yours'
  const results = q ? PAINTS.filter((c) => c.name!.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []
  return (
    <div className="space-y-2 text-xs">
      <div className="relative">
        <button onClick={() => setOpen(!open)} className={`flex w-full items-center justify-between rounded-md border border-stone-300 bg-white px-2 ${big ? 'min-h-11' : 'py-1'}`}>
          <span><span className="text-stone-400">{p.section} · </span><b className="font-semibold">{p.name}</b></span><Icon name="chevron" size={14} />
        </button>
        {open && (
          <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md bg-white p-1 shadow-lg ring-1 ring-black/10">
            {(['Paint sets', 'Mid-century', 'Yours'] as const).map((s) => (
              <div key={s}>
                <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">{s}</div>
                {ed.palettes.filter((x) => x.section === s).map((x) => (
                  <button key={x.id} onClick={() => { ed.setPaletteId(x.id); setOpen(false) }} className={`flex w-full items-center gap-2 rounded px-2 ${big ? 'min-h-11' : 'py-1'} hover:bg-stone-100`}>
                    <span className="flex">{x.colors.slice(0, 6).map((c, i) => <span key={i} className="-ml-1 h-3 w-3 rounded-full ring-1 ring-white first:ml-0" style={{ background: c.hex }} />)}</span>{x.name}
                  </button>
                ))}
                {s === 'Yours' && <button onClick={() => { ed.newPalette(); setOpen(false) }} className="w-full rounded px-2 py-1 text-left text-sky-700 hover:bg-stone-100">+ New palette</button>}
              </div>
            ))}
          </div>
        )}
      </div>
      {layout === 'chips' ? (
        <div className="flex flex-wrap gap-1.5">
          {p.colors.map((c, i) => <Swatch key={i} c={c} size={big ? 36 : 24} active={c.hex === ed.color.hex} onClick={() => ed.setColor(c)} />)}
          {mine && <button onClick={() => setAdding(!adding)} className="grid place-items-center rounded-full border border-dashed border-stone-400 text-stone-500" style={{ width: big ? 36 : 24, height: big ? 36 : 24 }}>+</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-0.5">
          {p.colors.map((c, i) => (
            <button key={i} onClick={() => ed.setColor(c)} className={`flex items-center gap-2 rounded-md px-1.5 ${big ? 'min-h-11' : 'py-1'} text-left ${c.hex === ed.color.hex ? 'bg-stone-900 text-white' : 'hover:bg-stone-100'}`}>
              <span className="h-6 w-10 shrink-0 rounded" style={{ background: c.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }} />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
          {mine && <button onClick={() => setAdding(!adding)} className="rounded-md px-1.5 py-1 text-left text-sky-700">+ Add a color</button>}
        </div>
      )}
      {mine && adding && (
        <div className="space-y-1.5 rounded-md bg-stone-100 p-2">
          <input autoFocus placeholder="Search paints, e.g. “ultra”" value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded border border-stone-300 px-2 py-1" />
          {results.map((c) => (
            <button key={c.name} onClick={() => ed.editPalette((pp) => ({ ...pp, colors: [...pp.colors, c] }))} className="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-white">
              <span className="h-4 w-4 rounded-full" style={{ background: c.hex }} />{c.name}<span className="ml-auto text-stone-400">add</span>
            </button>
          ))}
          <button onClick={() => ed.editPalette((pp) => ({ ...pp, colors: [...pp.colors, { ...ed.color, name: ed.color.name ?? 'My color' }] }))} className="text-sky-700">+ Add the Current color ({ed.color.name ?? ed.color.hex}) and name it</button>
        </div>
      )}
      <div className="flex items-center gap-2 text-stone-500">
        <button className="flex items-center gap-1"><Icon name="dropper" size={14} /> Eyedropper</button>
        {!mine && <button onClick={() => ed.duplicatePalette(p)} className="ml-auto text-sky-700">Duplicate to edit</button>}
        {mine && <span className="ml-auto">Yours · editable</span>}
      </div>
    </div>
  )
}

export function LibraryPanel({ ed, cols = 4, big }: { ed: Ed; cols?: number; big?: boolean }) {
  const [tab, setTab] = useState<'shapes' | 'pieces'>('shapes')
  return (
    <div className="space-y-2 text-xs">
      <Seg big={big} value={tab} onChange={setTab} options={[['shapes', 'Shapes'], ['pieces', 'Your Pieces']]} />
      {tab === 'shapes' ? (
        (['Basics', 'Mid-century', 'Nature'] as const).map((g) => (
          <div key={g}>
            <div className="py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">{g}</div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
              {SHAPES.filter((s) => s.group === g).map((s) => <ShapeTile key={s.name} name={s.name} d={s.d} onClick={() => ed.placeShape(s.name, s.d)} />)}
            </div>
          </div>
        ))
      ) : (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {PIECES.map((s) => <ShapeTile key={s.name} name={s.name} d={s.d} onClick={() => ed.placeShape(s.name, s.d)} />)}
          <div className="col-span-full pt-1 text-stone-400">Select a Group and choose “Save as Piece” to add one.</div>
        </div>
      )}
    </div>
  )
}
const ShapeTile = ({ name, d, onClick }: { name: string; d: string; onClick: () => void }) => (
  <button title={name} onClick={onClick} draggable className="aspect-square rounded-md bg-white p-1.5 ring-1 ring-black/10 hover:ring-stone-900">
    <svg viewBox="0 0 1 1" className="h-full w-full"><path d={d} fill="#e8dcc0" stroke="#1f2430" strokeWidth={0.04} strokeLinejoin="round" /></svg>
  </button>
)

/** Mock Design thumbnails + list behaviours. */
export function useDesigns() {
  const [list, setList] = useState(DESIGNS)
  const [q, setQ] = useState('')
  const [trash, setTrash] = useState(false)
  const shown = list.filter((d) => !!d.trashed === trash && d.name.toLowerCase().includes(q.toLowerCase()))
  const toggleTrash = (id: string) => setList((l) => l.map((d) => (d.id === id ? { ...d, trashed: !d.trashed } : d)))
  const duplicate = (id: string) => setList((l) => { const d = l.find((x) => x.id === id)!; return [{ ...d, id: 'd' + Date.now(), name: d.name + ' copy', edited: 'Just now' }, ...l] })
  return { shown, q, setQ, trash, setTrash, toggleTrash, duplicate }
}
export const Thumb = ({ colors, className = '' }: { colors: string[]; className?: string }) => (
  <svg viewBox="0 0 16 20" className={`bg-white ${className}`} preserveAspectRatio="xMidYMid slice">
    <rect width="16" height="12" fill={colors[0]} /><circle cx="11" cy="5.5" r="2.4" fill={colors[1]} />
    <path d="M0 12 C3 9.5 6 9.5 9 11.5 S14 10 16 10.5 L16 20 L0 20 Z" fill={colors[2]} /><path d="M0 15 C4 12.5 8 13 11 14.5 S15 14 16 13.5 L16 20 L0 20Z" fill={colors[3]} />
  </svg>
)

export const MENU = ['New design', 'Print Reference…', 'Download PNG', 'Download Design file', 'Import Design file…', 'Import tracing image…', 'Canvas size…', 'Keyboard shortcuts', 'Sign in to sync (Google)']
export function Menu({ ed, onClose }: { ed: Ed; onClose: () => void }) {
  return (
    <div className="w-60 rounded-lg bg-white p-1 text-sm shadow-xl ring-1 ring-black/10">
      {MENU.map((m) => <button key={m} onClick={() => { ed.toast_(`${m} — not in this prototype`); onClose() }} className="block w-full rounded px-3 py-1.5 text-left hover:bg-stone-100">{m}</button>)}
    </div>
  )
}

export { TOOLS, TOOL_LABEL }
