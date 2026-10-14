import { useId, type ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

export type SelectFieldProps = Omit<ComponentPropsWithRef<"select">, "id"> & {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
};

export function SelectField({ label, options, error, className, ...props }: SelectFieldProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-small font-semibold">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(
          "min-h-11 rounded-control bg-branco px-3 text-body text-abismo",
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
      {error ? (
        <p id={errorId} className="text-small text-erro">
          {error}
        </p>
      ) : null}
    </div>
  );
}
