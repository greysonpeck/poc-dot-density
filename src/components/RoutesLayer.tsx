import { Fragment } from 'react';
import { AdvancedMarker, Polygon, Polyline } from '@vis.gl/react-google-maps';
import type { HullMode, IconStyleDef, RouteGroup, TruckPoint } from '../types';
import { colorHex, iconSrc } from '../iconSets';
import {
  COMPLETED_OPACITY,
  HULL_FILL_OPACITY,
  HULL_STRIPE_ANGLE_DEG,
  HULL_STRIPE_REFERENCE_ZOOM,
  HULL_STRIPE_SPACING_M,
  HULL_STRIPE_SPACING_MAX_M,
  HULL_STRIPE_SPACING_MIN_M,
  HULL_STRIPE_STROKE_WEIGHT,
  HULL_STROKE_OPACITY,
  HULL_STROKE_WEIGHT,
  PATH_HALO_STROKE_WEIGHT,
  PATH_STROKE_WEIGHT,
} from '../constants';
import { convexHull, hullStripes, type LatLng } from '../lib/geo';

const DEFAULT_STROKE_OPACITY = 0.9;

interface RoutesLayerProps {
  routeGroups: RouteGroup[];
  iconStyle: IconStyleDef;
  zoom: number;
  pathZoomThreshold: number;
  hullsEnabled: boolean;
  hullMode: HullMode;
}

/** Renders each route as individual pins at/above pathZoomThreshold, or as a colored polyline
 *  below it — the fix for halo washout: past a certain zoom-out, pins overlap into a wall of
 *  white halo anyway, so draw the route itself instead of the pins that make it up. Either way,
 *  the completed portion of the route recedes (dimmed) so the incomplete portion — what still
 *  needs doing — draws the eye. Optionally overlays each route's convex hull, independent of the
 *  pins-vs-path switch, so its coverage area can be compared against either representation. */
export function RoutesLayer({ routeGroups, iconStyle, zoom, pathZoomThreshold, hullsEnabled, hullMode }: RoutesLayerProps) {
  const showPoints = zoom >= pathZoomThreshold;

  return (
    <>
      {routeGroups.map((group) => (
        <Fragment key={group.id}>
          {hullsEnabled &&
            (hullMode === 'separate' ? (
              <RouteHullSeparate group={group} zoom={zoom} />
            ) : (
              <RouteHull group={group} />
            ))}
          {showPoints ? <RouteMarkers group={group} iconStyle={iconStyle} /> : <RoutePath group={group} />}
        </Fragment>
      ))}
    </>
  );
}

function RouteHull({ group }: { group: RouteGroup }) {
  const hull = convexHull(toLatLngs(group.points));
  if (hull.length < 3) {
    return null;
  }

  return <SolidHullPolygon hull={hull} color={colorHex(group.color)} />;
}

/** 'Separate hulls' mode: one hull over the completed points, one over the remaining
 *  (incomplete) points, so finished vs. outstanding coverage can be compared directly. The
 *  completed hull uses the normal solid fill; the remaining hull is hatched instead (see
 *  StripedHullPolygon) so the two don't just read as two same-color blobs stacked on the map. */
function RouteHullSeparate({ group, zoom }: { group: RouteGroup; zoom: number }) {
  const color = colorHex(group.color);
  const completedHull = convexHull(toLatLngs(group.points.filter((point) => point.completed)));
  const remainingHull = convexHull(toLatLngs(group.points.filter((point) => !point.completed)));

  return (
    <Fragment>
      {completedHull.length >= 3 && <SolidHullPolygon hull={completedHull} color={color} />}
      {remainingHull.length >= 3 && <StripedHullPolygon hull={remainingHull} color={color} zoom={zoom} />}
    </Fragment>
  );
}

function SolidHullPolygon({ hull, color }: { hull: LatLng[]; color: string }) {
  return (
    <Polygon
      paths={hull}
      fillColor={color}
      fillOpacity={HULL_FILL_OPACITY}
      strokeColor={color}
      strokeOpacity={HULL_STROKE_OPACITY}
      strokeWeight={HULL_STROKE_WEIGHT}
    />
  );
}

