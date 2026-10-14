import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export const propertyTypeLabels: Record<Enums["property_type"], string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  cobertura: "Cobertura",
  terreno: "Terreno",
  outro: "Outro",
};

export const propertyStatusLabels: Record<Enums["property_status"], string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

export const feeCalcLabels: Record<Enums["fee_calc"], string> = {
  fixed: "Valor fixo",
  per_night: "Por noite",
  per_guest_per_night: "Por hóspede, por noite",
  percent: "Percentual sobre as diárias",
};

export const feeAppliesToLabels: Record<Enums["fee_applies_to"], string> = {
  both: "Temporada e mensal",
  seasonal: "Só temporada",
  monthly: "Só mensal",
};
