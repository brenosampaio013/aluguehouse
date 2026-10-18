import { MAX_AREA_SPAN_DEG, type MapArea } from "./params";

/** Lógica do mapa de preços sem MapLibre nem React (testável). */

export type MarkerPoint = { id: string; lat: number; lng: number };

const compact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const whole = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** Texto curto do marcador: "R$ 1.250" ou, a partir de 10 mil, "R$ 15 mil". */
export function markerPriceLabel(price: number | null): string {
  if (price === null) return "Consultar";
  const rounded = Math.round(price);
  // Intl usa espaço não separável; o marcador fica mais legível com espaço comum.
  return (rounded >= 10_000 ? compact.format(rounded) : whole.format(rounded)).replace(/\s/g, " ");
}

/** Nome acessível do marcador: título, preço completo e avaliação. */
export function markerAriaLabel(m: {
  title: string;
  price: number | null;
  priceKind: "night" | "month";
  rating: { average: number; count: number } | null;
}): string {
  const price =
    m.price === null
      ? "preço sob consulta"
      : `${whole.format(Math.round(m.price))} ${m.priceKind === "night" ? "por noite" : "por mês"}`;
  const rating = m.rating ? `, nota ${m.rating.average.toLocaleString("pt-BR")}` : "";
  return `${m.title}, ${price}${rating}`.replace(/\u00a0|\u202f/g, " ");
}

/** Retângulo que contém todos os pontos, ou null sem pontos. */
export function pointsBounds(points: MarkerPoint[]): MapArea | null {
  if (points.length === 0) return null;
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of points) {
    w = Math.min(w, p.lng);
    e = Math.max(e, p.lng);
    s = Math.min(s, p.lat);
    n = Math.max(n, p.lat);
  }
  return [w, s, e, n];
}

/** GeoJSON da fonte agrupada do mapa: só o id em cada ponto. */
export function markersGeoJSON(points: MarkerPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((p) => ({
      type: "Feature" as const,
      properties: { id: p.id },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  };
}

/**
 * Área visível do mapa para "Pesquisar nesta área", limitada às faixas
 * válidas; null se o mapa estiver afastado demais (a busca recusaria).
 */
export function visibleArea(
  bounds: { west: number; south: number; east: number; north: number },
  maxSpanDeg = MAX_AREA_SPAN_DEG,
): MapArea | null {
  const w = Math.max(-180, bounds.west);
  const e = Math.min(180, bounds.east);
  const s = Math.max(-90, bounds.south);
  const n = Math.min(90, bounds.north);
  if (!(w < e && s < n) || e - w > maxSpanDeg || n - s > maxSpanDeg) return null;
  return [w, s, e, n];
}
