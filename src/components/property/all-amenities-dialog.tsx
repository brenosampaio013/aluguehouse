"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";

/** Lista completa de comodidades. Usa <dialog> nativo: Esc fecha e o foco volta ao botão. */
export function AllAmenitiesDialog({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <div>
        <Button variant="secondary" onClick={() => dialogRef.current?.showModal()}>
          Mostrar todas as {count} comodidades
        </Button>
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby="todas-comodidades"
        className="m-auto max-h-[min(90dvh,48rem)] w-[min(100%-2rem,40rem)] rounded-photo bg-branco p-0 text-abismo backdrop:bg-abismo/60"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-areia bg-branco px-5 py-2">
          <h2 id="todas-comodidades" className="font-semibold">
            O que este lugar oferece ({count})
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex size-11 items-center justify-center rounded-control hover:bg-areia"
          >
            <CloseIcon width={24} height={24} />
            <span className="sr-only">Fechar</span>
          </button>
        </div>
        <div className="grid gap-8 p-5">{children}</div>
      </dialog>
    </>
  );
}
