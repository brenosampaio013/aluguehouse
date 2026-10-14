"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { blockKindLabels, type BlockKind } from "@/lib/booking/labels";
import { formatDateISO } from "@/lib/format";
import { addCalendarBlock, deleteCalendarBlock } from "@/server/actions/booking-admin";

import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

type Block = {
  id: string;
  kind: BlockKind;
  checkIn: string;
  checkOut: string;
  note: string | null;
  booking_request_id: string | null;
  guestName: string | null;
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function BlocksManager({ propertyId, blocks }: { propertyId: string; blocks: Block[] }) {
  const { state, pending, formProps } = useFormAction(addCalendarBlock, { resetOnSuccess: true });
  const e = state.fieldErrors ?? {};

  return (
    <div className="grid min-w-0 gap-6">
      {blocks.length === 0 ? (
        <p className="text-rocha">Nenhuma reserva ou bloqueio daqui para frente.</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <caption className="sr-only">Reservas e bloqueios a partir de hoje</caption>
            <thead className="text-small text-rocha">
              <tr>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Período
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Motivo
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Observação
                </th>
                <th scope="col" className="py-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => {
                const nights = Math.round(
                  (Date.parse(block.checkOut) - Date.parse(block.checkIn)) / 86_400_000,
                );
                const period = `${formatDateISO(block.checkIn)} a ${formatDateISO(block.checkOut)}`;
                return (
                  <tr key={block.id} className="border-t border-areia">
                    <td className="py-2 pr-4 tabular-nums">
                      {period}
                      <span className="block text-small text-rocha">
                        {plural(nights, "noite", "noites")}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{blockKindLabels[block.kind]}</td>
                    <td className="py-2 pr-4">
                      {block.kind === "booking" && block.booking_request_id ? (
                        <Link
                          href={`/admin/solicitacoes/${block.booking_request_id}`}
                          className="text-petroleo underline underline-offset-3"
                        >
                          {block.guestName ?? "Ver pedido"}
                        </Link>
                      ) : (
                        (block.note ?? "—")
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {block.kind === "booking" ? (
                        <span className="text-small text-rocha">Cancele pelo pedido</span>
                      ) : (
                        <form action={deleteCalendarBlock}>
                          <input type="hidden" name="id" value={propertyId} />
                          <input type="hidden" name="blockId" value={block.id} />
                          <Button
                            type="submit"
                            variant="text"
                            className="text-erro hover:text-erro"
                          >
                            Remover<span className="sr-only"> bloqueio de {period}</span>
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form {...formProps} className="grid gap-5 rounded-photo border border-areia p-5">
        <h3 className="font-semibold">Bloquear datas</h3>
        <input type="hidden" name="id" value={propertyId} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Motivo"
            name="kind"
            defaultValue="owner"
            options={[
              { value: "owner", label: blockKindLabels.owner },
              { value: "maintenance", label: blockKindLabels.maintenance },
            ]}
            error={e.kind}
          />
          <TextField
            label="Primeira noite"
            name="start_date"
            type="date"
            hint="Dia da chegada."
            error={e.start_date}
          />
          <TextField
            label="Última noite"
            name="end_date"
            type="date"
            hint="A saída é no dia seguinte."
            error={e.end_date}
          />
          <TextField
            label="Observação"
            name="note"
            maxLength={500}
            hint="Opcional."
            error={e.note}
          />
        </div>
        <FormFeedback state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Bloqueando…" : "Bloquear datas"}
          </Button>
        </div>
      </form>
    </div>
  );
}
