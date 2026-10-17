import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/admin/ui/card";
import { DataTable, Td, Th } from "@/components/admin/ui/data-table";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { ListToolbar } from "@/components/admin/ui/list-toolbar";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { ListPagination } from "@/components/admin/ui/pagination";
import { StatusTabs } from "@/components/admin/ui/status-tabs";
import { BookingStageBadge } from "@/components/owner/booking-stage-badge";
import { CalendarIcon } from "@/components/ui/icons";
import { parseUuid } from "@/lib/admin/filters";
import { buildHref, first, outOfRangeHref, PAGE_SIZE, parsePage } from "@/lib/admin/list-params";
import { requireOwner } from "@/lib/auth/require-owner";
import { nightsBetween } from "@/lib/booking/calendar";
import { rentalModeLabels } from "@/lib/booking/labels";
import { formatBRL, formatDateISO, todayInSaoPaulo } from "@/lib/format";
import { ownerBookingTabs, parseOwnerBookingTab, plural } from "@/lib/owner/portal";
import { listOwnerBookings, listOwnerProperties } from "@/server/queries/owner-portal";

export const metadata: Metadata = { title: "Reservas" };

const PATH = "/proprietario/reservas";

export default async function ReservasProprietarioPage({
  searchParams,
}: PageProps<"/proprietario/reservas">) {
  const params = await searchParams;
  const tab = parseOwnerBookingTab(first(params.situacao));
  const page = parsePage(params.pagina);
  const { supabase } = await requireOwner();
  const today = todayInSaoPaulo();
  const properties = await listOwnerProperties(supabase);
  // Filtro só com imóveis do proprietário; qualquer outro ID é ignorado.
  const requested = parseUuid(params.imovel);
  const propertyId = properties.some((p) => p.id === requested) ? requested : null;

  const { rows, count } = await listOwnerBookings(supabase, { tab, propertyId, today, page });
  const validPage = outOfRangeHref(PATH, params, page, count);
  if (validPage) redirect(validPage);

  const base = { situacao: tab === "todas" ? null : tab, imovel: propertyId };

  return (
    <AdminPage>
      <PageHeader
        title="Reservas"
        description="Reservas e pedidos dos seus imóveis. Aprovação, recusa e cancelamento são feitos pela Alugue Houses."
      />

      <StatusTabs
        label="Etapa das reservas"
        current={tab}
        tabs={ownerBookingTabs.map((t) => ({
          slug: t.slug,
          label: t.label,
          href: buildHref(PATH, { ...base, situacao: t.slug === "todas" ? null : t.slug }),
        }))}
      />

      <Card as="div">
        {properties.length > 1 ? (
          <ListToolbar
            action={PATH}
            hidden={{ situacao: base.situacao }}
            selects={[
              {
                name: "imovel",
                label: "Imóvel",
                value: propertyId,
                allLabel: "Todos",
                options: properties.map((p) => ({ value: p.id, label: p.title })),
              },
            ]}
            active={Boolean(propertyId)}
            clearHref={buildHref(PATH, { situacao: base.situacao })}
          />
        ) : null}

        {rows.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon />}
            title={
              properties.length === 0
                ? "Nenhum imóvel vinculado ainda"
                : "Nenhuma reserva nesta etapa"
            }
            description={
              properties.length === 0
                ? "As reservas aparecem aqui assim que a Alugue Houses vincular seus imóveis."
                : "Quando houver reservas ou pedidos nesta situação, eles aparecem aqui."
            }
          />
        ) : (
          <DataTable
            caption={`Reservas: ${ownerBookingTabs.find((t) => t.slug === tab)!.label.toLowerCase()}`}
            minWidth={820}
            head={
              <>
                <Th>Imóvel</Th>
                <Th>Hóspede</Th>
                <Th>Datas</Th>
                <Th>Situação</Th>
                <Th align="right">Valor estimado</Th>
              </>
            }
          >
            {rows.map((booking) => (
              <tr key={booking.id} className="hover:bg-marfim/50">
                <Td>
                  <Link
                    href={`${PATH}/${booking.id}`}
                    className="font-semibold text-petroleo hover:underline"
                  >
                    {booking.property_title}
                  </Link>
                </Td>
                <Td>
                  {booking.guest_first_name}
                  <span className="block text-small text-rocha">
                    {plural(booking.guests_count, "hóspede", "hóspedes")}
                  </span>
                </Td>
                <Td className="tabular-nums">
                  {formatDateISO(booking.check_in)} a {formatDateISO(booking.check_out)}
                  <span className="block text-small text-rocha">
                    {plural(nightsBetween(booking.check_in, booking.check_out), "noite", "noites")}{" "}
                    · {rentalModeLabels[booking.rental_mode]}
                  </span>
                </Td>
                <Td>
                  <BookingStageBadge booking={booking} today={today} />
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatBRL(booking.quoted_total)}
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
        <ListPagination
          page={page}
          pageSize={PAGE_SIZE}
          count={count}
          hrefFor={(n) => buildHref(PATH, { ...base, pagina: n })}
        />
      </Card>
      <p className="text-small text-rocha">
        Valor estimado: orçamento feito no momento do pedido (diárias e taxas). Não é pagamento
        recebido nem repasse.
      </p>
    </AdminPage>
  );
}
