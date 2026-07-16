# dot-density

Interactive demo of a rendering problem in RCC: dense clusters of GPS truck-ping pins visually
read as a route, but RCC's current pin icon has a white halo that overlaps at high density and
washes out the path color. This app reproduces that with synthetic truck routes driven along real
roads and lets you compare candidate icon fixes live, at real Google Maps zoom levels.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and set VITE_GOOGLE_MAPS_API_KEY to a key with "Maps JavaScript API" and
# "Directions API" both enabled
npm run dev
```

`VITE_GOOGLE_MAPS_MAP_ID` defaults to Google's public `DEMO_MAP_ID`, which works for local dev
with no extra Cloud Console setup (Advanced Markers require a Map ID). See `.env.example`.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds the app and deploys `dist/` on every push to `main`. This
repo is a *project* page (`greysonpeck.github.io/poc-dot-density/`, not a user page at domain
root), so `vite.config.ts` sets `base: '/poc-dot-density/'` for the production build only — local
`npm run dev` still runs at `/`. If the repo is ever renamed, update `base` to match.

One-time setup in the GitHub repo settings:

1. **Settings → Pages → Source**: set to **GitHub Actions** (not "Deploy from a branch" — that
   serves the raw, un-built source, which is the 404 you just hit: browsers can't execute `.tsx`
   directly, only Vite's dev server transpiles it on the fly).
2. **Settings → Secrets and variables → Actions → New repository secret**: add
   `VITE_GOOGLE_MAPS_API_KEY` with a real key (used to build the deployed bundle). Add
   `VITE_GOOGLE_MAPS_MAP_ID` too if not using the default `DEMO_MAP_ID`.
3. **Restrict the API key's HTTP referrers** (Google Cloud Console → Credentials) to
   `https://greysonpeck.github.io/*`. Vite bakes `VITE_*` env vars into the public bundle at build
   time — that's normal for any client-side Maps JS app, but it means the key is visible to anyone
   who opens dev tools, so the referrer restriction is what actually keeps it from being usable
   elsewhere.

## Using it

1. Pan/zoom the map to wherever you want the demo routes.
2. Set **Routes** to how many simulated trucks to generate at once (default 3) — each gets its own
   zone and its own color from the palette, sequential (route 1 = first palette color, route 2 =
   second, etc.).
3. Adjust **Spacing** (distance between pings) and **Jitter** (GPS noise) and click **Generate
   routes**.
