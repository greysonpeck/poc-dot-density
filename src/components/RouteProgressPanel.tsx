import type { CSSProperties } from 'react';
import type { RouteGroup } from '../types';
import { colorHex } from '../iconSets';
import { COMPLETED_OPACITY } from '../constants';

interface RouteProgressPanelProps {
  routeGroups: RouteGroup[];
}

/** Compact per-route "stops remaining" bar chart, color-coded and named to match each route on
 *  the map, using the same completed/incomplete opacity treatment so the panel reads as an
 *  extension of the map, not a separate legend to cross-reference. Incomplete (full color, the
 *  darker-reading segment) sits on the left; completed (dimmed) on the right. */
export function RouteProgressPanel({ routeGroups }: RouteProgressPanelProps) {
  if (routeGroups.length === 0) return null;

  return (
    <div style={panelStyle}>
      <h2 style={{ fontSize: '0.8rem', margin: '0 0 0.5rem', fontWeight: 600 }}>Stops remaining</h2>
      {routeGroups.map((group) => (
        <RouteProgressRow key={group.id} group={group} />
      ))}
    </div>
  );
}

function RouteProgressRow({ group }: { group: RouteGroup }) {
  const total = group.points.length;
  const remaining = group.points.filter((point) => !point.completed).length;
  const remainingFraction = total > 0 ? remaining / total : 0;
  const completedFraction = 1 - remainingFraction;

  const fullColor = colorHex(group.color);

  return (
    <div style={rowStyle}>
      <div style={{ ...swatchStyle, background: fullColor }} />
      <span style={nameStyle}>{group.name}</span>
      <div style={barTrackStyle}>
        {remainingFraction > 0 && (
          <div style={{ ...barSegmentStyle, width: `${remainingFraction * 100}%`, background: fullColor }} />
        )}
        {completedFraction > 0 && (
          <div style={{ ...barSegmentStyle, width: `${completedFraction * 100}%`, background: fullColor, opacity: COMPLETED_OPACITY }} />
        )}
      </div>
      <span style={pctStyle}>{Math.round(remainingFraction * 100)}%</span>
    </div>
  );
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 1,
  background: 'white',
  borderRadius: 8,
  padding: '0.75rem 1rem',
  minWidth: 240,
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  fontFamily: 'system-ui, sans-serif',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 6,
};

const swatchStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  flexShrink: 0,
};

const nameStyle: CSSProperties = {
  fontSize: '0.7rem',
  fontFamily: 'ui-monospace, monospace',
  color: '#333',
  width: 52,
  flexShrink: 0,
};

const barTrackStyle: CSSProperties = {
  flex: 1,
  height: 10,
  borderRadius: 4,
  overflow: 'hidden',
  display: 'flex',
  background: '#eee',
};

const barSegmentStyle: CSSProperties = {
  height: '100%',
};

const pctStyle: CSSProperties = {
  fontSize: '0.7rem',
  color: '#666',
  width: 32,
  textAlign: 'right',
  flexShrink: 0,
};
