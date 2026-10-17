import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardHeader } from "@/components/admin/ui/card";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { BookingStageBadge } from "@/components/owner/booking-stage-badge";
import { parseUuid } from "@/lib/admin/filters";
import { requireOwner } from "@/lib/auth/require-owner";
import { nightsBetween } from "@/lib/booking/calendar";
import { rentalModeLabels } from "@/lib/booking/labels";
import { formatBRL, formatDateISO, todayInSaoPaulo } from "@/lib/format";
import { parseQuote, plural } from "@/lib/owner/portal";
import { getOwnerBooking } from "@/server/queries/owner-portal";

export const metadata: Metadata = { title: "Reserva" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function ReservaProprietarioPage({
  params,
}: PageProps<"/proprietario/reservas/[id]">) {
  const { id: rawId } = await params;
  const id = parseUuid(rawId);
  if (!id) notFound();

  const { supabase } = await requireOwner();
  // owner_bookings só devolve reservas dos imóveis vinculados a quem está logado.
  const booking = await getOwnerBooking(supabase, id);
  if (!booking) notFound();

  const today = todayInSaoPaulo();
  const quote = parseQuote(booking.quote);
  const nights = nightsBetween(booking.check_in, booking.check_out);

  return (
    <AdminPage>
      <PageHeader
        back={{ href: "/proprietario/reservas", label: "Reservas" }}
        title={`Reserva de ${booking.guest_first_name}`}
        meta={<BookingStageBadge booking={booking} today={today} />}
        description={
          <>
            <Link
              href={`/proprietario/imoveis/${booking.property_id}`}
              className="font-semibold text-petroleo hover:underline"
            >
              {booking.property_title}
            </Link>{" "}
            · protocolo {booking.id.slice(0, 8).toUpperCase()}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="estadia">
          <CardHeader id="estadia" title="Estadia" />
          <dl className="grid gap-3 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-small text-rocha">Entrada</dt>
              <dd className="font-semibold tabular-nums">{formatDateISO(booking.check_in)}</dd>
            </div>
            <div>
              <dt className="text-small text-rocha">Saída</dt>
              <dd className="font-semibold tabular-nums">{formatDateISO(booking.check_out)}</dd>
            </div>
            <div>
              <dt className="text-small text-rocha">Duração</dt>
              <dd className="font-semibold">
                {plural(nights, "noite", "noites")} · {rentalModeLabels[booking.rental_mode]}
              </dd>
            </div>
            <div>
              <dt className="text-small text-rocha">Hóspedes</dt>
              <dd className="font-semibold">{booking.guests_count}</dd>
            </div>
            <div>
              <dt className="text-small text-rocha">Pedido feito em</dt>
              <dd className="tabular-nums">{dateTime.format(new Date(booking.created_at))}</dd>
            </div>
            {booking.decided_at ? (
              <div>
                <dt className="text-small text-rocha">Decisão em</dt>
                <dd className="tabular-nums">{dateTime.format(new Date(booking.decided_at))}</dd>
              </div>
            ) : null}
          </dl>
          <p className="border-t border-areia px-5 py-4 text-small text-rocha">
            Por privacidade, o portal mostra só o primeiro nome do hóspede. Aprovação, recusa e
            cancelamento são feitos pela Alugue Houses.
          </p>
        </Card>

        <Card aria-labelledby="estimativa">
          <CardHeader
            id="estimativa"
            title="Valores estimados"
            description="Orçamento feito no momento do pedido. É uma estimativa: não é pagamento recebido nem repasse."
          />
          <dl className="grid gap-1 p-5 tabular-nums">
            {quote.lines.map((line) => (
              <div key={line.label + line.unitPrice} className="flex justify-between gap-4">
                <dt>
                  {line.label} · {plural(line.nights, "noite", "noites")}
                </dt>
                <dd>{formatBRL(line.amount)}</dd>
              </div>
            ))}
            {quote.fees.map((fee) => (
              <div key={fee.label} className="flex justify-between gap-4">
                <dt>{fee.label}</dt>
                <dd>{formatBRL(fee.amount)}</dd>
              </div>
            ))}
            <div className="mt-2 flex justify-between gap-4 border-t border-junco pt-2 font-semibold">
              <dt>Total estimado</dt>
              <dd>{formatBRL(booking.quoted_total)}</dd>
            </div>
          </dl>
          {quote.deposits.length ? (
            <div className="grid gap-1 px-5 pb-5">
              {quote.deposits.map((deposit) => (
                <p key={deposit.label} className="text-small text-rocha">
                  {deposit.label} (reembolsável): {formatBRL(deposit.amount)}, fora do total.
                </p>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </AdminPage>
  );
}
