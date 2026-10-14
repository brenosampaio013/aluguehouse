"use client";

import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { updateAmenities } from "@/server/actions/properties";

import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

export function AmenitiesForm({
  propertyId,
  amenities,
  selected,
}: {
  propertyId: string;
  amenities: { id: string; label: string }[];
  selected: string[];
}) {
  const { state, pending, formProps } = useFormAction(updateAmenities);
  const chosen = new Set(selected);
  return (
    <form {...formProps} className="grid gap-5">
      <input type="hidden" name="id" value={propertyId} />
      <fieldset>
        <legend className="sr-only">Comodidades do imóvel</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {amenities.map((amenity) => (
            <CheckboxField
              key={amenity.id}
              label={amenity.label}
              name="amenity"
              value={amenity.id}
              defaultChecked={chosen.has(amenity.id)}
            />
          ))}
        </div>
      </fieldset>
      <FormFeedback state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar comodidades"}
        </Button>
      </div>
    </form>
  );
}
