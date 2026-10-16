"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { adminNavItems, isActive } from "./nav-items";

/** Links do menu lateral, com ícones e contadores de pendências. */
export function AdminNav({
  pending,
  collapsed = false,
  onNavigate,
}: {
  pending: Record<string, number>;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Painel">
      <ul className="grid gap-1">
        {adminNavItems.map((item) => {
          const active = isActive(pathname, item);
          const count = pending[item.href] ?? 0;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex min-h-11 items-center gap-3 rounded-control px-3 font-semibold transition-colors",
                  active ? "bg-nevoa text-abismo" : "text-rocha hover:bg-marfim hover:text-abismo",
                  collapsed && "justify-center px-0",
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-petroleo"
                  />
                ) : null}
                <Icon className={cn("shrink-0", active ? "text-petroleo" : undefined)} />
                <span className={cn("flex-1 truncate", collapsed && "sr-only")}>{item.label}</span>
                {count > 0 ? (
                  <span
                    className={cn(
                      "inline-flex min-w-6 justify-center rounded-full bg-petroleo px-1.5 text-small text-branco tabular-nums",
                      collapsed && "absolute top-1 right-1 min-w-5 px-1 text-[0.6875rem]",
                    )}
                  >
                    {count}
                    <span className="sr-only"> pendentes</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
