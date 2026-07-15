import { useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { ControlPanel } from './components/ControlPanel';
import { MapView } from './components/MapView';
import type { RouteGroup, RouteParams } from './types';
import { ALL_ICON_STYLES, CURRENT_PROD_ICON_STYLE } from './iconSets';
import {
  DEFAULT_ZOOM,
  JITTER_METERS_DEFAULT,
  PATH_ZOOM_THRESHOLD_DEFAULT,
  SPACING_METERS_DEFAULT,
} from './constants';
import { GOOGLE_MAPS_API_KEY, isConfigured } from './config';

const DEFAULT_ROUTE_PARAMS: RouteParams = {
  spacingMeters: SPACING_METERS_DEFAULT,
  jitterMeters: JITTER_METERS_DEFAULT,
};

function App() {
  const [iconStyleId, setIconStyleId] = useState(CURRENT_PROD_ICON_STYLE.id);
  const [routeParams, setRouteParams] = useState<RouteParams>(DEFAULT_ROUTE_PARAMS);
  const [routeGroups, setRouteGroups] = useState<RouteGroup[]>([]);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pathZoomThreshold, setPathZoomThreshold] = useState(PATH_ZOOM_THRESHOLD_DEFAULT);

  if (!isConfigured) {
    return <ConfigWarning />;
  }

  const selectedIconStyle = ALL_ICON_STYLES.find((style) => style.id === iconStyleId) ?? CURRENT_PROD_ICON_STYLE;
  const pointCount = routeGroups.reduce((sum, group) => sum + group.points.length, 0);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        <ControlPanel
          iconStyleId={iconStyleId}
          onIconStyleChange={setIconStyleId}
          routeParams={routeParams}
          onRouteParamsChange={setRouteParams}
          onGenerate={setRouteGroups}
          zoom={zoom}
          pointCount={pointCount}
          pathZoomThreshold={pathZoomThreshold}
          onPathZoomThresholdChange={setPathZoomThreshold}
        />
        <MapView
          routeGroups={routeGroups}
          iconStyle={selectedIconStyle}
          zoom={zoom}
          pathZoomThreshold={pathZoomThreshold}
          onZoomChanged={setZoom}
        />
      </div>
    </APIProvider>
  );
}

function ConfigWarning() {
  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
      <h1>Google Maps API key not configured</h1>
      <p>
        Copy <code>.env.example</code> to <code>.env</code> and set{' '}
        <code>VITE_GOOGLE_MAPS_API_KEY</code> to a Google Maps JavaScript API key with the "Maps
        JavaScript API" enabled.
      </p>
      <p>
        <code>VITE_GOOGLE_MAPS_MAP_ID</code> defaults to Google's public <code>DEMO_MAP_ID</code>, which
        works for local development with no extra setup.
      </p>
    </div>
  );
}

export default App;
