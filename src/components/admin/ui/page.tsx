import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronLeftIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Área de conteúdo de uma página do painel. */
export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main id="conteudo" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div
        className={cn(
          "mx-auto grid w-full max-w-[88rem] grid-cols-[minmax(0,1fr)] gap-6",
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}

/** Título da página, descrição curta, ações principais e link de volta. */
export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      {back ? (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1 text-small font-semibold text-petroleo hover:underline"
        >
          <ChevronLeftIcon width={16} height={16} />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.625rem] leading-tight font-semibold tracking-[-0.01em] sm:text-[1.875rem]">
              {title}
            </h1>
            {meta}
          </div>
          {description ? <p className="max-w-[72ch] text-rocha">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
