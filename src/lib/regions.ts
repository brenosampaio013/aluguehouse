/** Regiões da linha da costa, em ordem geográfica pela Rio-Santos (aprovado na Etapa 2). */
export const regions = [
  { slug: "riviera-de-sao-lourenco", name: "Riviera de São Lourenço", caption: "Bertioga" },
  { slug: "sao-sebastiao", name: "São Sebastião", caption: "Costa sul" },
  { slug: "ilhabela", name: "Ilhabela", caption: "Arquipélago" },
  { slug: "caraguatatuba", name: "Caraguatatuba", caption: "Litoral Norte" },
  { slug: "ubatuba", name: "Ubatuba", caption: "Divisa com o RJ" },
] as const;

export type RegionSlug = (typeof regions)[number]["slug"];
