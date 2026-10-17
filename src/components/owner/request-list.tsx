import { RemoveRowButton } from "@/components/admin/remove-row-button";
import { Badge } from "@/components/admin/ui/badge";
import { formatDateISO } from "@/lib/format";
import { ownerRequestStatusLabels, ownerRequestStatusTones } from "@/lib/owner/portal";
import { cancelOwnerRequest } from "@/server/actions/owner";
import type { OwnerRequest } from "@/server/queries/owner-portal";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** Pedidos enviados à Alugue Houses, com a resposta e a opção de desistir. */
export function RequestList({
  requests,
  showProperty = false,
  empty,
}: {
  requests: OwnerRequest[];
  showProperty?: boolean;
  empty: string;
}) {
  if (requests.length === 0) return <p className="px-5 py-6 text-rocha">{empty}</p>;
  return (
    <ul className="divide-y divide-areia">
      {requests.map((request) => {
        const what =
          request.kind === "block" && request.stay
            ? `Bloqueio de ${formatDateISO(request.stay.start)} a ${formatDateISO(request.stay.endExclusive)}`
            : "Alteração do anúncio";
        return (
          <li key={request.id} className="grid gap-2 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="grid min-w-0 gap-0.5">
                <p className="font-semibold">
                  {showProperty ? `${request.propertyTitle} · ` : null}
                  {what}
                </p>
                <p className="text-small text-rocha">
                  Enviado em {dateTime.format(new Date(request.created_at))}
                </p>
              </div>
              <Badge tone={ownerRequestStatusTones[request.status]}>
                {ownerRequestStatusLabels[request.status]}
              </Badge>
            </div>
            {request.message ? (
              <p className="max-w-[68ch] text-small whitespace-pre-line">{request.message}</p>
            ) : null}
            {request.admin_reply ? (
              <p className="max-w-[68ch] rounded-control bg-marfim px-3 py-2 text-small">
                <span className="font-semibold">Resposta da Alugue Houses:</span>{" "}
                {request.admin_reply}
              </p>
            ) : null}
            {request.status === "pending" ? (
              <div>
                <RemoveRowButton
                  action={cancelOwnerRequest}
                  fields={{ id: request.id }}
                  label={what}
                  confirmTitle="Cancelar este pedido?"
                  verb="Cancelar pedido"
                  pendingVerb="Cancelando…"
                  keepLabel="Manter pedido"
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
