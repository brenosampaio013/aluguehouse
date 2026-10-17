"use client";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { sendOwnerNotice } from "@/server/actions/owner-documents";

import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

/** Aviso que aparece nas notificações do portal dos proprietários. */
export function OwnerNoticeForm({ properties }: { properties: { id: string; title: string }[] }) {
  const { state, pending, formProps } = useFormAction(sendOwnerNotice, { resetOnSuccess: true });
  return (
    <form {...formProps} className="grid max-w-2xl gap-4">
      <SelectField
        label="Para"
        name="propertyId"
        defaultValue=""
        options={[
          { value: "", label: "Todos os proprietários" },
          ...properties.map((p) => ({ value: p.id, label: `Proprietários de ${p.title}` })),
        ]}
      />
      <TextField label="Título" name="title" maxLength={160} error={state.fieldErrors?.title} />
      <TextareaField
        label="Mensagem (opcional)"
        name="body"
        rows={3}
        maxLength={2000}
        error={state.fieldErrors?.body}
      />
      <FormFeedback state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar aviso"}
        </Button>
      </div>
    </form>
  );
}
