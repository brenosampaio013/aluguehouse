import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { regions } from "@/lib/regions";
import type { RentalFilters, RentalMode } from "@/lib/search/params";

const bedroomOptions = [
  { value: "", label: "Qualquer" },
  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} ou mais` })),
];

const sortOptions = [
  { value: "recentes", label: "Mais recentes" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
];

/**
 * Filtros como formulário GET: funcionam sem JavaScript e deixam a busca na
 * URL, pronta para compartilhar.
 */
export function RentalFiltersForm({
  path,
  mode,
  filters,
  amenities,
  today,
}: {
  path: string;
  mode: RentalMode;
  filters: RentalFilters;
  amenities: { slug: string; label: string }[];
  today: string;
}) {
  const selected = new Set(filters.comodidades);
  return (
    <form
      method="get"
      action={path}
      aria-label="Filtros"
      className="grid gap-6 rounded-photo border border-areia p-5"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Região"
          name="regiao"
          defaultValue={filters.regiao ?? ""}
          options={[
            { value: "", label: "Qualquer região" },
            ...regions.map((r) => ({ value: r.slug, label: r.name })),
          ]}
        />
        <TextField
          label="Chegada"
          name="chegada"
          type="date"
          min={today}
          defaultValue={filters.chegada}
        />
        <TextField
          label="Saída"
          name="saida"
          type="date"
          min={today}
          defaultValue={filters.saida}
          hint={mode === "seasonal" ? "Até 29 noites." : "De 30 a 90 noites."}
        />
        <TextField
          label="Hóspedes"
          name="hospedes"
          type="number"
          min={1}
          max={50}
          defaultValue={filters.hospedes}
        />
        <SelectField
          label="Quartos"
          name="quartos"
          options={bedroomOptions}
          defaultValue={filters.quartos ? String(filters.quartos) : ""}
        />
        <TextField
          label={mode === "seasonal" ? "Diária até (R$)" : "Aluguel mensal até (R$)"}
          name="preco_max"
          inputMode="numeric"
          pattern="[0-9]*"
          defaultValue={filters.precoMax}
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
        <Link href={path} className="font-semibold text-petroleo underline underline-offset-3">
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
