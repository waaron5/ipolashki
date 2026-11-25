// PROTOTYPE — Pen feel playground (throwaway). Answers "Prototype the freehand vector pen feel" (waaron5/ipolashki#6).
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type Candidate, type Pt, type Recognition, type RecognizeOpts,
  decide, decideForced, dist, pathLength, recognize, shapePoly,
} from './recognize'
import {
  type El, asDrawn, boundsOf, eraseLoop, isLoop, liveSnapDot, newId, nodesOf,
  pressureOutline, scrubTrim, shapeToD, snapEnds,
} from './ops'

// ---------------- settings ----------------
type Input = 'mouse' | 'touch' | 'pen'
type Tool = 'pen' | 'eraser' | 'select'
type Settings = {
  recognize: boolean
  trigger: 'release' | 'hold' | 'both'
  chooser: 'off' | 'snapped' | 'always'
  threshold: number
  waveThreshold: number
  tieMargin: number
  worstVeto: number
  closeFrac: number
  holdMs: number
  smoothing: number
  streamline: number
  snapEnds: boolean
  snapPx: number
  pressure: boolean
}
const BASE: Settings = {
  recognize: true, trigger: 'both', chooser: 'snapped',
  threshold: 0.55, waveThreshold: 0.3, tieMargin: 0.1, worstVeto: 0.1, closeFrac: 0.15,
  holdMs: 450, smoothing: 2.5, streamline: 0, snapEnds: true, snapPx: 10, pressure: false,
}
const INPUTS: Input[] = ['mouse', 'touch', 'pen']
const INPUT_LABEL: Record<Input, string> = { mouse: 'Mouse', touch: 'Finger', pen: 'Stylus' }

type Slider = { key: keyof Settings; label: string; hint: string; min: number; max: number; step: number; fmt: (v: number) => string }
const SLIDERS: Slider[] = [
  { key: 'smoothing', label: 'Smoothing (As drawn)', hint: 'How far the smoothed path may stray from your stroke. Higher = fewer points and calmer curves.', min: 0, max: 20, step: 0.5, fmt: (v) => `${v} px` },
  { key: 'streamline', label: 'Steadying while drawing', hint: 'The ink trails the pointer to calm a shaky hand. 0 = ink sticks to the pointer.', min: 0, max: 0.9, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'threshold', label: 'Snap when at least this sure', hint: 'Shapes snap on release only above this confidence. Higher = fewer snaps.', min: 0.05, max: 0.95, step: 0.05, fmt: (v) => v.toFixed(2) },
  { key: 'waveThreshold', label: 'Waves: snap when at least', hint: 'Waves have their own bar (research suggested 0.3).', min: 0.05, max: 0.95, step: 0.05, fmt: (v) => v.toFixed(2) },
  { key: 'tieMargin', label: 'Prefer the simpler shape within', hint: 'Near-ties go to the simpler shape: line over arc, circle over ellipse.', min: 0, max: 0.3, step: 0.02, fmt: (v) => v.toFixed(2) },
  { key: 'worstVeto', label: 'One stray bit vetoes a shape at', hint: 'A single wobble this far off (× the stroke’s size) rules a shape out.', min: 0.03, max: 0.3, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'closeFrac', label: 'Closed when the ends are within', hint: '× the stroke’s length. Closed strokes become circles, ellipses, rectangles, triangles.', min: 0.03, max: 0.3, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'holdMs', label: 'Hold still to snap after', hint: 'Keep the pointer down and still at the end of a stroke to force a snap (Procreate / Apple style).', min: 200, max: 1200, step: 50, fmt: (v) => `${v} ms` },
  { key: 'snapPx', label: 'Join ends within', hint: 'Stroke ends this close to a path snap onto it (trim or extend). Hold Ctrl/Cmd to skip.', min: 0, max: 30, step: 1, fmt: (v) => `${v} px` },
]
const WIDTHS = [{ label: 'Fine', w: 3 }, { label: 'Medium', w: 6 }, { label: 'Bold', w: 12 }]
const INK = '#2b2a28'

