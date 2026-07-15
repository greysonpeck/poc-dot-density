import { destinationPoint, haversineDistanceMeters, lerpLatLng, type LatLng } from './geo';
import { sampleSplineDensely } from './spline';
import { routeWaypoints } from './directionsApi';
import type { RouteParams, TruckPoint } from '../types';
import {
  ASSUMED_TRUCK_SPEED_MPS,
  COMPLETION_FRACTION_MAX,
  COMPLETION_FRACTION_MIN,
  MAX_GENERATE_ATTEMPTS,
  MAX_ROUTE_STRAY_HARD_CAP_MULTIPLIER,
  MAX_ROUTE_STRAY_MULTIPLIER,
  RETRY_OFFSET_MAX_M,
  ROUTE_ZONE_MARGIN_M,
  SWEEP_COL_SPACING_M,
  SWEEP_COLS,
  SWEEP_JITTER_M,
  SWEEP_ROW_SPACING_M,
  SWEEP_ROWS,
} from '../constants';

/** Straight-line half-diagonal of the intended lattice footprint, in meters. */
const LATTICE_HALF_DIAGONAL_M =
  Math.hypot((SWEEP_COLS - 1) * SWEEP_COL_SPACING_M, (SWEEP_ROWS - 1) * SWEEP_ROW_SPACING_M) / 2;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function jitterPoint(point: LatLng, jitterMeters: number): LatLng {
  if (jitterMeters <= 0) return point;
  const bearing = randomBetween(0, 360);
  const distance = jitterMeters * Math.sqrt(Math.random()); // sqrt -> uniform over disk, not center-biased
  return destinationPoint(point, bearing, distance);
}

/**
 * Lays out a serpentine "coverage sweep": SWEEP_ROWS parallel passes of SWEEP_COLS stops each,
 * alternating direction every pass (like mowing a lawn), confined to a compact area anchored at
 * `anchor`. Feeding this many close-together stops to the Directions API forces it through many
 * local turns along actual residential streets, instead of routing point-to-point across town.
 * The whole lattice is rotated by a random bearing each call so routes don't all point one way.
 */
function generateWaypoints(anchor: LatLng): LatLng[] {
  const along = randomBetween(0, 360);
  const across = along + 90;

  const waypoints: LatLng[] = [];
  for (let row = 0; row < SWEEP_ROWS; row++) {
    // Centered on `anchor` (not starting at it) so the lattice's bounding box matches what
    // computeZoneAnchor assumes when tiling multiple routes' zones around a shared center.
    const rowOffset = (row - (SWEEP_ROWS - 1) / 2) * SWEEP_ROW_SPACING_M;
    const passStart = destinationPoint(anchor, across, rowOffset);
    const reversed = row % 2 === 1;
    for (let i = 0; i < SWEEP_COLS; i++) {
      const col = reversed ? SWEEP_COLS - 1 - i : i;
      const colOffset = (col - (SWEEP_COLS - 1) / 2) * SWEEP_COL_SPACING_M;
      const point = destinationPoint(passStart, along, colOffset);
      waypoints.push(jitterPoint(point, SWEEP_JITTER_M));
    }
  }

  return waypoints;
}

/**
 * Places `count` route anchors in a roughly square, non-overlapping grid centered on `center`,
 * spaced so each route's coverage-sweep lattice (see generateWaypoints) gets its own zone with
 * a margin — mimicking how real dispatch zones tile adjacent neighborhoods.
 */
function computeZoneAnchor(center: LatLng, index: number, count: number): LatLng {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);

  const cellWidth = (SWEEP_COLS - 1) * SWEEP_COL_SPACING_M + ROUTE_ZONE_MARGIN_M;
  const cellHeight = (SWEEP_ROWS - 1) * SWEEP_ROW_SPACING_M + ROUTE_ZONE_MARGIN_M;
  const totalWidth = cols * cellWidth;
  const totalHeight = rows * cellHeight;

  const east = (col + 0.5) * cellWidth - totalWidth / 2;
  const north = totalHeight / 2 - (row + 0.5) * cellHeight;

  return destinationPoint(destinationPoint(center, 90, east), 0, north);
}

/** Resamples a densely-sampled polyline at fixed arc-length intervals, so spacing is even along true curve length. */
function resampleByArcLength(fine: LatLng[], spacingMeters: number): LatLng[] {
  const cumulative = [0];
  for (let i = 1; i < fine.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineDistanceMeters(fine[i - 1], fine[i]));
  }
  const totalLength = cumulative[cumulative.length - 1];

  const sampled: LatLng[] = [];
  let targetDist = 0;
  let i = 1;

  while (targetDist <= totalLength && i < cumulative.length) {
    while (i < cumulative.length - 1 && cumulative[i] < targetDist) i++;

    const segStart = cumulative[i - 1];
    const segEnd = cumulative[i];
    const frac = segEnd > segStart ? (targetDist - segStart) / (segEnd - segStart) : 0;
    sampled.push(lerpLatLng(fine[i - 1], fine[i], frac));

    targetDist += spacingMeters;
  }

  return sampled;
}

