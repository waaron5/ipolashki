// PROTOTYPE — smart Pen shape recognizer (pure: no DOM, no Paper.js).
// Geometric fitters per Live shape, scored with one scale-free error, as recommended by
// "Research: shape recognition, Region fill & vector erasing" (waaron5/ipolashki#15).
// This module is the liftable part of the prototype; the page around it is throwaway.

export type Pt = { x: number; y: number }
export type WaveStyle = 'smooth' | 'zigzag' | 'scallop'

export type Shape =
  | { kind: 'line'; a: Pt; b: Pt }
  | { kind: 'circle'; c: Pt; r: number }
  | { kind: 'ellipse'; c: Pt; rx: number; ry: number; rot: number }
  | { kind: 'arc'; c: Pt; r: number; start: number; sweep: number }
  | { kind: 'rect'; c: Pt; w: number; h: number; rot: number }
  | { kind: 'triangle'; p: [Pt, Pt, Pt] }
  // closed half circle (D shape): an arc of 180° plus its straight diameter; `rot` points from c to the arc's apex
  | { kind: 'semicircle'; c: Pt; r: number; rot: number }
  // a→b is the straight baseline. Peaks (smooth/zigzag) or cusps (scallop) sit at
  // `phase + k·period` along it; `cuspSign` says which side the scallop cusps are on.
  | { kind: 'wave'; style: WaveStyle; a: Pt; b: Pt; period: number; amplitude: number; phase: number; cuspSign: 1 | -1 }

export type Candidate = {
  id: string // stable id for the chooser and the log: 'circle', 'wave-zigzag', …
  label: string
  shape: Shape
  conf: number // 0..1
  rms: number // RMS distance / stroke diagonal
  worst: number // worst distance / stroke diagonal
}

export type RecognizeOpts = {
  errScale: number // normalized RMS at which confidence reaches 0
  worstVeto: number // a single deviation larger than this (× diagonal) vetoes a fit
  closeFrac: number // ends closer than this × stroke length ⇒ closed stroke
  angleSnapDeg: number // lines/rects within this of horizontal/vertical snap to it
  halfCircleDeg: number // arcs within this of 180° become half circles
}

export type Recognition = {
  cands: Candidate[] // sorted by confidence, best first
  closed: boolean
  length: number
  diag: number
  waveNote?: string // why waves were not considered, if they weren't
}

export type DecideOpts = { threshold: number; waveThreshold: number; tieMargin: number }

// ---------- small geometry ----------
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y })
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y })
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k })
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const DEG = Math.PI / 180

export function pathLength(p: Pt[]) {
  let L = 0
  for (let i = 1; i < p.length; i++) L += dist(p[i - 1], p[i])
  return L
}

export function bboxDiag(p: Pt[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const q of p) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y) }
  return Math.hypot(x1 - x0, y1 - y0)
}

export function resample(pts: Pt[], n: number): Pt[] {
  const L = pathLength(pts)
  if (L === 0 || pts.length < 2) return Array.from({ length: n }, () => ({ ...pts[0] }))
  const step = L / (n - 1)
  const out: Pt[] = [{ ...pts[0] }]
  let acc = 0
  let prev = pts[0]
  for (let i = 1; i < pts.length && out.length < n; i++) {
    let cur = pts[i]
    let d = dist(prev, cur)
    while (acc + d >= step && out.length < n) {
      const t = (step - acc) / d
      const q = { x: prev.x + (cur.x - prev.x) * t, y: prev.y + (cur.y - prev.y) * t }
      out.push(q)
      d = dist(q, cur)
      prev = q
      acc = 0
    }
    acc += d
    prev = cur
  }
  while (out.length < n) out.push({ ...pts[pts.length - 1] })
  return out
}

