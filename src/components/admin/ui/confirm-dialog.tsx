"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { AlertIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** "danger" para ações que apagam ou não podem ser desfeitas. */
  tone?: "danger" | "default";
};

/**
 * Pede confirmação explícita antes de enviar um formulário. Usa <dialog>
 * nativo (foco preso, Esc fecha). Funciona com forms de Server Action
 * comuns e com useFormAction:
 *
 *   const confirm = useConfirmSubmit(() => ({ title, confirmLabel }));
 *   <form onSubmit={(e) => confirm.intercept(e) || formProps.onSubmit(e)}>
 *   {confirm.dialog}
 */
export function useConfirmSubmit(options: () => ConfirmOptions) {
  const [current, setCurrent] = useState<ConfirmOptions | null>(null);
  const pending = useRef<{ form: HTMLFormElement; submitter: HTMLElement | null } | null>(null);
  const confirmed = useRef(false);

  /** Devolve true quando segurou o envio para perguntar antes. */
  const intercept = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (confirmed.current) {
        confirmed.current = false;
        return false;
      }
      event.preventDefault();
      pending.current = {
        form: event.currentTarget,
        submitter: (event.nativeEvent as SubmitEvent).submitter,
      };
      setCurrent(options());
      return true;
    },
    [options],
  );

  const onConfirm = useCallback(() => {
    const target = pending.current;
    setCurrent(null);
    if (!target) return;
    confirmed.current = true;
    target.form.requestSubmit(
      target.submitter instanceof HTMLButtonElement ? target.submitter : undefined,
    );
  }, []);

  const dialog = (
    <ConfirmDialog options={current} onConfirm={onConfirm} onCancel={() => setCurrent(null)} />
  );
  return { intercept, dialog };
}

export function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (options && !dialog.open) dialog.showModal();
    if (!options && dialog.open) dialog.close();
  }, [options]);

  const danger = options?.tone === "danger";
  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={options?.description ? descriptionId : undefined}
      onClose={onCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-photo border border-areia bg-branco p-0 text-abismo shadow-flutuante backdrop:bg-abismo/40"
    >
      {options ? (
        <div className="grid gap-4 p-6">
          <div className="flex gap-3">
            {danger ? (
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-erro/10 text-erro">
                <AlertIcon />
              </span>
            ) : null}
            <div className="grid gap-1">
              <h2 id={titleId} className="text-h3 font-semibold">
                {options.title}
              </h2>
              {options.description ? (
                <p id={descriptionId} className="text-rocha">
                  {options.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {/* O foco começa em "Cancelar": Enter por engano não confirma. */}
            <Button variant="secondary" onClick={onCancel} autoFocus>
              {options.cancelLabel ?? "Cancelar"}
            </Button>
            <Button onClick={onConfirm} className={cn(danger && "bg-erro hover:bg-[#8a2818]")}>
              {options.confirmLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
