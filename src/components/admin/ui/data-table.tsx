import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { SortDir } from "@/lib/admin/list-params";

/** Tabela com rolagem horizontal própria (a página nunca rola de lado). */
export function DataTable({
  caption,
  minWidth = 720,
  head,
  children,
}: {
  caption: string;
  minWidth?: number;
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-left" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-areia bg-marfim/60 text-small text-rocha">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-areia">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 font-semibold whitespace-nowrap",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

/** Cabeçalho que ordena a tabela; clicar de novo inverte a direção. */
export function SortTh<K extends string>({
  label,
  sortKey,
  current,
  hrefFor,
  align = "left",
}: {
  label: string;
  sortKey: K;
  current: { key: K; dir: SortDir };
  hrefFor: (sort: { key: K; dir: SortDir }) => string;
  align?: "left" | "right";
}) {
  const active = current.key === sortKey;
  const nextDir: SortDir = active && current.dir === "asc" ? "desc" : active ? "asc" : "asc";
  const Icon = active && current.dir === "desc" ? ArrowDownIcon : ArrowUpIcon;
  return (
    <th
      scope="col"
      aria-sort={active ? (current.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(
        "px-4 py-2.5 font-semibold whitespace-nowrap",
        align === "right" && "text-right",
      )}
    >
      <Link
        href={hrefFor({ key: sortKey, dir: nextDir })}
        className={cn(
          "inline-flex items-center gap-1 rounded-control hover:text-abismo",
          active && "text-abismo",
        )}
      >
        {label}
        <Icon width={14} height={14} className={cn(active ? "opacity-100" : "opacity-0")} />
        <span className="sr-only">
          {active
            ? `, ordenado ${current.dir === "asc" ? "crescente" : "decrescente"}`
            : ", ordenar"}
        </span>
      </Link>
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <td className={cn("px-4 py-3 align-top", align === "right" && "text-right", className)}>
      {children}
    </td>
  );
}
