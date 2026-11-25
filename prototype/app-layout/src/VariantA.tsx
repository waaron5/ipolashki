// PROTOTYPE (throwaway) — Variant A: "Docked panels".
// Desktop: top bar + options bar, vertical toolbar on the left, tabbed dock on the right.
// Designs is its own home page. Phone: tools along the bottom, every panel is a bottom sheet.
import { useState } from 'react'
import {
  CanvasView, Icon, LayersList, LibraryPanel, Menu, ModPuck, PalettePanel, Properties, SnapMenu, Thumb, ToolIcon, ToolOptions,
  TOOLS, TOOL_LABEL, ValueMenu, toolColor, useDesigns, useEditor, useWidth, type Ed,
} from './editor'

export default function VariantA() {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [page, setPage] = useState<'designs' | 'editor'>('editor')
  const ed = useEditor()
  const compact = w < 700
  return (
    <div ref={ref} className="relative h-full w-full bg-stone-100">
      {page === 'designs' ? <DesignsPage compact={compact} open={() => setPage('editor')} /> : compact ? <Phone ed={ed} home={() => setPage('designs')} /> : <Desktop ed={ed} home={() => setPage('designs')} />}
    </div>
  )
}

function Desktop({ ed, home }: { ed: Ed; home: () => void }) {
  const [tab, setTab] = useState<'design' | 'layers' | 'library'>('design')
  const [pop, setPop] = useState<null | 'menu' | 'snap' | 'value'>(null)
  const tbtn = 'grid h-8 w-8 place-items-center rounded-md hover:bg-stone-200'
  return (
    <div className="flex h-full flex-col">
      <header className="relative flex h-11 shrink-0 items-center gap-1 border-b border-stone-300 bg-white px-2">
        <button className={tbtn} onClick={home} title="All designs"><Icon name="designs" /></button>
        <input defaultValue="Palm Springs" className="w-40 rounded px-2 py-1 text-sm font-medium hover:bg-stone-100" />
        <span className="flex items-center gap-1 text-xs text-stone-400"><Icon name="cloud" size={14} /> Saved on this device</span>
        <div className="flex-1" />
        <button className={tbtn} title="Undo"><Icon name="undo" /></button>
        <button className={tbtn} title="Redo"><Icon name="redo" /></button>
        <div className="mx-1 h-6 w-px bg-stone-200" />
        <button className={`${tbtn} ${ed.valueBands ? 'bg-stone-900 text-white hover:bg-stone-800' : ''}`} onClick={() => setPop(pop === 'value' ? null : 'value')} title="Value preview"><Icon name="value" /></button>
        <button className={`${tbtn} ${ed.grid ? 'bg-stone-900 text-white hover:bg-stone-800' : ''}`} onClick={() => setPop(pop === 'snap' ? null : 'snap')} title="Grid & snapping"><Icon name="grid" /></button>
        <button className={tbtn} title="Zoom to fit (Shift+1)"><Icon name="zoomfit" /></button>
        <button className="ml-1 flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white" onClick={() => ed.toast_('Reference PDF layout is still fog on the map')}><Icon name="print" size={16} /> Reference</button>
        <button className={tbtn} onClick={() => setPop(pop === 'menu' ? null : 'menu')}><Icon name="menu" /></button>
        {pop && (
          <div className="absolute right-2 top-11 z-40 rounded-lg bg-white p-2 shadow-xl ring-1 ring-black/10">
            {pop === 'menu' && <Menu ed={ed} onClose={() => setPop(null)} />}
            {pop === 'snap' && <SnapMenu ed={ed} />}
            {pop === 'value' && <div className="space-y-1 text-xs"><div className="font-semibold">Value preview (view only)</div><ValueMenu ed={ed} /></div>}
          </div>
        )}
      </header>
      <div className="flex h-10 shrink-0 items-center gap-3 overflow-x-auto border-b border-stone-200 bg-stone-50 px-3">
        <span className="text-xs font-semibold text-stone-700">{TOOL_LABEL[ed.tool].split(' ')[0]}</span>
        <ToolOptions ed={ed} />
      </div>
      <div className="flex min-h-0 flex-1">
        <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-stone-300 bg-white py-2">
          {TOOLS.map((t) => (
            <button key={t} title={TOOL_LABEL[t]} onClick={() => ed.setTool(t)} className={`grid h-10 w-10 place-items-center rounded-lg ${ed.tool === t ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'}`}>
              <ToolIcon tool={t} color={toolColor(ed, t)} />
            </button>
          ))}
          <div className="my-1 h-px w-8 bg-stone-200" />
          <button title={`Current color: ${ed.color.name}`} onClick={() => setTab('design')} className="h-8 w-8 rounded-full ring-2 ring-white" style={{ background: ed.color.hex, boxShadow: '0 0 0 1px rgba(0,0,0,.2)' }} />
        </nav>
        <main className="min-w-0 flex-1"><CanvasView ed={ed} /></main>
        <aside className="flex w-72 shrink-0 flex-col border-l border-stone-300 bg-white">
          <div className="flex border-b border-stone-200 text-xs">
            {(['design', 'layers', 'library'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 capitalize ${tab === t ? 'border-b-2 border-stone-900 font-semibold' : 'text-stone-500'}`}>{t === 'design' ? (ed.sel.length ? 'Selection' : 'Design') : t}</button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {tab === 'design' && <div className="space-y-4"><Properties ed={ed} /><div className="border-t border-stone-200 pt-3"><div className="mb-2 text-xs font-semibold">Palette</div><PalettePanel ed={ed} /></div></div>}
            {tab === 'layers' && <div className="-mx-3"><LayersList ed={ed} /></div>}
            {tab === 'library' && <LibraryPanel ed={ed} />}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Phone({ ed, home }: { ed: Ed; home: () => void }) {
  const [sheet, setSheet] = useState<null | 'color' | 'layers' | 'library' | 'props' | 'menu'>(null)
  const b = 'grid h-11 w-11 place-items-center rounded-xl'
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-stone-300 bg-white px-1">
        <button className={b} onClick={home}><Icon name="back" /></button>
        <span className="flex-1 truncate text-sm font-medium">Palm Springs</span>
        <button className={b}><Icon name="undo" /></button>
        <button className={b}><Icon name="redo" /></button>
        <button className={b} onClick={() => setSheet('menu')}><Icon name="more" /></button>
      </header>
      <main className="relative min-h-0 flex-1">
        <CanvasView ed={ed} compact />
        <div className="absolute left-2 top-1/2 -translate-y-1/2"><ModPuck ed={ed} vertical /></div>
      </main>
      <div className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-t border-stone-200 bg-stone-50 px-2"><ToolOptions ed={ed} big /></div>
      <div className="flex shrink-0 items-center justify-between border-t border-stone-200 bg-white px-1 py-1">
        <button onClick={() => setSheet('color')} className="h-9 w-9 rounded-full ring-2 ring-white" style={{ background: ed.color.hex, boxShadow: '0 0 0 1px rgba(0,0,0,.25)' }} />
        <button className={b} onClick={() => setSheet('props')}><Icon name="sliders" /></button>
        <button className={b} onClick={() => setSheet('layers')}><Icon name="layers" /></button>
        <button className={b} onClick={() => setSheet('library')}><Icon name="library" /></button>
        <button className={`${b} ${ed.valueBands ? 'bg-stone-900 text-white' : ''}`} onClick={() => ed.setValueBands(ed.valueBands ? 0 : 3)}><Icon name="value" /></button>
        <button className={`${b} ${ed.grid ? 'bg-stone-900 text-white' : ''}`} onClick={() => ed.setGrid(!ed.grid)}><Icon name="grid" /></button>
      </div>
      <nav className="flex shrink-0 justify-around border-t border-stone-300 bg-white pb-[env(safe-area-inset-bottom)]">
        {TOOLS.map((t) => (
          <button key={t} onClick={() => ed.setTool(t)} className={`grid h-12 w-12 place-items-center rounded-xl ${ed.tool === t ? 'bg-stone-900 text-white' : 'text-stone-700'}`}><ToolIcon tool={t} color={toolColor(ed, t)} /></button>
        ))}
      </nav>
      {sheet && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/30" onClick={() => setSheet(null)}>
          <div className="max-h-[60%] overflow-auto rounded-t-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300" />
            {sheet === 'color' && <PalettePanel ed={ed} big />}
            {sheet === 'props' && <Properties ed={ed} />}
            {sheet === 'layers' && <div className="-mx-4"><LayersList ed={ed} big /></div>}
            {sheet === 'library' && <LibraryPanel ed={ed} cols={4} big />}
            {sheet === 'menu' && <div className="space-y-3"><Menu ed={ed} onClose={() => setSheet(null)} /><SnapMenu ed={ed} /></div>}
          </div>
        </div>
      )}
    </div>
  )
}

function DesignsPage({ compact, open }: { compact: boolean; open: () => void }) {
  const ds = useDesigns()
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-stone-300 bg-white px-4">
        <span className="text-lg font-semibold tracking-tight">ipolashki</span>
        <div className="flex-1" />
        {!compact && <span className="text-xs text-stone-400">Not signed in · designs live on this device</span>}
        <button className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">Sign in</button>
      </header>
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-stone-300 bg-white px-2"><Icon name="search" size={16} /><input value={ds.q} onChange={(e) => ds.setQ(e.target.value)} placeholder="Search designs" className="min-w-0 flex-1 py-1.5 text-sm outline-none" /></div>
        <select className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"><option>Last edited</option><option>Name</option></select>
        <button onClick={() => ds.setTrash(!ds.trash)} className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${ds.trash ? 'bg-stone-900 text-white' : 'border border-stone-300'}`}><Icon name="trash" size={16} />Trash</button>
      </div>
      <div className="grid flex-1 auto-rows-min gap-4 overflow-auto px-4 pb-20" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 140 : 180}px, 1fr))` }}>
        {!ds.trash && (
          <button onClick={open} className="grid aspect-[4/5] place-items-center rounded-lg border-2 border-dashed border-stone-300 text-stone-500"><span className="text-center"><Icon name="plus" size={28} /><br />New design</span></button>
        )}
        {ds.shown.map((d) => (
          <div key={d.id} className="group">
            <button onClick={open} className="block w-full overflow-hidden rounded-lg shadow-sm ring-1 ring-black/10"><Thumb colors={d.thumb} className="aspect-[4/5] w-full" /></button>
            <div className="mt-1.5 flex items-start justify-between text-sm">
              <div><div className="font-medium">{d.name}</div><div className="text-xs text-stone-400">{d.edited} · {d.size}</div></div>
              <div className="flex gap-1 opacity-60">
                {!ds.trash && <button onClick={() => ds.duplicate(d.id)} className="text-xs">Dup</button>}
                <button onClick={() => ds.toggleTrash(d.id)} className="text-xs">{ds.trash ? 'Restore' : <Icon name="trash" size={14} />}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
