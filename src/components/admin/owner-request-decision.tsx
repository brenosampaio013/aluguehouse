"use client";

import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/textarea-field";
import { decideOwnerRequest } from "@/server/actions/property-owners";

import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

/** Aprovar ou recusar um pedido do proprietário, com resposta opcional. */
export function OwnerRequestDecision({ id, kind }: { id: string; kind: "block" | "change" }) {
  const { state, pending, formProps } = useFormAction(decideOwnerRequest);
  if (state.status === "success") return <FormFeedback state={state} />;
  return (
    <form {...formProps} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <TextareaField
        label="Resposta ao proprietário (opcional)"
        name="reply"
        rows={2}
        maxLength={2000}
        error={state.fieldErrors?.reply}
      />
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="approve" disabled={pending}>
          {kind === "block" ? "Aprovar e bloquear as datas" : "Marcar como feito"}
        </Button>
        <Button type="submit" name="decision" value="reject" variant="secondary" disabled={pending}>
          Recusar
        </Button>
      </div>
    </form>
  );
}