const recOpts = (s: Settings): RecognizeOpts => ({ errScale: 0.05, worstVeto: s.worstVeto, closeFrac: s.closeFrac, angleSnapDeg: 4, halfCircleDeg: 12 })
const decOpts = (s: Settings) => ({ threshold: s.threshold, waveThreshold: s.waveThreshold, tieMargin: s.tieMargin })

// ---------------- stroke log ----------------
type LogEntry = {
  id: number
  at: string
  input: Input
  raw: [number, number, number, number][] // x, y, ms since start, pressure
  closedSelf: boolean
  auto: string // what the Pen did by itself: 'asdrawn' or a candidate id
  forced: boolean // snapped by holding still
  cands: { id: string; conf: number }[]
  final: string // what the painter ended up with
  changedVia?: 'chooser' | 'later'
  undone?: boolean
}
const LS_LOG = 'PROTOTYPE-pen-feel-strokes'
const LS_SET = 'PROTOTYPE-pen-feel-settings'
const load = <T,>(k: string, fallback: T): T => { try { const v = localStorage.getItem(k); return v ? { ...fallback, ...JSON.parse(v) } : fallback } catch { return fallback } }
const loadLog = (): LogEntry[] => { try { return JSON.parse(localStorage.getItem(LS_LOG) || '[]') } catch { return [] } }
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }

// ---------------- last-action report ----------------
type Report =
  | {
      kind: 'pen'; input: Input; samples: number; ms: number; length: number; pressure: [number, number]
      rec: Recognition | null; auto: Candidate | null; forced: boolean; settings: Settings
      nodes: number; ends: string
    }
  | { kind: 'erase'; mode: 'loop' | 'scrub'; detail: string; before: number; after: number }

type Chooser = { elId: string; logId?: number; x: number; y: number; options: { id: string; label: string; cand?: Candidate }[]; current: string }

type Stroke = {
  tool: Tool; input: Input; pointerId: number; t0: number
  raw: Pt[]; times: number[]; pressures: number[]
  ink: Pt[] // steadied points actually drawn
  noSnap: boolean
  holdAnchor: Pt; holdTimer: number | undefined
  held: Candidate | null
}

