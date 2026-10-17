"use client";

import { FormFeedback } from "@/components/admin/form-feedback";
import { useFormAction } from "@/components/admin/use-form-action";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { updateOwnerProfile } from "@/server/actions/owner";

/** Nome e telefone de contato do proprietário. */
export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const { state, pending, formProps } = useFormAction(updateOwnerProfile);
  return (
    <form {...formProps} className="grid max-w-xl gap-4">
      <TextField
        label="Nome completo"
        name="fullName"
        defaultValue={fullName}
        maxLength={120}
        autoComplete="name"
        error={state.fieldErrors?.fullName}
      />
      <TextField
        label="Telefone (com DDD)"
        name="phone"
        defaultValue={phone}
        inputMode="tel"
        autoComplete="tel"
        hint="Só números, ex.: 13999990000."
        error={state.fieldErrors?.phone}
      />
      <FormFeedback state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
