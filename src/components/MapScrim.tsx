import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface MapScrimProps {
  opacity: number;
}

/**
 * A translucent white layer inserted strictly between the basemap tiles and the route
 * markers/polylines, to mute the basemap so the data layer pops against it — for a busy area
 * where map detail competes with pins/lines for attention.
 *
 * This can't be done with the Map's `styles` prop: Google Maps doesn't allow inline `styles`
 * alongside a Map ID (required here for Advanced Markers) — the style is supposed to come from
 * the Map ID's Cloud Console config instead, so an inline styles array is silently ignored.
 * Instead, this uses a real `google.maps.OverlayView` inserted into the `overlayLayer` pane,
 * which sits below `markerLayer` (where AdvancedMarker renders) but above `mapPane` (the tiles) —
 * exactly the stacking needed. Route `Polyline`s also render in `overlayLayer`; prepending this
 * div as that pane's first child keeps it the bottom-most element there, so polylines (added
 * after, in DOM order) always stack above it regardless of mount timing.
 */
export function MapScrim({ opacity }: MapScrimProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const currentMap = map;

    class ScrimOverlay extends google.maps.OverlayView {
      private div: HTMLDivElement | null = null;

      onAdd() {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.background = 'white';
        div.style.opacity = String(opacity);
        div.style.pointerEvents = 'none';
        this.div = div;
        const pane = this.getPanes()?.overlayLayer;
        pane?.insertBefore(div, pane.firstChild);
      }

      draw() {
        if (!this.div) return;
        const projection = this.getProjection();
        const bounds = currentMap.getBounds();
        if (!projection || !bounds) return;

        const ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());
        const sw = projection.fromLatLngToDivPixel(bounds.getSouthWest());
        if (!ne || !sw) return;

        this.div.style.left = `${sw.x}px`;
        this.div.style.top = `${ne.y}px`;
        this.div.style.width = `${ne.x - sw.x}px`;
        this.div.style.height = `${sw.y - ne.y}px`;
      }

      onRemove() {
        this.div?.remove();
        this.div = null;
      }
    }

    const overlay = new ScrimOverlay();
    overlay.setMap(currentMap);
    return () => overlay.setMap(null);
  }, [map, opacity]);

  return null;
}
