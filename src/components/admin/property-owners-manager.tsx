"use client";

import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { TextField } from "@/components/ui/text-field";
import { linkPropertyOwner, unlinkPropertyOwner } from "@/server/actions/property-owners";

import { FormFeedback } from "./form-feedback";
import { RemoveRowButton } from "./remove-row-button";
import { useFormAction } from "./use-form-action";

const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/**
 * Proprietários com acesso a este imóvel no portal: vincular por e-mail e
 * remover o acesso. O banco recusa vincular contas que não são de
 * proprietário e o servidor nunca transforma um admin em proprietário.
 */
export function PropertyOwnersManager({
  propertyId,
  owners,
}: {
  propertyId: string;
  owners: { ownerId: string; email: string; linkedAt: string }[];
}) {
  const { state, pending, formProps } = useFormAction(linkPropertyOwner, { resetOnSuccess: true });
  return (
    <div className="grid gap-6">
      {owners.length === 0 ? (
        <p className="text-rocha">
          Nenhum proprietário vinculado. Ninguém vê este imóvel no portal.
        </p>
      ) : (
        <ul className="divide-y divide-areia rounded-control border border-areia">
          {owners.map((owner) => (
            <li
              key={owner.ownerId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block font-semibold break-all">{owner.email}</span>
                <span className="block text-small text-rocha">
                  Acesso desde {date.format(new Date(owner.linkedAt))}
                </span>
              </span>
              <RemoveRowButton
                action={unlinkPropertyOwner}
                fields={{ propertyId, ownerId: owner.ownerId }}
                label={owner.email}
                confirmTitle={`Remover o acesso de ${owner.email} a este imóvel?`}
                verb="Remover acesso"
              />
            </li>
          ))}
        </ul>
      )}
      <form {...formProps} className="grid max-w-xl gap-4">
        <input type="hidden" name="propertyId" value={propertyId} />
        <TextField
          label="E-mail do proprietário"
          name="email"
          type="email"
          autoComplete="off"
          hint="Se ainda não houver conta com este e-mail, ela é criada. O proprietário entra pelo link enviado ao e-mail e cadastra o código do celular no primeiro acesso."
          error={state.fieldErrors?.email}
        />
        <CheckboxField
          name="confirm"
          label="Confirmo que este e-mail é do proprietário deste imóvel. Ele verá o imóvel, o calendário e as reservas (só o primeiro nome dos hóspedes)."
          error={state.fieldErrors?.confirm}
        />
        <FormFeedback state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Vinculando…" : "Dar acesso ao portal"}
          </Button>
        </div>
      </form>
    </div>
  );
}
