// PROTOTYPE (throwaway) — Variant C: "Painter's workbench".
// Desktop: labelled tools + inline options in one top row; Designs and Layers share a left column;
// a right "paint" column puts the Current color and a named Palette first, the selection below;
// the Library is a tray that slides up from under the Canvas.
// Phone: split screen — Canvas on top, a working panel below switched by a bottom tab bar.
import { useState } from 'react'
import {
  CanvasView, Icon, LayersList, LibraryPanel, Menu, ModPuck, PalettePanel, Properties, SnapMenu, Thumb, ToolIcon, ToolOptions,
  TOOLS, TOOL_LABEL, ValueMenu, toolColor, useDesigns, useEditor, useWidth, type Ed,
} from './editor'

export default function VariantC() {
  const [ref, w] = useWidth<HTMLDivElement>()
  const ed = useEditor()
  return <div ref={ref} className="relative h-full w-full bg-[#f4f1ea]">{w < 700 ? <Phone ed={ed} /> : <Desktop ed={ed} />}</div>
}

const label = (t: string) => TOOL_LABEL[t as keyof typeof TOOL_LABEL].split(' ')[0]

function Desktop({ ed }: { ed: Ed }) {
  const [tray, setTray] = useState(false)
  const [menu, setMenu] = useState(false)
  const [snap, setSnap] = useState(false)
  return (
    <div className="flex h-full flex-col">
      <header className="relative flex h-10 shrink-0 items-center gap-2 bg-stone-900 px-3 text-stone-100">
        <span className="text-sm font-semibold tracking-tight">ipolashki</span>
        <span className="text-stone-500">/</span>
        <input defaultValue="Palm Springs" className="w-40 rounded bg-transparent px-1 text-sm hover:bg-white/10" />
        <span className="text-xs text-stone-500">Saved on this device</span>
        <div className="flex-1" />
        <button className="p-1.5"><Icon name="undo" size={18} /></button>
        <button className="p-1.5"><Icon name="redo" size={18} /></button>
        <button className="ml-2 rounded bg-[#E0482F] px-3 py-1 text-sm font-medium text-white" onClick={() => ed.toast_('Reference PDF layout is still fog on the map')}>Print Reference</button>
        <button className="p-1.5" onClick={() => setMenu(!menu)}><Icon name="menu" size={18} /></button>
        {menu && <div className="absolute right-2 top-10 z-40 text-stone-900"><Menu ed={ed} onClose={() => setMenu(false)} /></div>}
      </header>
      <div className="relative flex h-14 shrink-0 items-center gap-3 border-b border-stone-300 bg-white px-2">
        <div className="flex gap-0.5">
          {TOOLS.map((t) => (
            <button key={t} title={TOOL_LABEL[t]} onClick={() => ed.setTool(t)} className={`flex w-14 flex-col items-center rounded-md py-1 text-[10px] ${ed.tool === t ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
              <ToolIcon tool={t} color={toolColor(ed, t)} size={20} />{label(t)}
            </button>
          ))}
        </div>
        <div className="h-8 w-px bg-stone-200" />
        <div className="min-w-0 flex-1 overflow-x-auto"><ToolOptions ed={ed} /></div>
        <button onClick={() => setSnap(!snap)} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${ed.grid ? 'bg-stone-900 text-white' : 'border border-stone-300'}`}><Icon name="magnet" size={16} />Grid & snap</button>
        {snap && <div className="absolute right-2 top-14 z-40 rounded-lg bg-white p-2 shadow-xl ring-1 ring-black/10"><SnapMenu ed={ed} /></div>}
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-stone-300 bg-white">
          <DesignsList />
          <div className="flex items-center justify-between border-y border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold">Layers<button className="font-normal text-stone-500">Group</button></div>
          <div className="min-h-0 flex-1 overflow-auto"><LayersList ed={ed} /></div>
        </aside>
        <main className="relative min-w-0 flex-1">
          <CanvasView ed={ed} />
          <div className={`absolute inset-x-4 bottom-0 rounded-t-xl bg-white shadow-[0_-6px_24px_rgba(0,0,0,.12)] ring-1 ring-black/10 transition-transform ${tray ? 'translate-y-0' : 'translate-y-[calc(100%-2.25rem)]'}`}>
            <button onClick={() => setTray(!tray)} className="flex h-9 w-full items-center justify-center gap-2 text-xs font-semibold">
              <Icon name="library" size={16} /> Library — Shapes & Your Pieces <span className={tray ? 'rotate-180' : ''}>▴</span>
            </button>
            <div className="max-h-64 overflow-auto px-4 pb-4"><LibraryPanel ed={ed} cols={12} /></div>
          </div>
        </main>
        <aside className="flex w-64 shrink-0 flex-col overflow-auto border-l border-stone-300 bg-white">
          <div className="flex items-center gap-3 border-b border-stone-200 p-3">
            <span className="h-12 w-12 rounded-lg" style={{ background: ed.color.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }} />
            <div className="text-xs"><div className="text-stone-400">Current color</div><div className="text-sm font-semibold">{ed.color.name ?? ed.color.hex}</div><div className="text-stone-400">{ed.color.hex}</div></div>
          </div>
          <div className="border-b border-stone-200 p-3"><PalettePanel ed={ed} layout="list" /></div>
          <div className="border-b border-stone-200 p-3 text-xs"><div className="mb-1.5 font-semibold">Value preview</div><ValueMenu ed={ed} /></div>
          <div className="p-3"><Properties ed={ed} /></div>
        </aside>
      </div>
    </div>
  )
}

function DesignsList({ big }: { big?: boolean }) {
  const ds = useDesigns()
  const [open, setOpen] = useState(!big)
  return (
    <div className={big ? '' : 'max-h-[40%] overflow-auto'}>
      {!big && <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between bg-stone-50 px-3 py-1.5 text-xs font-semibold">Designs <span className="font-normal text-stone-500">{open ? '▾' : '▸'}</span></button>}
      {open && (
        <div className="p-1">
          <div className="flex items-center gap-1 px-1 pb-1">
            <input value={ds.q} onChange={(e) => ds.setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 rounded bg-stone-100 px-2 py-1 text-xs outline-none" />
            <button className="rounded bg-stone-900 px-2 py-1 text-xs text-white">+</button>
          </div>
          {ds.shown.map((d, i) => (
            <div key={d.id} className={`group flex items-center gap-2 rounded px-2 ${big ? 'min-h-14' : 'py-1'} text-xs ${i === 0 && !ds.trash ? 'bg-sky-100' : 'hover:bg-stone-100'}`}>
              <Thumb colors={d.thumb} className={`${big ? 'h-12 w-10' : 'h-6 w-5'} shrink-0 rounded-sm ring-1 ring-black/10`} />
              <span className="flex-1 truncate">{d.name}</span><span className="text-stone-400">{d.edited}</span>
              <button onClick={() => ds.toggleTrash(d.id)} className={`${big ? 'p-2' : 'opacity-0 group-hover:opacity-60'}`}>{ds.trash ? '↺' : <Icon name="trash" size={12} />}</button>
            </div>
          ))}
          <button onClick={() => ds.setTrash(!ds.trash)} className="px-2 py-1 text-xs text-stone-500">{ds.trash ? '← Designs' : 'Trash'}</button>
        </div>
      )}
    </div>
  )
}

function Phone({ ed }: { ed: Ed }) {
  const [tab, setTab] = useState<'draw' | 'color' | 'layers' | 'library' | 'designs'>('draw')
  const [full, setFull] = useState(false)
  const [menu, setMenu] = useState(false)
  const tabs = [['draw', 'pen', 'Draw'], ['color', 'palette', 'Color'], ['layers', 'layers', 'Layers'], ['library', 'library', 'Library'], ['designs', 'designs', 'Designs']] as const
  return (
    <div className="flex h-full flex-col">
      <header className="relative flex h-11 shrink-0 items-center gap-1 bg-stone-900 px-2 text-stone-100">
        <span className="flex-1 truncate text-sm font-medium">Palm Springs</span>
        <button className="p-2.5"><Icon name="undo" size={18} /></button>
        <button className="p-2.5"><Icon name="redo" size={18} /></button>
        <button className="p-2.5" onClick={() => setMenu(!menu)}><Icon name="more" size={18} /></button>
        {menu && <div className="absolute right-1 top-11 z-40 text-stone-900"><Menu ed={ed} onClose={() => setMenu(false)} /></div>}
      </header>
      <main className={`relative min-h-0 ${full ? 'flex-1' : 'basis-[52%]'}`}>
        <CanvasView ed={ed} compact />
        <div className="absolute right-2 top-2"><ModPuck ed={ed} /></div>
        <button onClick={() => setFull(!full)} className="absolute bottom-2 left-2 rounded-full bg-white/90 px-3 py-2 text-xs shadow ring-1 ring-black/10">{full ? '▴ Show panel' : '▾ Bigger canvas'}</button>
        {/* current color always visible on the canvas edge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-white/90 py-1 pl-1 pr-3 text-xs shadow ring-1 ring-black/10">
          <span className="h-7 w-7 rounded-full" style={{ background: ed.color.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.2)' }} />{ed.color.name}
        </div>
      </main>
      {!full && (
        <section className="min-h-0 flex-1 overflow-auto border-t border-stone-300 bg-white p-3">
          {tab === 'draw' && (
            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-1">
                {TOOLS.map((t) => (
                  <button key={t} onClick={() => ed.setTool(t)} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] ${ed.tool === t ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>
                    <ToolIcon tool={t} color={toolColor(ed, t)} />{label(t)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2"><ToolOptions ed={ed} big /></div>
              {ed.sel.length > 0 && <div className="border-t border-stone-200 pt-2"><Properties ed={ed} /></div>}
              {!ed.sel.length && <div className="flex flex-wrap gap-3 border-t border-stone-200 pt-2"><ValueMenu ed={ed} /><SnapMenu ed={ed} /></div>}
            </div>
          )}
          {tab === 'color' && <PalettePanel ed={ed} layout="list" big />}
          {tab === 'layers' && <div className="-mx-3"><LayersList ed={ed} big /></div>}
          {tab === 'library' && <LibraryPanel ed={ed} cols={5} big />}
          {tab === 'designs' && <div className="-mx-3"><DesignsList big /></div>}
        </section>
      )}
      <nav className="flex shrink-0 border-t border-stone-300 bg-white pb-[env(safe-area-inset-bottom)]">
        {tabs.map(([k, icon, l]) => (
          <button key={k} onClick={() => { setTab(k); setFull(false) }} className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${tab === k && !full ? 'text-stone-900' : 'text-stone-400'}`}>
            {k === 'draw' ? <ToolIcon tool={ed.tool} color={toolColor(ed, ed.tool)} /> : <Icon name={icon} />}{l}
          </button>
        ))}
      </nav>
    </div>
  )
}
