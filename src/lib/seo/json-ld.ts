import { siteConfig } from "@/lib/site-config";

type Thing = Record<string, unknown>;

/**
 * Serializa para <script type="application/ld+json">. Escapa "<" para que um
 * texto vindo do banco nunca feche a tag de script.
 */
export function serializeJsonLd(data: Thing | Thing[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function organizationJsonLd(siteUrl: string): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: new URL("/", siteUrl).toString(),
    logo: new URL("/icon.svg", siteUrl).toString(),
    email: siteConfig.contact.email,
    telephone: `+${siteConfig.contact.whatsapp}`,
    description: siteConfig.description,
    areaServed: ["Riviera de São Lourenço", "Litoral Norte de São Paulo"],
  };
}

const schemaType: Record<string, string> = {
  casa: "House",
  apartamento: "Apartment",
  cobertura: "Apartment",
  terreno: "Place",
  outro: "Accommodation",
};

export type ListingInput = {
  url: string;
  title: string;
  description: string | null;
  propertyType: string;
  city: string;
  neighborhood: string | null;
  /** Localização aproximada (pública); a exata nunca entra aqui. */
  geo: { lat: number; lng: number } | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  areaM2: number | null;
  amenities: string[];
  images: string[];
  publishedAt: string | null;
  prices: {
    nightly: number | null;
    monthly: number | null;
    sale: number | null;
  };
  rating: { average: number; count: number } | null;
};

/** Anúncio (RealEstateListing) com o imóvel e as ofertas de cada modalidade. */
export function listingJsonLd(input: ListingInput): Thing {
  const place: Thing = {
    "@type": schemaType[input.propertyType] ?? "Accommodation",
    name: input.title,
    address: {
      "@type": "PostalAddress",
      addressLocality: input.city,
      ...(input.neighborhood ? { streetAddress: input.neighborhood } : {}),
      addressRegion: "SP",
      addressCountry: "BR",
    },
    ...(input.geo
      ? { geo: { "@type": "GeoCoordinates", latitude: input.geo.lat, longitude: input.geo.lng } }
      : {}),
    ...(input.propertyType !== "terreno"
      ? {
          numberOfBedrooms: input.bedrooms,
          numberOfBathroomsTotal: input.bathrooms,
          occupancy: { "@type": "QuantitativeValue", maxValue: input.maxGuests },
        }
      : {}),
    ...(input.areaM2
      ? { floorSize: { "@type": "QuantitativeValue", value: input.areaM2, unitCode: "MTK" } }
      : {}),
    ...(input.amenities.length > 0
      ? {
          amenityFeature: input.amenities.map((name) => ({
            "@type": "LocationFeatureSpecification",
            name,
            value: true,
          })),
        }
      : {}),
    ...(input.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Math.round(input.rating.average * 10) / 10,
            reviewCount: input.rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  const offer = (price: number, extra: Thing): Thing => ({
    "@type": "Offer",
    price,
    priceCurrency: "BRL",
    url: input.url,
    ...extra,
  });
  const offers = [
    input.prices.nightly !== null
      ? offer(input.prices.nightly, {
          businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: input.prices.nightly,
            priceCurrency: "BRL",
            unitCode: "DAY",
            unitText: "noite",
          },
        })
      : null,
    input.prices.monthly !== null
      ? offer(input.prices.monthly, {
          businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: input.prices.monthly,
            priceCurrency: "BRL",
            unitCode: "MON",
            unitText: "mês",
          },
        })
      : null,
    input.prices.sale !== null
      ? offer(input.prices.sale, { businessFunction: "http://purl.org/goodrelations/v1#Sell" })
      : null,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: input.title,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.images.length > 0 ? { image: input.images } : {}),
    ...(input.publishedAt ? { datePosted: input.publishedAt } : {}),
    about: place,
    ...(offers.length > 0 ? { offers } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
