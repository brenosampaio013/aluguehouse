import { nightsBetween, type StayLimits } from "@/lib/booking/calendar";
import {
  findDestination,
  matchSearchDestinations,
  normalizeText,
  type SearchDestination,
} from "@/lib/destinations";

/** Lógica da barra de busca da página inicial (sem React, testável). */

export type SearchMode = "temporada" | "mensal" | "venda";

export const searchModes: { value: SearchMode; label: string }[] = [
  { value: "temporada", label: "Temporada" },
  { value: "mensal", label: "Mensal" },
  { value: "venda", label: "Venda" },
];

/** Janela de datas da busca: a mesma do calendário do imóvel. */
export const SEARCH_WINDOW_DAYS = 365;

/** Limite de hóspedes aceito pela listagem (parseRentalFilters). */
export const MAX_SEARCH_GUESTS = 50;

/** Noites aceitas em cada modalidade de aluguel. */
export const modeStayLimits: Record<Exclude<SearchMode, "venda">, StayLimits> = {
  temporada: { minNights: 1, maxNights: 29 },
  mensal: { minNights: 30, maxNights: SEARCH_WINDOW_DAYS },
};

export type Destination = SearchDestination;

/**
 * Destinos que combinam com o texto digitado: regiões, cidades e bairros
 * (src/lib/destinations.ts), sem diferenciar acentos. Texto vazio mostra as
 * regiões.
 */
export function matchDestinations(query: string): Destination[] {
  return matchSearchDestinations(query);
}

/**
 * Destino escolhido a partir do texto digitado, sem clicar numa sugestão:
 * o único que combina, ou o de nome idêntico (ex.: "Bertioga" também aparece
 * como legenda da Riviera).
 */
export function pickDestination(query: string): Destination | undefined {
  const matches = matchDestinations(query);
  if (matches.length === 1) return matches[0];
  const q = normalizeText(query);
  const exact = matches.filter((d) => normalizeText(d.name) === q);
  return exact.length === 1 ? exact[0] : undefined;
}

export function destinationName(slug: string | undefined) {
  return findDestination(slug)?.name;
}

export type Guests = { adults: number; children: number };

export function totalGuests(guests: Guests) {
  return guests.adults + guests.children;
}

/**
 * Aplica um passo (+1/−1) respeitando as regras: nunca negativo, total até a
 * capacidade e, havendo crianças, pelo menos um adulto.
 */
export function stepGuests(
  guests: Guests,
  field: keyof Guests,
  delta: 1 | -1,
  capacity: number,
): Guests {
  const next = { ...guests, [field]: guests[field] + delta };
  if (next[field] < 0) return guests;
  if (field === "children" && delta === 1 && next.adults === 0) next.adults = 1;
  if (field === "adults" && next.adults === 0 && next.children > 0) return guests;
  if (totalGuests(next) > capacity) return guests;
  return next;
}

export function guestsSummary(guests: Guests) {
  const total = totalGuests(guests);
  if (total === 0) return null;
  return `${total} ${total === 1 ? "hóspede" : "hóspedes"}`;
}

export type SearchInput = {
  mode: SearchMode;
  /** Slug do destino (região, cidade ou bairro). */
  destination?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: Guests;
  saleType?: string;
  salePriceMax?: string;
};

export type SearchResult = { ok: true; href: string } | { ok: false; error: string };

/** Valida e monta o endereço da listagem com os parâmetros que ela já entende. */
export function buildSearch(input: SearchInput, today: string): SearchResult {
  const params = new URLSearchParams();
  const destination = findDestination(input.destination);
  // Região usa o parâmetro de sempre (links antigos); cidade e bairro, "destino".
  // A venda filtra só por região: cidade e bairro levam à região deles.
  if (destination) {
    if (destination.kind === "region" || input.mode === "venda") {
      params.set("regiao", destination.region);
    } else {
      params.set("destino", destination.slug);
    }
  }

  if (input.mode === "venda") {
    if (input.saleType) params.set("tipo", input.saleType);
    if (input.salePriceMax) params.set("preco_max", input.salePriceMax);
  } else {
    const { checkIn, checkOut } = input;
    if (checkIn && checkOut) {
      if (checkIn < today) return { ok: false, error: "A data de check-in já passou." };
      const nights = nightsBetween(checkIn, checkOut);
      if (nights <= 0) return { ok: false, error: "O check-out precisa ser depois do check-in." };
      const limits = modeStayLimits[input.mode];
      if (nights > limits.maxNights && input.mode === "temporada") {
        return {
          ok: false,
          error: "Temporada vai até 29 noites. Para 30 noites ou mais, escolha Mensal.",
        };
      }
      if (nights < limits.minNights) {
        return {
          ok: false,
          error: "Aluguel mensal começa em 30 noites. Para estadias menores, escolha Temporada.",
        };
      }
      params.set("chegada", checkIn);
      params.set("saida", checkOut);
    } else if (checkIn || checkOut) {
      return { ok: false, error: "Escolha a data de check-out, ou limpe as datas." };
    }
    const total = input.guests ? totalGuests(input.guests) : 0;
    if (total > 0) params.set("hospedes", String(Math.min(total, MAX_SEARCH_GUESTS)));
  }

  const query = params.toString();
  return { ok: true, href: `/${input.mode}${query ? `?${query}` : ""}` };
}
