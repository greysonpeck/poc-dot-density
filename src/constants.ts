export const DEFAULT_CENTER = { lat: 39.7684, lng: -86.1581 }; // Indianapolis, IN — plausible trucking hub
export const DEFAULT_ZOOM = 13;

export const SPACING_METERS_MIN = 2;
export const SPACING_METERS_MAX = 100;
export const SPACING_METERS_DEFAULT = 20;

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
// less than this multiple of the half-diagonal, or we fall back to synthetic. 6x comfortably
// clears ordinary "loose" detours while still catching gross outliers (measured ~18x near a
// sparse/disconnected grid, where even the best of several attempts stayed catastrophically bad).
export const MAX_ROUTE_STRAY_HARD_CAP_MULTIPLIER = 6;

// If a route fails to route compactly on real roads, retry with the anchor nudged to a nearby
// spot (and a freshly randomized sweep orientation) before settling for the best attempt seen —
// see MAX_ROUTE_STRAY_HARD_CAP_MULTIPLIER above. Retries stay within RETRY_OFFSET_MAX_M of the
// original anchor so they don't wander into a neighboring route's zone (see ROUTE_ZONE_MARGIN_M).
export const MAX_GENERATE_ATTEMPTS = 4;
export const RETRY_OFFSET_MAX_M = 200;

export const ASSUMED_TRUCK_SPEED_MPS = 15; // ~34 mph, only used to flavor synthetic timestamps

// Each route simulates a truck partway through its run: points are marked complete in sequence
// order up to a randomly chosen fraction of the route (a real truck completes stops as it drives,
// not in a scattered pattern), and incomplete from there on. The fraction is re-randomized per
// route per generation, within this range.
export const COMPLETION_FRACTION_MIN = 0.5;
export const COMPLETION_FRACTION_MAX = 0.85;
export const INCOMPLETE_OPACITY = 0.5;

// Google Maps zoom is numeric-higher-is-closer (0 = whole world, ~20+ = building-level). Below
// the threshold (zoomed out further, more of the route visible at once, more pin overlap) render
// a connected polyline per route instead of individual pins — that's the fix for the halo
// washout this whole demo is about. At/above the threshold (zoomed in close), render individual
// pins as usual, since at that scale they're spread out enough to read clearly on their own.
export const PATH_ZOOM_THRESHOLD_MIN = 3;
export const PATH_ZOOM_THRESHOLD_MAX = 20;
export const PATH_ZOOM_THRESHOLD_DEFAULT = 17;
