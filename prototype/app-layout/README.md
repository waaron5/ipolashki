# PROTOTYPE — app layout on desktop & phone (throwaway)

Answers **Prototype the app layout on desktop & phone** (waaron5/ipolashki#5): how the toolbar, Layers,
properties/color, Library and Design browser are laid out on desktop, and how they collapse on a phone.
Also runs the ADR 0001 check: can plain SVG from React stay smooth with a dense (~300 path) Design on a mid-range phone?

Run: `pnpm --dir prototype/app-layout dev` (serves on your LAN too, so a phone on the same Wi-Fi can open it).

- `?variant=A` Docked panels · `B` Canvas first, floating · `C` Painter's workbench · `perf` SVG performance test
- `?frame=phone|tablet` previews a phone/tablet size on a desktop. Alt+←/→ cycles variants. On a narrow screen the switcher hides behind the PROTO tab.

Never merged. Mock data only; nothing persists.