/** How far the furthest point in `path` strays from `anchor`, in meters. */
function maxStrayDistance(path: LatLng[], anchor: LatLng): number {
  return Math.max(...path.map((point) => haversineDistanceMeters(anchor, point)));
}

export interface GeneratedRoute {
  points: TruckPoint[];
  /** False when the Directions API call failed, found no route, or strayed too far from the
   *  intended zone (sparse street grid nearby) — in all cases we fell back to the synthetic path. */
  snappedToRoads: boolean;
}

export async function generateRoute(anchor: LatLng, params: RouteParams): Promise<GeneratedRoute> {
  let waypoints: LatLng[] = [];
  let compact: LatLng[] | null = null;
  let bestRouted: LatLng[] | null = null;
  let bestStray = Infinity;

  // Retry with a nearby anchor (and a freshly randomized sweep orientation, from
  // generateWaypoints) before settling — a failure is often local to that specific spot (sparse
  // street grid, a gap between disconnected roads) rather than the whole zone. Track the
  // least-strayed real route seen along the way as a fallback better than pure synthetic.
  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
    const attemptAnchor = attempt === 0 ? anchor : jitterPoint(anchor, RETRY_OFFSET_MAX_M);
    waypoints = generateWaypoints(attemptAnchor);
    const routed = await routeWaypoints(waypoints);

    if (routed === null) {
      console.warn(`generateRoute attempt ${attempt}: Directions found no route`);
      continue;
    }

    const stray = maxStrayDistance(routed, attemptAnchor);
    if (stray <= LATTICE_HALF_DIAGONAL_M * MAX_ROUTE_STRAY_MULTIPLIER) {
      compact = routed;
      break;
    }

    console.warn(
      `generateRoute attempt ${attempt}: routed but strayed ${Math.round(stray)}m ` +
        `(compact bar ${Math.round(LATTICE_HALF_DIAGONAL_M * MAX_ROUTE_STRAY_MULTIPLIER)}m)`,
    );
    if (stray < bestStray) {
      bestStray = stray;
      bestRouted = routed;
    }
  }

  const acceptableFallback =
    bestRouted !== null && bestStray <= LATTICE_HALF_DIAGONAL_M * MAX_ROUTE_STRAY_HARD_CAP_MULTIPLIER
      ? bestRouted
      : null;
  const fine = compact ?? acceptableFallback ?? sampleSplineDensely(waypoints);
  const snappedToRoads = compact !== null || acceptableFallback !== null;
  const sampled = resampleByArcLength(fine, params.spacingMeters);

  const startTime = Date.now();
  const secondsPerPoint = params.spacingMeters / ASSUMED_TRUCK_SPEED_MPS;

  // Simulates a truck partway through its run: complete in sequence order up to a randomly
  // chosen fraction of the route, incomplete from there on — not a scattered random subset,
  // since that's not how a truck actually works through its stops.
  const completionFraction = randomBetween(COMPLETION_FRACTION_MIN, COMPLETION_FRACTION_MAX);
  const completeCount = Math.round(sampled.length * completionFraction);

  const points = sampled.map((point, index) => {
    const jittered = jitterPoint(point, params.jitterMeters);
    return {
      id: crypto.randomUUID(),
      sequence: index,
      lat: jittered.lat,
      lng: jittered.lng,
      timestamp: new Date(startTime + index * secondsPerPoint * 1000).toISOString(),
      completed: index < completeCount,
    };
  });

  return { points, snappedToRoads };
}

/** Generates `count` simulated routes at once, each in its own zone around `center`. */
export async function generateRoutes(center: LatLng, count: number, params: RouteParams): Promise<GeneratedRoute[]> {
  const anchors = Array.from({ length: count }, (_, i) => computeZoneAnchor(center, i, count));
  return Promise.all(anchors.map((anchor) => generateRoute(anchor, params)));
}

/** Rough point-count estimate for the UI readout, without generating the full route. */
export function estimatePointCount(params: RouteParams): number {
  const approxRouteLength =
    SWEEP_ROWS * (SWEEP_COLS - 1) * SWEEP_COL_SPACING_M + (SWEEP_ROWS - 1) * SWEEP_ROW_SPACING_M;
  return Math.max(1, Math.round(approxRouteLength / params.spacingMeters));
}
