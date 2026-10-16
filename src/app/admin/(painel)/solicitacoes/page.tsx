import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BookingStatusBadge } from "@/components/admin/booking-status-badge";
import { Badge } from "@/components/admin/ui/badge";
import { Card } from "@/components/admin/ui/card";
import { DataTable, SortTh, Td, Th } from "@/components/admin/ui/data-table";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { ListToolbar } from "@/components/admin/ui/list-toolbar";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { ListPagination } from "@/components/admin/ui/pagination";
import { StatusTabs } from "@/components/admin/ui/status-tabs";
import { buttonClasses } from "@/components/ui/button";
import { CalendarIcon, DownloadIcon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseBookingFilters, type BookingFilters } from "@/lib/admin/filters";
import { buildHref, outOfRangeHref, PAGE_SIZE, pageRange } from "@/lib/admin/list-params";
import { bookingTabs, rentalModeLabels } from "@/lib/booking/labels";
import { formatBRL, formatDateISO, todayInSaoPaulo } from "@/lib/format";
import { listPropertyOptions } from "@/server/queries/admin-dashboard";
import { searchBookingRequests } from "@/server/queries/admin-bookings";
import { settle } from "@/server/queries/settle";
import { getStatusCounts } from "@/server/queries/status-counts";

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

function listParams(filters: BookingFilters) {
  const defaultDir = filters.tab.status === "pending" ? "asc" : "desc";
  const isDefault = filters.sort.key === "recebida" && filters.sort.dir === defaultDir;
  return {
    situacao: filters.tab.slug,
    q: filters.q,
    imovel: filters.propertyId,
    modalidade: filters.mode,
    de: filters.from,
    ate: filters.to,
    ordem: isDefault ? null : filters.sort.key,
    dir: isDefault ? null : filters.sort.dir,
  };
}