/** Real-world stripe spacing that keeps the hatch's on-screen density roughly constant across
 *  zoom levels — see the HULL_STRIPE_SPACING_M comment in constants.ts for why a fixed meter
 *  spacing alone looks wrong. Each zoom level out from the reference doubles the meter spacing
 *  (half as many stripes fit on screen otherwise); each level in halves it. */
function zoomScaledStripeSpacing(zoom: number): number {
  const scaled = HULL_STRIPE_SPACING_M * 2 ** (HULL_STRIPE_REFERENCE_ZOOM - zoom);
  return Math.min(HULL_STRIPE_SPACING_MAX_M, Math.max(HULL_STRIPE_SPACING_MIN_M, scaled));
}

/** Same outline as SolidHullPolygon, but with no fill — a dense hatch of thin angled Polylines
 *  (see hullStripes) stands in for the fill instead. */
function StripedHullPolygon({ hull, color, zoom }: { hull: LatLng[]; color: string; zoom: number }) {
  const stripes = hullStripes(hull, zoomScaledStripeSpacing(zoom), HULL_STRIPE_ANGLE_DEG);

  return (
    <Fragment>
      <Polygon paths={hull} fillOpacity={0} strokeColor={color} strokeOpacity={HULL_STROKE_OPACITY} strokeWeight={HULL_STROKE_WEIGHT} />
      {stripes.map(([start, end], index) => (
        <Polyline
          key={index}
          path={[start, end]}
          strokeColor={color}
          strokeOpacity={HULL_STROKE_OPACITY}
          strokeWeight={HULL_STRIPE_STROKE_WEIGHT}
        />
      ))}
    </Fragment>
  );
}

function toLatLngs(points: TruckPoint[]) {
  return points.map((point) => ({ lat: point.lat, lng: point.lng }));
}

/** One route segment drawn with a white halo/outline: a wider white Polyline first, then the
 *  actual colored Polyline on top at normal weight, both sharing the same path and opacity. */
function PathSegment({ path, color, opacity }: { path: { lat: number; lng: number }[]; color: string; opacity: number }) {
  return (
    <Fragment>
      <Polyline path={path} strokeColor="#ffffff" strokeOpacity={opacity} strokeWeight={PATH_HALO_STROKE_WEIGHT} />
      <Polyline path={path} strokeColor={color} strokeOpacity={opacity} strokeWeight={PATH_STROKE_WEIGHT} />
    </Fragment>
  );
}

/** Draws the route as two segments split at the completion boundary — the completed portion
 *  renders dimmed, sharing the boundary point with the incomplete segment so there's no gap. */
function RoutePath({ group }: { group: RouteGroup }) {
  const color = colorHex(group.color);
  const splitIndex = group.points.findIndex((point) => !point.completed);

  if (splitIndex === -1) {
    // Whole route already complete.
    return <PathSegment path={toLatLngs(group.points)} color={color} opacity={COMPLETED_OPACITY} />;
  }

  const completedPart = group.points.slice(0, splitIndex + 1);
  const incompletePart = group.points.slice(splitIndex);

  return (
    <Fragment>
      {completedPart.length >= 2 && <PathSegment path={toLatLngs(completedPart)} color={color} opacity={COMPLETED_OPACITY} />}
      {incompletePart.length >= 2 && <PathSegment path={toLatLngs(incompletePart)} color={color} opacity={DEFAULT_STROKE_OPACITY} />}
    </Fragment>
  );
}

function RouteMarkers({ group, iconStyle }: { group: RouteGroup; iconStyle: IconStyleDef }) {
  const src = iconSrc(iconStyle, group.color);

  return (
    <Fragment>
      {group.points.map((point) => (
        <AdvancedMarker
          key={point.id}
          position={{ lat: point.lat, lng: point.lng }}
          anchorLeft={`${-iconStyle.anchor.x * 100}%`}
          anchorTop={`${-iconStyle.anchor.y * 100}%`}
        >
          <img
            src={src}
            width={iconStyle.width}
            height={iconStyle.height}
            alt=""
            style={{ display: 'block', opacity: point.completed ? COMPLETED_OPACITY : 1 }}
          />
        </AdvancedMarker>
      ))}
    </Fragment>
  );
}
