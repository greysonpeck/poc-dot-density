import type { LatLng } from './geo';

/** Catmull-Rom interpolation through p1..p2 at t in [0,1], using p0/p3 as tangent context. */
function catmullRom1D(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export function catmullRomPoint(p0: LatLng, p1: LatLng, p2: LatLng, p3: LatLng, t: number): LatLng {
  return {
    lat: catmullRom1D(p0.lat, p1.lat, p2.lat, p3.lat, t),
    lng: catmullRom1D(p0.lng, p1.lng, p2.lng, p3.lng, t),
  };
}

/** Densely samples a Catmull-Rom spline through all waypoints (padding the ends so the curve passes through every waypoint). */
export function sampleSplineDensely(waypoints: LatLng[], samplesPerSegment = 100): LatLng[] {
  if (waypoints.length < 2) return waypoints.slice();

  const padded = [waypoints[0], ...waypoints, waypoints[waypoints.length - 1]];
  const points: LatLng[] = [];

  for (let i = 0; i < padded.length - 3; i++) {
    const [p0, p1, p2, p3] = [padded[i], padded[i + 1], padded[i + 2], padded[i + 3]];
    for (let s = 0; s < samplesPerSegment; s++) {
      points.push(catmullRomPoint(p0, p1, p2, p3, s / samplesPerSegment));
    }
  }
  points.push(waypoints[waypoints.length - 1]);

  return points;
}
