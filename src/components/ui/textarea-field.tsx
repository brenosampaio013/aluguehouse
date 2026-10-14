import { useId, type ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

export type TextareaFieldProps = Omit<ComponentPropsWithRef<"textarea">, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextareaField({ label, hint, error, className, ...props }: TextareaFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={id} className="text-small font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={cn(
          "min-h-28 rounded-control bg-branco px-3 py-2 text-body text-abismo",
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
        <p id={errorId} className="text-small text-erro">
          {error}
        </p>
      ) : null}
    </div>
  );
}
