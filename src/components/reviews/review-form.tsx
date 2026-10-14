"use client";

import { useState } from "react";

import { FormFeedback } from "@/components/admin/form-feedback";
import { useFormAction } from "@/components/admin/use-form-action";
import { Button } from "@/components/ui/button";
import { PrivacyLink } from "@/components/legal/privacy-link";
import { TextareaField } from "@/components/ui/textarea-field";
import { cn } from "@/lib/cn";
import { submitReview } from "@/server/actions/reviews";

import { StarIcon } from "./stars";

const ratingWords = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"];

export function ReviewForm({
  bookingId,
  propertyTitle,
}: {
  bookingId: string;
  propertyTitle: string;
}) {
  const { state, pending, formProps } = useFormAction(submitReview);
  const [rating, setRating] = useState(0);
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") return <FormFeedback state={state} />;

  return (
    <form {...formProps} className="grid gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <fieldset
        className="grid gap-2"
        aria-describedby={errors.rating ? `nota-erro-${bookingId}` : undefined}
      >
        <legend className="text-small font-semibold">Sua nota para {propertyTitle}</legend>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="grid size-11 cursor-pointer place-items-center rounded-control text-petroleo hover:bg-areia has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-petroleo"
              >
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  className="sr-only"
                />
                <StarIcon filled={n <= rating} className="size-7" />
                <span className="sr-only">
                  {n} {n === 1 ? "estrela" : "estrelas"} ({ratingWords[n]})
                </span>
              </label>
            ))}
          </div>
          <span aria-hidden="true" className={cn("text-rocha", rating > 0 && "text-abismo")}>
            {rating > 0 ? `${rating} de 5 · ${ratingWords[rating]}` : "Escolha de 1 a 5"}
          </span>
        </div>
        {errors.rating ? (
          <p id={`nota-erro-${bookingId}`} className="text-small text-erro">
            {errors.rating}
          </p>
        ) : null}
      </fieldset>
      <TextareaField
        label="Comentário (opcional)"
        name="comment"
        rows={4}
        maxLength={2000}
        hint="Conte como foi a estadia. Só o seu primeiro nome aparece no site."
        error={errors.comment}
      />
      <p className="text-small text-rocha">
        Ao enviar, você concorda em publicar a nota e o comentário com o seu primeiro nome, depois
        da nossa moderação (<PrivacyLink />
        ).
      </p>
      <FormFeedback state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar avaliação"}
        </Button>
      </div>
    </form>
  );
}
