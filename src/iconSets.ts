import type { IconStyleDef } from './types';

const PIN_ANCHOR = { x: 0.5, y: 1 } as const; // teardrop pin — tip at bottom-center marks the exact coordinate

function pinStyle(id: string, label: string, folder: string): IconStyleDef {
  return { id, label, folder, width: 16, height: 16, anchor: PIN_ANCHOR };
}

/** RCC's current production style: white halo + center dot. This is the one that washes out. */
export const CURRENT_PROD_ICON_STYLE = pinStyle('pins-set', 'Current (halo + dot)', 'pins-set');

export const ICON_STYLES: IconStyleDef[] = [
  CURRENT_PROD_ICON_STYLE,
  pinStyle('pins-halo-nodot', 'Halo, no center dot', 'pins-halo-nodot'),
  pinStyle('pins-no-halo', 'No halo, with dot', 'pins-no-halo'),
  pinStyle('pins-nohalo-nodot', 'No halo, no dot', 'pins-nohalo-nodot'),
];

/** Inline placeholder so the map is never blank if an icon asset path ever fails to resolve. */
export const FALLBACK_ICON_STYLE: IconStyleDef = {
  id: 'fallback',
  label: 'Fallback (plain dot)',
  folder: '', // no PNGs — iconSrc() renders this one as an inline colored SVG instead
  width: 16,
  height: 16,
  anchor: { x: 0.5, y: 0.5 },
};

export const ALL_ICON_STYLES: IconStyleDef[] = [...ICON_STYLES, FALLBACK_ICON_STYLE];

/**
 * Ordered 20-color palette shared by every icon style/folder (`pin_<color>.png` in each).
 * Simulating N routes at once assigns the first N colors here, in this order, one per route —
 * see colorForRouteIndex.
 */
export const PIN_COLORS = [
  'amber_F8B31B',
  'blue_3385F3',
  'charcoal_4A4A4A',
  'crimson_AF0125',
  'gold_BA8600',
  'green_0BAE5B',
  'hotpink_F03080',
  'indigo_3838C8',
  'jade_087F67',
  'lavender_C370FB',
  'lime_90E000',
  'magenta_AB17B6',
  'mint_00D8A8',
  'navy_05188E',
  'olive_6B8200',
  'orange_FB8917',
  'purple_7050F0',
  'red_F01E1E',
  'sky_38C8F8',
  'teal_08A5A5',
] as const;

export function colorForRouteIndex(index: number): string {
  return PIN_COLORS[index % PIN_COLORS.length];
}

/** Extracts the `#RRGGBB` hex from a palette color key like 'blue_3385F3'. */
export function colorHex(color: string): string {
  return `#${color.split('_')[1] ?? '2563EB'}`;
}

/** Resolves an <img> src for a given icon style rendered in a given palette color. */
export function iconSrc(style: IconStyleDef, color: string): string {
  if (style.id === FALLBACK_ICON_STYLE.id) {
    return (
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">` +
          `<circle cx="8" cy="8" r="6" fill="${colorHex(color)}" stroke="white" stroke-width="2"/>` +
          `</svg>`,
      )
    );
  }
  // Runtime-constructed path — Vite only rewrites asset references it can statically see (e.g.
  // in index.html or import statements), so this needs BASE_URL by hand to resolve correctly
  // when deployed under a subpath (GitHub project pages: /<repo-name>/, not domain root).
  return `${import.meta.env.BASE_URL}icons/${style.folder}/pin_${color}.png`;
}
