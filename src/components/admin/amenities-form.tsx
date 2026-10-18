"use client";

import { Button } from "@/components/ui/button";
import { updateAmenities } from "@/server/actions/properties";

import { AmenitiesPicker } from "./amenities-picker";
import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

export function AmenitiesForm({
  propertyId,
  selected,
}: {
  propertyId: string;
  selected: string[];
}) {
  const { state, pending, formProps } = useFormAction(updateAmenities);
  return (
    <form {...formProps} className="grid gap-5">
      <input type="hidden" name="id" value={propertyId} />
      <AmenitiesPicker initial={selected} />
      <FormFeedback state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar comodidades"}
        </Button>
      </div>
    </form>
  );
}
