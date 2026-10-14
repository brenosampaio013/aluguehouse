"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { formatDateISO } from "@/lib/format";
import { submitBookingRequest, type BookingFormState } from "@/server/actions/booking";

import { TurnstileWidget } from "./turnstile-widget";

type Props = {
  propertyId: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  turnstileSiteKey?: string;
};

export function BookingRequestForm({
  propertyId,
  propertyTitle,
  checkIn,
  checkOut,
  guests,
  turnstileSiteKey,
}: Props) {
  const [state, dispatch, pending] = useActionState(submitBookingRequest, {
    status: "idle",
  } as BookingFormState);
  const confirmation = useRef<HTMLHeadingElement>(null);
  // Cada token do Turnstile vale um envio: um novo widget a cada tentativa.
  const [attempts, setAttempts] = useState(0);

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
      <div className="grid gap-3 rounded-photo bg-nevoa p-5">
        <h3 ref={confirmation} tabIndex={-1} className="font-serif text-h3 font-normal">
          Solicitação enviada
        </h3>
        {state.reference ? (
          <p>
            Protocolo <strong className="font-semibold tabular-nums">{state.reference}</strong>
          </p>
        ) : null}
        <p>
          Recebemos seu pedido para {propertyTitle}, de {formatDateISO(checkIn)} a{" "}
          {formatDateISO(checkOut)}. Ainda não é uma reserva confirmada: vamos conferir a
          disponibilidade e responder pelo e-mail ou telefone informados.
        </p>
        <p className="text-small text-rocha">Nada foi cobrado.</p>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-labelledby="solicitar">
      <h3 id="solicitar" className="font-serif text-h3 font-normal">
        Solicitar reserva
      </h3>
      <p className="text-small text-rocha">
        Sem cadastro e sem pagamento agora. A reserva só vale depois da nossa confirmação.
      </p>

      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />
      <input type="hidden" name="guests" value={guests} />

      {/* Campo-isca para robôs: escondido de pessoas e de leitores de tela. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <TextField
        label="Nome completo"
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
        label="Telefone (WhatsApp)"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        hint="Com DDD."
        defaultValue={values.phone}
        error={errors.phone}
      />
      <TextareaField
        label="Mensagem (opcional)"
        name="message"
        rows={3}
        maxLength={2000}
        defaultValue={values.message}
        error={errors.message}
      />
      <CheckboxField
        name="consent"
        required
        label="Concordo que a Alugue Houses use estes dados apenas para responder a esta solicitação."
        error={errors.consent}
      />

      {turnstileSiteKey ? <TurnstileWidget key={attempts} siteKey={turnstileSiteKey} /> : null}

      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar solicitação"}
      </Button>
    </form>
  );
}
