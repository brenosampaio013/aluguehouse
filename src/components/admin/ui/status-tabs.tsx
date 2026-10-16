import Link from "next/link";

import { cn } from "@/lib/cn";

/** Abas por situação, com a contagem de cada uma. */
export function StatusTabs({
  label,
  tabs,
  current,
}: {
  label: string;
  tabs: { slug: string; label: string; href: string; count?: number | null }[];
  current: string;
}) {
  return (
    <nav aria-label={label} className="relative overflow-x-auto">
      <ul className="flex min-w-max gap-1 border-b border-areia">
        {tabs.map((tab) => {
          const active = tab.slug === current;
          return (
            <li key={tab.slug}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 font-semibold",
                  active
                    ? "border-petroleo text-abismo"
                    : "border-transparent text-rocha hover:border-areia hover:text-abismo",
                )}
              >
                {tab.label}
                {typeof tab.count === "number" ? (
                  <span
                    className={cn(
                      "rounded-full px-2 text-small tabular-nums",
                      active ? "bg-nevoa text-abismo" : "bg-marfim text-rocha",
                    )}
                  >
                    {tab.count}
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
