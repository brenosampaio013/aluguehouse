"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { TrashIcon } from "@/components/ui/icons";
import { deleteProperty } from "@/server/actions/properties";

import { useConfirmSubmit } from "./ui/confirm-dialog";
import { useFormAction } from "./use-form-action";

/** Exclui o imóvel da lista do painel, depois de confirmar. */
export function PropertyDeleteButton({ id, title }: { id: string; title: string }) {
  const { state, pending, formProps } = useFormAction(deleteProperty);
  const pathname = usePathname();
  const search = useSearchParams();
  const params = new URLSearchParams(search);
  params.delete("aviso");
  const returnTo = params.size > 0 ? `${pathname}?${params}` : pathname;
  const confirm = useConfirmSubmit(() => ({
    title: `Excluir “${title}”?`,
    description:
      "O anúncio, as fotos, os vídeos, as tarifas e as taxas serão apagados. Esta ação não pode ser desfeita. Para tirar do ar mantendo o histórico, use “Arquivar”.",
    confirmLabel: "Excluir definitivamente",
    tone: "danger",
  }));
  return (
    <form
      {...formProps}
      onSubmit={(event) => confirm.intercept(event) || formProps.onSubmit(event)}
      className="inline-grid justify-items-end"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-2 text-small font-semibold text-erro hover:bg-erro/10 disabled:opacity-60"
      >
        <TrashIcon width={16} height={16} />
        {pending ? "Excluindo…" : "Excluir"}
        <span className="sr-only"> {title}</span>
      </button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="mt-1 max-w-64 text-left text-small text-erro">
          {state.message}
        </p>
      ) : null}
      {confirm.dialog}
    </form>
  );
}
