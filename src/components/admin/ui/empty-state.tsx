import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Lista vazia ou seção sem dados: diz o que aconteceu e o próximo passo. */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-center gap-2 px-6 py-10 text-center", className)}>
      {icon ? (
        <span className="mb-1 inline-flex size-11 items-center justify-center rounded-full bg-marfim text-rocha">
          {icon}
        </span>
      ) : null}
      <p className="font-semibold">{title}</p>
      {description ? <p className="max-w-[48ch] text-small text-rocha">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Aviso de seção que não carregou (o resto da página continua funcionando). */
export function SectionError({ what }: { what: string }) {
  return (
    <p
      role="alert"
      className="m-5 rounded-control border border-erro/40 bg-branco px-4 py-3 text-small text-erro"
    >
      Não foi possível carregar {what} agora. Atualize a página em instantes.
    </p>
  );
}
