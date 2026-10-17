import type { ReactNode } from "react";

import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/icons";
import { formatDelta, type Delta } from "@/lib/admin/dashboard";
import { cn } from "@/lib/cn";

/** Indicador com valor, comparação com o período anterior e explicação. */
export function StatCard({
  label,
  value,
  delta,
  hint,
  icon,
}: {
  label: string;
  value: string;
  /** null = sem base para comparar (ex.: período anterior zerado); omitido = sem comparação. */
  delta?: Delta | null;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid min-w-0 content-start gap-2 rounded-photo border border-areia bg-branco p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-small font-semibold text-rocha">{label}</p>
        {icon ? <span className="text-rocha">{icon}</span> : null}
      </div>
      <p
        data-valor
        className="text-[1.75rem] leading-none font-semibold tracking-[-0.02em] tabular-nums"
      >
        {value}
      </p>
      {delta === undefined ? null : (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small">
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 font-semibold tabular-nums",
                delta.good === true && "bg-nevoa text-petroleo",
                delta.good === false && "bg-erro/10 text-erro",
                delta.good === null && "bg-marfim text-rocha",
              )}
            >
              {delta.trend === "up" ? <ArrowUpIcon width={12} height={12} /> : null}
              {delta.trend === "down" ? <ArrowDownIcon width={12} height={12} /> : null}
              {formatDelta(delta)}
              <span className="sr-only">
                {delta.good === true ? " (melhora)" : delta.good === false ? " (piora)" : ""}
              </span>
            </span>
          ) : (
            <span className="text-rocha">Sem base de comparação</span>
          )}
          {delta ? <span className="text-rocha">vs. período anterior</span> : null}
        </p>
      )}
      {hint ? <p className="text-small text-rocha">{hint}</p> : null}
    </div>
  );
}
