"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { TurnstileWidget } from "@/components/booking/turnstile-widget";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormMessage } from "@/components/ui/form-message";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { visitPeriods } from "@/lib/inquiries";
import { submitInquiry, type InquiryFormState } from "@/server/actions/inquiries";

type Props = {
  /** "contact": mensagem livre; "sale": visita ou interesse em um imóvel à venda. */
  variant: "contact" | "sale";
  propertyId?: string;
  /** Hoje (AAAA-MM-DD, São Paulo), mínimo da data de visita. */
  today: string;
  turnstileSiteKey?: string;
  submitLabel?: string;
};

export function InquiryForm({
  variant,
  propertyId,
  today,
  turnstileSiteKey,
  submitLabel = "Enviar mensagem",
}: Props) {
  const [state, dispatch, pending] = useActionState(submitInquiry, {
    status: "idle",
  } as InquiryFormState);
  const [kind, setKind] = useState(variant === "sale" ? "visit" : "contact");
  const [attempts, setAttempts] = useState(0);
  const confirmation = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "success") confirmation.current?.focus();
  }, [state]);

  // Sem o reinício automático do React 19: o que foi digitado continua no
  // formulário quando há erro.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setAttempts((n) => n + 1);
    startTransition(() => dispatch(formData));
  }

  if (state.status === "success") {
    return (
      <p
        ref={confirmation}
        tabIndex={-1}
        role="status"
        className="rounded-control bg-nevoa px-4 py-3 text-abismo"
      >
        {state.message}
      </p>
    );
  }

  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <input type="hidden" name="propertyId" value={propertyId ?? ""} />
      {variant === "contact" ? <input type="hidden" name="kind" value="contact" /> : null}

      {/* Campo-isca para robôs: escondido de pessoas e de leitores de tela. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {variant === "sale" ? (
        <fieldset className="grid gap-2">
          <legend className="text-small font-semibold">O que você gostaria?</legend>
          {[
            { value: "visit", label: "Agendar uma visita" },
            { value: "sale_interest", label: "Tirar dúvidas sobre a compra" },
          ].map((option) => (
            <label key={option.value} className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name="kind"
                value={option.value}
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
                className="size-5 accent-petroleo"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      ) : null}

      <TextField
        label="Nome"
        name="name"
        autoComplete="name"
        required
        defaultValue={values.name}
        error={errors.name}
      />
      <TextField
        label="E-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        defaultValue={values.email}
        error={errors.email}
      />
      <TextField
        label="Telefone (opcional)"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        hint="Com DDD, se preferir resposta pelo WhatsApp."
        defaultValue={values.phone}
        error={errors.phone}
      />

      {variant === "sale" && kind === "visit" ? (
        <div className="grid gap-4">
          <TextField
            label="Data preferida (opcional)"
            name="visitDate"
            type="date"
            min={today}
            error={errors.visitDate}
          />
          <SelectField
            label="Período"
            name="visitPeriod"
            defaultValue="manha"
            options={Object.entries(visitPeriods).map(([value, period]) => ({
              value,
              label: period.label,
            }))}
          />
        </div>
      ) : null}

      <TextareaField
        label={variant === "contact" ? "Mensagem" : "Mensagem (opcional)"}
        name="message"
        rows={4}
        maxLength={4000}
        required={variant === "contact"}
        defaultValue={values.message}
        error={errors.message}
      />
      <CheckboxField
        name="consent"
        required
        label="Concordo que a Alugue Houses use estes dados apenas para responder a esta mensagem."
        error={errors.consent}
      />

      {turnstileSiteKey ? <TurnstileWidget key={attempts} siteKey={turnstileSiteKey} /> : null}

      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
