"use client";

import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { toDecimalInput } from "@/lib/format";
import { propertyTypeLabels } from "@/lib/properties/labels";
import { regions } from "@/lib/regions";
import { updateGeneral } from "@/server/actions/properties";
import type { Database } from "@/types/database";

import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

type Property = Database["public"]["Tables"]["properties"]["Row"];

const typeOptions = Object.entries(propertyTypeLabels).map(([value, label]) => ({ value, label }));
const regionOptions = [
  { value: "", label: "Não definida" },
  ...regions.map((region) => ({ value: region.slug, label: region.name })),
];

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-5 rounded-photo border border-areia p-5">
      <legend className="px-1 font-semibold">{legend}</legend>
      {children}
    </fieldset>
  );
}

export function PropertyGeneralForm({ property }: { property: Property }) {
  const { state, pending, formProps } = useFormAction(updateGeneral);
  const e = state.fieldErrors ?? {};
  const time = (value: string) => value.slice(0, 5);

  return (
    <form {...formProps} className="grid gap-6">
      <input type="hidden" name="id" value={property.id} />

      <Fieldset legend="Anúncio">
        <TextField label="Título" name="title" defaultValue={property.title} error={e.title} />
        <TextField
          label="Endereço na web (slug)"
          name="slug"
          defaultValue={property.slug}
          hint="Parte final do link do imóvel. Mudar depois de publicado quebra links já compartilhados."
          error={e.slug}
        />
        <TextareaField
          label="Resumo"
          name="summary"
          rows={2}
          defaultValue={property.summary ?? ""}
          hint="Uma ou duas frases para os cartões de listagem (até 300 caracteres)."
          error={e.summary}
        />
        <TextareaField
          label="Descrição completa"
          name="description"
          rows={8}
          defaultValue={property.description ?? ""}
          error={e.description}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <SelectField
            label="Tipo"
            name="property_type"
            options={typeOptions}
            defaultValue={property.property_type}
            error={e.property_type}
          />
          <TextField label="Cidade" name="city" defaultValue={property.city} error={e.city} />
          <TextField
            label="Bairro ou módulo"
            name="neighborhood"
            defaultValue={property.neighborhood ?? ""}
            error={e.neighborhood}
          />
          <SelectField
            label="Região (linha da costa)"
            name="region"
            options={regionOptions}
            defaultValue={property.region ?? ""}
            hint="Usada no filtro de região do site. Sem região, o imóvel só aparece em “Qualquer região”."
            error={e.region}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Modalidades e preços">
        <div className="grid gap-3">
          <CheckboxField
            label="Aluguel por temporada (1 a 29 noites)"
            name="offers_seasonal"
            defaultChecked={property.offers_seasonal}
          />
          <CheckboxField
            label="Aluguel mensal (30 a 90 noites)"
            name="offers_monthly"
            defaultChecked={property.offers_monthly}
          />
          <CheckboxField label="Venda" name="offers_sale" defaultChecked={property.offers_sale} />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            label="Diária base (R$)"
            name="nightly_price"
            inputMode="decimal"
            defaultValue={toDecimalInput(property.nightly_price)}
            hint="Usada fora das tarifas sazonais."
            error={e.nightly_price}
          />
          <TextField
            label="Valor mensal (R$, por 30 noites)"
            name="monthly_price"
            inputMode="decimal"
            defaultValue={toDecimalInput(property.monthly_price)}
            error={e.monthly_price}
          />
          <TextField
            label="Preço de venda (R$)"
            name="sale_price"
            inputMode="decimal"
            defaultValue={toDecimalInput(property.sale_price)}
            error={e.sale_price}
          />
          <TextField
            label="Mínimo de noites (temporada)"
            name="min_nights"
            type="number"
            min={1}
            max={29}
            defaultValue={property.min_nights}
            error={e.min_nights}
          />
          <TextField
            label="Máximo de noites"
            name="max_nights"
            type="number"
            min={1}
            max={90}
            defaultValue={property.max_nights}
            hint="Até 90 (limite da locação por temporada)."
            error={e.max_nights}
          />
          <TextField
            label="Condomínio (R$/mês)"
            name="condo_fee"
            inputMode="decimal"
            defaultValue={toDecimalInput(property.condo_fee)}
            error={e.condo_fee}
          />
          <TextField
            label="IPTU (R$/ano)"
            name="iptu_yearly"
            inputMode="decimal"
            defaultValue={toDecimalInput(property.iptu_yearly)}
            error={e.iptu_yearly}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Características">
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            label="Quartos"
            name="bedrooms"
            type="number"
            min={0}
            max={50}
            defaultValue={property.bedrooms}
            error={e.bedrooms}
          />
          <TextField
            label="Suítes"
            name="suites"
            type="number"
            min={0}
            max={50}
            defaultValue={property.suites}
            error={e.suites}
          />
          <TextField
            label="Banheiros"
            name="bathrooms"
            type="number"
            min={0}
            max={50}
            defaultValue={property.bathrooms}
            error={e.bathrooms}
          />
          <TextField
            label="Capacidade (hóspedes)"
            name="max_guests"
            type="number"
            min={1}
            max={50}
            defaultValue={property.max_guests}
            error={e.max_guests}
          />
          <TextField
            label="Vagas de garagem"
            name="parking_spots"
            type="number"
            min={0}
            max={50}
            defaultValue={property.parking_spots}
            error={e.parking_spots}
          />
          <TextField
            label="Área (m²)"
            name="area_m2"
            inputMode="decimal"
            defaultValue={
              property.area_m2 === null ? "" : String(property.area_m2).replace(".", ",")
            }
            error={e.area_m2}
          />
          <TextField
            label="Distância da praia (m)"
            name="distance_to_beach_m"
            type="number"
            min={0}
            defaultValue={property.distance_to_beach_m ?? ""}
            error={e.distance_to_beach_m}
          />
          <TextField
            label="Check-in a partir de"
            name="check_in_time"
            type="time"
            defaultValue={time(property.check_in_time)}
            error={e.check_in_time}
          />
          <TextField
            label="Check-out até"
            name="check_out_time"
            type="time"
            defaultValue={time(property.check_out_time)}
            error={e.check_out_time}
          />
        </div>
        <TextareaField
          label="Regras da casa"
          name="house_rules"
          rows={4}
          defaultValue={property.house_rules ?? ""}
          error={e.house_rules}
        />
      </Fieldset>

      <FormFeedback state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar dados gerais"}
        </Button>
      </div>
    </form>
  );
}