function pca(p: Pt[]) {
  let cx = 0, cy = 0
  for (const q of p) { cx += q.x; cy += q.y }
  cx /= p.length; cy /= p.length
  let sxx = 0, syy = 0, sxy = 0
  for (const q of p) { const dx = q.x - cx, dy = q.y - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const dir = { x: Math.cos(ang), y: Math.sin(ang) }
  return { c: { x: cx, y: cy }, dir, nrm: { x: -dir.y, y: dir.x } }
}

function solve3(A: number[][], b: number[]): number[] | null {
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  const D = det(A)
  if (Math.abs(D) < 1e-12) return null
  return [0, 1, 2].map((k) => det(A.map((row, i) => row.map((v, j) => (j === k ? b[i] : v)))) / D)
}

function distToSeg(p: Pt, a: Pt, b: Pt) {
  const ab = sub(b, a)
  const L2 = dot(ab, ab)
  const t = L2 === 0 ? 0 : clamp01(dot(sub(p, a), ab) / L2)
  return dist(p, add(a, mul(ab, t)))
}

function distToPoly(p: Pt, poly: Pt[], closed: boolean) {
  let m = Infinity
  for (let i = 1; i < poly.length; i++) m = Math.min(m, distToSeg(p, poly[i - 1], poly[i]))
  if (closed && poly.length > 2) m = Math.min(m, distToSeg(p, poly[poly.length - 1], poly[0]))
  return m
}

function lineIntersect(p1: Pt, d1: Pt, p2: Pt, d2: Pt): Pt | null {
  const cr = d1.x * d2.y - d1.y * d2.x
  if (Math.abs(cr) < 1e-6) return null
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / cr
  return add(p1, mul(d1, t))
}

function snapAngle(a: number, snapDeg: number) {
  // snap to the nearest multiple of 90° when within snapDeg
  const q = Math.round(a / (Math.PI / 2)) * (Math.PI / 2)
  return Math.abs(a - q) < snapDeg * DEG ? q : a
}

// ---------- shape → polyline (for scoring and for rendering) ----------
export function shapePoly(s: Shape): { pts: Pt[]; closed: boolean } {
  switch (s.kind) {
    case 'line':
      return { pts: [s.a, s.b], closed: false }
    case 'circle':
      return { pts: ring(s.c, s.r, s.r, 0, 0, 2 * Math.PI, 96, true), closed: true }
    case 'ellipse':
      return { pts: ring(s.c, s.rx, s.ry, s.rot, 0, 2 * Math.PI, 96, true), closed: true }
    case 'arc':
      return { pts: ring(s.c, s.r, s.r, 0, s.start, s.sweep, Math.max(8, Math.ceil(Math.abs(s.sweep) / (4 * DEG))), false), closed: false }
    case 'rect': {
      const u = { x: Math.cos(s.rot), y: Math.sin(s.rot) }, v = { x: -u.y, y: u.x }
      const hw = s.w / 2, hh = s.h / 2
      const P = (a: number, b: number) => add(s.c, add(mul(u, a), mul(v, b)))
      return { pts: [P(-hw, -hh), P(hw, -hh), P(hw, hh), P(-hw, hh)], closed: true }
    }
    case 'triangle':
      return { pts: [...s.p], closed: true }
    case 'semicircle':
      return { pts: ring(s.c, s.r, s.r, 0, s.rot - Math.PI / 2, Math.PI, 48, false), closed: true }
    case 'wave':
      return { pts: wavePoly(s), closed: false }
  }
}

function ring(c: Pt, rx: number, ry: number, rot: number, start: number, sweep: number, n: number, closedRing: boolean) {
  const out: Pt[] = []
  const cr = Math.cos(rot), sr = Math.sin(rot)
  const count = closedRing ? n : n + 1
  for (let i = 0; i < count; i++) {
    const t = start + (sweep * i) / n
    const x = rx * Math.cos(t), y = ry * Math.sin(t)
    out.push({ x: c.x + x * cr - y * sr, y: c.y + x * sr + y * cr })
  }
  return out
}

export function waveOffset(s: Extract<Shape, { kind: 'wave' }>, along: number) {
  const t = (((along - s.phase) / s.period) % 1 + 1) % 1
  const A = s.amplitude
  if (s.style === 'smooth') return A * Math.cos(2 * Math.PI * t)
  if (s.style === 'zigzag') return A * (4 * Math.abs(t - 0.5) - 1)
  const bulge = Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2))
  return s.cuspSign * A - s.cuspSign * 2 * A * bulge
}

