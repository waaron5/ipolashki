// PROTOTYPE (throwaway) — Variant B: "Canvas first, floating".
// The Canvas fills the window; everything floats over it and appears only when relevant.
// Palette is a strip along the bottom, the inspector appears only with a selection,
// Library is a popover off the toolbar, Designs is a drawer that slides over the Canvas.
import { useState, type ReactNode } from 'react'
import {
  CanvasView, Icon, LayersList, LibraryPanel, Menu, ModPuck, PalettePanel, Properties, SnapMenu, Swatch, Thumb, ToolIcon, ToolOptions,
  TOOLS, TOOL_LABEL, ValueMenu, toolColor, useDesigns, useEditor, useWidth, type Ed,
} from './editor'

const Pill = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`flex items-center gap-0.5 rounded-xl bg-white/95 p-1 shadow-lg ring-1 ring-black/10 backdrop-blur ${className}`}>{children}</div>
)

export default function VariantB() {
  const [ref, w] = useWidth<HTMLDivElement>()
  const ed = useEditor()
  const compact = w < 700
  const [drawer, setDrawer] = useState(false)
  const [layersPick, setLayers] = useState<boolean | null>(null)
  const layers = layersPick ?? !compact
  const [pop, setPop] = useState<null | 'library' | 'palette' | 'menu' | 'snap' | 'value' | 'props'>(null)
  const b = compact ? 'grid h-11 w-11 place-items-center rounded-lg' : 'grid h-9 w-9 place-items-center rounded-lg hover:bg-stone-100'
  const toggle = (p: typeof pop) => setPop(pop === p ? null : p)
  const hasOptions = ed.tool !== 'select' || ed.sel.length > 0

  const toolbar = (
    <Pill>
      {TOOLS.map((t) => (
        <button key={t} title={TOOL_LABEL[t]} onClick={() => ed.setTool(t)} className={`${b} ${ed.tool === t ? '!bg-stone-900 text-white' : 'text-stone-700'}`}><ToolIcon tool={t} color={toolColor(ed, t)} /></button>
      ))}
      {!compact && <div className="mx-0.5 h-6 w-px bg-stone-200" />}
      <button className={b} title="Library" onClick={() => toggle('library')}><Icon name="plus" /></button>
    </Pill>
  )
  const paletteStrip = (
    <Pill className="max-w-full">
      <button onClick={() => toggle('palette')} className="flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-xs hover:bg-stone-100">
        <span className="h-7 w-7 rounded-full ring-2 ring-white" style={{ background: ed.color.hex, boxShadow: '0 0 0 1px rgba(0,0,0,.25)' }} />
        {!compact && <span className="max-w-28 truncate">{ed.palette.name}</span>}<Icon name="chevron" size={12} />
      </button>
      <div className="flex gap-1 overflow-x-auto px-1">
        {ed.palette.colors.map((c, i) => <Swatch key={i} c={c} size={compact ? 30 : 22} active={c.hex === ed.color.hex} onClick={() => ed.setColor(c)} />)}
      </div>
      <button className={b} title="Eyedropper"><Icon name="dropper" size={18} /></button>
    </Pill>
  )

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <CanvasView ed={ed} compact={compact} />

      {/* top-left: designs + name */}
      <Pill className="absolute left-2 top-2">
        <button className={b} onClick={() => setDrawer(true)} title="Designs"><Icon name="menu" /></button>
        <span className="px-1.5 text-sm font-medium">Palm Springs</span>
        {!compact && <><button className={b}><Icon name="undo" /></button><button className={b}><Icon name="redo" /></button></>}
      </Pill>

      {/* top-right: view + output */}
      <Pill className="absolute right-2 top-2">
        {compact ? (
          <><button className={b}><Icon name="undo" /></button><button className={b} onClick={() => setLayers(!layers)}><Icon name="layers" /></button><button className={b} onClick={() => toggle('menu')}><Icon name="more" /></button></>
        ) : (
          <>
            <button className={`${b} ${ed.valueBands ? '!bg-stone-900 text-white' : ''}`} onClick={() => toggle('value')}><Icon name="value" /></button>
            <button className={`${b} ${ed.grid ? '!bg-stone-900 text-white' : ''}`} onClick={() => toggle('snap')}><Icon name="grid" /></button>
            <button className={`${b} ${layers ? '!bg-stone-200' : ''}`} onClick={() => setLayers(!layers)}><Icon name="layers" /></button>
            <button className="mx-1 rounded-lg bg-stone-900 px-3 py-1.5 text-sm text-white" onClick={() => ed.toast_('Reference PDF layout is still fog on the map')}>Reference</button>
            <button className={b} onClick={() => toggle('menu')}><Icon name="more" /></button>
          </>
        )}
      </Pill>

      {/* toolbar: top-centre on desktop, bottom on phone */}
      {!compact && <div className="absolute left-1/2 top-2 -translate-x-1/2">{toolbar}</div>}
      {!compact && hasOptions && <div className="absolute left-1/2 top-16 -translate-x-1/2"><Pill className="px-3 py-1.5">{<ToolOptions ed={ed} />}</Pill></div>}

      {!compact && <div className="absolute bottom-3 left-1/2 max-w-[70%] -translate-x-1/2">{paletteStrip}</div>}

      {compact && (
        <div className="absolute inset-x-2 bottom-2 flex flex-col items-center gap-2 pb-[env(safe-area-inset-bottom)]">
          {hasOptions && <Pill className="max-w-full overflow-x-auto px-2 py-1"><ToolOptions ed={ed} big />{ed.sel.length > 0 && <button className="ml-2 rounded-md border border-stone-300 px-2.5 py-2 text-sm" onClick={() => toggle('props')}>Style</button>}</Pill>}
          {paletteStrip}
          {toolbar}
        </div>
      )}
      {compact && <div className="absolute right-2 top-1/3"><ModPuck ed={ed} vertical /></div>}

      {/* contextual inspector (desktop) */}
      {!compact && ed.sel.length > 0 && (
        <div className={`absolute top-28 w-64 rounded-xl bg-white/95 p-3 shadow-xl ring-1 ring-black/10 ${layers ? 'right-[19rem]' : 'right-3'}`}>
          <Properties ed={ed} />
        </div>
      )}

      {/* layers card */}
      {layers && (
        <div className={compact ? 'absolute inset-y-0 right-0 z-30 w-72 overflow-auto bg-white shadow-2xl' : 'absolute right-3 top-16 max-h-[60%] w-72 overflow-auto rounded-xl bg-white/95 py-2 shadow-xl ring-1 ring-black/10'}>
          <div className="flex items-center justify-between px-3 pb-1 text-xs font-semibold">Layers{compact && <button className="p-2" onClick={() => setLayers(false)}><Icon name="close" /></button>}</div>
          <LayersList ed={ed} big={compact} />
        </div>
      )}

      {/* popovers */}
      {pop && (
        <div className="absolute inset-0 z-40" onClick={() => setPop(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className={compact ? 'absolute inset-x-0 bottom-0 max-h-[65%] overflow-auto rounded-t-2xl bg-white p-4 shadow-2xl' : `absolute rounded-xl bg-white p-3 shadow-2xl ring-1 ring-black/10 ${pop === 'library' ? 'left-1/2 top-16 w-[30rem] -translate-x-1/2 max-h-[75%] overflow-auto' : pop === 'palette' ? 'bottom-20 left-1/2 w-80 -translate-x-1/2' : 'right-2 top-16'}`}>
            {pop === 'library' && <LibraryPanel ed={ed} cols={compact ? 4 : 6} big={compact} />}
            {pop === 'palette' && <PalettePanel ed={ed} big={compact} />}
            {pop === 'menu' && <div className="space-y-3"><Menu ed={ed} onClose={() => setPop(null)} />{compact && <><SnapMenu ed={ed} /><ValueMenu ed={ed} /></>}</div>}
            {pop === 'snap' && <SnapMenu ed={ed} />}
            {pop === 'value' && <div className="space-y-1 text-xs"><div className="font-semibold">Value preview</div><ValueMenu ed={ed} /></div>}
            {pop === 'props' && <Properties ed={ed} />}
          </div>
        </div>
      )}

      {drawer && <DesignsDrawer compact={compact} close={() => setDrawer(false)} />}
    </div>
  )
}

function DesignsDrawer({ compact, close }: { compact: boolean; close: () => void }) {
  const ds = useDesigns()
  return (
    <div className="absolute inset-0 z-50 bg-black/30" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className={`absolute inset-y-0 left-0 flex flex-col bg-white shadow-2xl ${compact ? 'w-[88%]' : 'w-80'}`}>
        <div className="flex items-center justify-between p-3">
          <span className="font-semibold">Designs</span>
          <div className="flex gap-1"><button className="rounded-md bg-stone-900 px-2.5 py-1 text-sm text-white">+ New</button><button className="p-1" onClick={close}><Icon name="close" /></button></div>
        </div>
        <div className="mx-3 flex items-center gap-2 rounded-md bg-stone-100 px-2"><Icon name="search" size={16} /><input value={ds.q} onChange={(e) => ds.setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none" /></div>
        <div className="flex-1 overflow-auto p-2">
          {ds.shown.map((d) => (
            <div key={d.id} className="group flex items-center gap-3 rounded-lg p-2 hover:bg-stone-100" onClick={close}>
              <Thumb colors={d.thumb} className="h-14 w-11 shrink-0 rounded ring-1 ring-black/10" />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{d.name}</div><div className="text-xs text-stone-400">{d.edited} · {d.size}</div></div>
              <button onClick={(e) => { e.stopPropagation(); ds.toggleTrash(d.id) }} className="p-1 opacity-50">{ds.trash ? '↺' : <Icon name="trash" size={16} />}</button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-stone-200 p-3 text-sm">
          <button onClick={() => ds.setTrash(!ds.trash)} className="flex items-center gap-1 text-stone-600"><Icon name="trash" size={16} />{ds.trash ? 'Back to designs' : 'Trash'}</button>
          <button className="text-sky-700">Sign in to sync</button>
        </div>
      </div>
    </div>
  )
}
