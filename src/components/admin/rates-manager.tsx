"use client";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { addDaysISO, formatBRL, formatDateISO, parseDateRange } from "@/lib/format";
import { addSeasonalRate, deleteSeasonalRate } from "@/server/actions/properties";

import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

type Rate = {
  id: string;
  label: string;
  period: string;
  nightly_price: number;
  min_nights: number | null;
};

export function RatesManager({ propertyId, rates }: { propertyId: string; rates: Rate[] }) {
  const { state, pending, formProps } = useFormAction(addSeasonalRate, { resetOnSuccess: true });
  const e = state.fieldErrors ?? {};

  return (
    <div className="grid min-w-0 gap-6">
      {rates.length === 0 ? (
        <p className="text-rocha">Nenhuma tarifa sazonal. Fora delas vale a diária base.</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <caption className="sr-only">Tarifas sazonais</caption>
            <thead className="text-small text-rocha">
              <tr>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Nome
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Período
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">
                  Diária
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">
                  Mínimo
                </th>
                <th scope="col" className="py-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => {
                const range = parseDateRange(rate.period);
                const period = range
                  ? `${formatDateISO(range.start)} a ${formatDateISO(addDaysISO(range.endExclusive, -1))}`
                  : rate.period;
                return (
                  <tr key={rate.id} className="border-t border-areia">
                    <td className="py-2 pr-4">{rate.label}</td>
                    <td className="py-2 pr-4">{period}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatBRL(rate.nightly_price)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {rate.min_nights ? `${rate.min_nights} noites` : "—"}
                    </td>
                    <td className="py-2 text-right">
                      <form action={deleteSeasonalRate}>
                        <input type="hidden" name="id" value={propertyId} />
                        <input type="hidden" name="rateId" value={rate.id} />
                        <Button type="submit" variant="text" className="text-erro hover:text-erro">
                          Remover<span className="sr-only"> tarifa {rate.label}</span>
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form {...formProps} className="grid gap-5 rounded-photo border border-areia p-5">
        <h3 className="font-semibold">Adicionar tarifa sazonal</h3>
        <input type="hidden" name="id" value={propertyId} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <TextField
            label="Nome"
            name="label"
            hint="Ex.: Réveillon."
            error={e.label}
            className="lg:col-span-2"
          />
          <TextField label="Primeiro dia" name="start_date" type="date" error={e.start_date} />
          <TextField label="Último dia" name="end_date" type="date" error={e.end_date} />
          <TextField
            label="Diária (R$)"
            name="nightly_price"
            inputMode="decimal"
            error={e.nightly_price}
          />
          <TextField
            label="Mínimo de noites"
            name="min_nights"
            type="number"
            min={1}
            max={29}
            hint="Opcional."
            error={e.min_nights}
          />
        </div>
        <FormFeedback state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adicionando…" : "Adicionar tarifa"}
          </Button>
        </div>
      </form>
    </div>
  );
}
