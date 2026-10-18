"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getPublicEnv } from "@/lib/env";
import { nominatimSearchUrl, parseNominatim, type GeocodeResult } from "@/lib/geocode";

export type GeocodeResponse =
  { status: "ok"; results: GeocodeResult[] } | { status: "error"; message: string };

/**
 * Procura o endereço digitado no painel e devolve até 5 lugares com
 * coordenadas. Só para admin; nada é salvo aqui (a pessoa confere o ponto no
 * mapa e salva a localização).
 */
export async function geocodeAddress(query: string): Promise<GeocodeResponse> {
  await requireAdmin();
  const q = String(query ?? "").trim();
  if (q.length < 5 || q.length > 300) {
    return { status: "error", message: "Digite o endereço completo, com número, bairro e cidade." };
  }

  try {
    const response = await fetch(nominatimSearchUrl(q), {
      headers: {
        // Identificação exigida pela política de uso do Nominatim.
        "User-Agent": `AlugueHouses/1.0 (+${getPublicEnv().NEXT_PUBLIC_SITE_URL})`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`nominatim ${response.status}`);
    const results = parseNominatim(await response.json());
    if (results.length === 0) {
      return {
        status: "error",
        message:
          "Endereço não encontrado. Tente sem o número ou com o nome do bairro, ou marque o ponto direto no mapa.",
      };
    }
    return { status: "ok", results };
  } catch {
    return {
      status: "error",
      message: "A busca de endereço não respondeu agora. Marque o ponto direto no mapa.",
    };
  }
}
