export const DEFAULT_CENTER = { lat: 39.7684, lng: -86.1581 }; // Indianapolis, IN — plausible trucking hub
export const DEFAULT_ZOOM = 13;

export const SPACING_METERS_MIN = 2;
export const SPACING_METERS_MAX = 100;
export const SPACING_METERS_DEFAULT = 30;

export const JITTER_METERS_MIN = 0;
export const JITTER_METERS_MAX = 15;
export const JITTER_METERS_DEFAULT = 3;

// Fixed route-shape constants — not exposed as UI controls, to keep the control
// surface focused on density/jitter, which is what actually demonstrates the halo problem.
//
// Routes are generated as a serpentine "coverage sweep": a lattice of stops arranged in
// parallel passes (like mowing a lawn), alternating direction each pass, confined to a
// compact residential-block-sized area. This forces the Directions API through many local
// turns — like a real garbage truck route — instead of one long cross-town haul.
export const SWEEP_ROWS = 5; // parallel passes
export const SWEEP_COLS = 4; // stops per pass
export const SWEEP_ROW_SPACING_M = 90; // distance between parallel passes — about one residential block
export const SWEEP_COL_SPACING_M = 140; // distance between stops along a pass
export const SWEEP_JITTER_M = 25; // small per-stop random offset so the lattice isn't perfectly regular

// Small and positive: zones sit close with only a modest gap in the idealized case, so routes
// read as several trucks working one neighborhood rather than isolated service areas — but they
// don't structurally overlap by design. -120 (deliberately overlapping zones) turned out to
// produce 50%+ route overlap in practice, once combined with how far routes can legitimately
// stray (up to the 6x hard cap, ~1660m — see MAX_ROUTE_STRAY_HARD_CAP_MULTIPLIER): "sometimes
// share a road for a stretch" wants occasional overlap from that natural straying, not zones
// that overlap by default before a single route is even generated.
export const ROUTE_ZONE_MARGIN_M = 100;
export const ROUTE_COUNT_MIN = 1;
export const ROUTE_COUNT_MAX = 6;
export const ROUTE_COUNT_DEFAULT = 3;

// Directions API routes the lattice through real streets, and real streets don't always have a
// direct connector where our lattice expects one — near sparse/disconnected road grids (edge of
// town, industrial areas, highway interchanges) it can detour many km to satisfy the requested
// stop order. An on-road route straying further than this multiple of the lattice's own
// half-diagonal from its center is treated as "not great, but keep trying" — see
// MAX_GENERATE_ATTEMPTS. 3x comfortably covers ordinary detour behavior (measured ~1.7-2.4x in
// testing) while still catching real outliers.
export const MAX_ROUTE_STRAY_MULTIPLIER = 3;

// If every retry attempt fails to find a route this compact, we'd still rather use the
// least-strayed real route any attempt actually found than throw it away for a fully synthetic
// path — real road geometry that's a bit loose beats a smooth curve that isn't on any street at
// all. This is the outer bound on that concession: even the best available real route must stray
// less than this multiple of the half-diagonal, or we fall back to synthetic. 8x comfortably
// clears ordinary "loose" detours (including tricky downtown grids — see MAX_GENERATE_ATTEMPTS)
// while still catching gross outliers (measured ~18x near a sparse/disconnected grid, where even
// the best of several attempts stayed catastrophically bad).
export const MAX_ROUTE_STRAY_HARD_CAP_MULTIPLIER = 8;

// If a route fails to route compactly on real roads, retry with the anchor nudged to a nearby
// spot (and a freshly randomized sweep orientation) before settling for the best attempt seen.
// The retry radius escalates per attempt (RETRY_OFFSET_STEP_M * attempt number) rather than using
// one fixed distance: some real locations (dense one-way downtown grids, water/park-adjacent
// blocks) are bad enough that no amount of resampling *nearby* helps, and only a retry that
// actually relocates somewhat can escape them. Measured directly against downtown Houston/Seattle
// (both prone to synthetic fallback under a fixed 200m retry radius and 4 attempts): escalating
// the radius and raising attempts from 4 to 6 eliminated synthetic fallback entirely across 6
// trials, resolving fully compact more often too. The tradeoff: a late, large retry (up to
// 6*200=1200m) can occasionally land inside a neighboring route's zone (see ROUTE_ZONE_MARGIN_M)
// — acceptable, since it only happens in the rare case a route needed that many retries at all.
export const MAX_GENERATE_ATTEMPTS = 6;
export const RETRY_OFFSET_STEP_M = 200;

// Point timestamps aren't shown anywhere in the UI yet, but are computed to flavor a plausible
// truck timeline. Driving speed and per-stop dwell time both depend on whether a point falls on a
// "collection" leg (working stop-to-stop along a residential pass) or a "connector" leg (turning
// onto the next pass) — see classifyConnectorLegs/isConnectorPoint in generateRoute.ts. Collection
// legs are slow, stop-and-go, and each stop adds dwell time (idling to service it); connector legs
// are faster, uninterrupted driving, with no dwell — this only changes simulated timing, not point
// positions/spacing.
export const TRUCK_COLLECTION_SPEED_MPS = 4; // ~9 mph — slow stop-and-go working a residential pass
export const TRUCK_CONNECTOR_SPEED_MPS = 15; // ~34 mph — normal driving speed between passes
export const STOP_DWELL_SECONDS_MIN = 15;
export const STOP_DWELL_SECONDS_MAX = 45;

