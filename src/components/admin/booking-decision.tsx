"use client";

import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/textarea-field";
import type { BookingStatus } from "@/lib/booking/labels";
import { decideBooking } from "@/server/actions/booking-admin";

import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

type Props = {
  bookingId: string;
  status: BookingStatus;
  /** Chegada já passou: aprovar não é mais possível. */
  checkInPassed: boolean;
  hasConflicts: boolean;
};

/** Aprovar, recusar ou cancelar a solicitação. */
export function BookingDecision({ bookingId, status, checkInPassed, hasConflicts }: Props) {
  const approve = useFormAction(decideBooking);
  const decline = useFormAction(decideBooking);
  const cancel = useFormAction(decideBooking);
  // Depois de decidir, a página recarrega e o formulário usado some; a
  // confirmação fica aqui em cima. Ordem: cancelar só vem depois de aprovar.
  const done = [cancel.state, decline.state, approve.state].find((s) => s.status === "success");
  const errorOnly = (state: typeof approve.state) =>
    state.status === "error" ? state : { status: "idle" as const };

  const feedback = done ? <FormFeedback state={done} /> : null;

  if (status !== "pending" && status !== "approved") {
    return (
      <div className="grid gap-4">
        {feedback}
        <p className="text-rocha">Este pedido já foi encerrado. Nenhuma ação disponível.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {feedback}
      {status === "pending" ? (
        <form {...approve.formProps} className="grid gap-3">
          <input type="hidden" name="id" value={bookingId} />
          <input type="hidden" name="decision" value="approve" />
          {checkInPassed ? (
            <p className="text-rocha">A data de chegada já passou; só é possível recusar.</p>
          ) : (
            <p className="text-rocha">
              Aprovar bloqueia as datas no calendário na mesma hora.
              {hasConflicts ? " Há conflitos acima: confira antes." : ""}
            </p>
          )}
          <FormFeedback state={errorOnly(approve.state)} />
          <div>
            <Button type="submit" disabled={approve.pending || checkInPassed}>
              {approve.pending ? "Aprovando…" : "Aprovar reserva"}
            </Button>
          </div>
        </form>
      ) : null}

      {status === "pending" ? (
        <form {...decline.formProps} className="grid gap-3 rounded-photo bg-branco p-5">
          <h3 className="font-semibold">Recusar</h3>
          <input type="hidden" name="id" value={bookingId} />
          <input type="hidden" name="decision" value="decline" />
          <TextareaField
            label="Motivo (opcional, uso interno)"
            name="reason"
            rows={2}
            maxLength={5000}
            error={decline.state.fieldErrors?.reason}
          />
          <FormFeedback state={errorOnly(decline.state)} />
          <div>
            <Button type="submit" variant="secondary" disabled={decline.pending}>
              {decline.pending ? "Recusando…" : "Recusar solicitação"}
            </Button>
          </div>
        </form>
      ) : (
        <form {...cancel.formProps} className="grid gap-3 rounded-photo bg-branco p-5">
          <h3 className="font-semibold">Cancelar reserva</h3>
          <p className="text-small text-rocha">As datas voltam a ficar livres no site.</p>
          <input type="hidden" name="id" value={bookingId} />
          <input type="hidden" name="decision" value="cancel" />
          <TextareaField
            label="Motivo (opcional, uso interno)"
            name="reason"
            rows={2}
            maxLength={5000}
            error={cancel.state.fieldErrors?.reason}
          />
          <FormFeedback state={errorOnly(cancel.state)} />
          <div>
            <Button
              type="submit"
              variant="secondary"
              className="border-erro text-erro hover:bg-branco"
              disabled={cancel.pending}
            >
              {cancel.pending ? "Cancelando…" : "Cancelar reserva"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