export default async function SolicitacoesPage({ searchParams }: PageProps<"/admin/solicitacoes">) {
  const params = await searchParams;
  const filters = parseBookingFilters(params);
  const { supabase } = await requireAdmin();
  const [{ rows, count }, countsResult, properties] = await Promise.all([
    searchBookingRequests(supabase, filters, pageRange(filters.page)),
    // Sem as contagens a lista continua útil: só as abas ficam sem números.
    settle(getStatusCounts(), "contagens das abas"),
    listPropertyOptions(supabase),
  ]);
  const counts = countsResult.ok ? countsResult.data.booking_requests : null;
  // Página além da última (ex.: excluiu o último item dela): vai para a última válida.
  const validPage = outOfRangeHref("/admin/solicitacoes", params, filters.page, count);
  if (validPage) redirect(validPage);
  const today = todayInSaoPaulo();
  const base = listParams(filters);
  const href = (extra: Record<string, string | number | null>) =>
    buildHref("/admin/solicitacoes", { ...base, ...extra });
  const sortHref = (s: { key: string; dir: string }) =>
    href({ ordem: s.key, dir: s.dir, pagina: null });
  const filtered = Boolean(
    filters.q || filters.propertyId || filters.mode || filters.from || filters.to,
  );
  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : null;

  return (
    <AdminPage>
      <PageHeader
        title="Solicitações de reserva"
        description="Pedidos feitos pelo site. Nada é confirmado até você aprovar; ao aprovar, as datas são bloqueadas no calendário."
        actions={
          <Link
            href={buildHref("/admin/exportar/solicitacoes", { ...base, ordem: null, dir: null })}
            prefetch={false}
            className={buttonClasses("secondary", "min-h-10 px-4")}
          >
            <DownloadIcon width={18} height={18} />
            Exportar CSV
          </Link>
        }
      />

      <StatusTabs
        label="Situação das solicitações"
        current={filters.tab.slug}
        tabs={bookingTabs.map((tab) => ({
          slug: tab.slug,
          label: tab.label,
          // Trocar de aba mantém busca e filtros, mas volta à ordenação padrão.
          href: buildHref("/admin/solicitacoes", {
            ...base,
            situacao: tab.slug,
            ordem: null,
            dir: null,
          }),
          count: tab.status ? (counts?.[tab.status] ?? null) : total,
        }))}
      />

      <Card as="div">
        <ListToolbar
          action="/admin/solicitacoes"
          search={filters.q}
          searchLabel="Buscar por nome, e-mail ou telefone"
          hidden={{ situacao: filters.tab.slug, ordem: base.ordem, dir: base.dir }}
          selects={[
            {
              name: "imovel",
              label: "Imóvel",
              value: filters.propertyId,
              allLabel: "Todos",
              options: properties,
            },
            {
              name: "modalidade",
              label: "Modalidade",
              value: filters.mode,
              allLabel: "Todas",
              options: Object.entries(rentalModeLabels).map(([value, label]) => ({ value, label })),
            },
          ]}
          extra={
            <>
              <label className="grid min-w-0 flex-[1_1_9rem] gap-1">
                <span className="text-small font-semibold">Recebida de</span>
                <input
                  type="date"
                  name="de"
                  defaultValue={filters.from ?? ""}
                  className="min-h-11 w-full min-w-0 rounded-control border border-junco bg-branco px-3"
                />
              </label>
              <label className="grid min-w-0 flex-[1_1_9rem] gap-1">
                <span className="text-small font-semibold">Recebida até</span>
                <input
                  type="date"
                  name="ate"
                  defaultValue={filters.to ?? ""}
                  className="min-h-11 w-full min-w-0 rounded-control border border-junco bg-branco px-3"
                />
              </label>
            </>
          }
          active={filtered}
          clearHref={buildHref("/admin/solicitacoes", { situacao: filters.tab.slug })}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon />}
            title={
              filtered
                ? "Nenhuma solicitação encontrada"
                : filters.tab.status === "pending"
                  ? "Nenhuma solicitação pendente"
                  : "Nenhuma solicitação nesta situação"
            }
            description={
              filtered
                ? "Nenhum pedido corresponde à busca e aos filtros escolhidos."
                : "Os pedidos feitos pelo site aparecem aqui assim que chegam."
            }
          />
        ) : (
          <DataTable
            caption={`Solicitações: ${filters.tab.label.toLowerCase()}`}
            minWidth={880}
            head={
              <>
                <SortTh
                  label="Hóspede"
                  sortKey="hospede"
                  current={filters.sort}
                  hrefFor={sortHref}
                />
                <Th>Imóvel</Th>
                <SortTh label="Datas" sortKey="chegada" current={filters.sort} hrefFor={sortHref} />
                <SortTh
                  label="Total estimado"
                  sortKey="total"
                  current={filters.sort}
                  hrefFor={sortHref}
                  align="right"
                />
                <Th>Situação</Th>
                <SortTh
                  label="Recebida"
                  sortKey="recebida"
                  current={filters.sort}
                  hrefFor={sortHref}
                />
              </>
            }
          >
            {rows.map((request) => (
              <tr key={request.id} className="hover:bg-marfim/50">
                <Td>
                  <Link
                    href={`/admin/solicitacoes/${request.id}`}
                    className="font-semibold text-petroleo hover:underline"
                  >
                    {request.guest_name}
                  </Link>
                  <span className="block text-small text-rocha">
                    {request.guests_count} {request.guests_count === 1 ? "hóspede" : "hóspedes"}
                  </span>
                </Td>
                <Td>{request.properties?.title ?? "—"}</Td>
                <Td className="tabular-nums">
                  {formatDateISO(request.checkIn)} a {formatDateISO(request.checkOut)}
                  <span className="block text-small text-rocha">
                    {nights(request.checkIn, request.checkOut)} ·{" "}
                    {rentalModeLabels[request.rental_mode]}
                  </span>
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatBRL(request.quoted_total)}
                </Td>
                <Td>
                  <div className="grid justify-items-start gap-1">
                    <BookingStatusBadge status={request.status} />
                    {request.status === "pending" && request.checkIn < today ? (
                      <Badge tone="danger">Chegada já passou</Badge>
                    ) : null}
                  </div>
                </Td>
                <Td className="text-small text-rocha tabular-nums">
                  {dateTime.format(new Date(request.created_at))}
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
        <ListPagination
          page={filters.page}
          pageSize={PAGE_SIZE}
          count={count}
          hrefFor={(page) => href({ pagina: page })}
        />
      </Card>
    </AdminPage>
  );
}
