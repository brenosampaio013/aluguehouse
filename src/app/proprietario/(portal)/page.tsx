import type { Metadata } from "next";
import Link from "next/link";

import { StatCard } from "@/components/admin/dashboard/stat-card";
import { Badge } from "@/components/admin/ui/badge";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { EmptyState, SectionError } from "@/components/admin/ui/empty-state";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { DayStateLegend, OccupancyStrip } from "@/components/owner/occupancy-strip";
import { buttonClasses } from "@/components/ui/button";
import { CalendarIcon, HouseIcon } from "@/components/ui/icons";
import { requireOwner } from "@/lib/auth/require-owner";
import { addDaysISO, formatDateISO, todayInSaoPaulo } from "@/lib/format";
import { ownerRequestStatusLabels, plural } from "@/lib/owner/portal";
import { siteConfig } from "@/lib/site-config";
import {
  getOwnerBookingCounts,
  getOwnerCalendar,
  getOwnerMovements,
  listOwnerProperties,
  listOwnerRequests,
} from "@/server/queries/owner-portal";
import { settle } from "@/server/queries/settle";

export const metadata: Metadata = { title: "Visão geral" };

const OCCUPANCY_DAYS = 30;

export default async function ProprietarioPage() {
  const { supabase, session } = await requireOwner();
  const today = todayInSaoPaulo();
  const [properties, counts, movements, calendar, requests] = await Promise.all([
    settle(listOwnerProperties(supabase), "imóveis do proprietário"),
    settle(getOwnerBookingCounts(supabase, today), "contagem de reservas"),
    settle(getOwnerMovements(supabase, today, OCCUPANCY_DAYS), "entradas e saídas"),
    settle(
      getOwnerCalendar(supabase, {
        from: today,
        to: addDaysISO(today, OCCUPANCY_DAYS),
        propertyId: null,
      }),
      "ocupação",
    ),
    settle(listOwnerRequests(supabase, null, 10), "pedidos"),
  ]);

  if (properties.ok && properties.data.length === 0) {
    return (
      <AdminPage>
        <PageHeader title="Bem-vindo ao portal" description={`Conectado como ${session.email}.`} />
        <Card>
          <EmptyState
            icon={<HouseIcon />}
            title="Nenhum imóvel vinculado à sua conta ainda"
            description="A Alugue Houses vincula cada imóvel à conta do proprietário. Assim que isso for feito, seus imóveis, reservas e calendário aparecem aqui."
            action={
              <a href={`mailto:${siteConfig.contact.email}`} className={buttonClasses("secondary")}>
                Falar com a Alugue Houses
              </a>
            }
          />
        </Card>
      </AdminPage>
    );
  }

  const pendingRequests = requests.ok ? requests.data.filter((r) => r.status === "pending") : [];

  return (
    <AdminPage>
      <PageHeader
        title="Visão geral"
        description="Seus imóveis, reservas e ocupação, com os dados atuais da Alugue Houses."
      />

      {counts.ok && properties.ok ? (
        <section
          aria-label="Indicadores"
          className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3"
        >
          <StatCard label="Imóveis vinculados" value={String(properties.data.length)} />
          <StatCard
            label="Reservas futuras"
            value={String(counts.data.upcoming)}
            hint="Confirmadas, com entrada depois de hoje."
          />
          <StatCard
            label="Hospedagens em andamento"
            value={String(counts.data.inProgress)}
            hint="Hóspedes no imóvel hoje."
          />
          <StatCard
            label="Aguardando aprovação"
            value={String(counts.data.pending)}
            hint="Pedidos que a Alugue Houses ainda vai analisar."
          />
          <StatCard label="Reservas concluídas" value={String(counts.data.completed)} />
          <StatCard label="Reservas canceladas" value={String(counts.data.cancelled)} />
        </section>
      ) : (
        <Card>
          <SectionError what="os indicadores" />
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card aria-labelledby="entradas">
          <CardHeader
            id="entradas"
            title="Próximas entradas"
            description={`Reservas confirmadas com entrada nos próximos ${OCCUPANCY_DAYS} dias.`}
          />
          {movements.ok ? (
            <MovementList
              items={movements.data.arrivals.map((m) => ({ ...m, date: m.check_in }))}
              today={today}
              empty="Nenhuma entrada prevista."
            />
          ) : (
            <SectionError what="as próximas entradas" />
          )}
        </Card>
        <Card aria-labelledby="saidas">
          <CardHeader
            id="saidas"
            title="Próximas saídas"
            description={`Saídas de hospedagens nos próximos ${OCCUPANCY_DAYS} dias.`}
          />
          {movements.ok ? (
            <MovementList
              items={movements.data.departures.map((m) => ({ ...m, date: m.check_out }))}
              today={today}
              empty="Nenhuma saída prevista."
            />
          ) : (
            <SectionError what="as próximas saídas" />
          )}
        </Card>
      </div>

      <Card aria-labelledby="ocupacao">
        <CardHeader
          id="ocupacao"
          title="Ocupação dos próximos 30 dias"
          description={`De ${formatDateISO(today)} a ${formatDateISO(addDaysISO(today, OCCUPANCY_DAYS - 1))}.`}
          action={
            <Link
              href="/proprietario/calendario"
              className={buttonClasses("secondary", "min-h-10 px-4")}
            >
              <CalendarIcon width={18} height={18} />
              Abrir calendário
            </Link>
          }
        />
        {properties.ok && calendar.ok ? (
          <div className="grid gap-5 p-5">
            <DayStateLegend />
            <ul className="grid gap-5">
              {properties.data.map((property) => (
                <li key={property.id} className="grid gap-2">
                  <Link
                    href={`/proprietario/calendario?imovel=${property.id}`}
                    className="w-fit font-semibold text-petroleo hover:underline"
                  >
                    {property.title}
                  </Link>
                  <OccupancyStrip
                    blocks={calendar.data.filter((b) => b.property_id === property.id)}
                    from={today}
                    days={OCCUPANCY_DAYS}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <SectionError what="a ocupação" />
        )}
      </Card>

      {pendingRequests.length > 0 ? (
        <Card aria-labelledby="pedidos">
          <CardHeader
            id="pedidos"
            title="Seus pedidos em análise"
            description="Bloqueios de datas e alterações aguardando a Alugue Houses."
          />
          <ul className="divide-y divide-areia">
            {pendingRequests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
              >
                <span>
                  <span className="font-semibold">{request.propertyTitle}</span>
                  <span className="block text-small text-rocha">
                    {request.kind === "block" && request.stay
                      ? `Bloqueio de ${formatDateISO(request.stay.start)} a ${formatDateISO(request.stay.endExclusive)}`
                      : "Alteração do anúncio"}
                  </span>
                </span>
                <Badge tone="warning">{ownerRequestStatusLabels[request.status]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </AdminPage>
  );
}

function MovementList({
  items,
  today,
  empty,
}: {
  items: {
    id: string;
    date: string;
    property_title: string;
    guest_first_name: string;
    guests_count: number;
  }[];
  today: string;
  empty: string;
}) {
  if (items.length === 0) return <p className="px-5 py-6 text-rocha">{empty}</p>;
  return (
    <ul className="divide-y divide-areia">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/proprietario/reservas/${item.id}`}
            className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-marfim/60"
          >
            <span className="min-w-0">
              <span className="block font-semibold">{item.property_title}</span>
              <span className="block text-small text-rocha">
                {item.guest_first_name} · {plural(item.guests_count, "hóspede", "hóspedes")}
              </span>
            </span>
            <span className="text-small font-semibold tabular-nums">
              {item.date === today ? "Hoje" : formatDateISO(item.date)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
