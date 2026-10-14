"use client";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { updatePrivate } from "@/server/actions/properties";
import type { Database } from "@/types/database";

import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

type PrivateData = Database["public"]["Tables"]["property_private"]["Row"];

const coord = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value).replace(".", ",");

export function PropertyPrivateForm({
  propertyId,
  data,
  approx,
}: {
  propertyId: string;
  data: PrivateData | null;
  approx: { lat: number | null; lng: number | null };
}) {
  const { state, pending, formProps } = useFormAction(updatePrivate);
  const e = state.fieldErrors ?? {};
  return (
    <form {...formProps} className="grid gap-5">
      <input type="hidden" name="id" value={propertyId} />
      <TextField
        label="Endereço completo"
        name="full_address"
        defaultValue={data?.full_address ?? ""}
        error={e.full_address}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Latitude exata"
          name="exact_lat"
          inputMode="decimal"
          defaultValue={coord(data?.exact_lat)}
          hint="Em graus decimais, ex.: -23,8012."
          error={e.exact_lat}
        />
        <TextField
          label="Longitude exata"
          name="exact_lng"
          inputMode="decimal"
          defaultValue={coord(data?.exact_lng)}
          hint="Ex.: -46,0123."
          error={e.exact_lng}
        />
      </div>
      <p className="text-small text-rocha">
        Coordenada pública (aproximada, calculada automaticamente):{" "}
        <strong className="text-abismo">
          {approx.lat !== null && approx.lng !== null
            ? `${coord(approx.lat)}, ${coord(approx.lng)}`
            : "ainda não definida"}
        </strong>
      </p>
      <TextareaField
        label="Anotações internas"
        name="owner_notes"
        rows={4}
        defaultValue={data?.owner_notes ?? ""}
        hint="Visível só no painel. Evite guardar dados pessoais desnecessários do proprietário."
        error={e.owner_notes}
      />
      <FormFeedback state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar localização"}
        </Button>
      </div>
    </form>
  );
}
