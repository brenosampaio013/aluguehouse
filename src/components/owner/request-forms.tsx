"use client";

import { FormFeedback } from "@/components/admin/form-feedback";
import { useFormAction } from "@/components/admin/use-form-action";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { requestOwnerBlock, requestPropertyChange } from "@/server/actions/owner";

/** Pedido de alteração do anúncio: a Alugue Houses revisa e faz a edição. */
export function ChangeRequestForm({ propertyId }: { propertyId: string }) {
  const { state, pending, formProps } = useFormAction(requestPropertyChange, {
    resetOnSuccess: true,
  });
  return (
    <form {...formProps} className="grid max-w-2xl gap-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <TextareaField
        label="O que você quer alterar?"
        name="message"
        rows={4}
        maxLength={2000}
        hint="Ex.: atualizar a descrição, trocar fotos, mudar a diária de janeiro. O anúncio só muda depois da revisão."
        error={state.fieldErrors?.message}
      />
      <FormFeedback state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar pedido de alteração"}
        </Button>
      </div>
    </form>
  );
}

/** Pedido de bloqueio de datas para uso próprio (aprovado pela Alugue Houses). */
export function BlockRequestForm({
  properties,
  defaultPropertyId,
  today,
}: {
  properties: { id: string; title: string }[];
  defaultPropertyId: string | null;
  today: string;
}) {
  const { state, pending, formProps } = useFormAction(requestOwnerBlock, {
    resetOnSuccess: true,
  });
  return (
    <form {...formProps} className="grid gap-4">
      {properties.length > 1 ? (
        <SelectField
          label="Imóvel"
          name="propertyId"
          defaultValue={defaultPropertyId ?? properties[0]?.id}
          options={properties.map((p) => ({ value: p.id, label: p.title }))}
          error={state.fieldErrors?.propertyId}
        />
      ) : (
        <input type="hidden" name="propertyId" value={properties[0]?.id ?? ""} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="De (primeira noite)"
          name="checkIn"
          type="date"
          min={today}
          error={state.fieldErrors?.checkIn}
        />
        <TextField
          label="Até (dia da saída)"
          name="checkOut"
          type="date"
          min={today}
          error={state.fieldErrors?.checkOut}
        />
      </div>
      <TextField
        label="Motivo (opcional)"
        name="message"
        maxLength={500}
        hint="Ex.: férias da família."
        error={state.fieldErrors?.message}
      />
      <FormFeedback state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Pedir bloqueio"}
        </Button>
      </div>
    </form>
  );
}