4. Switch the **Icon set** dropdown to compare halo/dot variants against the current production
   style (**Current (halo + dot)**, the default) — this updates every pin on the map immediately,
   no need to regenerate. **Dot** is a plain colored circle (not one of RCC's actual pin assets),
   included as a simple baseline for comparison.
5. Zoom in/out to see the halo-washout effect appear and disappear.
6. Adjust **Path below zoom**: at/above that zoom level each route renders as individual pins;
   below it, as a single colored line — the fix for the washout. The zoom/mode readout at the top
   of the panel shows which one is currently active. This applies live, no regenerate needed.
7. Toggle **Dim basemap (scrim)** to mute the map tiles so pins/lines pop against them — useful
   over a busy, detailed area where basemap contrast competes with the data layer.
8. Check the **Stops remaining** panel (top-right) for an at-a-glance read on which routes are
   nearly done vs. which have a long way to go, without needing to visually parse pin/line dimming
   across the whole map.

See `public/icons/README.md` for how to add new icon sets.

## Notes

- Each route is generated as a serpentine "coverage sweep": a lattice of stops laid out in
  parallel passes, alternating direction each pass (like mowing a lawn), confined to a compact
  area — see `generateWaypoints` in `src/lib/generateRoute.ts`. This mimics how a real garbage
  truck route looks (lots of local turns through a residential grid), not a long point-to-point
  haul across town, which is what a plain Directions route between two distant points looked like.
- The lattice is routed turn-by-turn along real roads via the Directions API (`travelMode:
  DRIVING`, see `src/lib/directionsApi.ts`), then resampled at even arc-length spacing with
  optional jitter to control density.
- Real streets don't always have a direct connector exactly where the lattice expects one, so a
  routed path commonly strays several hundred meters outside the intended box turning around
  between passes — and near a sparse or disconnected street grid (edge of town, industrial areas,
  highway interchanges) it can occasionally detour for kilometers. `generateRoute` treats a routed
  path straying more than `MAX_ROUTE_STRAY_MULTIPLIER` past the lattice's half-diagonal as "not
  great" and retries — up to `MAX_GENERATE_ATTEMPTS` times, each with the anchor nudged to a nearby
  spot within `RETRY_OFFSET_MAX_M` and a freshly randomized sweep orientation, since a failure is
  usually local to that specific spot rather than the whole zone. If every attempt comes back loose,
  it uses the *least-strayed* real routed path seen (as long as it clears the more permissive
  `MAX_ROUTE_STRAY_HARD_CAP_MULTIPLIER`) rather than throwing away real road geometry for a
  synthetic curve — a loose-but-real route beats a smooth curve that isn't on any street at all.
  Only if every attempt returned nothing usable at all (Directions found no route, or even the best
  attempt blew past the hard cap) does it drop to a synthetic path through the last attempted
  lattice. Each rejected/loose attempt logs a reason to the console (`generateRoute attempt N: ...`)
  for diagnosing a specific location's failures. The control panel reports whether all, some, or
  none of the generated routes ended up using real roads.
- Multiple simulated routes are placed in a roughly square grid of zones around the map center
  (`computeZoneAnchor`), close together with only a modest gap (`ROUTE_ZONE_MARGIN_M`) so routes
  read as several trucks working one neighborhood rather than isolated far-apart service areas.
  Zones don't structurally overlap by design, though — the gap is small enough that routed paths
  commonly straying beyond their own lattice box (see the note above) will sometimes cross into a
  neighboring zone and share a stretch of road, which is the "sometimes, not usually" amount of
  overlap real dispatch routes tend to have. A negative margin (deliberately overlapping zones)
  was tried and produced 50%+ overlap once combined with how far a "loose" route is allowed to
  stray — too much.
- Each generated point carries a `sequence` index and optional `timestamp` (`src/types.ts`); the
  points within a route group are already in that sequence order (that's how they were sampled
  along the route), so the pins-vs-path switch (`RoutesLayer.tsx`) can draw the polyline straight
  from `group.points` with no re-sorting.
- Each point also carries a simulated `completed` status: a random completion fraction between
  `COMPLETION_FRACTION_MIN` and `COMPLETION_FRACTION_MAX` (50%–85%) is chosen per route per
  generation, and points are marked complete in sequence order up to that fraction — a real truck
  finishes stops as it drives, not in a scattered pattern. In path mode the route draws as two
  polylines split at the completion boundary (sharing that point so there's no gap).
- **Completed** pins/path segments recede — dimmed via `COMPLETED_OPACITY`, same color, no hue
  change; incomplete ones render at full color/opacity. This is a deliberate flip from an earlier
  version (completed = full, incomplete = muted): what still needs doing should draw the eye,
  what's already done should fade into the background. An earlier iteration also desaturated the
  completed portion, on the theory that opacity alone competes with the basemap's own contrast and
  reads ambiguously — but hue-preserving desaturation turned out to have its own failure mode: a
  muted color can still read as "a legitimately different, just less vivid, color" rather than
  clearly "the same color, muted," especially across several simultaneous routes, so it was dropped
  in favor of opacity alone. Since `Polyline` is drawn by the Maps SDK (not a DOM node), the
  completed segment is a second `Polyline` at `COMPLETED_OPACITY`; markers just set the `<img>`'s
  CSS `opacity` directly. This applies uniformly across every icon style, including **Dot** — a
  shape-based treatment (e.g. a hollow ring for incomplete points) was tried for that style
  specifically and reverted; opacity alone is the one signal used everywhere.
- In path mode, each segment also draws with a white halo/outline for legibility against a busy or
  dark basemap — a wider white `Polyline` (`PATH_HALO_STROKE_WEIGHT`) drawn first, then the actual
  colored `Polyline` (`PATH_STROKE_WEIGHT`) on top at normal weight, both at the segment's own
  opacity (`PathSegment` in `RoutesLayer.tsx`). This doesn't reintroduce the pin-halo washout
  problem this whole demo is about — that happens because *many small pin halos* overlap and stack
  into solid white at high density; a single continuous line's halo doesn't overlap with itself no
  matter how dense the underlying points were.
- Each route also gets a short display name (e.g. `1525_A`) via `generateRouteName` in
  `src/lib/routeName.ts` — a random 4-digit number plus a letter derived from the route's position
  in the generation batch (A, B, C, ...), so multiple routes always get distinct labels.
- **Stops remaining** panel (`RouteProgressPanel.tsx`, top-right) shows one compact horizontal bar
  per route, labeled with that route's name and color-coded to match its pin color: the incomplete
  fraction (full color, reads darker) on the left, the completed fraction (dimmed via
  `COMPLETED_OPACITY`) on the right — same visual language and left/right emphasis as the map
  itself, so the panel reads as an extension of the map rather than a separate legend to
  cross-reference.
- **Dim basemap (scrim)** toggle mutes the map tiles so pins/lines pop against them. This can't use
  the Map's `styles` prop — Google Maps ignores inline `styles` whenever a Map ID is set (required
  here for Advanced Markers), since styling is supposed to come from the Map ID's Cloud Console
  config instead. Instead, `MapScrim.tsx` uses a real `google.maps.OverlayView` inserted into the
  `overlayLayer` pane, which sits above `mapPane` (the tiles) but below `markerLayer` (where
  `AdvancedMarker` renders) — exactly the stacking needed so pins/lines stay crisp above the dimmed
  basemap.
- Markers use `AdvancedMarker` from `@vis.gl/react-google-maps`, which is DOM-element-based (one
  element per pin). Comfortable up to roughly a few thousand points; beyond that, expect visible
  stutter on pan/zoom/regenerate. With 4 routes at the default Spacing this stays well under that,
  but pushing Routes and Spacing to their extremes can approach it. Below the path zoom threshold,
  each route is a single `Polyline` instead, so this limit stops applying regardless of point count.
