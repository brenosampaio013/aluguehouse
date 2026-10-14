import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "text";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-petroleo text-branco hover:bg-abismo",
  secondary: "border border-petroleo bg-branco text-petroleo hover:bg-nevoa",
  text: "px-1 text-petroleo underline underline-offset-3 hover:text-abismo",
};

export function buttonClasses(variant: Variant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

export type ButtonProps = ComponentPropsWithRef<"button"> & { variant?: Variant };

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
