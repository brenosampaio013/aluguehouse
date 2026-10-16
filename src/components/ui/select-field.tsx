import { useId, type ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

export type SelectFieldProps = Omit<ComponentPropsWithRef<"select">, "id"> & {
  label: string;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string;
};

export function SelectField({
  label,
  options,
  hint,
  error,
  className,
  ...props
}: SelectFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={id} className="text-small font-semibold">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={cn(
          "min-h-11 w-full min-w-0 rounded-control bg-branco px-3 text-body text-abismo",
          error ? "border-2 border-erro" : "border border-junco",
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
