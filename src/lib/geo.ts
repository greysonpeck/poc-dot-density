export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Shortest distance from `point` to the segment `a`-`b`, in meters — projects onto the segment
 *  treating lat/lng as a flat (x, y) plane (same approximation as convexHull, fine at neighborhood
 *  scale), then measures the real distance to that projected point via haversine. */
export function pointToSegmentDistanceMeters(point: LatLng, a: LatLng, b: LatLng): number {
  const abLng = b.lng - a.lng;
  const abLat = b.lat - a.lat;
  const lengthSquared = abLng * abLng + abLat * abLat;

  if (lengthSquared === 0) {
    return haversineDistanceMeters(point, a);
  }

  const t = Math.max(0, Math.min(1, ((point.lng - a.lng) * abLng + (point.lat - a.lat) * abLat) / lengthSquared));
  const projected = { lng: a.lng + t * abLng, lat: a.lat + t * abLat };
  return haversineDistanceMeters(point, projected);
}

/** Returns the point `distanceMeters` away from `origin` along `bearingDegrees` (0 = north, clockwise). */
export function destinationPoint(origin: LatLng, bearingDegrees: number, distanceMeters: number): LatLng {
  const bearing = toRad(bearingDegrees);
  const angularDistance = distanceMeters / EARTH_RADIUS_M;
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

export function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/** Convex hull via monotone chain, treating lat/lng as a flat (x, y) plane — fine at the
 *  neighborhood scale these routes cover, where longitude distortion is negligible. Returns the
 *  hull in counter-clockwise order, deduped, without a closing repeat of the first point (the
 *  Polygon component closes the ring itself). Fewer than 3 distinct points can't form a polygon,
 *  so those are returned as-is. */
export function convexHull(points: LatLng[]): LatLng[] {
  const sorted = [...points]
    .sort((a, b) => a.lng - b.lng || a.lat - b.lat)
    .filter((point, index, arr) => index === 0 || point.lng !== arr[index - 1].lng || point.lat !== arr[index - 1].lat);

  if (sorted.length < 3) {
    return sorted;
  }

  const cross = (o: LatLng, a: LatLng, b: LatLng) => (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);

  const lower: LatLng[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper: LatLng[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const point = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

const METERS_PER_DEGREE_LAT = 111320; // same flat-plane approximation as convexHull — fine at neighborhood scale

function rotateAround(point: LatLng, pivot: LatLng, angleRad: number): LatLng {
  const x = point.lng - pivot.lng;
  const y = point.lat - pivot.lat;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return { lng: pivot.lng + x * cos - y * sin, lat: pivot.lat + x * sin + y * cos };
}

function centroid(points: LatLng[]): LatLng {
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/** Hatch lines filling `hull` at `angleDegrees` from horizontal (0 = horizontal, clockwise),
 *  spaced `spacingMeters` apart — used to render a polygon as a dense stripe pattern instead of a
 *  solid fill. Rotates the hull by `-angleDegrees` around its centroid so the requested stripe
 *  direction becomes the horizontal axis, runs a standard horizontal scanline polygon fill in
 *  that rotated frame (for each scan line: find the edges crossing it, take the crossing x's in
 *  order, pair them up 1st-2nd/3rd-4th/... for the in/out spans), then rotates the resulting
 *  segment endpoints back by `+angleDegrees` into real lat/lng. The crossing test is deliberately
 *  half-open (`a.y <= scanY && b.y > scanY`, one-sided) so a scanline through a hull vertex counts
 *  it on one edge only, not both — otherwise it'd double-count and pair the crossings up wrong.
 *  Works for any simple polygon, not just convex ones, so it doesn't assume its input is a
 *  convexHull() result. */
export function hullStripes(hull: LatLng[], spacingMeters: number, angleDegrees: number): [LatLng, LatLng][] {
  if (hull.length < 3) {
    return [];
  }

  const pivot = centroid(hull);
  const angleRad = (angleDegrees * Math.PI) / 180;
  const rotated = hull.map((point) => rotateAround(point, pivot, -angleRad));

  const spacingDeg = spacingMeters / METERS_PER_DEGREE_LAT;
  const lats = rotated.map((point) => point.lat);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const stripes: [LatLng, LatLng][] = [];
  for (let scanLat = minLat + spacingDeg / 2; scanLat < maxLat; scanLat += spacingDeg) {
    const crossingLngs: number[] = [];
    for (let i = 0; i < rotated.length; i++) {
      const a = rotated[i];
      const b = rotated[(i + 1) % rotated.length];
      if ((a.lat <= scanLat && b.lat > scanLat) || (b.lat <= scanLat && a.lat > scanLat)) {
        const t = (scanLat - a.lat) / (b.lat - a.lat);
        crossingLngs.push(a.lng + t * (b.lng - a.lng));
      }
    }
    crossingLngs.sort((x, y) => x - y);
    for (let i = 0; i + 1 < crossingLngs.length; i += 2) {
      const start = { lat: scanLat, lng: crossingLngs[i] };
      const end = { lat: scanLat, lng: crossingLngs[i + 1] };
      stripes.push([rotateAround(start, pivot, angleRad), rotateAround(end, pivot, angleRad)]);
    }
  }
  return stripes;
}
