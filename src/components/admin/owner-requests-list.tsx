import Link from "next/link";

import { Badge } from "@/components/admin/ui/badge";
import { formatDateISO } from "@/lib/format";
import { ownerRequestStatusTones } from "@/lib/owner/portal";
import type { AdminOwnerRequest } from "@/server/queries/admin-owners";

import { OwnerRequestDecision } from "./owner-request-decision";

const statusLabels = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado pelo proprietário",
} as const;

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** Pedidos dos proprietários (bloqueio de datas e alteração do anúncio). */
export function OwnerRequestsList({
  requests,
  showProperty = false,
  empty,
}: {
  requests: AdminOwnerRequest[];
  showProperty?: boolean;
  empty: string;
}) {
  if (requests.length === 0) return <p className="text-rocha">{empty}</p>;
  return (
    <ul className="grid gap-4">
      {requests.map((request) => (
        <li key={request.id} className="grid gap-3 rounded-control border border-areia p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="grid min-w-0 gap-0.5">
              <p className="font-semibold">
                {request.kind === "block" && request.stay
                  ? `Bloqueio para uso próprio: ${formatDateISO(request.stay.start)} a ${formatDateISO(request.stay.end)}`
                  : "Alteração do anúncio"}
              </p>
              <p className="text-small text-rocha">
                {showProperty ? (
                  <>
                    <Link
                      href={`/admin/imoveis/${request.property_id}#proprietarios`}
                      className="font-semibold text-petroleo hover:underline"
                    >
                      {request.propertyTitle}
                    </Link>{" "}
                    ·{" "}
                  </>
                ) : null}
                {request.requesterEmail} · {dateTime.format(new Date(request.created_at))}
              </p>
            </div>
            <Badge tone={ownerRequestStatusTones[request.status]}>
              {statusLabels[request.status]}
            </Badge>
          </div>
          {request.message ? (
            <p className="max-w-[72ch] whitespace-pre-line">{request.message}</p>
          ) : null}
          {request.admin_reply ? (
            <p className="text-small text-rocha">Resposta: {request.admin_reply}</p>
          ) : null}
          {request.status === "pending" ? (
            <OwnerRequestDecision id={request.id} kind={request.kind} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
