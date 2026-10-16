"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRightIcon } from "@/components/ui/icons";

import { breadcrumbsFor } from "./nav-items";

export function Breadcrumbs() {
  const crumbs = breadcrumbsFor(usePathname());
  return (
    <nav aria-label="Trilha de navegação" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-small text-rocha">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRightIcon width={14} height={14} className="shrink-0" /> : null}
              {last ? (
                <span aria-current="page" className="truncate font-semibold text-abismo">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="truncate hover:text-abismo hover:underline">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
