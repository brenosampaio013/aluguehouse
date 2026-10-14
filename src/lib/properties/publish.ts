export type PublishCheck = { label: string; ok: boolean };

/** Itens exigidos para publicar. O banco também valida os preços. */
export function publishChecklist(property: {
  title: string;
  offers_seasonal: boolean;
  offers_monthly: boolean;
  offers_sale: boolean;
  nightly_price: number | null;
  monthly_price: number | null;
  sale_price: number | null;
  imageCount: number;
}): PublishCheck[] {
  const offersSomething =
    property.offers_seasonal || property.offers_monthly || property.offers_sale;
  const pricesOk =
    (!property.offers_seasonal || property.nightly_price !== null) &&
    (!property.offers_monthly || property.monthly_price !== null) &&
    (!property.offers_sale || property.sale_price !== null);

  return [
    { label: "Pelo menos uma modalidade (temporada, mensal ou venda)", ok: offersSomething },
    { label: "Preço de cada modalidade oferecida", ok: offersSomething && pricesOk },
    { label: "Pelo menos uma foto", ok: property.imageCount > 0 },
  ];
}
