import Link from "next/link";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { totalPages } from "@/lib/admin/list-params";
import { cn } from "@/lib/cn";

/** Páginas visíveis: primeira, última e vizinhas da atual, com reticências. */
export function visiblePages(page: number, total: number): (number | "…")[] {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (const n of sorted) {
    const last = result[result.length - 1];
    if (typeof last === "number" && n - last > 1) result.push("…");
    result.push(n);
  }
  return result;
}

const item =
  "inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-control px-2 text-small font-semibold";

/** Rodapé da lista: "21–40 de 312" e navegação entre páginas. */
export function ListPagination({
  page,
  pageSize,
  count,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  count: number;
  hrefFor: (page: number) => string;
}) {
  const total = totalPages(count, pageSize);
  const start = Math.min(count, (page - 1) * pageSize + 1);
  const end = Math.min(count, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-areia px-4 py-3">
      <p className="text-small text-rocha tabular-nums">
        {count === 0 || start > end ? "Nenhum resultado" : `${start}–${end} de ${count}`}
      </p>
      {total > 1 ? (
        <nav aria-label="Paginação">
          <ul className="flex flex-wrap items-center gap-1">
            <li>
              {page > 1 ? (
                <Link
                  href={hrefFor(page - 1)}
                  className={cn(item, "text-petroleo hover:bg-marfim")}
                >
                  <ChevronLeftIcon width={16} height={16} />
                  <span className="sr-only sm:not-sr-only">Anterior</span>
                </Link>
              ) : null}
            </li>
            {visiblePages(page, total).map((n, index) =>
              n === "…" ? (
                <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-rocha">
                  …
                </li>
              ) : (
                <li key={n}>
                  <Link
                    href={hrefFor(n)}
                    aria-current={n === page ? "page" : undefined}
                    className={cn(
                      item,
                      "tabular-nums",
                      n === page ? "bg-petroleo text-branco" : "text-petroleo hover:bg-marfim",
                    )}
                  >
                    <span className="sr-only">Página </span>
                    {n}
                  </Link>
                </li>
              ),
            )}
            <li>
              {page < total ? (
                <Link
                  href={hrefFor(page + 1)}
                  className={cn(item, "text-petroleo hover:bg-marfim")}
                >
                  <span className="sr-only sm:not-sr-only">Próxima</span>
                  <ChevronRightIcon width={16} height={16} />
                </Link>
              ) : null}
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
