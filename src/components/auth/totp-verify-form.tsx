"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { verifyTotp, type FormState } from "@/server/actions/auth";

const initialState: FormState = { status: "idle" };

export function TotpVerifyForm({ factorId }: { factorId: string }) {
  const [state, formAction, pending] = useActionState(verifyTotp, initialState);

  return (
    <form action={formAction} className="grid max-w-sm gap-5" noValidate>
      <input type="hidden" name="factorId" value={factorId} />
      <TextField
        label="Código de 6 dígitos"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        error={state.fieldErrors?.code}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Verificando…" : "Confirmar código"}
      </Button>
    </form>
  );
}
