/**
 * Situação comercial mostrada sobre a foto do imóvel. Hoje só "sale" é
 * calculado (imóvel oferecido para venda); "rent" e "sold" já têm selo
 * pronto para quando o site passar a diferenciá-los.
 */
export type ListingStatus = "sale" | "rent" | "sold";

/** Situação comercial a partir das modalidades cadastradas. */
export function listingStatus(property: { offers_sale: boolean }): ListingStatus | null {
  return property.offers_sale ? "sale" : null;
}
