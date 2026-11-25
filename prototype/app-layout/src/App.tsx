// PROTOTYPE (throwaway): three radically different app layouts + a phone performance test,
// switchable via ?variant=A|B|C|perf, and ?frame=auto|phone|tablet to preview phone/tablet sizes on a desktop.
import { useEffect, useState } from 'react'
import VariantA from './VariantA'
import VariantB from './VariantB'
import VariantC from './VariantC'
import Perf from './Perf'

const VARIANTS = [
  { key: 'A', name: 'Docked panels', C: VariantA },
  { key: 'B', name: 'Canvas first, floating', C: VariantB },
  { key: 'C', name: "Painter's workbench", C: VariantC },
  { key: 'perf', name: 'SVG performance test', C: Perf },
]
const FRAMES = { auto: null, phone: [390, 844], tablet: [1024, 768] } as const
type Frame = keyof typeof FRAMES

const param = (k: string, d: string) => new URLSearchParams(location.search).get(k) ?? d

export default function App() {
  const [v, setV] = useState(param('variant', 'A'))
  const [frame, setFrame] = useState<Frame>(param('frame', 'auto') as Frame)
  const [hidden, setHidden] = useState(innerWidth < 700)
  const i = Math.max(0, VARIANTS.findIndex((x) => x.key === v))
  const cur = VARIANTS[i]

  useEffect(() => {
    const u = new URL(location.href)
    u.searchParams.set('variant', cur.key)
    u.searchParams.set('frame', frame)
    history.replaceState(null, '', u)
  }, [cur.key, frame])
  const go = (d: number) => setV(VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length].key)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) return
      if (e.key === 'ArrowLeft' && e.altKey) go(-1)
      if (e.key === 'ArrowRight' && e.altKey) go(1)
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  })

  const size = FRAMES[frame]
  const Comp = cur.C
  return (
    <div className="h-full w-full">
      {size ? (
        <div className="grid h-full w-full place-items-center overflow-auto bg-stone-700 p-4">
          <div className="relative overflow-hidden rounded-[28px] bg-white shadow-2xl ring-8 ring-stone-900" style={{ width: size[0], height: size[1] }}>
            <Comp key={cur.key + frame} />
          </div>
        </div>
      ) : (
        <Comp key={cur.key} />
      )}
      {hidden ? (
        <button onClick={() => setHidden(false)} className="fixed left-0 top-1/2 z-[100] -translate-y-1/2 rounded-l-none rounded-full bg-fuchsia-700 px-2 py-1 text-[10px] font-bold text-white shadow-lg">PROTO</button>
      ) : (
        <div className="fixed bottom-2 left-2 z-[100] flex items-center gap-1 rounded-full bg-fuchsia-700 px-1.5 py-1 text-xs text-white shadow-xl ring-2 ring-white">
          <button onClick={() => go(-1)} className="h-7 w-7 rounded-full hover:bg-white/20">←</button>
          <span className="min-w-36 text-center font-semibold">{cur.key} · {cur.name}</span>
          <button onClick={() => go(1)} className="h-7 w-7 rounded-full hover:bg-white/20">→</button>
          <select value={frame} onChange={(e) => setFrame(e.target.value as Frame)} className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
            <option value="auto">Real size</option><option value="phone">Phone frame</option><option value="tablet">Tablet frame</option>
          </select>
          <button onClick={() => setHidden(true)} className="h-7 w-7 rounded-full hover:bg-white/20" title="Hide">×</button>
        </div>
      )}
    </div>
  )
}