// Each route simulates a truck partway through its run: points are marked complete in sequence
// order up to a randomly chosen fraction of the route (a real truck completes stops as it drives,
// not in a scattered pattern), and incomplete from there on. The fraction is re-randomized per
// route per generation, within this range.
export const COMPLETION_FRACTION_MIN = 0.5;
export const COMPLETION_FRACTION_MAX = 0.85;

// Completed pins/path segments recede (reduced opacity, same color); incomplete ones render at
// full color/opacity — what still needs doing should draw the eye, what's already done should
// fade into the background. An earlier version also desaturated the completed portion, but that
// was dropped: pure hue-preserving desaturation could still read as "a legitimately different,
// just less vivid, color" rather than clearly "the same color, muted," especially across several
// simultaneous routes — opacity alone reads unambiguously as "the same thing, receded."
export const COMPLETED_OPACITY = 0.35;

// Path mode draws a white halo/outline behind each colored polyline segment for legibility
// against a busy or dark basemap: a wider white line drawn first, then the actual colored line on
// top at its normal weight (see RoutePath in RoutesLayer.tsx). This doesn't reintroduce the
// pin-halo washout problem this whole demo is about — that happens because *many small pin
// halos* overlap and stack into solid white at high density; a single continuous line's halo
// doesn't overlap with itself, no matter how dense the underlying points were. The halo matches
// each segment's own opacity (full for incomplete, COMPLETED_OPACITY for completed) so it doesn't
// undercut the "completed recedes" effect by rendering complete segments with a bold outline.
export const PATH_STROKE_WEIGHT = 5;
export const PATH_HALO_STROKE_WEIGHT = 9;

// Google Maps zoom is numeric-higher-is-closer (0 = whole world, ~20+ = building-level). Below
// the threshold (zoomed out further, more of the route visible at once, more pin overlap) render
// a connected polyline per route instead of individual pins — that's the fix for the halo
// washout this whole demo is about. At/above the threshold (zoomed in close), render individual
// pins as usual, since at that scale they're spread out enough to read clearly on their own.
export const PATH_ZOOM_THRESHOLD_MIN = 3;
export const PATH_ZOOM_THRESHOLD_MAX = 20;
export const PATH_ZOOM_THRESHOLD_DEFAULT = 17;

// "Convex hull" toggle: a filled polygon around each route's own points, in that route's color —
// shows the area a route actually covers, for comparison against the per-pin halo it's otherwise
// easy to confuse with. Stroke is deliberately heavier than the path halo (PATH_STROKE_WEIGHT)
// since a hull outline traces one big shape rather than many stacked segments, so it doesn't need
// legibility help from a white backing — just its own color, bolder.
export const HULL_FILL_OPACITY = 0.15;
export const HULL_STROKE_WEIGHT = 4;
export const HULL_STROKE_OPACITY = 0.8;

// "Separate hulls" sub-mode: instead of one hull per route, draw two — one over the completed
// points, one over the remaining (incomplete) points — so finished vs. outstanding coverage area
// can be compared directly. The remaining hull renders as a dense angled hatch of thin lines (see
// hullStripes in lib/geo.ts) rather than a solid fill, so next to the completed hull's solid fill
// it doesn't just read as "a second same-color blob."
//
// Stripe spacing is defined in real-world meters, but Polylines are geographic — a fixed meter
// spacing looks increasingly dense zoomed out (more of it fits on screen) and increasingly sparse
// zoomed in (each gap spans more screen pixels), the opposite of a texture that should look roughly
// the same regardless of zoom. RoutesLayer compensates by scaling the meter spacing relative to
// HULL_STRIPE_REFERENCE_ZOOM — the zoom this base value was tuned at — doubling it for each zoom
// level further out and halving it for each level further in, clamped to MIN/MAX so it never goes
// dense enough to tank performance (many tiny Polylines) or sparse enough to vanish.
export const HULL_STRIPE_SPACING_M = 5;
export const HULL_STRIPE_REFERENCE_ZOOM = 17; // matches PATH_ZOOM_THRESHOLD_DEFAULT
export const HULL_STRIPE_SPACING_MIN_M = 2;
export const HULL_STRIPE_SPACING_MAX_M = 16;
export const HULL_STRIPE_STROKE_WEIGHT = 1;
export const HULL_STRIPE_ANGLE_DEG = 45;

// "Scrim" toggle: a translucent white layer between the basemap tiles and the route markers/
// polylines, muting the basemap so the data layer pops — for a busy area where map detail
// competes with pins/lines. Can't use the Map's `styles` prop for this: Google Maps ignores
// inline `styles` whenever a Map ID is set (required here for Advanced Markers) — styling is
// supposed to come from the Map ID's Cloud Console config instead. See MapScrim.tsx for the
// actual implementation (a real google.maps.OverlayView inserted into the tile/marker pane
// stack) and why that's the correct approach given the Map ID constraint.
export const SCRIM_OPACITY = 0.5;