function wavePoly(s: Extract<Shape, { kind: 'wave' }>): Pt[] {
  const len = dist(s.a, s.b)
  const u = mul(sub(s.b, s.a), 1 / (len || 1))
  const n = { x: -u.y, y: u.x }
  const per = s.style === 'scallop' ? 64 : 32
  const step = s.period / per
  // sample on a grid aligned to the phase so zigzag corners and scallop cusps are exact
  const k0 = Math.ceil((0 - s.phase) / step)
  const along: number[] = [0]
  for (let k = k0; s.phase + k * step < len; k++) {
    const a = s.phase + k * step
    if (a > 0) along.push(a)
  }
  along.push(len)
  return along.map((a) => add(add(s.a, mul(u, a)), mul(n, waveOffset(s, a))))
}

// ---------- fitters ----------
function fitLine(s: Pt[], o: RecognizeOpts): Shape {
  const { c, dir } = pca(s)
  const proj = (p: Pt) => add(c, mul(dir, dot(sub(p, c), dir)))
  let a = proj(s[0]), b = proj(s[s.length - 1])
  const ang = Math.atan2(b.y - a.y, b.x - a.x)
  const snapped = snapAngle(ang, o.angleSnapDeg)
  if (snapped !== ang) {
    const m = mul(add(a, b), 0.5), half = dist(a, b) / 2
    const u = { x: Math.cos(snapped), y: Math.sin(snapped) }
    a = sub(m, mul(u, half)); b = add(m, mul(u, half))
  }
  return { kind: 'line', a, b }
}

function fitCircleRaw(s: Pt[]) {
  // Kåsa algebraic fit on centered data
  let mx = 0, my = 0
  for (const p of s) { mx += p.x; my += p.y }
  mx /= s.length; my /= s.length
  let Sxx = 0, Sxy = 0, Syy = 0, Sx = 0, Sy = 0, Sxz = 0, Syz = 0, Sz = 0
  for (const p of s) {
    const x = p.x - mx, y = p.y - my, z = x * x + y * y
    Sxx += x * x; Sxy += x * y; Syy += y * y; Sx += x; Sy += y; Sxz += x * z; Syz += y * z; Sz += z
  }
  const r = solve3([[Sxx, Sxy, Sx], [Sxy, Syy, Sy], [Sx, Sy, s.length]], [-Sxz, -Syz, -Sz])
  if (!r) return null
  const [D, E, F] = r
  const cx = -D / 2, cy = -E / 2
  const rr = cx * cx + cy * cy - F
  if (rr <= 0) return null
  return { c: { x: cx + mx, y: cy + my }, r: Math.sqrt(rr) }
}

function fitCircle(s: Pt[]): Shape | null {
  const f = fitCircleRaw(s)
  return f && { kind: 'circle', c: f.c, r: f.r }
}

function fitArc(s: Pt[], o: RecognizeOpts, diag: number): Shape | null {
  const f = fitCircleRaw(s)
  if (!f || f.r > 4 * diag) return null
  let prev = Math.atan2(s[0].y - f.c.y, s[0].x - f.c.x)
  const start = prev
  let sweep = 0
  for (let i = 1; i < s.length; i++) {
    const a = Math.atan2(s[i].y - f.c.y, s[i].x - f.c.x)
    let d = a - prev
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    sweep += d
    prev = a
  }
  const abs = Math.abs(sweep)
  if (abs < 25 * DEG || abs > 330 * DEG) return null
  if (Math.abs(abs - Math.PI) < o.halfCircleDeg * DEG) {
    // half circle: keep the arc centered on what was drawn
    const mid = start + sweep / 2
    sweep = Math.sign(sweep) * Math.PI
    return { kind: 'arc', c: f.c, r: f.r, start: mid - sweep / 2, sweep }
  }
  return { kind: 'arc', c: f.c, r: f.r, start, sweep }
}

