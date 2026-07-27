import type { LatLng } from './geo';

export interface RouteWaypointsResult {
  path: LatLng[] | null;
  /** 'OK' on success; otherwise a short reason for the failure (e.g. the Directions status like
   *  'ZERO_RESULTS' or 'OVER_QUERY_LIMIT', or an exception message) — surfaced so callers can log
   *  *why* a specific attempt failed instead of just that it did, which otherwise makes a
   *  persistently-failing location (bad street topology vs. a quota/rate-limit issue) impossible
   *  to tell apart from the console. */
  status: string;
}

/**
 * Routes through `waypoints` (first = origin, last = destination, rest = via-points) using
 * the Directions API, so the returned path follows the real road network turn-by-turn rather
 * than snapping/interpolating between disconnected points.
 */
export async function routeWaypoints(waypoints: LatLng[]): Promise<RouteWaypointsResult> {
  if (waypoints.length < 2) return { path: null, status: 'TOO_FEW_WAYPOINTS' };

  try {
    const { DirectionsService } = (await google.maps.importLibrary('routes')) as google.maps.RoutesLibrary;
    const service = new DirectionsService();

    const [origin, ...rest] = waypoints;
    const destination = rest.pop()!;
    const via = rest.map((location) => ({ location, stopover: false }));

    const result = await service.route({
      origin,
      destination,
      waypoints: via,
      travelMode: google.maps.TravelMode.DRIVING,
    });

    const path = result.routes[0]?.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() })) ?? [];
    return path.length >= 2 ? { path, status: 'OK' } : { path: null, status: 'EMPTY_ROUTE' };
  } catch (err) {
    const status = err instanceof Error ? err.message : String(err);
    return { path: null, status };
  }
}
