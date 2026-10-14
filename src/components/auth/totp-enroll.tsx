"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { startTotpEnrollment, type EnrollState } from "@/server/actions/auth";

import { TotpVerifyForm } from "./totp-verify-form";

const initialState: EnrollState = { status: "idle" };

export function TotpEnroll() {
  const [state, formAction, pending] = useActionState(startTotpEnrollment, initialState);

  if (state.status === "success" && state.factorId && state.qrCode) {
    return (
      <div className="grid gap-8">
        <ol className="grid max-w-[60ch] list-decimal gap-2 pl-5">
          <li>
            Abra um aplicativo autenticador (Google Authenticator, Microsoft Authenticator,
            1Password…).
          </li>
          <li>Leia o QR code abaixo ou digite a chave manualmente.</li>
          <li>Digite o código de 6 dígitos que aparecer no aplicativo.</li>
        </ol>
        {/* O QR code vem do Supabase como SVG em data URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.qrCode}
          alt="QR code para cadastrar a Alugue Houses no aplicativo autenticador"
          width={192}
          height={192}
          className="rounded-control border border-junco bg-branco p-2"
        />
        <p className="grid gap-1">
          <span className="text-small font-semibold">Chave para digitar manualmente</span>
          <code data-testid="totp-secret" className="text-body break-all">
            {state.secret}
          </code>
        </p>
        <TotpVerifyForm factorId={state.factorId} />
      </div>
    );
  }

  return (
    <form action={formAction} className="grid max-w-sm gap-5">
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Preparando…" : "Configurar autenticador"}
      </Button>
    </form>
  );
}