function fitEllipse(s: Pt[]): Shape | null {
  // Halíř–Flusser direct least-squares ellipse fit on normalized data
  const { c } = pca(s)
  let scale = 0
  for (const p of s) scale = Math.max(scale, Math.abs(p.x - c.x), Math.abs(p.y - c.y))
  if (scale === 0) return null
  const P = s.map((p) => ({ x: (p.x - c.x) / scale, y: (p.y - c.y) / scale }))
  const S1 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], S2 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], S3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  for (const { x, y } of P) {
    const d1 = [x * x, x * y, y * y], d2 = [x, y, 1]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      S1[i][j] += d1[i] * d1[j]; S2[i][j] += d1[i] * d2[j]; S3[i][j] += d2[i] * d2[j]
    }
  }
  const S3inv = inv3(S3)
  if (!S3inv) return null
  // T = -S3⁻¹ S2ᵀ
  const S2T = [0, 1, 2].map((i) => [0, 1, 2].map((j) => S2[j][i]))
  const T = matmul(S3inv, S2T).map((r) => r.map((v) => -v))
  const M = matadd(S1, matmul(S2, T))
  // premultiply by C1⁻¹
  const Mc = [M[2].map((v) => v / 2), M[1].map((v) => -v), M[0].map((v) => v / 2)]
  let best: number[] | null = null
  for (const lam of eig3(Mc)) {
    const A = Mc.map((r, i) => r.map((v, j) => (i === j ? v - lam : v)))
    const vecs = [cross(A[0], A[1]), cross(A[0], A[2]), cross(A[1], A[2])]
    const v = vecs.reduce((m, q) => (norm(q) > norm(m) ? q : m))
    if (norm(v) < 1e-12) continue
    if (4 * v[0] * v[2] - v[1] * v[1] > 0) { best = v; break }
  }
  if (!best) return null
  const a1 = best
  const a2 = matvec(T, a1)
  const [a, b, cc] = a1, [d, e, f] = a2
  // conic → center, axes, rotation
  const den = 4 * a * cc - b * b
  const x0 = (b * e - 2 * cc * d) / den, y0 = (b * d - 2 * a * e) / den
  const f0 = a * x0 * x0 + b * x0 * y0 + cc * y0 * y0 + d * x0 + e * y0 + f
  const th = 0.5 * Math.atan2(b, a - cc)
  const ct = Math.cos(th), st = Math.sin(th)
  const A2 = a * ct * ct + b * ct * st + cc * st * st
  const C2 = a * st * st - b * st * ct + cc * ct * ct
  if (-f0 / A2 <= 0 || -f0 / C2 <= 0) return null
  const rx = Math.sqrt(-f0 / A2) * scale, ry = Math.sqrt(-f0 / C2) * scale
  return { kind: 'ellipse', c: { x: x0 * scale + c.x, y: y0 * scale + c.y }, rx, ry, rot: th }
}

const norm = (v: number[]) => Math.hypot(v[0], v[1], v[2])
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const matmul = (A: number[][], B: number[][]) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]))
const matadd = (A: number[][], B: number[][]) => A.map((r, i) => r.map((v, j) => v + B[i][j]))
const matvec = (A: number[][], v: number[]) => A.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])
function inv3(m: number[][]): number[][] | null {
  const c = (i: number, j: number) => {
    const r = [0, 1, 2].filter((k) => k !== i), q = [0, 1, 2].filter((k) => k !== j)
    return ((i + j) % 2 ? -1 : 1) * (m[r[0]][q[0]] * m[r[1]][q[1]] - m[r[0]][q[1]] * m[r[1]][q[0]])
  }
  const det = m[0][0] * c(0, 0) + m[0][1] * c(0, 1) + m[0][2] * c(0, 2)
  if (Math.abs(det) < 1e-14) return null
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => c(j, i) / det))
}
function eig3(m: number[][]): number[] {
  // real roots of the characteristic polynomial λ³ + pλ² + qλ + r
  const tr = m[0][0] + m[1][1] + m[2][2]
  const minors = m[0][0] * m[1][1] - m[0][1] * m[1][0] + m[0][0] * m[2][2] - m[0][2] * m[2][0] + m[1][1] * m[2][2] - m[1][2] * m[2][1]
  const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  const p = -tr, q = minors, r = -det
  // depressed cubic t³ + At + B with λ = t − p/3
  const A = q - (p * p) / 3, B = (2 * p * p * p) / 27 - (p * q) / 3 + r
  const disc = (B * B) / 4 + (A * A * A) / 27
  const shift = -p / 3
  if (disc > 1e-18) {
    const u = Math.cbrt(-B / 2 + Math.sqrt(disc)), v = Math.cbrt(-B / 2 - Math.sqrt(disc))
    return [u + v + shift]
  }
  const rho = Math.sqrt(Math.max(0, -A / 3))
  if (rho < 1e-15) return [shift]
  const phi = Math.acos(Math.max(-1, Math.min(1, -B / (2 * rho * rho * rho))))
  return [0, 1, 2].map((k) => 2 * rho * Math.cos((phi - 2 * Math.PI * k) / 3) + shift)
}

