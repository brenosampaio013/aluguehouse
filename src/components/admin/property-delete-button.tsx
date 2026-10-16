"use client";

import { Button } from "@/components/ui/button";
import { deleteProperty } from "@/server/actions/properties";

import { useFormAction } from "./use-form-action";

/** Exclui o imóvel da lista do painel, depois de confirmar. */
export function PropertyDeleteButton({ id, title }: { id: string; title: string }) {
  const { state, pending, formProps } = useFormAction(deleteProperty);
  return (
    <form
      {...formProps}
      onSubmit={(event) => {
        const ok = window.confirm(
          `Excluir o anúncio “${title}”? As fotos e os vídeos também serão apagados. Esta ação não pode ser desfeita.`,
        );
        if (ok) formProps.onSubmit(event);
        else event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="text" disabled={pending} className="text-erro hover:text-erro">
        {pending ? "Excluindo…" : "Excluir"}
        <span className="sr-only"> {title}</span>
      </Button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="mt-1 max-w-64 text-small text-erro">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
