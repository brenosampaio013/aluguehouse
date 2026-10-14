import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { SelectField } from "@/components/ui/select-field";
import { propertyTypeLabels } from "@/lib/properties/labels";
import { regions } from "@/lib/regions";
import { areaOptions, salePriceOptions, type SaleFilters } from "@/lib/search/sale-params";

const typeOptions = [
  { value: "", label: "Todos" },
  ...Object.entries(propertyTypeLabels).map(([value, label]) => ({ value, label })),
];

const bedroomOptions = [
  { value: "", label: "Qualquer" },
  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} ou mais` })),
];

const sortOptions = [
  { value: "recentes", label: "Mais recentes" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
];

/** Filtros de venda como formulário GET (funcionam sem JavaScript). */
export function SaleFiltersForm({
  filters,
  amenities,
}: {
  filters: SaleFilters;
  amenities: { slug: string; label: string }[];
}) {
  const selected = new Set(filters.comodidades);
  const price = String(filters.precoMax ?? "");
  // Mantém um valor vindo da URL mesmo se não estiver nas faixas padrão.
  const priceOptions = salePriceOptions.some((o) => o.value === price)
    ? salePriceOptions
    : [
        ...salePriceOptions,
        { value: price, label: `Até R$ ${Number(price).toLocaleString("pt-BR")}` },
      ];

  return (
    <form
      method="get"
      action="/venda"
      aria-label="Filtros"
      className="grid gap-6 rounded-photo border border-areia p-5"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField
          label="Região"
          name="regiao"
          defaultValue={filters.regiao ?? ""}
          options={[
            { value: "", label: "Qualquer região" },
            ...regions.map((r) => ({ value: r.slug, label: r.name })),
          ]}
        />
        <SelectField
          label="Tipo"
          name="tipo"
          options={typeOptions}
          defaultValue={filters.tipo ?? ""}
        />
        <SelectField
          label="Preço máximo"
          name="preco_max"
          options={priceOptions}
          defaultValue={price}
        />
        <SelectField
          label="Quartos"
          name="quartos"
          options={bedroomOptions}
          defaultValue={filters.quartos ? String(filters.quartos) : ""}
        />
        <SelectField
          label="Área"
          name="area_min"
          options={areaOptions}
          defaultValue={filters.areaMin ? String(filters.areaMin) : ""}
        />
        <SelectField
          label="Ordenar por"
          name="ordem"
          options={sortOptions}
          defaultValue={filters.ordem}
        />
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 font-semibold">Comodidades</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {amenities.map((amenity) => (
            <CheckboxField
              key={amenity.slug}
              label={amenity.label}
              name="comodidade"
              value={amenity.slug}
              defaultChecked={selected.has(amenity.slug)}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit">Aplicar filtros</Button>
        <Link href="/venda" className="font-semibold text-petroleo underline underline-offset-3">
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
