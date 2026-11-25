// PROTOTYPE — geometry that needs Paper.js (headless): As-drawn smoothing, endpoint snapping,
// Eraser loop cut and scrub trim. In the real app this runs in a Worker; here it's the main thread.
import paper from 'paper'
import { type Pt, type Shape, dist, pathLength, shapePoly } from './recognize'

paper.setup(document.createElement('canvas'))
paper.settings.insertItems = false

export type El = {
  id: string
  d: string
  closed: boolean
  width: number
  color: string
  // Pen origin, kept so the choice can be switched later
  logId?: number
  raw?: Pt[]
  pressures?: number[]
  asDrawnD?: string
  asDrawnNodes?: number
  shape?: Shape
  pick?: string // 'asdrawn' | candidate id
  pressureD?: string // variable-width outline (pressure preview)
}

let nextId = 1
export const newId = () => `e${nextId++}`

const cache = new Map<string, paper.PathItem>()
function item(d: string): paper.PathItem {
  let it = cache.get(d)
  if (!it) {
    if (cache.size > 3000) cache.clear()
    it = paper.PathItem.create(d)
    cache.set(d, it)
  }
  return it
}
const P = (p: Pt) => new paper.Point(p.x, p.y)
const toPt = (p: paper.Point): Pt => ({ x: p.x, y: p.y })
const children = (it: paper.PathItem): paper.Path[] => (it instanceof paper.CompoundPath ? (it.children as paper.Path[]) : [it as paper.Path])

// ---------- shapes & smoothing ----------
export function shapeToD(s: Shape): string {
  let p: paper.Path
  switch (s.kind) {
    case 'circle':
      p = new paper.Path.Circle({ center: P(s.c), radius: s.r, insert: false })
      break
    case 'ellipse':
      p = new paper.Path.Ellipse({ center: P(s.c), radius: [s.rx, s.ry], insert: false })
      p.rotate((s.rot * 180) / Math.PI, P(s.c))
      break
    case 'arc': {
      const at = (t: number) => P({ x: s.c.x + s.r * Math.cos(t), y: s.c.y + s.r * Math.sin(t) })
      p = new paper.Path.Arc({ from: at(s.start), through: at(s.start + s.sweep / 2), to: at(s.start + s.sweep), insert: false })
      break
    }
    case 'rect':
      p = new paper.Path.Rectangle({ point: [s.c.x - s.w / 2, s.c.y - s.h / 2], size: [s.w, s.h], insert: false })
      p.rotate((s.rot * 180) / Math.PI, P(s.c))
      break
    default: {
      const { pts, closed } = shapePoly(s)
      p = new paper.Path({ segments: pts.map(P), closed, insert: false })
    }
  }
  return p.pathData
}

export function asDrawn(pts: Pt[], tolerance: number, closed: boolean) {
  const p = new paper.Path({ segments: pts.map(P), insert: false })
  if (closed) p.closed = true
  if (tolerance > 0 && pts.length > 2) p.simplify(tolerance)
  return { d: p.pathData, nodes: p.segments.length }
}

/** Variable-width outline from stylus pressure (preview only: v1 strokes are uniform width). */
export function pressureOutline(d: string, raw: Pt[], pressures: number[], width: number) {
  const path = item(d) as paper.Path
  if (!(path instanceof paper.Path) || path.length < 2) return null
  const cum = [0]
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + dist(raw[i - 1], raw[i]))
  const total = cum[cum.length - 1] || 1
  const pressAt = (f: number) => {
    const target = f * total
    let i = 1
    while (i < cum.length - 1 && cum[i] < target) i++
    return pressures[i] ?? 0.5
  }
  const L: paper.Point[] = [], R: paper.Point[] = []
  const n = Math.max(8, Math.ceil(path.length / 2))
  for (let k = 0; k <= n; k++) {
    const off = (path.length * k) / n
    const pt = path.getPointAt(off), nm = path.getNormalAt(off)
    if (!pt || !nm) continue
    const w = (width * (0.25 + 1.5 * pressAt(k / n))) / 2
    L.push(pt.add(nm.multiply(w)))
    R.push(pt.subtract(nm.multiply(w)))
  }
  const out = new paper.Path({ segments: [...L, ...R.reverse()], closed: true, insert: false })
  return out.pathData
}

export function nodesOf(d: string): Pt[] {
  return children(item(d)).flatMap((c) => c.segments.map((s) => toPt(s.point)))
}

export function boundsOf(d: string) {
  const b = item(d).bounds
  return { x: b.x, y: b.y, w: b.width, h: b.height }
}

