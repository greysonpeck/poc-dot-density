# Icon assets

Each subfolder here is one selectable icon *style* in the app's dropdown, registered as
`ICON_STYLES` in `src/iconSets.ts`. Every folder ships the same 20-color palette named
`pin_<color>_<hex>.png`. Style (which folder/halo variant) and color are independent: the
dropdown picks the style applied to every route, while each simulated route gets its own color
assigned in order from the shared `PIN_COLORS` palette (see `colorForRouteIndex` in
`iconSets.ts`) — so route 1 is always the first palette color, route 2 the second, etc.,
regardless of which style is selected.

- `pins-set` — current production style (white halo + center dot). This is the one that washes
  out at high density.
- `pins-halo-nodot` — candidate fix: halo kept, center dot removed.
- `pins-no-halo` — candidate fix: halo removed, center dot kept.
- `pins-nohalo-nodot` — candidate fix: halo and dot both removed (plain solid pin).

## Adding a new icon style

1. Drop a new subfolder of PNGs here, one per palette color, named `pin_<color>.png` where
   `<color>` matches an entry in `PIN_COLORS` (e.g. `pin_blue_3385F3.png`) — `iconSrc()` builds
   the path as `/icons/<folder>/pin_<color>.png`.
2. Add an entry to the `ICON_STYLES` array in `src/iconSets.ts` with the folder name, the real
   pixel width/height, and an `anchor`:
   - `{ x: 0.5, y: 1 }` for a pin/teardrop shape (tip at bottom marks the coordinate).
   - `{ x: 0.5, y: 0.5 }` for a symmetric dot/halo shape (center marks the coordinate).
3. Reload — the new option appears in the icon dropdown immediately.

## Adding a new color

Add an entry to `PIN_COLORS` in `src/iconSets.ts` in the order you want it assigned (routes use
colors in that order, one each), and add a matching `pin_<color>.png` to every style folder above
so the color renders correctly regardless of which style is selected.
