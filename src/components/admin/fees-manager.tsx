"use client";

import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { formatBRL } from "@/lib/format";
import { feeAppliesToLabels, feeCalcLabels } from "@/lib/properties/labels";
import { addFee, deleteFee } from "@/server/actions/properties";
import type { Database } from "@/types/database";

import { FormFeedback } from "./form-feedback";
import { RemoveRowButton } from "./remove-row-button";
import { useFormAction } from "./use-form-action";

type Fee = Database["public"]["Tables"]["property_fees"]["Row"];

const calcOptions = Object.entries(feeCalcLabels).map(([value, label]) => ({ value, label }));
const appliesOptions = Object.entries(feeAppliesToLabels).map(([value, label]) => ({
  value,
  label,
}));

export function FeesManager({ propertyId, fees }: { propertyId: string; fees: Fee[] }) {
  const { state, pending, formProps } = useFormAction(addFee, { resetOnSuccess: true });
  const e = state.fieldErrors ?? {};

  return (
    <div className="grid min-w-0 gap-6">
      {fees.length === 0 ? (
        <p className="text-rocha">Nenhuma taxa cadastrada.</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <caption className="sr-only">Taxas</caption>
            <thead className="text-small text-rocha">
              <tr>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Nome
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Cálculo
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">
                  Valor
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Vale para
                </th>
                <th scope="col" className="py-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <tr key={fee.id} className="border-t border-areia">
                  <td className="py-2 pr-4">
                    {fee.label}
                    {fee.is_refundable ? (
                      <span className="block text-small text-rocha">
                        Reembolsável, fora do total
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4">{feeCalcLabels[fee.calc]}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {fee.calc === "percent"
                      ? `${String(fee.amount).replace(".", ",")}%`
                      : formatBRL(fee.amount)}
                  </td>
                  <td className="py-2 pr-4">{feeAppliesToLabels[fee.applies_to]}</td>
                  <td className="py-2 text-right">
                    <RemoveRowButton
                      action={deleteFee}
                      fields={{ id: propertyId, feeId: fee.id }}
                      label={`taxa ${fee.label}`}
                      confirmTitle={`Remover a taxa “${fee.label}”?`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form {...formProps} className="grid gap-5 rounded-photo border border-areia p-5">
        <h3 className="font-semibold">Adicionar taxa</h3>
        <input type="hidden" name="id" value={propertyId} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Nome" name="label" hint="Ex.: Limpeza." error={e.label} />
          <SelectField label="Cálculo" name="calc" options={calcOptions} error={e.calc} />
          <TextField label="Valor (R$ ou %)" name="amount" inputMode="decimal" error={e.amount} />
          <SelectField
            label="Vale para"
            name="applies_to"
            options={appliesOptions}
            error={e.applies_to}
          />
        </div>
        <CheckboxField
          label="Reembolsável (caução)"
          name="is_refundable"
          hint="Aparece no orçamento como informação e não entra no total."
        />
        <FormFeedback state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adicionando…" : "Adicionar taxa"}
          </Button>
        </div>
      </form>
    </div>
  );
}
