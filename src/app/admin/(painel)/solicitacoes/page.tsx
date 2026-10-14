import type { Metadata } from "next";
import Link from "next/link";

import { BookingStatusBadge } from "@/components/admin/booking-status-badge";
import { Container } from "@/components/ui/container";
import { requireAdmin } from "@/lib/auth/require-admin";
import { bookingTabs, parseBookingTab, rentalModeLabels } from "@/lib/booking/labels";
import { cn } from "@/lib/cn";
import { formatBRL, formatDateISO } from "@/lib/format";
import { listBookingRequests } from "@/server/queries/admin-bookings";

export const metadata: Metadata = { title: "Solicitações de reserva" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function nights(checkIn: string, checkOut: string) {
  const n = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
  return `${n} ${n === 1 ? "noite" : "noites"}`;
}

export default async function SolicitacoesPage({ searchParams }: PageProps<"/admin/solicitacoes">) {
  const tab = parseBookingTab((await searchParams).situacao);
  const { supabase } = await requireAdmin();
  const requests = await listBookingRequests(supabase, tab.status);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );

  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-8">
        <div className="grid gap-2">
          <h1 className="font-serif text-h1 font-normal">Solicitações de reserva</h1>
          <p className="max-w-[68ch] text-rocha">
            Pedidos feitos pelo site. Nada é confirmado até você aprovar; ao aprovar, as datas são
            bloqueadas no calendário.
          </p>
        </div>

        <nav aria-label="Situação das solicitações">
          <ul className="flex flex-wrap gap-2">
            {bookingTabs.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/admin/solicitacoes?situacao=${item.slug}`}
                  aria-current={item.slug === tab.slug ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-4 font-semibold",
                    item.slug === tab.slug
                      ? "border-petroleo bg-petroleo text-branco"
                      : "border-junco text-petroleo hover:bg-areia",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {requests.length === 0 ? (
          <p className="text-rocha">
            {tab.status === "pending"
              ? "Nenhuma solicitação pendente."
              : "Nenhuma solicitação nesta situação."}
          </p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <caption className="sr-only">Solicitações: {tab.label.toLowerCase()}</caption>
              <thead className="text-small text-rocha">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Hóspede
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Imóvel
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Datas
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">
                    Total estimado
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Situação
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Recebida
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-t border-areia align-top">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/solicitacoes/${request.id}`}
                        className="font-semibold text-petroleo underline underline-offset-3"
                      >
                        {request.guest_name}
                      </Link>
                      <span className="block text-small text-rocha">
                        {request.guests_count} {request.guests_count === 1 ? "hóspede" : "hóspedes"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{request.properties?.title ?? "—"}</td>
                    <td className="py-3 pr-4 tabular-nums">
                      {formatDateISO(request.checkIn)} a {formatDateISO(request.checkOut)}
                      <span className="block text-small text-rocha">
                        {nights(request.checkIn, request.checkOut)} ·{" "}
                        {rentalModeLabels[request.rental_mode]}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatBRL(request.quoted_total)}
                    </td>
                    <td className="py-3 pr-4">
                      <BookingStatusBadge status={request.status} />
                      {request.status === "pending" && request.checkIn < today ? (
                        <span className="block pt-1 text-small text-erro">Chegada já passou</span>
                      ) : null}
                    </td>
                    <td className="py-3 text-rocha tabular-nums">
                      {dateTime.format(new Date(request.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </main>
  );
}