// ---------- endpoint snapping ----------
export function nearestOn(p: Pt, els: El[], maxD: number): Pt | null {
  let best: Pt | null = null, bd = maxD
  const pp = P(p)
  for (const el of els) {
    const it = item(el.d)
    if (!it.bounds.expand(maxD * 2).contains(pp)) continue
    const q = it.getNearestPoint(pp)
    const dd = q.getDistance(pp)
    if (dd <= bd) { bd = dd; best = toPt(q) }
  }
  return best
}

/** Where the stroke's last `len` px cross another path (the overshoot to trim). Offset on the stroke. */
function tailCrossing(path: paper.Path, els: El[], len: number, atEnd: boolean): number | null {
  let best: number | null = null
  for (const el of els) {
    const it = item(el.d)
    if (!it.bounds.intersects(path.bounds.expand(4))) continue
    for (const loc of path.getIntersections(it)) {
      const off = loc.offset
      if (atEnd ? off < path.length - len || off > path.length - 0.5 : off > len || off < 0.5) continue
      if (best === null || (atEnd ? off > best : off < best)) best = off
    }
  }
  return best
}

export type SnapInfo = { pts: Pt[]; closedSelf: boolean; startSnap: Pt | null; endSnap: Pt | null }

/** Ends within snapPx join the nearby path: trim an overshoot, or extend to meet. The stroke's own start closes it. */
export function snapEnds(pts: Pt[], els: El[], snapPx: number): SnapInfo {
  const L = pathLength(pts)
  if (pts.length < 2) return { pts, closedSelf: false, startSnap: null, endSnap: null }
  if (L > 4 * snapPx && dist(pts[0], pts[pts.length - 1]) <= snapPx) {
    return { pts: [...pts, pts[0]], closedSelf: true, startSnap: null, endSnap: pts[0] }
  }
  let path = new paper.Path({ segments: pts.map(P), insert: false })
  let endSnap: Pt | null = null, startSnap: Pt | null = null
  const reach = snapPx * 1.5
  const endCut = tailCrossing(path, els, reach, true)
  if (endCut !== null) {
    path.splitAt(endCut)
    endSnap = toPt(path.lastSegment.point)
  }
  const startCut = tailCrossing(path, els, reach, false)
  if (startCut !== null) {
    const rest = path.splitAt(startCut)
    if (rest) { path = rest; startSnap = toPt(path.firstSegment.point) }
  }
  let out = path.segments.map((s) => toPt(s.point))
  if (!endSnap) {
    const n = nearestOn(out[out.length - 1], els, snapPx)
    if (n) { out = [...out, n]; endSnap = n }
  }
  if (!startSnap) {
    const n = nearestOn(out[0], els, snapPx)
    if (n) { out = [n, ...out]; startSnap = n }
  }
  return { pts: out, closedSelf: false, startSnap, endSnap }
}

/** The dot shown while drawing: where the end will join, if anywhere. */
export function liveSnapDot(pts: Pt[], els: El[], snapPx: number): Pt | null {
  if (pts.length < 2) return null
  const end = pts[pts.length - 1]
  if (pathLength(pts) > 4 * snapPx && dist(pts[0], end) <= snapPx) return pts[0]
  return nearestOn(end, els, snapPx)
}

// ---------- Eraser ----------
export function isLoop(pts: Pt[], snapPx: number) {
  return pts.length > 2 && pathLength(pts) > 4 * snapPx && dist(pts[0], pts[pts.length - 1]) <= snapPx
}

function rebuild(base: El, result: paper.PathItem, isNew: boolean): El[] {
  const kids = children(result).filter((c) => c.segments.length > 1 && c.length > 0.5)
  if (!kids.length) return []
  const strip = { raw: undefined, pressures: undefined, asDrawnD: undefined, asDrawnNodes: undefined, shape: undefined, pick: undefined, logId: undefined }
  // closed pieces with holes stay one Element; open pieces become separate Elements
  if (kids.every((k) => k.closed)) {
    const d = result instanceof paper.CompoundPath ? result.pathData : kids[0].pathData
    return [{ ...base, ...strip, id: isNew ? newId() : base.id, d, closed: true }]
  }
  return kids.map((k, i) => ({ ...base, ...strip, id: i === 0 && !isNew ? base.id : newId(), d: k.pathData, closed: k.closed }))
}

/** Loop cut: subtract the loop from every touched Element (area semantics for closed, split for open). */
export function eraseLoop(loopD: string, els: El[]): El[] {
  const loop = paper.PathItem.create(loopD)
  ;(children(loop)[0] as paper.Path).closed = true
  const out: El[] = []
  for (const el of els) {
    const it = item(el.d)
    if (!it.bounds.intersects(loop.bounds)) { out.push(el); continue }
    const hits = it.getIntersections(loop).length
    const first = children(it)[0].firstSegment.point
    if (!hits && !loop.contains(first)) { out.push(el); continue }
    const res = el.closed ? it.subtract(loop, { insert: false }) : it.subtract(loop, { insert: false, trace: false })
    out.push(...rebuild(el, res, false))
  }
  return out
}

