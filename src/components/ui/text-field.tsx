import { useId, type ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

export type TextFieldProps = Omit<ComponentPropsWithRef<"input">, "id"> & {
  label: string;
  /** Texto de apoio exibido abaixo do campo. */
  hint?: string;
  /** Mensagem de erro. Quando presente, o campo é marcado como inválido. */
  error?: string;
};

export function TextField({ label, hint, error, className, ...props }: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={id} className="text-small font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-11 w-full min-w-0 rounded-control bg-branco px-3 text-body text-abismo placeholder:text-rocha",
          error ? "border-2 border-erro" : "border border-junco",
        )}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-small text-rocha">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-small text-erro">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="mt-0.5 size-3.5 shrink-0"
            fill="currentColor"
          >
            <path d="M8 1 15 14H1L8 1Zm-.75 5v4h1.5V6h-1.5Zm0 5v1.5h1.5V11h-1.5Z" />
          </svg>
          {error}
        </p>
      ) : null}
    </div>
  );
}
