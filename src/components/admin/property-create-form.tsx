"use client";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { propertyTypeLabels } from "@/lib/properties/labels";
import { createProperty } from "@/server/actions/properties";
import { useFormAction } from "./use-form-action";

const typeOptions = Object.entries(propertyTypeLabels).map(([value, label]) => ({ value, label }));

export function PropertyCreateForm() {
  const { state, pending, formProps } = useFormAction(createProperty);
  return (
    <form {...formProps} className="grid max-w-lg gap-5">
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
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando…" : "Criar rascunho"}
      </Button>
    </form>
  );
}
