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
  verb = "Remover",
  pendingVerb = "Removendo…",
  keepLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: Record<string, string>;
  /** Nome do item, para leitores de tela (ex.: "tarifa Réveillon"). */
  label: string;
  confirmTitle: string;
  /** Texto do botão e da confirmação (ex.: "Cancelar pedido"). */
  verb?: string;
  pendingVerb?: string;
  /** Botão que desiste da ação (padrão "Cancelar"). */
  keepLabel?: string;
}) {
  const { state, pending, formProps } = useFormAction(action);
  const confirm = useConfirmSubmit(() => ({
    title: confirmTitle,
    confirmLabel: verb,
    cancelLabel: keepLabel,
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
        {pending ? pendingVerb : verb}
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