export default function App() {
  const [els, setEls] = useState<El[]>([])
  const undo = useRef<El[][]>([])
  const redo = useRef<El[][]>([])
  const [tool, setTool] = useState<Tool>('pen')
  const [width, setWidth] = useState(6)
  const [profiles, setProfiles] = useState<Record<Input, Settings>>(() => {
    const saved = load<Partial<Record<Input, Settings>>>(LS_SET, {})
    return { mouse: { ...BASE, ...saved.mouse }, touch: { ...BASE, ...saved.touch }, pen: { ...BASE, ...saved.pen } }
  })
  const [editing, setEditing] = useState<Input>('mouse')
  const [log, setLog] = useState<LogEntry[]>(loadLog)
  const [report, setReport] = useState<Report | null>(null)
  const [chooser, setChooser] = useState<Chooser | null>(null)
  const [live, setLive] = useState<{ pts: Pt[]; tool: Tool; loop?: boolean; dot?: Pt | null; removed?: string[]; held?: Candidate | null } | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [showNodes, setShowNodes] = useState(false)
  const [panel, setPanel] = useState(() => window.innerWidth > 760)
  const stroke = useRef<Stroke | null>(null)
  const sawPen = useRef(false)
  const svg = useRef<SVGSVGElement>(null)
  const elsRef = useRef(els)
  elsRef.current = els
  const profRef = useRef(profiles)
  profRef.current = profiles
  const raf = useRef(0)

  useEffect(() => save(LS_SET, profiles), [profiles])
  useEffect(() => save(LS_LOG, log), [log])

  const commit = useCallback((next: El[]) => {
    undo.current.push(elsRef.current)
    redo.current = []
    setEls(next)
  }, [])

  const doUndo = useCallback(() => {
    const prev = undo.current.pop()
    if (!prev) return
    redo.current.push(elsRef.current)
    // a Pen stroke undone right away: don't count its log entry when tuning
    const gone = elsRef.current.filter((e) => e.logId && !prev.some((p) => p.logId === e.logId)).map((e) => e.logId)
    if (gone.length) setLog((l) => l.map((x) => (gone.includes(x.id) ? { ...x, undone: true } : x)))
    setEls(prev)
    setChooser(null)
  }, [])
  const doRedo = useCallback(() => {
    const nxt = redo.current.pop()
    if (!nxt) return
    undo.current.push(elsRef.current)
    const back = nxt.filter((e) => e.logId).map((e) => e.logId)
    setLog((l) => l.map((x) => (back.includes(x.id) ? { ...x, undone: false } : x)))
    setEls(nxt)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo() }
      else if (!mod && e.key === 'p') setTool('pen')
      else if (!mod && e.key === 'e') setTool('eraser')
      else if (!mod && e.key === 'v') setTool('select')
      else if (e.key === 'Escape') setChooser(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doUndo, doRedo])

  const at = (e: { clientX: number; clientY: number }): Pt => {
    const r = svg.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  // ---------------- pointer handling ----------------
  const onDown = (e: React.PointerEvent) => {
    const input = (e.pointerType as Input) || 'mouse'
    if (input === 'pen') sawPen.current = true
    if (stroke.current) {
      // a second finger while drawing: probably a pinch, so cancel the stroke
      if (input === 'touch') { clearTimeout(stroke.current.holdTimer); stroke.current = null; setLive(null) }
      return
    }
    if (input === 'touch' && sawPen.current) return // stylus seen: fingers don't draw
    if (e.button !== 0) return
    setChooser(null)
    setEditing(input)
    const p = at(e)
    if (tool === 'select') {
      const id = (e.target as Element).getAttribute?.('data-id')
      const el = id && elsRef.current.find((x) => x.id === id)
      if (el && el.raw) openChooserFor(el, 'always')
      return
    }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    stroke.current = {
      tool, input, pointerId: e.pointerId, t0: e.timeStamp,
      raw: [p], times: [0], pressures: [e.pressure || 0.5], ink: [p],
      noSnap: e.metaKey || e.ctrlKey, holdAnchor: p, holdTimer: undefined, held: null,
    }
    armHold()
    setLive({ pts: [p], tool })
  }

  const armHold = () => {
    const s = stroke.current
    if (!s || s.tool !== 'pen') return
    const set = profRef.current[s.input]
    if (!set.recognize || set.trigger === 'release') return
    clearTimeout(s.holdTimer)
    s.holdTimer = window.setTimeout(() => {
      const cur = stroke.current
      if (!cur || cur !== s) return
      const r = recognize(cur.raw, recOpts(set))
      cur.held = decideForced(r, decOpts(set))
      if (cur.held) setLive((l) => (l ? { ...l, held: cur.held } : l))
    }, set.holdMs)
  }

  const onMove = (e: React.PointerEvent) => {
    const s = stroke.current
    if (!s || e.pointerId !== s.pointerId) return
    const set = profRef.current[s.input]
    const evs = (e.nativeEvent.getCoalescedEvents?.() ?? []) as PointerEvent[]
    for (const ev of evs.length ? evs : [e.nativeEvent]) {
      const p = at(ev)
      s.raw.push(p)
      s.times.push(ev.timeStamp - s.t0)
      s.pressures.push(ev.pressure || 0.5)
      const last = s.ink[s.ink.length - 1]
      const k = s.tool === 'pen' ? 1 - set.streamline : 1
      s.ink.push({ x: last.x + (p.x - last.x) * k, y: last.y + (p.y - last.y) * k })
    }
    s.noSnap = e.metaKey || e.ctrlKey
    const end = s.raw[s.raw.length - 1]
    if (dist(end, s.holdAnchor) > (s.input === 'mouse' ? 3 : 6)) {
      s.holdAnchor = end
      if (s.held) s.held = null
      armHold()
    }
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const cur = stroke.current
      if (!cur) return
      const st = profRef.current[cur.input]
      if (cur.tool === 'pen') {
        const dot = st.snapEnds && !cur.noSnap ? liveSnapDot(cur.ink, elsRef.current, st.snapPx) : null
        setLive({ pts: [...cur.ink], tool: 'pen', dot, held: cur.held })
      } else {
        const loop = isLoop(cur.raw, st.snapPx)
        const removed = loop ? [] : scrubTrim(cur.raw, elsRef.current).removed
        setLive({ pts: [...cur.raw], tool: 'eraser', loop, removed })
      }
    })
  }

  const onUp = (e: React.PointerEvent) => {
    const s = stroke.current
    if (!s || e.pointerId !== s.pointerId) return
    clearTimeout(s.holdTimer)
    stroke.current = null
    setLive(null)
    const set = profiles[s.input]
    if (s.tool === 'pen') finishPen(s, set)
    else finishErase(s, set)
  }

  const finishPen = (s: Stroke, set: Settings) => {
    const ink = [...s.ink]
    const lastRaw = s.raw[s.raw.length - 1]
    if (dist(ink[ink.length - 1], lastRaw) > 0.5) ink.push(lastRaw) // steadying catches up on release
    if (pathLength(ink) < 2) return
    const snap = set.snapEnds && !s.noSnap
      ? snapEnds(ink, els, set.snapPx)
      : { pts: ink, closedSelf: false, startSnap: null, endSnap: null }
    const ad = asDrawn(snap.pts, set.smoothing, snap.closedSelf)
    const recRaw = snap.closedSelf ? [...s.raw, s.raw[0]] : s.raw
    const rec = set.recognize ? recognize(recRaw, recOpts(set)) : null
    let auto: Candidate | null = null
    let forced = false
    if (rec) {
      if (s.held && set.trigger !== 'release') { auto = decideForced(rec, decOpts(set)); forced = !!auto && !decide(rec, decOpts(set)) }
      else if (set.trigger !== 'hold') auto = decide(rec, decOpts(set))
      // a snapped line keeps the joined ends
      if (auto?.shape.kind === 'line' && (snap.startSnap || snap.endSnap)) {
        auto = { ...auto, shape: { ...auto.shape, a: snap.startSnap ?? auto.shape.a, b: snap.endSnap ?? auto.shape.b } }
      }
    }
    const pd = set.pressure && s.input === 'pen' ? pressureOutline(ad.d, s.raw, s.pressures, width) : null
    const logId = Date.now()
    const el: El = {
      id: newId(), width, color: INK, logId,
      raw: recRaw, pressures: s.pressures, asDrawnD: ad.d, asDrawnNodes: ad.nodes,
      shape: auto?.shape, pick: auto?.id ?? 'asdrawn',
      d: auto ? shapeToD(auto.shape) : ad.d,
      closed: auto ? shapePoly(auto.shape).closed : snap.closedSelf,
      ...(pd ? { pressureD: pd } : {}),
    }
    commit([...els, el])
    const entry: LogEntry = {
      id: logId, at: new Date().toISOString(), input: s.input,
      raw: s.raw.map((p, i) => [round(p.x), round(p.y), Math.round(s.times[i]), round(s.pressures[i], 3)]),
      closedSelf: snap.closedSelf, auto: auto?.id ?? 'asdrawn', forced,
      cands: (rec?.cands ?? []).map((c) => ({ id: c.id, conf: round(c.conf, 3) })),
      final: auto?.id ?? 'asdrawn',
    }
    setLog((l) => [...l, entry])
    const pr = s.pressures
    setReport({
      kind: 'pen', input: s.input, samples: s.raw.length, ms: Math.round(s.times[s.times.length - 1]),
      length: Math.round(pathLength(s.raw)), pressure: [Math.min(...pr), Math.max(...pr)],
      rec, auto, forced, settings: set, nodes: ad.nodes,
      ends: snap.closedSelf ? 'closed onto its own start'
        : [snap.startSnap && 'start joined a path', snap.endSnap && 'end joined a path'].filter(Boolean).join(', ') || 'no joins',
    })
    if (rec && set.chooser !== 'off' && (auto || set.chooser === 'always')) {
      openChooserFor(el, set.chooser, rec, set)
    }
  }

  const openChooserFor = (el: El, mode: 'snapped' | 'always', rec?: Recognition, set?: Settings) => {
    const st = set ?? profiles[editing]
    const r = rec ?? recognize(el.raw!, recOpts(st))
    const cur = el.pick ?? 'asdrawn'
    const ok = r.cands.filter((c) => c.conf > 0.05)
    let picked: Candidate[]
    if (mode === 'snapped') {
      const top = ok.find((c) => c.id === cur)
      const bar = (top?.conf ?? 1) - 0.3
      picked = ok.filter((c) => c.id === cur || c.conf >= bar || (top?.shape.kind === 'wave' && c.shape.kind === 'wave'))
    } else picked = ok
    picked = [...picked.filter((c) => c.id === cur), ...picked.filter((c) => c.id !== cur)].slice(0, 5)
    const b = boundsOf(el.d)
    setChooser({
      elId: el.id, logId: el.logId, current: cur,
      x: b.x + b.w / 2, y: b.y,
      options: [...picked.map((c) => ({ id: c.id, label: c.label, cand: c })), { id: 'asdrawn', label: 'As drawn' }],
    })
  }

  const choose = (opt: Chooser['options'][number]) => {
    if (!chooser) return
    const via: LogEntry['changedVia'] = tool === 'select' ? 'later' : 'chooser'
    setEls((list) => list.map((e) => {
      if (e.id !== chooser.elId) return e
      if (opt.cand) return { ...e, d: shapeToD(opt.cand.shape), shape: opt.cand.shape, closed: shapePoly(opt.cand.shape).closed, pick: opt.id }
      return { ...e, d: e.asDrawnD!, shape: undefined, closed: dist(e.raw![0], e.raw![e.raw!.length - 1]) < 0.5, pick: 'asdrawn' }
    }))
    if (chooser.logId) setLog((l) => l.map((x) => (x.id === chooser.logId ? { ...x, final: opt.id, changedVia: via } : x)))
    setChooser({ ...chooser, current: opt.id })
  }

  const finishErase = (s: Stroke, set: Settings) => {
    const pts = s.raw
    if (pathLength(pts) < 3) return
    const before = els.length
    if (isLoop(pts, set.snapPx)) {
      // perfect the loop with the Pen's recognizer (closed shapes only)
      const rec = recognize([...pts, pts[0]], recOpts(set))
      const c = decide(rec, decOpts(set))
      const loopD = c ? shapeToD(c.shape) : asDrawn(pts, set.smoothing, true).d
      const next = eraseLoop(loopD, els)
      commit(next)
      setReport({ kind: 'erase', mode: 'loop', detail: c ? `Loop perfected as a ${c.label.toLowerCase()} (${c.conf.toFixed(2)})` : 'Loop kept As drawn', before, after: next.length })
    } else {
      const { els: next, removed } = scrubTrim(pts, els)
      commit(next)
      setReport({ kind: 'erase', mode: 'scrub', detail: `${removed.length} piece${removed.length === 1 ? '' : 's'} trimmed back to their nearest crossings`, before, after: next.length })
    }
  }

  const exportLog = () => {
    const blob = new Blob([JSON.stringify({ prototype: 'pen-feel', exportedAt: new Date().toISOString(), settings: profiles, strokes: log }, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pen-feel-strokes-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`
    a.click()
  }
  const importLog = (f: File) => {
    f.text().then((t) => {
      const j = JSON.parse(t)
      const incoming: LogEntry[] = j.strokes ?? []
      setLog((l) => { const ids = new Set(l.map((x) => x.id)); return [...l, ...incoming.filter((x) => !ids.has(x.id))] })
    }).catch(() => alert('Not a pen-feel stroke file'))
  }

  const set = profiles[editing]
  const patch = (p: Partial<Settings>) => setProfiles((all) => ({ ...all, [editing]: { ...all[editing], ...p } }))

  return (
    <div className="app">
      <svg
        ref={svg}
        className={`canvas tool-${tool}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Elements els={els} showRaw={showRaw} showNodes={showNodes} hit={tool === 'select'} />
        {live && <Live live={live} width={width} />}
      </svg>

      <div className="toolbar">
        {(['pen', 'eraser', 'select'] as Tool[]).map((t) => (
          <button key={t} className={tool === t ? 'on' : ''} onClick={() => { setTool(t); setChooser(null) }} title={{ pen: 'Pen (P)', eraser: 'Eraser (E)', select: 'Select: tap a stroke to switch its shape later (V)' }[t]}>
            {{ pen: '✎', eraser: '⌫', select: '➚' }[t]}
            <span>{{ pen: 'Pen', eraser: 'Eraser', select: 'Select' }[t]}</span>
          </button>
        ))}
        <hr />
        {WIDTHS.map((w) => (
          <button key={w.w} className={width === w.w ? 'on' : ''} onClick={() => setWidth(w.w)} title={`${w.label} stroke`}>
            <i style={{ width: w.w + 4, height: w.w + 4 }} />
            <span>{w.label}</span>
          </button>
        ))}
      </div>

      <div className="topbar">
        <button onClick={doUndo} title="Undo (Ctrl/Cmd+Z)">↶</button>
        <button onClick={doRedo} title="Redo (Shift+Ctrl/Cmd+Z)">↷</button>
        <button onClick={() => { commit([]); setChooser(null) }}>Clear</button>
        <button className={panel ? 'on' : ''} onClick={() => setPanel(!panel)}>Tune</button>
      </div>

      {chooser && (
        <div className="chooser" style={{ left: chooser.x, top: Math.max(8, chooser.y - 52) }}>
          {chooser.options.map((o) => (
            <button key={o.id} className={chooser.current === o.id ? 'on' : ''} onPointerDown={(e) => e.stopPropagation()} onClick={() => choose(o)}>
              {o.label}
              {o.cand && <small>{o.cand.conf.toFixed(2)}</small>}
            </button>
          ))}
        </div>
      )}

      {panel && (
        <aside className="panel">
          <header>
            <b>PROTOTYPE · Pen feel</b>
            <p>Draw with the smart Pen and tune how it feels. Each input has its own settings, so you can check whether mouse, finger and stylus need different tuning. Every Pen stroke is recorded with what you finally picked, so the thresholds are tuned on <em>your</em> strokes.</p>
          </header>

          <section>
            <h3>Last action</h3>
            <ReportView r={report} />
          </section>

          <section>
            <h3>Tuning</h3>
            <div className="tabs">
              {INPUTS.map((i) => (
                <button key={i} className={editing === i ? 'on' : ''} onClick={() => setEditing(i)}>{INPUT_LABEL[i]}</button>
              ))}
            </div>
            <p className="hint">Editing the <b>{INPUT_LABEL[editing].toLowerCase()}</b> settings. This switches by itself to the input you last drew with.</p>
            <label className="row"><input type="checkbox" checked={set.recognize} onChange={(e) => patch({ recognize: e.target.checked })} /> Recognize shapes</label>
            <label className="field">Snap
              <select value={set.trigger} onChange={(e) => patch({ trigger: e.target.value as Settings['trigger'] })}>
                <option value="release">on release, when confident</option>
                <option value="hold">only when I hold still at the end</option>
                <option value="both">both</option>
              </select>
            </label>
            <label className="field">Shape chooser
              <select value={set.chooser} onChange={(e) => patch({ chooser: e.target.value as Settings['chooser'] })}>
                <option value="off">off</option>
                <option value="snapped">when it snaps</option>
                <option value="always">after every stroke</option>
              </select>
            </label>
            {SLIDERS.map((sl) => (
              <label key={sl.key} className="slider" title={sl.hint}>
                <span>{sl.label} <b>{sl.fmt(set[sl.key] as number)}</b></span>
                <input type="range" min={sl.min} max={sl.max} step={sl.step} value={set[sl.key] as number} onChange={(e) => patch({ [sl.key]: Number(e.target.value) })} />
                <small>{sl.hint}</small>
              </label>
            ))}
            <label className="row"><input type="checkbox" checked={set.snapEnds} onChange={(e) => patch({ snapEnds: e.target.checked })} /> Join ends to nearby paths</label>
            <label className="row"><input type="checkbox" checked={set.pressure} onChange={(e) => patch({ pressure: e.target.checked })} /> Pressure changes width (stylus, preview only)</label>
            <div className="row">
              <button onClick={() => patch(BASE)}>Reset {INPUT_LABEL[editing].toLowerCase()}</button>
              <button onClick={() => setProfiles((all) => ({ ...all, mouse: set, touch: set, pen: set }))}>Copy to all inputs</button>
            </div>
            <h4>Show</h4>
            <label className="row"><input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} /> Original strokes (grey)</label>
            <label className="row"><input type="checkbox" checked={showNodes} onChange={(e) => setShowNodes(e.target.checked)} /> Points (the editable nodes)</label>
          </section>

          <section>
            <h3>Recorded strokes</h3>
            <Scoreboard log={log} profiles={profiles} />
            <div className="row">
              <button onClick={exportLog} disabled={!log.length}>Export</button>
              <label className="btn">Import<input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importLog(e.target.files[0])} /></label>
              <button onClick={() => confirm('Forget every recorded stroke?') && setLog([])} disabled={!log.length}>Forget all</button>
            </div>
          </section>
        </aside>
      )}
    </div>
  )
}

