/**
 * Estilo do mapa (MapLibre). Padrão: OpenFreeMap, gratuito e sem chave.
 * Pode ser trocado por mapas próprios (ex.: PMTiles no Cloudflare R2) pela
 * variável NEXT_PUBLIC_MAP_STYLE_URL.
 */
export const DEFAULT_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export function mapStyleUrl(): string {
  return process.env.NEXT_PUBLIC_MAP_STYLE_URL || DEFAULT_MAP_STYLE_URL;
}

/** Raio do círculo exibido: cobre a incerteza da localização aproximada (~550 m). */
export const APPROX_RADIUS_M = 600;

const EARTH_RADIUS_M = 6_371_000;

/** Polígono GeoJSON aproximando um círculo de `radiusM` metros. */
export function circlePolygon(lat: number, lng: number, radiusM = APPROX_RADIUS_M, steps = 48) {
  const latRad = (lat * Math.PI) / 180;
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.cos(latRad);
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * 2 * Math.PI;
    ring.push([
      Number((lng + dLng * Math.cos(angle)).toFixed(6)),
      Number((lat + dLat * Math.sin(angle)).toFixed(6)),
    ]);
  }
  return { type: "Polygon" as const, coordinates: [ring] };
}

/** Distância em metros entre dois pontos (fórmula de haversine). */
export function distanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
