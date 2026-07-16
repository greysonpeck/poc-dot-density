import { Map, type MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import { RoutesLayer } from './RoutesLayer';
import { MapScrim } from './MapScrim';
import type { IconStyleDef, RouteGroup } from '../types';
import { DEFAULT_CENTER, DEFAULT_ZOOM, SCRIM_OPACITY } from '../constants';
import { GOOGLE_MAPS_MAP_ID } from '../config';

export const MAP_ID = 'demo-map';

interface MapViewProps {
  routeGroups: RouteGroup[];
  iconStyle: IconStyleDef;
  zoom: number;
  pathZoomThreshold: number;
  scrimEnabled: boolean;
  onZoomChanged?: (zoom: number) => void;
}

export function MapView({ routeGroups, iconStyle, zoom, pathZoomThreshold, scrimEnabled, onZoomChanged }: MapViewProps) {
  return (
    <Map
      id={MAP_ID}
      mapId={GOOGLE_MAPS_MAP_ID}
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={DEFAULT_ZOOM}
      gestureHandling="greedy"
      disableDefaultUI={false}
      style={{ width: '100%', height: '100%' }}
      onCameraChanged={(event: MapCameraChangedEvent) => onZoomChanged?.(event.detail.zoom)}
    >
      {scrimEnabled && <MapScrim opacity={SCRIM_OPACITY} />}
      <RoutesLayer routeGroups={routeGroups} iconStyle={iconStyle} zoom={zoom} pathZoomThreshold={pathZoomThreshold} />
    </Map>
  );
}