// corners of a closed stroke by a cyclic "straw" (ShortStraw-style), then a line fit per side
function polygonSides(s: Pt[], k: number) {
  const n = s.length, w = 4
  const straw = s.map((_, i) => dist(s[(i - w + n) % n], s[(i + w) % n]))
  const mins: number[] = []
  for (let i = 0; i < n; i++) {
    let isMin = true
    for (let j = -w; j <= w && isMin; j++) if (j && straw[(i + j + n) % n] < straw[i]) isMin = false
    if (isMin) mins.push(i)
  }
  mins.sort((a, b) => straw[a] - straw[b])
  const sep = Math.floor(n / (k * 2.5))
  const corners: number[] = []
  for (const i of mins) {
    if (corners.every((c) => Math.min(Math.abs(c - i), n - Math.abs(c - i)) >= sep)) corners.push(i)
    if (corners.length === k) break
  }
  if (corners.length < k) return null
  corners.sort((a, b) => a - b)
  const sides = corners.map((c0, j) => {
    const c1 = corners[(j + 1) % k]
    const len = (c1 - c0 + n) % n
    const m = Math.min(2, Math.floor(len / 4))
    const pts: Pt[] = []
    for (let t = m; t <= len - m; t++) pts.push(s[(c0 + t) % n])
    return pca(pts.length >= 2 ? pts : [s[c0], s[c1]])
  })
  return sides
}

function fitTriangle(s: Pt[], diag: number): Shape | null {
  const sides = polygonSides(s, 3)
  if (!sides) return null
  const p: Pt[] = []
  for (let j = 0; j < 3; j++) {
    const a = sides[(j + 2) % 3], b = sides[j]
    const q = lineIntersect(a.c, a.dir, b.c, b.dir)
    if (!q) return null
    p.push(q)
  }
  const cen = mul(add(add(p[0], p[1]), p[2]), 1 / 3)
  if (p.some((q) => dist(q, cen) > diag * 1.5)) return null
  return { kind: 'triangle', p: [p[0], p[1], p[2]] }
}

// D shape: find the two corners at the ends of the diameter (straw minima), take the run between
// them that is straight as the diameter, center the circle on it, and keep the pair that fits best.
function fitSemicircle(s: Pt[], o: RecognizeOpts, diag: number): Shape | null {
  const n = s.length, w = 4
  const straw = s.map((_, i) => dist(s[(i - w + n) % n], s[(i + w) % n]))
  const mins: number[] = []
  for (let i = 0; i < n; i++) {
    let isMin = true
    for (let j = -w; j <= w && isMin; j++) if (j && straw[(i + j + n) % n] < straw[i]) isMin = false
    if (isMin) mins.push(i)
  }
  mins.sort((a, b) => straw[a] - straw[b])
  const top = mins.slice(0, 6)
  let best: { shape: Shape; err: number } | null = null
  for (let x = 0; x < top.length; x++) for (let y = 0; y < top.length; y++) {
    const i = top[x], j = top[y]
    if (i === j) continue
    const len = (j - i + n) % n // run i→j is the diameter candidate; j→i is the arc
    if (len < n * 0.2 || len > n * 0.55) continue
    const dia: Pt[] = [], arc: Pt[] = []
    for (let t = 0; t <= len; t++) dia.push(s[(i + t) % n])
    for (let t = 0; t <= n - len; t++) arc.push(s[(j + t) % n])
    const L = pca(dia)
    const t1 = dot(sub(s[i], L.c), L.dir), t2 = dot(sub(s[j], L.c), L.dir)
    const c = add(L.c, mul(L.dir, (t1 + t2) / 2))
    const side = arc.reduce((m, p) => m + dot(sub(p, c), L.nrm), 0)
    if (Math.abs(side) < 1e-9) continue
    const r = arc.reduce((m, p) => m + dist(p, c), 0) / arc.length
    if (r < diag * 0.2) continue
    const apex = side > 0 ? L.nrm : mul(L.nrm, -1)
    const rot = snapAngle(Math.atan2(apex.y, apex.x), o.angleSnapDeg)
    const shape: Shape = { kind: 'semicircle', c, r, rot }
    const poly = shapePoly(shape)
    let sq = 0
    for (const p of s) sq += distToPoly(p, poly.pts, true) ** 2
    if (!best || sq < best.err) best = { shape, err: sq }
  }
  return best && best.shape
}

