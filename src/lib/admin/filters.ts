import { parseBookingTab } from "@/lib/booking/labels";
import { parseInquiryTab } from "@/lib/inquiries";
import { parseReviewTab } from "@/lib/reviews";

import {
  first,
  parseDate,
  parseEnum,
  parsePage,
  parseSearch,
  parseSort,
  type RawParams,
} from "./list-params";

/**
 * Filtros de cada lista do painel, lidos da URL. A página e a exportação
 * CSV usam a mesma leitura, então o arquivo traz exatamente o que a tela
 * mostra (sem a paginação).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseUuid(value: string | string[] | undefined): string | null {
  const v = first(value);
  return v && UUID.test(v) ? v.toLowerCase() : null;
}

// Imóveis ---------------------------------------------------------------

export const propertyStatuses = ["draft", "published", "archived"] as const;
export const propertyModes = ["temporada", "mensal", "venda"] as const;
export const propertySorts = ["atualizado", "titulo", "cidade", "criado"] as const;

export function parsePropertyFilters(params: RawParams) {
  return {
    q: parseSearch(params.q),
    status: parseEnum(params.situacao, propertyStatuses),
    mode: parseEnum(params.modalidade, propertyModes),
    sort: parseSort(params, propertySorts, { key: "atualizado", dir: "desc" }),
    page: parsePage(params.pagina),
  };
}
export type PropertyFilters = ReturnType<typeof parsePropertyFilters>;

// Solicitações de reserva -----------------------------------------------

export const bookingSorts = ["recebida", "chegada", "total", "hospede"] as const;
export const rentalModes = ["seasonal", "monthly"] as const;

export function parseBookingFilters(params: RawParams) {
  const tab = parseBookingTab(params.situacao);
  let from = parseDate(params.de);
  let to = parseDate(params.ate);
  if (from && to && from > to) [from, to] = [to, from];
  return {
    tab,
    q: parseSearch(params.q),
    propertyId: parseUuid(params.imovel),
    mode: parseEnum(params.modalidade, rentalModes),
    from,
    to,
    // Pendentes: as mais antigas primeiro (quem espera há mais tempo).
    sort: parseSort(params, bookingSorts, {
      key: "recebida",
      dir: tab.status === "pending" ? "asc" : "desc",
    }),
    page: parsePage(params.pagina),
  };
}
export type BookingFilters = ReturnType<typeof parseBookingFilters>;

// Contatos --------------------------------------------------------------

export const inquiryKinds = ["contact", "visit", "sale_interest"] as const;

export function parseInquiryFilters(params: RawParams) {
  const tab = parseInquiryTab(params.situacao);
  return {
    tab,
    q: parseSearch(params.q),
    kind: parseEnum(params.tipo, inquiryKinds),
    propertyId: parseUuid(params.imovel),
    // Novos: os mais antigos primeiro; demais abas: os mais recentes.
    dir: (first(params.dir) === "asc" || first(params.dir) === "desc"
      ? first(params.dir)
      : tab.status === "new"
        ? "asc"
        : "desc") as "asc" | "desc",
    page: parsePage(params.pagina),
  };
}
export type InquiryFilters = ReturnType<typeof parseInquiryFilters>;

// Avaliações ------------------------------------------------------------

export function parseReviewFilters(params: RawParams) {
  const rating = Number.parseInt(first(params.nota) ?? "", 10);
  return {
    tab: parseReviewTab(params.situacao),
    propertyId: parseUuid(params.imovel),
    rating: rating >= 1 && rating <= 5 ? rating : null,
    page: parsePage(params.pagina),
  };
}
export type ReviewFilters = ReturnType<typeof parseReviewFilters>;
