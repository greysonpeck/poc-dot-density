import { useState, type CSSProperties } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { IconStyleDef, RouteGroup, RouteParams } from '../types';
import { ALL_ICON_STYLES, colorForRouteIndex } from '../iconSets';
import { generateRoutes, estimatePointCount } from '../lib/generateRoute';
import { generateRouteName } from '../lib/routeName';
import {
  DEFAULT_CENTER,
  JITTER_METERS_MAX,
  JITTER_METERS_MIN,
  PATH_ZOOM_THRESHOLD_MAX,
  PATH_ZOOM_THRESHOLD_MIN,
  ROUTE_COUNT_DEFAULT,
  ROUTE_COUNT_MAX,
  ROUTE_COUNT_MIN,
  SPACING_METERS_MAX,
  SPACING_METERS_MIN,
} from '../constants';
import { MAP_ID } from './MapView';

interface ControlPanelProps {
  iconStyleId: string;
  onIconStyleChange: (id: string) => void;
  routeParams: RouteParams;
  onRouteParamsChange: (params: RouteParams) => void;
  onGenerate: (groups: RouteGroup[]) => void;
  zoom: number;
  pointCount: number;
  pathZoomThreshold: number;
  onPathZoomThresholdChange: (threshold: number) => void;
  scrimEnabled: boolean;
  onScrimEnabledChange: (enabled: boolean) => void;
}

type RouteStatus = 'idle' | 'routed' | 'partial' | 'fallback';

export function ControlPanel({
  iconStyleId,
  onIconStyleChange,
  routeParams,
  onRouteParamsChange,
  onGenerate,
  zoom,
  pointCount,
  pathZoomThreshold,
  onPathZoomThresholdChange,
  scrimEnabled,
  onScrimEnabledChange,
}: ControlPanelProps) {
  const map = useMap(MAP_ID);
  const [routeCount, setRouteCount] = useState(ROUTE_COUNT_DEFAULT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle');

  async function handleGenerateClick() {
    const center = map?.getCenter();
    const anchor = center ? { lat: center.lat(), lng: center.lng() } : DEFAULT_CENTER;
    setIsGenerating(true);
    try {
      const generated = await generateRoutes(anchor, routeCount, routeParams);
      const groups: RouteGroup[] = generated.map((route, index) => ({
        id: crypto.randomUUID(),
        name: generateRouteName(index),
        color: colorForRouteIndex(index),
        points: route.points,
      }));
      onGenerate(groups);

      const routedCount = generated.filter((route) => route.snappedToRoads).length;
      setRouteStatus(routedCount === generated.length ? 'routed' : routedCount === 0 ? 'fallback' : 'partial');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div style={panelStyle}>
      <h1 style={{ fontSize: '1rem', margin: 0 }}>dot-density</h1>
      <p style={{ fontSize: '0.75rem', color: '#666', margin: '0.25rem 0 1rem' }}>
        RCC pin halo washout demo — zoom: {zoom.toFixed(1)} ({zoom >= pathZoomThreshold ? 'pins' : 'path'})
      </p>

      <label style={labelStyle}>
        Path below zoom: {pathZoomThreshold}
        <input
          type="range"
          min={PATH_ZOOM_THRESHOLD_MIN}
          max={PATH_ZOOM_THRESHOLD_MAX}
          value={pathZoomThreshold}
          onChange={(e) => onPathZoomThresholdChange(Number(e.target.value))}
          style={inputStyle}
        />
      </label>

      <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          checked={scrimEnabled}
          onChange={(e) => onScrimEnabledChange(e.target.checked)}
          style={{ margin: 0 }}
        />
        Dim basemap (scrim)
      </label>

      <label style={labelStyle}>
        Icon set
        <select value={iconStyleId} onChange={(e) => onIconStyleChange(e.target.value)} style={inputStyle}>
          {ALL_ICON_STYLES.map((style: IconStyleDef) => (
            <option key={style.id} value={style.id}>
              {style.label}
            </option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        Routes: {routeCount}
        <input
          type="range"
          min={ROUTE_COUNT_MIN}
          max={ROUTE_COUNT_MAX}
          value={routeCount}
          onChange={(e) => setRouteCount(Number(e.target.value))}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Spacing: {routeParams.spacingMeters} m
        <input
          type="range"
          min={SPACING_METERS_MIN}
          max={SPACING_METERS_MAX}
          value={routeParams.spacingMeters}
          onChange={(e) => onRouteParamsChange({ ...routeParams, spacingMeters: Number(e.target.value) })}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Jitter: {routeParams.jitterMeters} m
        <input
          type="range"
          min={JITTER_METERS_MIN}
          max={JITTER_METERS_MAX}
          value={routeParams.jitterMeters}
          onChange={(e) => onRouteParamsChange({ ...routeParams, jitterMeters: Number(e.target.value) })}
          style={inputStyle}
        />
      </label>

      <p style={{ fontSize: '0.75rem', color: '#666', margin: '0 0 0.75rem' }}>
        ~{estimatePointCount(routeParams) * routeCount} points across {routeCount} route
        {routeCount === 1 ? '' : 's'}
        {pointCount > 0 ? ` (${pointCount} currently on map)` : ''}
      </p>

      <button onClick={handleGenerateClick} disabled={isGenerating} style={buttonStyle}>
        {isGenerating ? 'Generating…' : 'Generate routes'}
      </button>

      {routeStatus !== 'idle' && (
        <p style={{ fontSize: '0.7rem', color: routeStatus === 'routed' ? '#2a7' : '#a60', margin: '0.5rem 0 0' }}>
          {routeStatus === 'routed' && 'Routed all routes along real roads.'}
          {routeStatus === 'partial' &&
            'Some routes fell back to a synthetic path after repeated retries nearby found no good route.'}
          {routeStatus === 'fallback' && 'No routes could be routed, even after retries — used synthetic paths for all.'}
        </p>
      )}
    </div>
  );
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  zIndex: 1,
  background: 'white',
  borderRadius: 8,
  padding: '1rem',
  width: 220,
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  fontFamily: 'system-ui, sans-serif',
};

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: '0.8rem',
  marginBottom: '0.75rem',
};

const inputStyle: CSSProperties = {
  width: '100%',
};

const buttonStyle: CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
};