function fitRect(s: Pt[], o: RecognizeOpts): Shape | null {
  const sides = polygonSides(s, 4)
  if (!sides) return null
  const angs = sides.map((sd) => Math.atan2(sd.dir.y, sd.dir.x))
  let rot = Math.atan2(angs.reduce((m, a) => m + Math.sin(4 * a), 0), angs.reduce((m, a) => m + Math.cos(4 * a), 0)) / 4
  rot = snapAngle(rot, o.angleSnapDeg)
  const u = { x: Math.cos(rot), y: Math.sin(rot) }, v = { x: -u.y, y: u.x }
  const xs: number[] = [], ys: number[] = []
  for (const sd of sides) {
    const along = Math.abs(dot(sd.dir, u))
    if (along > 0.8) ys.push(dot(sd.c, v)) // runs along u ⇒ fixes a v coordinate
    else if (along < 0.6) xs.push(dot(sd.c, u))
    else return null
  }
  if (xs.length !== 2 || ys.length !== 2) return null
  let w = Math.abs(xs[1] - xs[0]), h = Math.abs(ys[1] - ys[0])
  if (Math.abs(w - h) < 0.1 * Math.max(w, h)) w = h = (w + h) / 2
  const cu = (xs[0] + xs[1]) / 2, cv = (ys[0] + ys[1]) / 2
  return { kind: 'rect', c: add(mul(u, cu), mul(v, cv)), w, h, rot }
}

