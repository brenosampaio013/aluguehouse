"use client";

import { FormFeedback } from "@/components/admin/form-feedback";
import { useFormAction } from "@/components/admin/use-form-action";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { deleteMyAccount } from "@/server/actions/account";

export function DeleteAccountForm() {
  const { state, pending, formProps } = useFormAction(deleteMyAccount);
  return (
    <form {...formProps} className="grid max-w-xl gap-4">
      <p>
        Apaga seu acesso, seus favoritos e suas avaliações. Solicitações de reserva continuam
        guardadas pelo prazo da política de privacidade. Esta ação não pode ser desfeita.
      </p>
      <CheckboxField
        name="confirm"
        label="Entendo que a exclusão é definitiva."
        error={state.fieldErrors?.confirm}
      />
      <FormFeedback state={state} />
      <div>
        <Button
          type="submit"
          variant="secondary"
          className="border-erro text-erro hover:bg-branco"
          disabled={pending}
        >
          {pending ? "Excluindo…" : "Excluir minha conta"}
        </Button>
      </div>
    </form>
  );
}
