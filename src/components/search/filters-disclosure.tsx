"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * No celular, os filtros ficam recolhidos atrás de um botão. A partir do
 * tablet, aparecem sempre.
 */
export function FiltersDisclosure({
  activeCount,
  children,
}: {
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="grid gap-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-junco px-5 font-semibold md:hidden"
      >
        Filtros
        {activeCount > 0 ? (
          <span className="rounded-full bg-petroleo px-2 text-small text-branco">
            {activeCount}
            <span className="sr-only"> ativos</span>
          </span>
        ) : null}
      </button>
      <div id={id} className={cn(!open && "max-md:hidden")}>
        {children}
      </div>
    </div>
  );
}
