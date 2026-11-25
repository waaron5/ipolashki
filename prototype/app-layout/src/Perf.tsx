// PROTOTYPE (throwaway) — SVG performance test (ADR 0001 check).
// React renders the Canvas as plain SVG, one memoized component per Element, the viewport as a <g transform>
// in React state, exactly as the real app would. Run the benchmarks on a mid-range phone and
// paste the results table into the issue. Bad numbers here trigger the Konva fallback.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

type P = { id: number; d: string; fill: string; stroke: string }
const COLORS = ['#9AC4E2', '#F0B024', '#A0AE88', '#1D8585', '#EE8667', '#E0482F', '#2B55A1', '#BF346C', '#77763A', '#F3EEE3']

// Seeded random so every device draws the same Design.
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646 }
function makeDesign(n: number, segs: number): P[] {
  const r = rng(42)
  return Array.from({ length: n }, (_, id) => {
    const cx = r() * 16, cy = r() * 20, rad = 0.3 + r() * 1.8
    const pts = Array.from({ length: segs }, (_, i) => {
      const a = (i / segs) * Math.PI * 2, k = rad * (0.6 + r() * 0.6)
      return [cx + Math.cos(a) * k, cy + Math.sin(a) * k]
    })
    // closed Catmull-Rom → cubic Béziers, like a smoothed "As drawn" pen path
    let d = `M${pts[0][0].toFixed(3)} ${pts[0][1].toFixed(3)}`
    for (let i = 0; i < segs; i++) {
      const p0 = pts[(i - 1 + segs) % segs], p1 = pts[i], p2 = pts[(i + 1) % segs], p3 = pts[(i + 2) % segs]
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
      d += `C${c1[0].toFixed(3)} ${c1[1].toFixed(3)} ${c2[0].toFixed(3)} ${c2[1].toFixed(3)} ${p2[0].toFixed(3)} ${p2[1].toFixed(3)}`
    }
    return { id, d: d + 'Z', fill: COLORS[id % COLORS.length], stroke: '#1F2430' }
  })
}

const ElementPath = memo(function ElementPath({ p, filled }: { p: P; filled: boolean }) {
  return <path d={p.d} fill={filled ? p.fill : 'none'} stroke={p.stroke} strokeWidth={0.0625} strokeLinejoin="round" />
})

type Result = { test: string; n: number; segs: number; filled: boolean; pan: string; fps: number; avg: number; p95: number; worst: number; slow: number }

