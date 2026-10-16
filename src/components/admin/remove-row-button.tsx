"use client";

import { Button } from "@/components/ui/button";
import type { FormState } from "@/server/actions/auth";

import { useConfirmSubmit } from "./ui/confirm-dialog";
import { useFormAction } from "./use-form-action";

/**
 * Botão "Remover" de uma linha (tarifa, taxa): pede confirmação, desabilita
 * enquanto envia e mostra o erro do servidor quando a remoção falha.
 */
export function RemoveRowButton({
  action,
  fields,
  label,
  confirmTitle,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: Record<string, string>;
  /** Nome do item, para leitores de tela (ex.: "tarifa Réveillon"). */
  label: string;
  confirmTitle: string;
}) {
  const { state, pending, formProps } = useFormAction(action);
  const confirm = useConfirmSubmit(() => ({
    title: confirmTitle,
    confirmLabel: "Remover",
    tone: "danger",
  }));
  return (
    <form
      {...formProps}
      onSubmit={(event) => confirm.intercept(event) || formProps.onSubmit(event)}
      className="inline-grid justify-items-end"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant="text" disabled={pending} className="text-erro hover:text-erro">
        {pending ? "Removendo…" : "Remover"}
        <span className="sr-only"> {label}</span>
      </Button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="mt-1 max-w-64 text-left text-small text-erro">
          {state.message}
        </p>
      ) : null}
      {confirm.dialog}
    </form>
  );
}
