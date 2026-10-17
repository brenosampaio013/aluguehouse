import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardHeader } from "@/components/admin/ui/card";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { MonthCalendar } from "@/components/owner/month-calendar";
import { DayStateLegend, dayStateStyles } from "@/components/owner/occupancy-strip";
import { BlockRequestForm } from "@/components/owner/request-forms";
import { RequestList } from "@/components/owner/request-list";
import { buttonClasses } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, HouseIcon } from "@/components/ui/icons";
import { parseUuid } from "@/lib/admin/filters";
import { first } from "@/lib/admin/list-params";
import { requireOwner } from "@/lib/auth/require-owner";
import { monthStart, monthsBetween } from "@/lib/booking/calendar";
import { cn } from "@/lib/cn";
import { formatDateISO, todayInSaoPaulo } from "@/lib/format";
import { plural } from "@/lib/owner/portal";
import {
  getOwnerCalendar,
  getPricingRules,
  listOwnerProperties,
  listOwnerRequests,
  listPendingStays,
} from "@/server/queries/owner-portal";

export const metadata: Metadata = { title: "Calendário" };

/** Até onde o proprietário navega: 24 meses para trás e para a frente. */
const MONTH_WINDOW = 24;

const monthName = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function parseMonth(value: string | undefined, today: string) {
  const current = monthStart(today);
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return current;
  const month = `${value}-01`;
  return Math.abs(monthsBetween(current, month)) <= MONTH_WINDOW ? month : current;
}

