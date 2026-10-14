"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";

/** Janela com todas as fotos. Usa <dialog> nativo: Esc fecha e o foco volta ao botão. */
export function AllPhotosDialog({ count, children }: { count: number; children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => dialogRef.current?.showModal()}
        className="bg-branco/95"
      >
        Ver todas as fotos ({count})
      </Button>
      <dialog
        ref={dialogRef}
        aria-label="Todas as fotos"
        className="m-0 size-full max-h-none max-w-none bg-branco p-0 backdrop:bg-abismo/60"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-areia bg-branco px-4 py-2 sm:px-10">
          <p className="font-semibold">Todas as fotos ({count})</p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex size-11 items-center justify-center rounded-control hover:bg-areia"
          >
            <CloseIcon width={24} height={24} />
            <span className="sr-only">Fechar</span>
          </button>
        </div>
        <div className="mx-auto grid max-w-4xl gap-4 p-4 sm:p-10">{children}</div>
      </dialog>
    </>
  );
}
