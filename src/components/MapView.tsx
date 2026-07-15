import { Map, type MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import { RoutesLayer } from './RoutesLayer';
import type { IconStyleDef, RouteGroup } from '../types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../constants';
import { GOOGLE_MAPS_MAP_ID } from '../config';

export const MAP_ID = 'demo-map';

interface MapViewProps {
  routeGroups: RouteGroup[];
  iconStyle: IconStyleDef;
  zoom: number;
  pathZoomThreshold: number;
  onZoomChanged?: (zoom: number) => void;
}

export function MapView({ routeGroups, iconStyle, zoom, pathZoomThreshold, onZoomChanged }: MapViewProps) {
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
      <RoutesLayer routeGroups={routeGroups} iconStyle={iconStyle} zoom={zoom} pathZoomThreshold={pathZoomThreshold} />
    </Map>
  );
}
