import { Fragment } from 'react';
import { AdvancedMarker, Polyline } from '@vis.gl/react-google-maps';
import type { IconStyleDef, RouteGroup, TruckPoint } from '../types';
import { colorHex, iconSrc } from '../iconSets';
import { COMPLETED_OPACITY, PATH_HALO_STROKE_WEIGHT, PATH_STROKE_WEIGHT } from '../constants';

const DEFAULT_STROKE_OPACITY = 0.9;

interface RoutesLayerProps {
  routeGroups: RouteGroup[];
  iconStyle: IconStyleDef;
  zoom: number;
  pathZoomThreshold: number;
}

/** Renders each route as individual pins at/above pathZoomThreshold, or as a colored polyline
 *  below it — the fix for halo washout: past a certain zoom-out, pins overlap into a wall of
 *  white halo anyway, so draw the route itself instead of the pins that make it up. Either way,
 *  the completed portion of the route recedes (dimmed) so the incomplete portion — what still
 *  needs doing — draws the eye. */
export function RoutesLayer({ routeGroups, iconStyle, zoom, pathZoomThreshold }: RoutesLayerProps) {
  const showPoints = zoom >= pathZoomThreshold;

  return (
    <>
      {routeGroups.map((group) =>
        showPoints ? <RouteMarkers key={group.id} group={group} iconStyle={iconStyle} /> : <RoutePath key={group.id} group={group} />,
      )}
    </>
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