export default async function CalendarioPage({
  searchParams,
}: PageProps<"/proprietario/calendario">) {
  const params = await searchParams;
  const { supabase } = await requireOwner();
  const today = todayInSaoPaulo();
  const properties = await listOwnerProperties(supabase);

  if (properties.length === 0) {
    return (
      <AdminPage>
        <PageHeader title="Calendário" />
        <Card>
          <EmptyState
            icon={<HouseIcon />}
            title="Nenhum imóvel vinculado à sua conta ainda"
            description="O calendário aparece assim que a Alugue Houses vincular seus imóveis."
          />
        </Card>
      </AdminPage>
    );
  }

  // Só imóveis da lista do proprietário: um ID de outro dono cai no primeiro dele.
  const requested = parseUuid(params.imovel);
  const property = properties.find((p) => p.id === requested) ?? properties[0]!;
  const firstDay = parseMonth(first(params.mes), today);
  const nextMonth = monthStart(firstDay, 1);
  const [blocks, pending, pricing, requests] = await Promise.all([
    getOwnerCalendar(supabase, { from: firstDay, to: nextMonth, propertyId: property.id }),
    listPendingStays(supabase, { propertyId: property.id, from: firstDay, to: nextMonth }),
    getPricingRules(supabase, property.id),
    listOwnerRequests(supabase, property.id),
  ]);
  const monthText = monthName.format(new Date(`${firstDay}T00:00:00Z`));
  const monthLabel = monthText.charAt(0).toUpperCase() + monthText.slice(1);
  const href = (month: string) =>
    `/proprietario/calendario?imovel=${property.id}&mes=${month.slice(0, 7)}`;
  const offset = monthsBetween(monthStart(today), firstDay);

  return (
    <AdminPage>
      <PageHeader
        title="Calendário"
        description="Datas livres, reservadas e bloqueadas de cada imóvel, com a tarifa de cada noite. Reservas não podem se sobrepor: o banco recusa qualquer período já ocupado."
      />

      {properties.length > 1 ? (
        <nav aria-label="Imóveis" className="flex flex-wrap gap-2">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/proprietario/calendario?imovel=${p.id}&mes=${firstDay.slice(0, 7)}`}
              aria-current={p.id === property.id ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center rounded-full border px-4 text-small font-semibold",
                p.id === property.id
                  ? "border-petroleo bg-petroleo text-branco"
                  : "border-junco bg-branco text-abismo hover:border-petroleo",
              )}
            >
              {p.title}
            </Link>
          ))}
        </nav>
      ) : null}

      <Card aria-labelledby="mes">
        <CardHeader
          id="mes"
          title={`${property.title} · ${monthLabel}`}
          description={`Valores por noite${
            pricing?.rates.length
              ? "; nas datas de temporada vale a tarifa sazonal"
              : " (diária base)"
          }. Estadia mínima: ${plural(pricing?.minNights ?? 1, "noite", "noites")}${
            pricing?.rates.some((r) => (r.minNights ?? 0) > pricing.minNights)
              ? " (mais em algumas temporadas, indicado no dia)"
              : ""
          }.`}
          action={
            <div className="flex items-center gap-2">
              {offset > -MONTH_WINDOW ? (
                <Link
                  href={href(monthStart(firstDay, -1))}
                  className={buttonClasses("secondary", "min-h-10 px-3")}
                >
                  <ChevronLeftIcon width={18} height={18} />
                  <span className="sr-only">Mês anterior</span>
                </Link>
              ) : null}
              {offset !== 0 ? (
                <Link
                  href={href(monthStart(today))}
                  className={buttonClasses("secondary", "min-h-10 px-3")}
                >
                  Hoje
                </Link>
              ) : null}
              {offset < MONTH_WINDOW ? (
                <Link
                  href={href(nextMonth)}
                  className={buttonClasses("secondary", "min-h-10 px-3")}
                >
                  <ChevronRightIcon width={18} height={18} />
                  <span className="sr-only">Próximo mês</span>
                </Link>
              ) : null}
            </div>
          }
        />
        <div className="grid gap-4 p-3 sm:p-5">
          <DayStateLegend withPending />
          <MonthCalendar
            firstDay={firstDay}
            monthLabel={monthLabel}
            today={today}
            blocks={blocks}
            pendingStays={pending}
            rates={pricing?.rates ?? []}
            basePrice={pricing?.nightlyPrice ?? null}
            baseMinNights={pricing?.minNights ?? 1}
          />
        </div>
        <div className="border-t border-areia px-5 py-4">
          <h3 className="mb-2 font-semibold">Períodos neste mês</h3>
          {blocks.length + pending.length === 0 ? (
            <p className="text-rocha">Nenhuma reserva, bloqueio ou pedido neste mês.</p>
          ) : (
            <ul className="grid gap-2">
              {blocks.map((block) => (
                <li
                  key={`${block.start_date}-${block.kind}`}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span
                    aria-hidden="true"
                    className={cn("size-3 rounded-[3px] border", dayStateStyles[block.kind].cell)}
                  />
                  <span className="font-semibold">{dayStateStyles[block.kind].label}</span>
                  <span className="tabular-nums">
                    {formatDateISO(block.start_date)} a {formatDateISO(block.end_date)}
                  </span>
                  {block.booking_request_id ? (
                    <Link
                      href={`/proprietario/reservas/${block.booking_request_id}`}
                      className="text-small font-semibold text-petroleo hover:underline"
                    >
                      Ver reserva
                    </Link>
                  ) : null}
                </li>
              ))}
              {pending.map((stay) => (
                <li
                  key={`p-${stay.check_in}-${stay.check_out}`}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-[3px] border border-dashed border-junco bg-areia"
                  />
                  <span className="font-semibold">Pedido aguardando aprovação</span>
                  <span className="tabular-nums">
                    {formatDateISO(stay.check_in)} a {formatDateISO(stay.check_out)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card aria-labelledby="bloqueio">
          <CardHeader
            id="bloqueio"
            title="Pedir bloqueio para uso próprio"
            description="As datas só ficam bloqueadas depois da aprovação da Alugue Houses. Períodos já reservados não podem ser bloqueados."
          />
          <div className="p-5">
            <BlockRequestForm
              properties={properties.map((p) => ({ id: p.id, title: p.title }))}
              defaultPropertyId={property.id}
              today={today}
            />
          </div>
        </Card>
        <Card aria-labelledby="pedidos-bloqueio">
          <CardHeader id="pedidos-bloqueio" title={`Pedidos de ${property.title}`} />
          <RequestList requests={requests} empty="Nenhum pedido enviado para este imóvel." />
        </Card>
      </div>
    </AdminPage>
  );
}
