import { Fragment } from 'react';
import { AdvancedMarker, Polyline } from '@vis.gl/react-google-maps';
import type { IconStyleDef, RouteGroup, TruckPoint } from '../types';
import { colorHex, iconSrc } from '../iconSets';
import { INCOMPLETE_OPACITY } from '../constants';

const COMPLETE_STROKE_OPACITY = 0.9;

interface RoutesLayerProps {
  routeGroups: RouteGroup[];
  iconStyle: IconStyleDef;
  zoom: number;
  pathZoomThreshold: number;
}

/** Renders each route as individual pins at/above pathZoomThreshold, or as a colored polyline
 *  below it — the fix for halo washout: past a certain zoom-out, pins overlap into a wall of
 *  white halo anyway, so draw the route itself instead of the pins that make it up. Either way,
 *  the simulated incomplete tail of the route renders dimmed. */
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

/** Draws the route as two segments split at the completion boundary — the incomplete tail
 *  renders dimmed, sharing the boundary point with the complete segment so there's no gap. */
function RoutePath({ group }: { group: RouteGroup }) {
  const color = colorHex(group.color);
  const splitIndex = group.points.findIndex((point) => !point.completed);

  if (splitIndex === -1) {
    return <Polyline path={toLatLngs(group.points)} strokeColor={color} strokeOpacity={COMPLETE_STROKE_OPACITY} strokeWeight={5} />;
  }

  const completePart = group.points.slice(0, splitIndex + 1);
  const incompletePart = group.points.slice(splitIndex);

  return (
    <Fragment>
      {completePart.length >= 2 && (
        <Polyline path={toLatLngs(completePart)} strokeColor={color} strokeOpacity={COMPLETE_STROKE_OPACITY} strokeWeight={5} />
      )}
      {incompletePart.length >= 2 && (
        <Polyline path={toLatLngs(incompletePart)} strokeColor={color} strokeOpacity={INCOMPLETE_OPACITY} strokeWeight={5} />
      )}
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
            style={{ display: 'block', opacity: point.completed ? 1 : INCOMPLETE_OPACITY }}
          />
        </AdvancedMarker>
      ))}
    </Fragment>
  );
}
