/**
 * Busca de endereço → coordenada (geocodificação) pelo Nominatim, o serviço
 * gratuito do OpenStreetMap, sem chave. Usado só no painel, ao cadastrar a
 * localização do imóvel: a pessoa escolhe o resultado e confere o ponto no
 * mapa antes de salvar.
 *
 * Política de uso do Nominatim: no máximo 1 busca por segundo e identificação
 * do site no User-Agent. Uma busca por clique no painel fica bem abaixo disso.
 */
export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/** Litoral atendido (Bertioga a Ubatuba): resultados daqui vêm primeiro. */
const COAST_VIEWBOX = "-46.35,-23.25,-44.7,-24.0";

export type GeocodeResult = { label: string; lat: number; lng: number };

export function nominatimSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    countrycodes: "br",
    viewbox: COAST_VIEWBOX,
    limit: "5",
    "accept-language": "pt-BR",
  });
  return `${NOMINATIM_URL}?${params}`;
}

/** Converte a resposta do Nominatim, ignorando itens inválidos. */
export function parseNominatim(data: unknown): GeocodeResult[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item): GeocodeResult[] => {
    if (!item || typeof item !== "object") return [];
    const { display_name, lat, lon } = item as Record<string, unknown>;
    const latN = Number(lat);
    const lngN = Number(lon);
    if (
      typeof display_name !== "string" ||
      !Number.isFinite(latN) ||
      !Number.isFinite(lngN) ||
      Math.abs(latN) > 90 ||
      Math.abs(lngN) > 180
    ) {
      return [];
    }
    return [{ label: display_name.slice(0, 200), lat: roundCoord(latN), lng: roundCoord(lngN) }];
  });
}

/** 6 casas decimais (~10 cm): a precisão da coluna exact_lat/exact_lng. */
export function roundCoord(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