// waves along a straight baseline: turning points with hysteresis (research §1, "Waves")
function fitWaves(raw: Pt[]): { cands: { style: WaveStyle; shape: Shape; conf: number }[]; note?: string } {
  const s = resample(raw, 400)
  const { c, dir: d0, nrm: n0 } = pca(s)
  let dir = d0, nrm = n0
  if (dot(sub(s[s.length - 1], s[0]), dir) < 0) { dir = mul(dir, -1); nrm = mul(nrm, -1) }
  const S = s.map((p) => dot(sub(p, c), dir)), D = s.map((p) => dot(sub(p, c), nrm))
  const span = S[S.length - 1] - S[0]
  if (span < 40) return { cands: [], note: 'too short for a wave' }
  let runMax = -Infinity
  for (const v of S) { runMax = Math.max(runMax, v); if (runMax - v > 0.03 * span) return { cands: [], note: 'backtracks (loops or curls), so not a wave' } }
  // remove a gentle bow: quadratic fit of D over S
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, t0 = 0, t1 = 0, t2 = 0
  for (let i = 0; i < S.length; i++) {
    const x = (S[i] - S[0]) / span, y = D[i]
    s0++; s1 += x; s2 += x * x; s3 += x ** 3; s4 += x ** 4; t0 += y; t1 += x * y; t2 += x * x * y
  }
  const q = solve3([[s0, s1, s2], [s1, s2, s3], [s2, s3, s4]], [t0, t1, t2]) ?? [0, 0, 0]
  const trend = S.map((v) => { const x = (v - S[0]) / span; return q[0] + q[1] * x + q[2] * x * x })
  const raw2 = D.map((v, i) => v - trend[i])
  const R = raw2.map((_, i) => { let m = 0, k = 0; for (let j = i - 3; j <= i + 3; j++) if (j >= 0 && j < raw2.length) { m += raw2[j]; k++ } return m / k })
  const sorted = [...R].sort((a, b) => a - b)
  const amp = (sorted[Math.floor(0.95 * (sorted.length - 1))] - sorted[Math.floor(0.05 * (sorted.length - 1))]) / 2
  if (amp < Math.max(3, 0.02 * span)) return { cands: [], note: 'too flat for a wave' }
  // a big bow with small wiggles is a curve (an arc), not a wave
  if (Math.abs(q[2]) / 4 > 3 * amp) return { cands: [], note: 'bowed more than it waves' }
  const h = 0.6 * amp
  const T: { i: number; peak: boolean }[] = []
  let mode: 'none' | 'up' | 'down' = 'none', maxI = 0, minI = 0
  const interior = (i: number) => i > 3 && i < R.length - 4
  for (let i = 1; i < R.length; i++) {
    const v = R[i]
    if (mode !== 'down' && v > R[maxI]) maxI = i
    if (mode !== 'up' && v < R[minI]) minI = i
    if (mode !== 'down' && R[maxI] - v > h) { if (interior(maxI)) T.push({ i: maxI, peak: true }); mode = 'down'; minI = i }
    else if (mode !== 'up' && v - R[minI] > h) { if (interior(minI)) T.push({ i: minI, peak: false }); mode = 'up'; maxI = i }
  }
  if (T.length < 3) return { cands: [], note: `only ${T.length} turning point${T.length === 1 ? '' : 's'}, needs 3` }
  const W: number[] = [], H: number[] = []
  for (let k = 0; k + 1 < T.length; k++) { W.push(S[T[k + 1].i] - S[T[k].i]); H.push(Math.abs(R[T[k + 1].i] - R[T[k].i])) }
  const cv = (a: number[]) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / (m || 1) }
  const reg = clamp01(1 - Math.max(cv(W), cv(H)) / 0.5)
  // compare each half-cycle (normalized to a unit box, rising) with each style's half-cycle
  const tmpl = {
    smooth: (u: number) => (1 - Math.cos(Math.PI * u)) / 2,
    zigzag: (u: number) => u,
    cuspEnd: (u: number) => 1 - Math.sqrt(Math.max(0, 1 - u * u)),
    cuspStart: (u: number) => Math.sqrt(Math.max(0, 1 - (1 - u) ** 2)),
  }
  const err = { smooth: 0, zigzag: 0, cuspAtPeaks: 0, cuspAtTroughs: 0 }
  for (let k = 0; k + 1 < T.length; k++) {
    const i0 = T[k].i, i1 = T[k + 1].i, rising = !T[k].peak
    const e = { smooth: 0, zigzag: 0, cuspAtPeaks: 0, cuspAtTroughs: 0 }
    let m = 0
    for (let j = i0; j <= i1; j++) {
      const u = (S[j] - S[i0]) / (S[i1] - S[i0] || 1)
      const vv = (R[j] - R[i0]) / (R[i1] - R[i0] || 1)
      e.smooth += (vv - tmpl.smooth(u)) ** 2
      e.zigzag += (vv - tmpl.zigzag(u)) ** 2
      // rising (trough→peak): cusps at peaks ⇒ cusp at end. falling (peak→trough): cusps at peaks ⇒ cusp at start
      e.cuspAtPeaks += (vv - (rising ? tmpl.cuspEnd(u) : tmpl.cuspStart(u))) ** 2
      e.cuspAtTroughs += (vv - (rising ? tmpl.cuspStart(u) : tmpl.cuspEnd(u))) ** 2
      m++
    }
    for (const key of Object.keys(e) as (keyof typeof e)[]) err[key] += Math.sqrt(e[key] / m) / (T.length - 1)
  }
  const P = 2 * (W.reduce((a, b) => a + b, 0) / W.length)
  const A = H.reduce((a, b) => a + b, 0) / H.length / 2
  // phase from all extremes (least squares on positions k·P/2), referenced to a peak
  let ph = 0
  T.forEach((t, k) => { ph += S[t.i] - S[0] - (k * P) / 2 })
  ph /= T.length
  const peakPhase = T[0].peak ? ph : ph + P / 2
  const d0mean = trend.reduce((a, b) => a + b, 0) / trend.length
  const a = add(add(c, mul(dir, S[0])), mul(nrm, d0mean))
  const b = add(add(c, mul(dir, S[S.length - 1])), mul(nrm, d0mean))
  const cuspPeaks = err.cuspAtPeaks <= err.cuspAtTroughs
  const make = (style: WaveStyle, e: number): { style: WaveStyle; shape: Shape; conf: number } => ({
    style,
    conf: reg * clamp01(1 - e / 0.25),
    shape: {
      kind: 'wave', style, a, b, period: P, amplitude: A,
      phase: style === 'scallop' && !cuspPeaks ? peakPhase + P / 2 : peakPhase,
      cuspSign: style === 'scallop' && !cuspPeaks ? -1 : 1,
    },
  })
  return {
    cands: [make('smooth', err.smooth), make('zigzag', err.zigzag), make('scallop', Math.min(err.cuspAtPeaks, err.cuspAtTroughs))],
  }
}

