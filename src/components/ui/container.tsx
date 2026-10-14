import type { ComponentPropsWithRef, ElementType } from "react";

import { cn } from "@/lib/cn";

type ContainerProps<T extends ElementType> = { as?: T } & ComponentPropsWithRef<T>;

/** Largura máxima de 1240 px com margens de 16/24/40 px. */
export function Container<T extends ElementType = "div">({
  as,
  className,
  ...props
}: ContainerProps<T>) {
  const Tag = as ?? "div";
  return (
    <Tag className={cn("mx-auto w-full max-w-site px-4 sm:px-6 lg:px-10", className)} {...props} />
  );
}
