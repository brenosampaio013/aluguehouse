"use client";

import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/ui/icons";
import { inquiryStatusLabels, type InquiryStatus } from "@/lib/inquiries";
import { deleteInquiry, setInquiryStatus } from "@/server/actions/inquiries";

import { FormFeedback } from "./form-feedback";
import { useConfirmSubmit } from "./ui/confirm-dialog";
import { useFormAction } from "./use-form-action";

const actions: Record<InquiryStatus, { status: InquiryStatus; label: string }[]> = {
  new: [
    { status: "in_progress", label: "Marcar como em andamento" },
    { status: "closed", label: "Encerrar" },
  ],
  in_progress: [
    { status: "closed", label: "Encerrar" },
    { status: "new", label: "Voltar para novos" },
  ],
  closed: [{ status: "in_progress", label: "Reabrir" }],
};

export function InquiryStatusForm({
  inquiryId,
  status,
  returnTo,
}: {
  inquiryId: string;
  status: InquiryStatus;
  /** Lista atual (aba, busca), para voltar a ela depois de salvar. */
  returnTo: string;
}) {
  const { state, pending, formProps } = useFormAction(setInquiryStatus);
  return (
    <form {...formProps} className="grid gap-3">
      <input type="hidden" name="id" value={inquiryId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-2">
        {actions[status].map((action, index) => (
          <Button
            key={action.status}
            type="submit"
            name="status"
            value={action.status}
            variant={index === 0 ? "primary" : "secondary"}
            disabled={pending}
            className="min-h-10 px-4"
          >
            {action.label}
            <span className="sr-only"> ({inquiryStatusLabels[action.status]})</span>
          </Button>
        ))}
      </div>
    </form>
  );
}

/** Exclui a mensagem depois de confirmação explícita (irreversível). */
export function InquiryDeleteButton({
  inquiryId,
  name,
  returnTo,
}: {
  inquiryId: string;
  name: string;
  returnTo: string;
}) {
  const { state, pending, formProps } = useFormAction(deleteInquiry);
  const confirm = useConfirmSubmit(() => ({
    title: `Excluir a mensagem de ${name}?`,
    description:
      "A mensagem e os dados de contato serão apagados do banco. Esta ação não pode ser desfeita.",
    confirmLabel: "Excluir mensagem",
    tone: "danger",
  }));
  return (
    <form
      {...formProps}
      onSubmit={(event) => confirm.intercept(event) || formProps.onSubmit(event)}
      className="grid gap-2"
    >
      <input type="hidden" name="id" value={inquiryId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {state.status === "error" ? <FormFeedback state={state} /> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-control px-2 text-small font-semibold text-erro hover:bg-erro/10 disabled:opacity-60"
      >
        <TrashIcon width={16} height={16} />
        {pending ? "Excluindo…" : "Excluir mensagem"}
        <span className="sr-only"> de {name}</span>
      </button>
      {confirm.dialog}
    </form>
  );
}