// ---------- public API ----------
const LABEL: Record<string, string> = {
  line: 'Line', circle: 'Circle', ellipse: 'Ellipse', arc: 'Arc', rect: 'Rectangle', triangle: 'Triangle', semicircle: 'Half circle',
  'wave-smooth': 'Smooth wave', 'wave-zigzag': 'Zigzag', 'wave-scallop': 'Scallops',
}
const RANK: Record<string, number> = { line: 0, arc: 1, circle: 2, semicircle: 2.5, ellipse: 3, triangle: 4, rect: 5, 'wave-smooth': 6, 'wave-zigzag': 7, 'wave-scallop': 8 }

export function labelFor(c: Candidate) {
  if (c.shape.kind === 'arc' && Math.abs(Math.abs(c.shape.sweep) - Math.PI) < 1e-6) return 'Half circle'
  if (c.shape.kind === 'rect' && c.shape.w === c.shape.h) return 'Square'
  return LABEL[c.id]
}

export function recognize(raw: Pt[], o: RecognizeOpts): Recognition {
  const length = pathLength(raw)
  const diag = bboxDiag(raw)
  const closed = raw.length > 2 && dist(raw[0], raw[raw.length - 1]) < o.closeFrac * length
  if (raw.length < 4 || length < 15 || diag < 10) return { cands: [], closed, length, diag }
  const s = resample(raw, 128)
  const cands: Candidate[] = []
  const score = (id: string, shape: Shape | null, confOverride?: number) => {
    if (!shape) return
    const poly = shapePoly(shape)
    let sq = 0, worst = 0
    for (const p of s) { const d = distToPoly(p, poly.pts, poly.closed); sq += d * d; worst = Math.max(worst, d) }
    const rms = Math.sqrt(sq / s.length) / diag
    worst /= diag
    const conf = confOverride ?? (worst > o.worstVeto ? 0 : clamp01(1 - rms / o.errScale))
    const c: Candidate = { id, label: '', shape, conf, rms, worst }
    c.label = labelFor(c)
    cands.push(c)
  }
  let waveNote: string | undefined
  if (closed) {
    score('circle', fitCircle(s))
    score('ellipse', fitEllipse(s))
    score('triangle', fitTriangle(s, diag))
    score('rect', fitRect(s, o))
    score('semicircle', fitSemicircle(s, o, diag))
  } else {
    score('line', fitLine(s, o))
    score('arc', fitArc(s, o, diag))
    const w = fitWaves(raw)
    waveNote = w.note
    for (const c of w.cands) score(`wave-${c.style}`, c.shape, c.conf)
  }
  cands.sort((a, b) => b.conf - a.conf)
  return { cands, closed, length, diag, waveNote }
}

const isWave = (c: Candidate) => c.shape.kind === 'wave'

/** Snap on release: the best candidate over its threshold, preferring the simpler shape on near-ties. */
export function decide(r: Recognition, o: DecideOpts): Candidate | null {
  const ok = r.cands.filter((c) => c.conf >= (isWave(c) ? o.waveThreshold : o.threshold))
  return pickSimplest(ok, o.tieMargin)
}

/** Hold to snap: the best candidate with any confidence at all. */
export function decideForced(r: Recognition, o: DecideOpts): Candidate | null {
  return pickSimplest(r.cands.filter((c) => c.conf > 0.05), o.tieMargin)
}

function pickSimplest(ok: Candidate[], tie: number) {
  if (!ok.length) return null
  const best = Math.max(...ok.map((c) => c.conf))
  return ok.filter((c) => c.conf >= best - tie).sort((a, b) => RANK[a.id] - RANK[b.id])[0]
}
