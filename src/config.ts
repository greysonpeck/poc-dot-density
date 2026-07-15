export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
// `||` on purpose, not `??`: an unset GitHub Actions secret interpolates to an empty string,
// not undefined, so `??` wouldn't fall back to the default and would bake in an empty Map ID.
export const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

export const isConfigured = GOOGLE_MAPS_API_KEY.length > 0;
