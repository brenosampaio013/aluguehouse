import type { HeroPhoto } from "@/lib/home/hero-photo";
import { regions, type RegionSlug } from "@/lib/regions";

/**
 * Destinos da página inicial, na ordem da Rio-Santos (src/lib/regions.ts).
 * Os textos descrevem só a geografia da região.
 *
 * `photo: null`: ainda não há foto; o cartão usa um desenho próprio, sem
 * simular foto. Para colocar uma foto:
 * `pnpm hero:photo caminho/da/foto.jpg destino-<slug>` e preencha `photo`
 * com `{ basePath: "/inicio/destino-<slug>", widths: [...], alt: "…",
 * illustrative: true }` (`illustrative` se não for um imóvel anunciado).
 */
export type Destination = {
  slug: RegionSlug;
  name: string;
  caption: string;
  description: string;
  photo: HeroPhoto | null;
};

const details: Record<RegionSlug, Pick<Destination, "description" | "photo">> = {
  "riviera-de-sao-lourenco": {
    description:
      "Bairro planejado em Bertioga, com praia extensa, ciclovias e infraestrutura completa.",
    photo: null,
  },
  "sao-sebastiao": {
    description: "As praias da costa sul, como Maresias, Juquehy e Barra do Sahy.",
    photo: null,
  },
  ilhabela: {
    description: "O arquipélago em frente a São Sebastião, com acesso de balsa.",
    photo: null,
  },
  caraguatatuba: {
    description: "A maior cidade do Litoral Norte, com orla plana e acesso fácil.",
    photo: null,
  },
  ubatuba: {
    description: "Dezenas de praias entre a Serra do Mar e o oceano, até a divisa com o RJ.",
    photo: null,
  },
};

export const destinations: readonly Destination[] = regions.map((region) => ({
  ...region,
  ...details[region.slug],
}));

export function destinationHref(slug: RegionSlug) {
  return `/temporada?regiao=${slug}`;
}

/** "1 imóvel para temporada" / "3 imóveis para temporada"; nada quando não há. */
export function rentalCountLabel(count: number) {
  if (count <= 0) return null;
  return `${count} ${count === 1 ? "imóvel" : "imóveis"} para temporada`;
}
