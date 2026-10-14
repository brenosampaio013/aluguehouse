"use client";

import { Button } from "@/components/ui/button";
import { inquiryStatusLabels, type InquiryStatus } from "@/lib/inquiries";
import { setInquiryStatus } from "@/server/actions/inquiries";

import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

const actions: Record<InquiryStatus, { status: InquiryStatus; label: string }[]> = {
  new: [
    { status: "in_progress", label: "Marcar como em andamento" },
    { status: "closed", label: "Encerrar" },
  ],
  in_progress: [
    { status: "closed", label: "Encerrar" },
    { status: "new", label: "Voltar para novos" },
  ],
  closed: [{ status: "in_progress", label: "Reabrir" }],
};

export function InquiryStatusForm({
  inquiryId,
  status,
  tab,
}: {
  inquiryId: string;
  status: InquiryStatus;
  tab: string;
}) {
  const { state, pending, formProps } = useFormAction(setInquiryStatus);
  return (
    <form {...formProps} className="grid gap-3">
      <input type="hidden" name="id" value={inquiryId} />
      <input type="hidden" name="tab" value={tab} />
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-3">
        {actions[status].map((action, index) => (
          <Button
            key={action.status}
            type="submit"
            name="status"
            value={action.status}
            variant={index === 0 ? "primary" : "secondary"}
            disabled={pending}
          >
            {action.label}
            <span className="sr-only"> ({inquiryStatusLabels[action.status]})</span>
          </Button>
        ))}
      </div>
    </form>
  );
}
