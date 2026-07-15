import type { LatLng } from './geo';

/**
 * Routes through `waypoints` (first = origin, last = destination, rest = via-points) using
 * the Directions API, so the returned path follows the real road network turn-by-turn rather
 * than snapping/interpolating between disconnected points. Returns null on any failure —
 * Directions API not enabled, no drivable route found, network error — so the caller can fall
 * back to the synthetic path.
 */
export async function routeWaypoints(waypoints: LatLng[]): Promise<LatLng[] | null> {
  if (waypoints.length < 2) return null;

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
    return path.length >= 2 ? path : null;
  } catch (err) {
    console.warn('Directions API request failed:', err);
    return null;
  }
}
