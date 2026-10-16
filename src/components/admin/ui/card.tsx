import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Superfície branca com borda discreta: base dos blocos do painel. */
export function Card({
  children,
  className,
  as: Tag = "section",
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
} & React.AriaAttributes) {
  return (
    <Tag
      className={cn("min-w-0 rounded-photo border border-areia bg-branco", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  id,
  title,
  description,
  action,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-areia px-5 py-4">
      <div className="grid min-w-0 gap-0.5">
        <h2 id={id} className="font-semibold">
          {title}
        </h2>
        {description ? <p className="text-small text-rocha">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
