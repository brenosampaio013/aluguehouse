"use client";

import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/textarea-field";
import type { ReviewStatus } from "@/lib/reviews";
import { moderateReview } from "@/server/actions/reviews";

import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

export function ReviewModeration({
  reviewId,
  status,
  reply,
  tab,
}: {
  reviewId: string;
  status: ReviewStatus;
  reply: string;
  /** Aba atual, para voltar a ela depois de publicar ou não publicar. */
  tab: string;
}) {
  const { state, pending, formProps } = useFormAction(moderateReview);
  return (
    <form {...formProps} className="grid gap-3">
      <input type="hidden" name="id" value={reviewId} />
      <input type="hidden" name="tab" value={tab} />
      <TextareaField
        label="Resposta pública (opcional)"
        name="admin_reply"
        rows={2}
        maxLength={2000}
        defaultValue={reply}
        hint="Aparece abaixo da avaliação, como resposta da Alugue Houses."
        error={state.fieldErrors?.admin_reply}
      />
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-3">
        {status !== "approved" ? (
          <Button type="submit" name="decision" value="approve" disabled={pending}>
            Publicar
          </Button>
        ) : (
          <Button type="submit" name="decision" value="reply" disabled={pending}>
            Salvar resposta
          </Button>
        )}
        {status !== "rejected" ? (
          <Button
            type="submit"
            name="decision"
            value="reject"
            variant="secondary"
            disabled={pending}
          >
            Não publicar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