const round = (v: number, k = 1) => Math.round(v * 10 ** k) / 10 ** k

// ---------------- rendering ----------------
const Elements = memo(function Elements({ els, showRaw, showNodes, hit }: { els: El[]; showRaw: boolean; showNodes: boolean; hit: boolean }) {
  return (
    <g>
      {els.map((e) => {
        const pd = e.pressureD
        const usePressure = pd && e.pick === 'asdrawn'
        return (
          <g key={e.id}>
            {showRaw && e.raw && <polyline points={e.raw.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#b9b3a8" strokeWidth={1} />}
            {usePressure
              ? <path d={pd} fill={e.color} />
              : <path d={e.d} fill="none" stroke={e.color} strokeWidth={e.width} strokeLinecap="round" strokeLinejoin="round" fillRule="evenodd" />}
            {hit && <path d={e.d} data-id={e.id} fill="none" stroke="transparent" strokeWidth={e.width + 16} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />}
            {showNodes && nodesOf(e.d).map((p, i) => <rect key={i} x={p.x - 2.5} y={p.y - 2.5} width={5} height={5} fill="#fff" stroke="#2f6fde" strokeWidth={1.2} />)}
          </g>
        )
      })}
    </g>
  )
})

function Live({ live, width }: { live: { pts: Pt[]; tool: Tool; loop?: boolean; dot?: Pt | null; removed?: string[]; held?: Candidate | null }; width: number }) {
  const pts = live.pts.map((p) => `${p.x},${p.y}`).join(' ')
  if (live.tool === 'eraser') {
    return (
      <g pointerEvents="none">
        {live.loop && <polygon points={pts} fill="rgba(214,69,65,0.15)" stroke="none" />}
        {live.removed?.map((d, i) => <path key={i} d={d} fill="none" stroke="#d64541" strokeWidth={width + 2} strokeLinecap="round" opacity={0.75} />)}
        <polyline points={pts} fill="none" stroke="#d64541" strokeWidth={1.5} strokeDasharray="5 4" />
        <text x={live.pts[live.pts.length - 1].x + 12} y={live.pts[live.pts.length - 1].y - 10} className="tag">{live.loop ? 'loop cut' : 'scrub trim'}</text>
      </g>
    )
  }
  return (
    <g pointerEvents="none">
      <polyline points={pts} fill="none" stroke={INK} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={live.held ? 0.25 : 1} />
      {live.held && <path d={shapeToD(live.held.shape)} fill="none" stroke={INK} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />}
      {live.dot && <circle cx={live.dot.x} cy={live.dot.y} r={5} fill="#2f6fde" stroke="#fff" strokeWidth={2} />}
    </g>
  )
}

function ReportView({ r }: { r: Report | null }) {
  if (!r) return <p className="hint">Draw something.</p>
  if (r.kind === 'erase') {
    return (
      <dl>
        <dt>Eraser</dt><dd>{r.mode === 'loop' ? 'Loop cut' : 'Scrub trim'}</dd>
        <dt>What happened</dt><dd>{r.detail}</dd>
        <dt>Elements</dt><dd>{r.before} → {r.after}</dd>
      </dl>
    )
  }
  const thr = r.settings.threshold, wthr = r.settings.waveThreshold
  return (
    <>
      <dl>
        <dt>Input</dt><dd>{INPUT_LABEL[r.input]} · {r.samples} samples · {r.ms} ms · {r.length} px</dd>
        {r.input === 'pen' && <><dt>Pressure</dt><dd>{r.pressure[0].toFixed(2)} – {r.pressure[1].toFixed(2)}</dd></>}
        <dt>Ends</dt><dd>{r.ends}</dd>
        <dt>Result</dt>
        <dd>
          {!r.rec ? `Recognition off · As drawn, ${r.nodes} points`
            : r.auto ? <>Snapped to <b>{r.auto.label}</b>{r.forced ? ' (you held still)' : ''}</>
            : <>Kept <b>As drawn</b> ({r.nodes} points){r.rec.cands[0] ? `: best guess ${r.rec.cands[0].label} at ${r.rec.cands[0].conf.toFixed(2)}` : ''}</>}
        </dd>
        {r.rec && <><dt>Stroke</dt><dd>{r.rec.closed ? 'closed' : 'open'}{r.rec.waveNote ? ` · not a wave: ${r.rec.waveNote}` : ''}</dd></>}
      </dl>
      {r.rec && r.rec.cands.length > 0 && (
        <table className="cands">
          <tbody>
            {r.rec.cands.map((c) => {
              const bar = c.shape.kind === 'wave' ? wthr : thr
              return (
                <tr key={c.id} className={r.auto?.id === c.id ? 'won' : ''}>
                  <td>{c.label}</td>
                  <td className="bar"><div style={{ width: `${c.conf * 100}%` }} /><i style={{ left: `${bar * 100}%` }} /></td>
                  <td>{c.conf.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}

/** Re-scores every recorded stroke with the current settings, against what the painter finally picked. */
function Scoreboard({ log, profiles }: { log: LogEntry[]; profiles: Record<Input, Settings> }) {
  const rows = useMemo(() => {
    const out: Record<string, { n: number; agree: number; falseSnap: number; miss: number; wrong: number; chooser: number }> = {}
    for (const x of log) {
      if (x.undone) continue
      const set = profiles[x.input]
      const raw = x.raw.map(([px, py]) => ({ x: px, y: py }))
      if (x.closedSelf) raw.push(raw[0])
      const auto = decide(recognize(raw, recOpts(set)), decOpts(set))?.id ?? 'asdrawn'
      const k = INPUT_LABEL[x.input]
      const r = (out[k] ??= { n: 0, agree: 0, falseSnap: 0, miss: 0, wrong: 0, chooser: 0 })
      r.n++
      if (x.changedVia) r.chooser++
      if (auto === x.final) r.agree++
      else if (x.final === 'asdrawn') r.falseSnap++
      else if (auto === 'asdrawn') r.miss++
      else r.wrong++
    }
    return out
  }, [log, profiles])
  const kinds = Object.keys(rows)
  if (!kinds.length) return <p className="hint">Nothing yet. Each Pen stroke lands here.</p>
  return (
    <>
      <p className="hint">With <b>today’s settings</b>, how often the Pen would do on release what you ended up keeping. Fix wrong results with the chooser (Undo removes a stroke from the count). Holding still isn’t counted here.</p>
      <table className="score">
        <thead><tr><th /><th>Strokes</th><th>Right</th><th>Snapped, you wanted As drawn</th><th>Missed a shape</th><th>Wrong shape</th></tr></thead>
        <tbody>
          {kinds.map((k) => (
            <tr key={k}>
              <td>{k}</td><td>{rows[k].n}</td>
              <td>{Math.round((100 * rows[k].agree) / rows[k].n)}%</td>
              <td>{rows[k].falseSnap}</td><td>{rows[k].miss}</td><td>{rows[k].wrong}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
