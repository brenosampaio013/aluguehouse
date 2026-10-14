import { useId, type ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

export type CheckboxFieldProps = Omit<ComponentPropsWithRef<"input">, "id" | "type"> & {
  label: string;
  hint?: string;
};

export function CheckboxField({ label, hint, className, ...props }: CheckboxFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={hintId}
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
      </span>
    </div>
  );
}
