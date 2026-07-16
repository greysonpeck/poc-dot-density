/** A single synthetic (or eventually real) GPS ping. */
export interface TruckPoint {
  id: string; // crypto.randomUUID() — stable React key
  sequence: number; // 0-based order along the route; used to draw the pins-vs-path polyline in order
  lat: number;
  lng: number;
  timestamp?: string; // ISO 8601, optional synthetic ping time
  completed: boolean; // simulated work-completion status; completed pings render dimmed
}

/** One selectable pin icon style (halo/dot variant). Color is chosen separately per route
 *  from the shared palette — see PIN_COLORS in iconSets.ts — so style and color vary independently. */
export interface IconStyleDef {
  id: string; // stable id used in <select>
  label: string; // human label shown in the dropdown
  folder: string; // public/icons/<folder>/pin_<color>.png; '' for the inline SVG fallback style
  width: number; // intrinsic render width in px
  height: number; // intrinsic render height in px
  /** Fraction-based anchor point within the image, 0-1 on each axis.
   *  {x:0.5,y:1} = bottom-center (classic pin tip), {x:0.5,y:0.5} = center (dot/halo icon). */
  anchor: { x: number; y: number };
}

/** User-adjustable route generation parameters. */
export interface RouteParams {
  spacingMeters: number; // distance between consecutive sampled points along the spline
  jitterMeters: number; // max random offset applied to each sampled point
}

/** One simulated truck's route: a set of points sharing a single palette color. */
export interface RouteGroup {
  id: string;
  name: string; // display label, e.g. "1525_A" — see generateRouteName in lib/routeName.ts
  color: string; // one of PIN_COLORS (iconSets.ts), e.g. 'blue_3385F3'
  points: TruckPoint[];
}
