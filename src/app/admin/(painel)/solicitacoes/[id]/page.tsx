import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "@/lib/zod";

import { BookingDecision } from "@/components/admin/booking-decision";
import { BookingNotesForm } from "@/components/admin/booking-notes-form";
import { BookingStatusBadge } from "@/components/admin/booking-status-badge";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { ChatIcon } from "@/components/ui/icons";
import { buttonClasses } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/require-admin";
import { nightsBetween } from "@/lib/booking/calendar";
import { blockKindLabels, bookingStatusLabels, rentalModeLabels } from "@/lib/booking/labels";
import { formatBRL, formatDateISO, todayInSaoPaulo } from "@/lib/format";
import { guestWhatsappLink } from "@/lib/whatsapp";
import { getBookingRequest } from "@/server/queries/admin-bookings";
import type { StayQuote } from "@/server/queries/property-page";

export const metadata: Metadata = { title: "Solicitação de reserva" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** (13) 99619-5221 para números com DDD; outros ficam como vieram. */
function formatPhone(digits: string) {
  const local = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  const match = local.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : digits;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  const id = `secao-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-photo border border-areia bg-branco">
      <h2 id={id} className="border-b border-areia px-5 py-4 text-h3 font-semibold">
        {title}
      </h2>
      <div className="grid gap-4 p-5">{children}</div>
    </section>
  );
}

export default async function SolicitacaoPage({ params }: PageProps<"/admin/solicitacoes/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase } = await requireAdmin();
  const { request, blockConflicts, pendingConflicts } = await getBookingRequest(supabase, id);
  const quote = request.quote_snapshot as unknown as StayQuote;
  const reference = request.id.slice(0, 8).toUpperCase();
  const nights = nightsBetween(request.checkIn, request.checkOut);
  const today = todayInSaoPaulo();
  const checkInPassed = request.checkIn < today;
  const property = request.properties;
  const firstName = request.guest_name.split(" ")[0];
  const whatsappMessage = `Olá, ${firstName}! Aqui é da Alugue Houses, sobre sua solicitação ${reference}${
    property ? ` para ${property.title}` : ""
  }, de ${formatDateISO(request.checkIn)} a ${formatDateISO(request.checkOut)}.`;
  const hasConflicts =
    request.status === "pending" && (blockConflicts.length > 0 || pendingConflicts.length > 0);

  return (
    <AdminPage>
      <PageHeader
        back={{ href: "/admin/solicitacoes", label: "Voltar para solicitações" }}
        title={request.guest_name}
        meta={<BookingStatusBadge status={request.status} />}
        description={
          <>
            Protocolo <span className="font-semibold tabular-nums">{reference}</span> · recebida em{" "}
            {dateTime.format(new Date(request.created_at))}
            {request.decided_at
              ? ` · ${bookingStatusLabels[request.status].toLowerCase()} em ${dateTime.format(new Date(request.decided_at))}`
              : ""}
          </>
        }
      />

      <a
        href="#decisao"
        className="w-fit font-semibold text-petroleo underline underline-offset-3 lg:hidden"
      >
        Ir para contato e decisão
      </a>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="grid min-w-0 gap-6">
          <Block title="Estadia">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-small font-semibold text-rocha">Imóvel</dt>
                <dd>
                  {property ? (
                    <Link
                      href={`/admin/imoveis/${property.id}#calendario`}
                      className="text-petroleo underline underline-offset-3"
                    >
                      {property.title}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-small font-semibold text-rocha">Datas</dt>
                <dd className="tabular-nums">
                  {formatDateISO(request.checkIn)} a {formatDateISO(request.checkOut)} ·{" "}
                  {plural(nights, "noite", "noites")}
                </dd>
              </div>
              <div>
                <dt className="text-small font-semibold text-rocha">Modalidade</dt>
                <dd>{rentalModeLabels[request.rental_mode]}</dd>
              </div>
              <div>
                <dt className="text-small font-semibold text-rocha">Hóspedes</dt>
                <dd>{request.guests_count}</dd>
              </div>
            </dl>
            {checkInPassed && request.status === "pending" ? (
              <p className="rounded-control border border-erro px-3 py-2 text-erro">
                A data de chegada já passou.
              </p>
            ) : null}
          </Block>

          {request.status === "pending" ? (
            <Block title="Conflitos">
              {!hasConflicts ? (
                <p>Nenhum conflito: as datas estão livres e não há outros pedidos pendentes.</p>
              ) : (
                <ul className="grid gap-2">
                  {blockConflicts.map((block) => (
                    <li
                      key={block.id}
                      className="rounded-control border border-erro px-3 py-2 text-erro"
                    >
                      Datas ocupadas: {blockKindLabels[block.kind].toLowerCase()} de{" "}
                      {formatDateISO(block.checkIn)} a {formatDateISO(block.checkOut)}
                      {block.booking_request_id ? (
                        <>
                          {" "}
                          (
                          <Link
                            href={`/admin/solicitacoes/${block.booking_request_id}`}
                            className="underline underline-offset-3"
                          >
                            ver reserva
                          </Link>
                          )
                        </>
                      ) : null}
                      . Aprovar não será possível.
                    </li>
                  ))}
                  {pendingConflicts.map((other) => (
                    <li key={other.id} className="rounded-control bg-areia px-3 py-2">
                      Outro pedido pendente nas mesmas datas:{" "}
                      <Link
                        href={`/admin/solicitacoes/${other.id}`}
                        className="text-petroleo underline underline-offset-3"
                      >
                        {other.guest_name}
                      </Link>
                      , {formatDateISO(other.checkIn)} a {formatDateISO(other.checkOut)}. Só um
                      deles pode ser aprovado.
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          ) : null}

          <Block title="Orçamento no momento do pedido">
            <dl className="grid max-w-md gap-1 tabular-nums">
              {(quote.lines ?? []).map((line) => (
                <div key={line.label + line.unit_price} className="flex justify-between gap-4">
                  <dt>
                    {line.label} · {plural(line.nights, "noite", "noites")}
                  </dt>
                  <dd>{formatBRL(line.amount)}</dd>
                </div>
              ))}
              {(quote.fees ?? []).map((fee) => (
                <div key={fee.label} className="flex justify-between gap-4">
                  <dt>{fee.label}</dt>
                  <dd>{formatBRL(fee.amount)}</dd>
                </div>
              ))}
              <div className="mt-2 flex justify-between gap-4 border-t border-junco pt-2 font-semibold">
                <dt>Total estimado</dt>
                <dd>{formatBRL(request.quoted_total)}</dd>
              </div>
            </dl>
            {(quote.deposits ?? []).map((deposit) => (
              <p key={deposit.label} className="text-small text-rocha">
                {deposit.label} (reembolsável): {formatBRL(deposit.amount)}, fora do total.
              </p>
            ))}
          </Block>

          {request.message ? (
            <Block title="Mensagem do hóspede">
              <p className="max-w-[68ch] whitespace-pre-line">{request.message}</p>
            </Block>
          ) : null}

          <Block title="Anotações">
            <BookingNotesForm bookingId={request.id} notes={request.admin_notes ?? ""} />
          </Block>
        </div>

        <aside
          id="decisao"
          aria-label="Contato e decisão"
          className="grid scroll-mt-24 gap-6 rounded-photo border border-areia bg-branco p-6 lg:sticky lg:top-24"
        >
          <div className="grid gap-3">
            <h2 className="text-h3 font-semibold">Contato</h2>
            <p>
              <a
                href={`mailto:${request.guest_email}`}
                className="break-all text-petroleo underline underline-offset-3"
              >
                {request.guest_email}
              </a>
            </p>
            <p className="tabular-nums">{formatPhone(request.guest_phone)}</p>
            <a
              href={guestWhatsappLink(request.guest_phone, whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary")}
            >
              <ChatIcon />
              Responder no WhatsApp
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </div>
          <div className="grid gap-3 border-t border-areia pt-6">
            <h2 className="text-h3 font-semibold">Decisão</h2>
            <BookingDecision
              bookingId={request.id}
              status={request.status}
              checkInPassed={checkInPassed}
              hasConflicts={hasConflicts}
            />
          </div>
        </aside>
      </div>
    </AdminPage>
  );
}
