"use client";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { propertyTypeLabels } from "@/lib/properties/labels";
import { createProperty } from "@/server/actions/properties";
import { AmenitiesPicker } from "./amenities-picker";
import { useFormAction } from "./use-form-action";

const typeOptions = Object.entries(propertyTypeLabels).map(([value, label]) => ({ value, label }));

export function PropertyCreateForm() {
  const { state, pending, formProps } = useFormAction(createProperty);
  return (
    <form {...formProps} className="grid gap-5">
      <div className="grid max-w-lg gap-5">
        <TextField
          label="Título do anúncio"
          name="title"
          hint="Como aparece para os visitantes, ex.: Apartamento a 100 m da praia."
          required
          error={state.fieldErrors?.title}
        />
        <SelectField
          label="Tipo"
          name="property_type"
          options={typeOptions}
          error={state.fieldErrors?.property_type}
        />
        <TextField
          label="Cidade"
          name="city"
          defaultValue="Bertioga"
          required
          error={state.fieldErrors?.city}
        />
      </div>
      <details className="group rounded-control border border-areia p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
          Comodidades (opcional)
          <span className="text-small font-normal text-rocha group-open:hidden">
            Também dá para marcar depois, na edição
          </span>
        </summary>
        <div className="mt-4">
          <AmenitiesPicker />
        </div>
      </details>
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Criando…" : "Criar rascunho"}
        </Button>
      </div>
    </form>
  );
}
