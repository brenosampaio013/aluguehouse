"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";

import type { FormState } from "@/server/actions/auth";

/**
 * Envia o formulário para uma Server Action sem o reinício automático do
 * React 19, que apagaria o que o admin digitou quando há erro de validação.
 * Com `resetOnSuccess`, limpa os campos só depois de salvar (útil em
 * formulários de "adicionar").
 */
export function useFormAction(
  action: (state: FormState, formData: FormData) => Promise<FormState>,
  options: { resetOnSuccess?: boolean } = {},
) {
  const [state, dispatch, pending] = useActionState(action, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (options.resetOnSuccess && state.status === "success") formRef.current?.reset();
  }, [state, options.resetOnSuccess]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, pending, formProps: { ref: formRef, onSubmit, noValidate: true } };
}
