import { useId, type ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

export type CheckboxFieldProps = Omit<ComponentPropsWithRef<"input">, "id" | "type"> & {
  label: string;
  /** Texto de apoio; aceita links (ex.: política de privacidade). */
  hint?: React.ReactNode;
  /** Mensagem de erro. Quando presente, o campo é marcado como inválido. */
  error?: string;
};

export function CheckboxField({ label, hint, error, className, ...props }: CheckboxFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className="mt-0.5 size-5 shrink-0 accent-petroleo"
        {...props}
      />
      <span className="grid gap-0.5">
        <label htmlFor={id} className="text-body">
          {label}
        </label>
        {hint ? (
          <span id={hintId} className="text-small text-rocha">
            {hint}
          </span>
        ) : null}
        {error ? (
          <span id={errorId} className="text-small text-erro">
            {error}
          </span>
        ) : null}
      </span>
    </div>
  );
}