export default function Perf() {
  const [n, setN] = useState(300)
  const [segs, setSegs] = useState(16)
  const [filled, setFilled] = useState(true)
  const [panMode, setPanMode] = useState<'react' | 'dom'>('react')
  const [mode, setMode] = useState<'pan' | 'draw'>('pan')
  const [vp, setVp] = useState({ s: 30, x: 20, y: 20 })
  const [stroke, setStroke] = useState<[number, number][] | null>(null)
  const [added, setAdded] = useState<P[]>([])
  const [live, setLive] = useState({ fps: 0, avg: 0, p95: 0 })
  const [results, setResults] = useState<Result[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const design = useMemo(() => makeDesign(n, segs), [n, segs])
  const wrap = useRef<HTMLDivElement>(null)
  const g = useRef<SVGGElement>(null)
  const vpRef = useRef(vp)
  vpRef.current = vp
  const frames = useRef<number[]>([])
  const rec = useRef<number[] | null>(null)

  // frame meter
  useEffect(() => {
    let last = performance.now(), raf = 0, tick = 0
    const loop = (t: number) => {
      const dt = t - last; last = t
      frames.current.push(dt); if (frames.current.length > 120) frames.current.shift()
      rec.current?.push(dt)
      if (++tick % 20 === 0) {
        const f = [...frames.current].sort((a, b) => a - b)
        const avg = f.reduce((a, b) => a + b, 0) / f.length
        setLive({ fps: 1000 / avg, avg, p95: f[Math.floor(f.length * 0.95)] })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const fit = useCallback(() => {
    const r = wrap.current!.getBoundingClientRect()
    const s = Math.min((r.width - 20) / 16, (r.height - 20) / 20)
    setVp({ s, x: (r.width - 16 * s) / 2, y: (r.height - 20 * s) / 2 })
  }, [])
  useEffect(fit, [fit])

  const applyVp = (v: typeof vp) => {
    if (panMode === 'dom') { vpRef.current = v; g.current?.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.s})`) }
    else setVp(v)
  }

  const bench = (test: 'pan' | 'draw' | 'zoom') => {
    if (running) return
    setRunning(test)
    const start = performance.now(), base = { ...vpRef.current }, cx = 8, cy = 10
    const pts: [number, number][] = []
    rec.current = []
    const step = (t: number) => {
      const k = (t - start) / 4000
      if (test === 'pan') applyVp({ ...base, x: base.x + Math.sin(k * Math.PI * 4) * 120, y: base.y + Math.cos(k * Math.PI * 4) * 120 - 120 })
      if (test === 'zoom') { const z = 1 + Math.sin(k * Math.PI * 4) * 0.5; applyVp({ s: base.s * z, x: base.x - (z - 1) * cx * base.s, y: base.y - (z - 1) * cy * base.s }) }
      if (test === 'draw') { const a = k * Math.PI * 12; pts.push([cx + Math.cos(a) * (1 + k * 5), cy + Math.sin(a) * (1 + k * 5)]); setStroke([...pts]) }
      if (k < 1) requestAnimationFrame(step)
      else {
        const f = rec.current!.slice(2).sort((a, b) => a - b); rec.current = null
        const avg = f.reduce((a, b) => a + b, 0) / f.length
        setResults((r) => [...r, { test, n: design.length + added.length, segs, filled, pan: panMode, fps: Math.round(1000 / avg), avg: +avg.toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), worst: +f[f.length - 1].toFixed(0), slow: Math.round((f.filter((x) => x > 25).length / f.length) * 100) }])
        if (test === 'draw') setStroke(null)
        if (panMode === 'dom') setVp(vpRef.current)
        else applyVp(base)
        setRunning(null)
      }
    }
    requestAnimationFrame(step)
  }

  // manual pan / draw
  const drag = useRef<{ x: number; y: number; vp: typeof vp } | null>(null)
  const toC = (e: React.PointerEvent): [number, number] => { const r = wrap.current!.getBoundingClientRect(), v = vpRef.current; return [(e.clientX - r.x - v.x) / v.s, (e.clientY - r.y - v.y) / v.s] }
  const down = (e: React.PointerEvent) => { (e.target as Element).setPointerCapture(e.pointerId); if (mode === 'pan') drag.current = { x: e.clientX, y: e.clientY, vp: { ...vpRef.current } }; else setStroke([toC(e)]) }
  const move = (e: React.PointerEvent) => {
    if (drag.current) { const d = drag.current; applyVp({ ...d.vp, x: d.vp.x + e.clientX - d.x, y: d.vp.y + e.clientY - d.y }) }
    else if (stroke) setStroke((s) => [...s!, toC(e)])
  }
  const up = () => {
    if (drag.current && panMode === 'dom') setVp(vpRef.current)
    drag.current = null
    if (stroke && stroke.length > 2) setAdded((a) => [...a, { id: 1e6 + a.length, d: 'M' + stroke.map((p) => p.map((v) => v.toFixed(3)).join(' ')).join('L'), fill: 'none', stroke: '#E0482F' }])
    setStroke(null)
  }

  const copy = () => {
    const ua = navigator.userAgent
    const head = `Device: ${ua}\nScreen ${screen.width}×${screen.height} @${devicePixelRatio}x, viewport ${innerWidth}×${innerHeight}\n\n| test | elements | segs | filled | pan via | fps | avg ms | p95 ms | worst ms | frames >25ms |\n|---|---|---|---|---|---|---|---|---|---|\n`
    const rows = results.map((r) => `| ${r.test} | ${r.n} | ${r.segs} | ${r.filled ? 'y' : 'n'} | ${r.pan} | ${r.fps} | ${r.avg} | ${r.p95} | ${r.worst} | ${r.slow}% |`).join('\n')
    navigator.clipboard?.writeText(head + rows).then(() => alert('Copied — paste it into the issue'), () => prompt('Copy this:', head + rows))
  }

  const good = live.p95 < 20, ok = live.p95 < 34
  return (
    <div className="flex h-full flex-col bg-stone-200 text-xs">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-stone-300 bg-white p-2">
        <b>SVG perf</b>
        <label>Elements <select value={n} onChange={(e) => { setN(+e.target.value); setAdded([]) }} className="rounded border px-1">{[100, 300, 600, 1000, 2000].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Segments/path <select value={segs} onChange={(e) => setSegs(+e.target.value)} className="rounded border px-1">{[8, 16, 40].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label><input type="checkbox" checked={filled} onChange={(e) => setFilled(e.target.checked)} /> fills</label>
        <label>Pan via <select value={panMode} onChange={(e) => setPanMode(e.target.value as 'react')} className="rounded border px-1"><option value="react">React state</option><option value="dom">direct DOM</option></select></label>
        <span className="rounded bg-stone-100 p-0.5">
          {(['pan', 'draw'] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded px-2 py-1 ${mode === m ? 'bg-stone-900 text-white' : ''}`}>{m === 'pan' ? 'Drag pans' : 'Drag draws'}</button>)}
        </span>
        <button onClick={fit} className="rounded border px-2 py-1">Fit</button>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-stone-300 bg-stone-50 p-2">
        <span className={`rounded px-2 py-1 font-mono font-semibold text-white ${good ? 'bg-green-700' : ok ? 'bg-amber-600' : 'bg-red-700'}`}>{live.fps.toFixed(0)} fps · p95 {live.p95?.toFixed(1)} ms</span>
        {(['pan', 'zoom', 'draw'] as const).map((t) => <button key={t} disabled={!!running} onClick={() => bench(t)} className="rounded bg-stone-900 px-3 py-1.5 text-white disabled:opacity-40">{running === t ? 'running…' : `Run ${t} 4s`}</button>)}
        <button onClick={copy} disabled={!results.length} className="rounded border border-stone-400 px-3 py-1.5 disabled:opacity-40">Copy results</button>
        <span className="text-stone-500">{design.length + added.length} elements on Canvas</span>
      </div>
      <div ref={wrap} className="relative min-h-0 flex-1 touch-none overflow-hidden" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <svg className="absolute inset-0 h-full w-full">
          <g ref={g} transform={`translate(${vp.x} ${vp.y}) scale(${vp.s})`}>
            <rect width={16} height={20} fill="#fff" />
            {design.map((p) => <ElementPath key={p.id} p={p} filled={filled} />)}
            {added.map((p) => <ElementPath key={p.id} p={p} filled={false} />)}
            {stroke && <path d={'M' + stroke.map((p) => p.join(' ')).join('L')} fill="none" stroke="#E0482F" strokeWidth={0.0625} strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        </svg>
        {results.length > 0 && (
          <div className="absolute bottom-14 right-2 max-h-[45%] overflow-auto rounded-lg bg-white/95 p-2 font-mono text-[10px] shadow-lg">
            <table><thead><tr className="text-left text-stone-500"><th className="pr-2">test</th><th className="pr-2">els</th><th className="pr-2">fill</th><th className="pr-2">pan</th><th className="pr-2">fps</th><th className="pr-2">p95</th><th className="pr-2">worst</th><th>&gt;25ms</th></tr></thead>
              <tbody>{results.map((r, i) => <tr key={i}><td className="pr-2">{r.test}</td><td className="pr-2">{r.n}</td><td className="pr-2">{r.filled ? 'y' : 'n'}</td><td className="pr-2">{r.pan}</td><td className="pr-2">{r.fps}</td><td className="pr-2">{r.p95}</td><td className="pr-2">{r.worst}</td><td>{r.slow}%</td></tr>)}</tbody></table>
          </div>
        )}
      </div>
    </div>
  )
}
