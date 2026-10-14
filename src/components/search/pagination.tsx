import Link from "next/link";

/** Paginação acessível: página atual marcada com aria-current. */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const link =
    "inline-flex min-h-11 items-center rounded-control px-3 font-semibold text-petroleo underline";
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={link}>
          Anterior
        </Link>
      ) : null}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <Link
          key={n}
          href={hrefFor(n)}
          aria-current={n === page ? "page" : undefined}
          className={
            "inline-flex size-11 items-center justify-center rounded-control font-semibold " +
            (n === page ? "bg-petroleo text-branco" : "text-petroleo hover:bg-areia")
          }
        >
          <span className="sr-only">Página </span>
          {n}
        </Link>
      ))}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={link}>
          Próxima
        </Link>
      ) : null}
    </nav>
  );
}