/** Scrub trim: each path the scrub crosses is cut back to its nearest crossings (or its ends). */
export function scrubTrim(scrub: Pt[], els: El[]): { els: El[]; removed: string[] } {
  if (scrub.length < 2) return { els, removed: [] }
  const sp = new paper.Path({ segments: scrub.map(P), insert: false })
  const out: El[] = [], removed: string[] = []
  for (const el of els) {
    const it = item(el.d)
    if (!it.bounds.expand(2).intersects(sp.bounds.expand(2))) { out.push(el); continue }
    const kids = children(it)
    let changed = false
    const kept: paper.Path[] = []
    for (const kid of kids) {
      const hits = kid.getIntersections(sp).map((l) => l.offset)
      if (!hits.length) { kept.push(kid.clone({ insert: false }) as paper.Path); continue }
      changed = true
      const L = kid.length
      // crossings with every other path, its siblings and itself
      const cross: number[] = []
      for (const other of els) {
        if (other.id === el.id) continue
        const oi = item(other.d)
        if (!oi.bounds.intersects(kid.bounds.expand(1))) continue
        for (const l of kid.getIntersections(oi)) cross.push(l.offset)
      }
      for (const sib of kids) if (sib !== kid) for (const l of kid.getIntersections(sib)) cross.push(l.offset)
      for (const l of kid.getIntersections()) cross.push(l.offset)
      cross.sort((a, b) => a - b)
      // removed intervals around each hit
      const cuts: [number, number][] = []
      for (const h of hits) {
        if (kid.closed) {
          if (cross.length < 2) { cuts.push([0, L]); continue }
          const lo = [...cross].reverse().find((c) => c < h) ?? cross[cross.length - 1]
          const hi = cross.find((c) => c > h) ?? cross[0]
          if (lo < hi) cuts.push([lo, hi])
          else { cuts.push([lo, L]); cuts.push([0, hi]) }
        } else {
          const lo = [...cross].reverse().find((c) => c < h) ?? 0
          const hi = cross.find((c) => c > h) ?? L
          cuts.push([lo, hi])
        }
      }
      // merge cuts, then keep the complement
      cuts.sort((a, b) => a[0] - b[0])
      const merged: [number, number][] = []
      for (const c of cuts) {
        const m = merged[merged.length - 1]
        if (m && c[0] <= m[1] + 0.01) m[1] = Math.max(m[1], c[1])
        else merged.push([...c])
      }
      for (const [a, b] of merged) { const r = section(kid, a, b); if (r) removed.push(r.pathData) }
      const keep: [number, number][] = []
      let cur = 0
      for (const [a, b] of merged) { if (a > cur + 0.5) keep.push([cur, a]); cur = Math.max(cur, b) }
      if (cur < L - 0.5) keep.push([cur, L])
      if (kid.closed && keep.length > 1 && keep[0][0] === 0 && keep[keep.length - 1][1] === L) {
        // the kept piece wraps around the start: stitch it as one piece
        const last = keep.pop()!
        keep[0] = [last[0], keep[0][1] + L]
      }
      for (const [a, b] of keep) { const r = section(kid, a, b); if (r) kept.push(r) }
    }
    if (!changed) { out.push(el); continue }
    if (!kept.length) continue
    const res = kept.length === 1 ? kept[0] : new paper.CompoundPath({ children: kept, insert: false })
    // a trimmed closed shape opens; the prototype has no fills, so it just becomes an open line
    out.push(...rebuild({ ...el, closed: false }, res, false))
  }
  return { els: out, removed }
}

/** The part of `path` between two offsets (b may exceed length on a closed path to wrap). */
function section(path: paper.Path, a: number, b: number): paper.Path | null {
  const L = path.length
  const p = path.clone({ insert: false }) as paper.Path
  if (p.closed) {
    if (b - a >= L - 0.01 && a <= 0.01) { p.closed = false; return p.length > 0.5 ? p : null }
    p.splitAt(a % L) // opens it, now starting at a
    const len = b - a
    if (len < p.length - 0.01) p.splitAt(len)
    return p.length > 0.5 ? p : null
  }
  let piece: paper.Path | null = p
  if (b < L - 0.01) p.splitAt(b)
  if (a > 0.01) piece = p.splitAt(a)
  return piece && piece.length > 0.5 ? piece : null
}
