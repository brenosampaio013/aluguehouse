import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClasses } from "@/components/ui/button";
import { SearchIcon } from "@/components/ui/icons";

export type FilterSelect = {
  name: string;
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  /** Rótulo da opção "todos" (sem filtro). */
  allLabel: string;
};

/**
 * Busca e filtros combinados num formulário GET: funciona sem JavaScript,
 * mantém o estado na URL (dá para copiar o link) e volta à página 1.
 */
export function ListToolbar({
  action,
  search,
  searchLabel,
  selects = [],
  hidden = {},
  extra,
  clearHref,
  active,
}: {
  action: string;
  /** Sem `searchLabel`, a barra não tem busca por texto (só filtros). */
  search?: string;
  searchLabel?: string;
  selects?: FilterSelect[];
  /** Parâmetros mantidos ao filtrar (ex.: aba atual e ordenação). */
  hidden?: Record<string, string | null | undefined>;
  extra?: ReactNode;
  clearHref: string;
  /** Há algum filtro aplicado? Mostra "Limpar filtros". */
  active: boolean;
}) {
  return (
    <form
      action={action}
      method="get"
      role={searchLabel ? "search" : undefined}
      aria-label={searchLabel ? undefined : "Filtros"}
      className="flex flex-wrap items-end gap-3 border-b border-areia p-4"
    >
      {Object.entries(hidden).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      {searchLabel ? (
        <label className="grid min-w-[min(100%,16rem)] flex-[2_1_16rem] gap-1">
          <span className="text-small font-semibold">{searchLabel}</span>
          <span className="relative">
            <SearchIcon
              width={18}
              height={18}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-rocha"
            />
            <input
              type="search"
              name="q"
              defaultValue={search}
              maxLength={100}
              placeholder="Buscar…"
              className="min-h-11 w-full rounded-control border border-junco bg-branco pr-3 pl-9 text-abismo placeholder:text-rocha"
            />
          </span>
        </label>
      ) : null}
      {selects.map((select) => (
        <label key={select.name} className="grid min-w-0 flex-[1_1_10rem] gap-1">
          <span className="text-small font-semibold">{select.label}</span>
          <select
            name={select.name}
            defaultValue={select.value ?? ""}
            className="min-h-11 w-full min-w-0 rounded-control border border-junco bg-branco px-3 text-abismo"
          >
            <option value="">{select.allLabel}</option>
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {extra}
      <div className="flex gap-2">
        <button type="submit" className={buttonClasses("primary", "min-h-11 px-4")}>
          Filtrar
        </button>
        {active ? (
          <Link href={clearHref} className={buttonClasses("text", "min-h-11")}>
            Limpar filtros
          </Link>
        ) : null}
      </div>
    </form>
  );
}
