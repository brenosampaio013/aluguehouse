"use client";

import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/textarea-field";
import { saveBookingNotes } from "@/server/actions/booking-admin";

import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

export function BookingNotesForm({ bookingId, notes }: { bookingId: string; notes: string }) {
  const { state, pending, formProps } = useFormAction(saveBookingNotes);
  return (
    <form {...formProps} className="grid gap-3">
      <input type="hidden" name="id" value={bookingId} />
      <TextareaField
        label="Anotações internas"
        name="admin_notes"
        rows={4}
        maxLength={5000}
        defaultValue={notes}
        hint="Só você vê. Ex.: hóspede avisou que chega à noite."
        error={state.fieldErrors?.admin_notes}
      />
      <FormFeedback state={state} />
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Salvando…" : "Salvar anotações"}
        </Button>
      </div>
    </form>
  );
}
