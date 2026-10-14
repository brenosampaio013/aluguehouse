"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";
import { adminSignIn, type FormState } from "@/server/actions/auth";

const initialState: FormState = { status: "idle" };

export function AdminSignInForm() {
  const [state, formAction, pending] = useActionState(adminSignIn, initialState);

  return (
    <form action={formAction} className="grid max-w-sm gap-5" noValidate>
      <TextField
        label="E-mail"
        name="email"
        type="email"
        defaultValue={state.values?.email}
        autoComplete="username"
        required
        error={state.fieldErrors?.email}
      />
      <TextField
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
