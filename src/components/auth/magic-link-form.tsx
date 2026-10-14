"use client";

import { useActionState } from "react";

import { PrivacyLink, TermsLink } from "@/components/legal/privacy-link";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";
import { requestMagicLink, type FormState } from "@/server/actions/auth";

const initialState: FormState = { status: "idle" };

export function MagicLinkForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(requestMagicLink, initialState);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={formAction} className="grid max-w-sm gap-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField
        label="E-mail"
        name="email"
        type="email"
        defaultValue={state.values?.email}
        autoComplete="email"
        inputMode="email"
        required
        error={state.fieldErrors?.email}
      />
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar link de acesso"}
      </Button>
      <p className="text-small text-rocha">
        Ao entrar, você concorda com os <TermsLink /> e a <PrivacyLink />.
      </p>
    </form>
  );
}
