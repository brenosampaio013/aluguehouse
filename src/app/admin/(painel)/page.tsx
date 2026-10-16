import type { Metadata } from "next";
import Link from "next/link";

import { BookingStatusBadge } from "@/components/admin/booking-status-badge";
import { BarList } from "@/components/admin/dashboard/bar-list";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { TrendChart } from "@/components/admin/dashboard/trend-chart";
import { Badge } from "@/components/admin/ui/badge";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { EmptyState, SectionError } from "@/components/admin/ui/empty-state";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { buttonClasses } from "@/components/ui/button";
import {
  AlertIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  ExternalIcon,
  HouseIcon,
  InboxIcon,
  PlusIcon,
  StarIcon,
} from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  bucketLabels,
  compare,
  formatDuration,
  formatPercent,
  parseDashboardPeriod,
  periodPresets,
  ratio,
} from "@/lib/admin/dashboard";
import { parseUuid } from "@/lib/admin/filters";
import { buildHref, first } from "@/lib/admin/list-params";
import { bookingStatusLabels, rentalModeLabels, type BookingStatus } from "@/lib/booking/labels";
import { cn } from "@/lib/cn";
import { formatBRL, formatDateISO, todayInSaoPaulo } from "@/lib/format";
import { inquiryKindLabels } from "@/lib/inquiries";
import {
  getDashboardMetrics,
  getPendingWork,
  getRecentActivity,
  getUpcomingArrivals,
  getPropertyTitle,
  listPropertyOptions,
  type Activity,
} from "@/server/queries/admin-dashboard";
import { settle } from "@/server/queries/settle";

export const metadata: Metadata = { title: "Visão geral" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const number = new Intl.NumberFormat("pt-BR");
const rating = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const SERIES = [
  { name: "Solicitações", color: "#1d6b73" },
  { name: "Contatos", color: "#a8844a" },
];

const activityIcons: Record<Activity["kind"], typeof CalendarIcon> = {
  booking: CalendarIcon,
  decision: CheckIcon,
  inquiry: InboxIcon,
  review: StarIcon,
  property: HouseIcon,
};

function daysSince(iso: string, now = Date.now()) {
  return Math.floor((now - Date.parse(iso)) / 86_400_000);
}

export default async function VisaoGeralPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const today = todayInSaoPaulo();
  const period = parseDashboardPeriod(params, today);

  // Filtro de imóvel: valida o formato aqui (sem depender da lista do
  // seletor) e confere a existência em paralelo com os indicadores.
  const rawProperty = first(params.imovel);
  const propertyId = parseUuid(rawProperty);
  const invalidFilter = Boolean(rawProperty) && !propertyId;

  const [options, selected, metrics, pending, arrivals, activity] = await Promise.all([
    settle(listPropertyOptions(supabase), "imóveis do filtro"),
    propertyId ? settle(getPropertyTitle(supabase, propertyId), "imóvel do filtro") : null,
    settle(getDashboardMetrics(supabase, { ...period, propertyId }), "indicadores"),
    settle(getPendingWork(supabase), "pendências"),
    settle(getUpcomingArrivals(supabase, today), "próximas chegadas"),
    settle(getRecentActivity(supabase), "atividade recente"),
  ]);

  const selectedTitle = selected?.ok ? selected.data : null;
  const propertyOptions = options.ok ? options.data : [];
  // O imóvel do filtro sempre aparece selecionado no seletor, mesmo fora da
  // lista, inexistente ou sem título confirmado: a tela nunca mostra "Todos"
  // enquanto os números estão filtrados (e "Aplicar" não perde o filtro).
  if (propertyId && !propertyOptions.some((o) => o.value === propertyId)) {
    propertyOptions.unshift({
      value: propertyId,
      label:
        selectedTitle ??
        (selected?.ok
          ? "Imóvel não encontrado (filtro atual)"
          : "Imóvel selecionado (filtro atual)"),
    });
  }
  const filterWarning = invalidFilter
    ? "O filtro de imóvel da URL é inválido e foi ignorado: os números abaixo são de todos os imóveis."
    : selected && !selected.ok
      ? "Não foi possível confirmar o imóvel do filtro agora; os números abaixo continuam filtrados por ele."
      : selected?.ok && selectedTitle === null
        ? "O imóvel do filtro não existe (pode ter sido excluído): os números abaixo ficam zerados. Use “Limpar” para ver todos."
        : null;

  const exportHref = buildHref("/admin/exportar/solicitacoes", {
    situacao: "todas",
    de: period.from,
    ate: period.to,
    imovel: propertyId,
  });

  return (
    <AdminPage>
      <PageHeader
        title="Visão geral"
        description={`${period.label}: ${formatDateISO(period.from)} a ${formatDateISO(period.to)}${
          propertyId ? ` · ${selectedTitle ?? "imóvel selecionado"}` : " · todos os imóveis"
        }`}
        actions={
          <>
            <Link
              href={exportHref}
              className={buttonClasses("secondary", "min-h-10 px-4")}
              prefetch={false}
            >
              <DownloadIcon width={18} height={18} />
              Exportar período
            </Link>
            <Link href="/admin/imoveis/novo" className={buttonClasses("primary", "min-h-10 px-4")}>
              <PlusIcon width={18} height={18} />
              Novo imóvel
            </Link>
          </>
        }
      />

      {filterWarning ? (
        <p
          role="alert"
          className="rounded-control border border-junco bg-areia px-4 py-3 text-abismo"
        >
          {filterWarning}
        </p>
      ) : null}

      <Card as="div">
        <form
          method="get"
          action="/admin"
          aria-label="Filtros da visão geral"
          className="flex flex-wrap items-end gap-3 p-4"
        >
          <label className="grid min-w-0 flex-[1_1_11rem] gap-1">
            <span className="text-small font-semibold">Período</span>
            <select
              name="periodo"
              defaultValue={period.preset === "personalizado" ? "30" : period.preset}
              className="min-h-11 w-full min-w-0 rounded-control border border-junco bg-branco px-3"
            >
              {periodPresets.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 flex-[1_1_9rem] gap-1">
            <span className="text-small font-semibold">De (opcional)</span>
            <input
              type="date"
              name="de"
              max={today}
              defaultValue={period.preset === "personalizado" ? period.from : ""}
              className="min-h-11 w-full min-w-0 rounded-control border border-junco bg-branco px-3"
            />
          </label>
          <label className="grid min-w-0 flex-[1_1_9rem] gap-1">
            <span className="text-small font-semibold">Até (opcional)</span>
            <input
              type="date"
              name="ate"
              max={today}
              defaultValue={period.preset === "personalizado" ? period.to : ""}
              className="min-h-11 w-full min-w-0 rounded-control border border-junco bg-branco px-3"
            />
          </label>
          <label className="grid min-w-0 flex-[2_1_14rem] gap-1">
            <span className="text-small font-semibold">Imóvel</span>
            <select
              name="imovel"
              defaultValue={propertyId ?? ""}
              className="min-h-11 w-full min-w-0 rounded-control border border-junco bg-branco px-3"
            >
              <option value="">Todos os imóveis</option>
              {propertyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className={buttonClasses("primary", "min-h-11 px-4")}>
              Aplicar
            </button>
            {period.preset !== "30" || rawProperty ? (
              <Link href="/admin" className={buttonClasses("text", "min-h-11")}>
                Limpar
              </Link>
            ) : null}
          </div>
          <p className="basis-full text-small text-rocha">
            Preencha “De” e “Até” para um período personalizado; sem datas vale o período escolhido.
            Cada indicador é comparado com o mesmo número de dias imediatamente antes.
          </p>
        </form>
      </Card>

      {metrics.ok ? (
        <Metrics metrics={metrics.data} />
      ) : (
        <Card>
          <SectionError what="os indicadores" />
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card aria-labelledby="pendencias" className="xl:col-span-2">
          <CardHeader
            id="pendencias"
            title="Pendências"
            description="O que precisa da sua atenção, dos mais antigos para os mais novos."
          />
          {pending.ok ? (
            <PendingWork data={pending.data} today={today} />
          ) : (
            <SectionError what="as pendências" />
          )}
        </Card>

        <Card aria-labelledby="atalhos">
          <CardHeader id="atalhos" title="Atalhos" />
          <ul className="grid gap-1 p-3">
            {[
              { href: "/admin/imoveis/novo", label: "Cadastrar imóvel", icon: PlusIcon },
              {
                href: "/admin/solicitacoes?situacao=pendentes",
                label: "Responder solicitações",
                icon: CalendarIcon,
              },
              { href: "/admin/imoveis", label: "Bloquear datas de um imóvel", icon: HouseIcon },
              { href: "/admin/contatos", label: "Ver contatos novos", icon: InboxIcon },
              { href: "/admin/avaliacoes", label: "Moderar avaliações", icon: StarIcon },
            ].map((item) => (
              <li key={item.href + item.label}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center gap-3 rounded-control px-3 font-semibold text-petroleo hover:bg-marfim"
                >
                  <item.icon width={18} height={18} />
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-3 rounded-control px-3 font-semibold text-petroleo hover:bg-marfim"
              >
                <ExternalIcon width={18} height={18} />
                Abrir o site
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </li>
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card aria-labelledby="chegadas">
          <CardHeader
            id="chegadas"
            title="Próximas chegadas"
            description="Reservas aprovadas com entrada nos próximos 14 dias."
          />
          {!arrivals.ok ? (
            <SectionError what="as próximas chegadas" />
          ) : arrivals.data.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon />}
              title="Nenhuma chegada nos próximos 14 dias"
              description="Quando você aprovar uma reserva, ela aparece aqui."
            />
          ) : (
            <ul className="divide-y divide-areia">
              {arrivals.data.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/solicitacoes/${row.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-marfim"
                  >
                    <span className="grid min-w-0">
                      <span className="truncate font-semibold">{row.guest_name}</span>
                      <span className="truncate text-small text-rocha">
                        {row.properties?.title ?? "—"} · {row.guests_count}{" "}
                        {row.guests_count === 1 ? "hóspede" : "hóspedes"} ·{" "}
                        {rentalModeLabels[row.rental_mode]}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-small tabular-nums">
                      <span className="block font-semibold">{formatDateISO(row.checkIn)}</span>
                      <span className="text-rocha">até {formatDateISO(row.checkOut)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card aria-labelledby="atividade">
          <CardHeader id="atividade" title="Atividade recente" />
          {!activity.ok ? (
            <SectionError what="a atividade recente" />
          ) : activity.data.length === 0 ? (
            <EmptyState
              title="Nenhuma atividade ainda"
              description="Pedidos, contatos e alterações aparecem aqui."
            />
          ) : (
            <ol className="divide-y divide-areia">
              {activity.data.map((item) => {
                const Icon = activityIcons[item.kind];
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-marfim"
                    >
                      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-marfim text-petroleo">
                        <Icon width={16} height={16} />
                      </span>
                      <span className="grid min-w-0 flex-1">
                        <span className="font-semibold">{item.title}</span>
                        <span className="truncate text-small text-rocha">{item.detail}</span>
                      </span>
                      <time
                        dateTime={item.at}
                        className="shrink-0 text-small text-rocha tabular-nums"
                      >
                        {dateTime.format(new Date(item.at))}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </AdminPage>
  );
}

function Metrics({ metrics }: { metrics: Awaited<ReturnType<typeof getDashboardMetrics>> }) {
  const { current: cur, previous: prev } = metrics;
  const days = metrics.period.days;
  const capacity = metrics.rental_properties * days;
  // Mesmo conjunto de imóveis no numerador e no denominador (publicados com aluguel).
  const occupancy = ratio(cur.occupied_nights, capacity);
  const prevOccupancy = ratio(prev.occupied_nights, capacity);
  const approval = ratio(cur.approved, cur.requests);
  const prevApproval = ratio(prev.approved, prev.requests);

  const points = metrics.series.map((point) => ({
    ...bucketLabels(metrics.period.bucket, point.b_start, point.b_end),
    values: [point.requests, point.inquiries],
  }));
  const bucketName = { day: "por dia", week: "por semana", month: "por mês" }[
    metrics.period.bucket
  ];

  const statusItems = (
    ["pending", "approved", "declined", "cancelled", "expired"] as BookingStatus[]
  )
    .map((status) => ({
      label: bookingStatusLabels[status],
      value: metrics.by_status[status] ?? 0,
    }))
    .filter((item) => item.value > 0 || item.label !== bookingStatusLabels.expired);

  return (
    <>
      <section
        aria-label="Indicadores do período"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Solicitações recebidas"
          value={number.format(cur.requests)}
          delta={compare(cur.requests, prev.requests)}
          icon={<CalendarIcon width={18} height={18} />}
          hint={`${number.format(cur.approved)} ${cur.approved === 1 ? "aprovada" : "aprovadas"}`}
        />
        <StatCard
          label="Taxa de aprovação"
          value={formatPercent(approval)}
          delta={compare(approval, prevApproval, { kind: "points" })}
          icon={<CheckIcon width={18} height={18} />}
          hint="Aprovadas ÷ recebidas no período"
        />
        <StatCard
          label="Valor estimado aprovado"
          value={formatBRL(cur.approved_value)}
          delta={compare(cur.approved_value, prev.approved_value)}
          hint="Soma dos orçamentos das solicitações aprovadas"
        />
        <StatCard
          label="Taxa de ocupação"
          value={formatPercent(occupancy)}
          delta={compare(occupancy, prevOccupancy, { kind: "points" })}
          icon={<HouseIcon width={18} height={18} />}
          hint={
            metrics.rental_properties === 0
              ? "Nenhum imóvel de aluguel publicado"
              : `${number.format(cur.occupied_nights)} de ${number.format(capacity)} noites (${metrics.rental_properties} ${
                  metrics.rental_properties === 1 ? "imóvel" : "imóveis"
                })`
          }
        />
        <StatCard
          label="Contatos recebidos"
          value={number.format(cur.inquiries)}
          delta={compare(cur.inquiries, prev.inquiries)}
          icon={<InboxIcon width={18} height={18} />}
          hint="Mensagens, visitas e interesse em compra"
        />
        <StatCard
          label="Tempo médio de resposta"
          value={formatDuration(cur.avg_response_hours)}
          delta={compare(cur.avg_response_hours, prev.avg_response_hours, {
            higherIsBetter: false,
          })}
          icon={<ClockIcon width={18} height={18} />}
          hint="Do pedido até aprovar ou recusar"
        />
        <StatCard
          label="Nota média das avaliações"
          value={cur.rating_avg === null ? "—" : rating.format(cur.rating_avg)}
          delta={compare(cur.rating_avg, prev.rating_avg, { kind: "percent" })}
          icon={<StarIcon width={18} height={18} />}
          hint={`${number.format(cur.reviews)} ${cur.reviews === 1 ? "avaliação recebida" : "avaliações recebidas"}`}
        />
        <StatCard
          label="Noites reservadas"
          value={number.format(cur.booked_nights)}
          delta={compare(cur.booked_nights, prev.booked_nights)}
          hint="Noites de reservas aprovadas dentro do período"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card aria-labelledby="evolucao" className="xl:col-span-2">
          <CardHeader
            id="evolucao"
            title="Evolução"
            description={`Solicitações de reserva e contatos recebidos ${bucketName}.`}
          />
          <div className="p-5">
            {cur.requests === 0 && cur.inquiries === 0 ? (
              <EmptyState
                title="Nada recebido neste período"
                description="Escolha um período maior ou outro imóvel."
              />
            ) : (
              <TrendChart
                title={`Solicitações e contatos ${bucketName}`}
                points={points}
                series={SERIES}
              />
            )}
          </div>
        </Card>

        <Card aria-labelledby="por-situacao">
          <CardHeader
            id="por-situacao"
            title="Solicitações por situação"
            description="Recebidas no período, na situação atual."
          />
          <div className="grid gap-6 p-5">
            {cur.requests === 0 ? (
              <p className="text-small text-rocha">Nenhuma solicitação no período.</p>
            ) : (
              <BarList label="Solicitações por situação" items={statusItems} />
            )}
            {cur.requests > 0 ? (
              <div className="grid gap-2 border-t border-areia pt-4">
                <p className="text-small font-semibold text-rocha">Por modalidade</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(rentalModeLabels).map(([mode, label]) => (
                    <Badge key={mode} tone="neutral">
                      {label}: {metrics.by_mode[mode] ?? 0}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {metrics.top_properties.length > 0 ? (
        <Card aria-labelledby="mais-procurados">
          <CardHeader
            id="mais-procurados"
            title="Imóveis mais procurados"
            description="Por número de solicitações no período."
          />
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <caption className="sr-only">Imóveis mais procurados no período</caption>
              <thead className="border-b border-areia bg-marfim/60 text-small text-rocha">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-semibold">
                    Imóvel
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                    Solicitações
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                    Aprovadas
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                    Valor aprovado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-areia tabular-nums">
                {metrics.top_properties.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/imoveis/${row.id}`}
                        className="font-semibold text-petroleo hover:underline"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right">{row.requests}</td>
                    <td className="px-5 py-3 text-right">{row.approved}</td>
                    <td className="px-5 py-3 text-right">{formatBRL(row.approved_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </>
  );
}

function PendingWork({
  data,
  today,
}: {
  data: Awaited<ReturnType<typeof getPendingWork>>;
  today: string;
}) {
  const summary = [
    {
      label: "Solicitações pendentes",
      count: data.bookingsCount,
      href: "/admin/solicitacoes?situacao=pendentes",
      icon: CalendarIcon,
    },
    {
      label: "Contatos novos",
      count: data.inquiriesCount,
      href: "/admin/contatos?situacao=novos",
      icon: InboxIcon,
    },
    {
      label: "Avaliações a moderar",
      count: data.reviewsCount,
      href: "/admin/avaliacoes?situacao=pendentes",
      icon: StarIcon,
    },
    {
      label: "Imóveis em rascunho",
      count: data.draftsCount,
      href: "/admin/imoveis?situacao=draft",
      icon: HouseIcon,
    },
  ];
  const allClear = summary.every((item) => item.count === 0);

  return (
    <div className="grid gap-0">
      <ul className="grid grid-cols-2 gap-px border-b border-areia bg-areia lg:grid-cols-4">
        {summary.map((item) => (
          <li key={item.label} className="bg-branco">
            <Link href={item.href} className="grid h-full gap-1 px-5 py-4 hover:bg-marfim">
              <span className="flex items-center gap-2 text-small text-rocha">
                <item.icon width={16} height={16} />
                {item.label}
              </span>
              <span
                className={cn(
                  "text-h2 leading-none font-semibold tabular-nums",
                  item.count === 0 && "text-rocha",
                )}
              >
                {item.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {allClear ? (
        <EmptyState
          icon={<CheckIcon />}
          title="Tudo em dia"
          description="Nenhuma pendência no momento."
        />
      ) : (
        <ul className="divide-y divide-areia">
          {data.bookings.map((row) => {
            const late = row.checkIn < today;
            const waiting = daysSince(row.created_at);
            return (
              <li key={row.id}>
                <Link
                  href={`/admin/solicitacoes/${row.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 hover:bg-marfim"
                >
                  <span className="grid min-w-0">
                    <span className="font-semibold">{row.guest_name}</span>
                    <span className="text-small text-rocha">
                      {row.properties?.title ?? "—"} · {formatDateISO(row.checkIn)} a{" "}
                      {formatDateISO(row.checkOut)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {late ? (
                      <Badge tone="danger">
                        <AlertIcon width={12} height={12} aria-hidden="true" />
                        Chegada já passou
                      </Badge>
                    ) : null}
                    <BookingStatusBadge status="pending" />
                    <span className="text-small text-rocha tabular-nums">
                      {waiting === 0 ? "hoje" : `há ${waiting} ${waiting === 1 ? "dia" : "dias"}`}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
          {data.inquiries.map((row) => (
            <li key={row.id}>
              <Link
                href={`/admin/contatos?situacao=novos&q=${encodeURIComponent(row.name)}`}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 hover:bg-marfim"
              >
                <span className="grid min-w-0">
                  <span className="font-semibold">{row.name}</span>
                  <span className="text-small text-rocha">{inquiryKindLabels[row.kind]}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone="info">Contato novo</Badge>
                  <span className="text-small text-rocha tabular-nums">
                    {dateTime.format(new Date(row.created_at))}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {data.drafts.map((row) => (
            <li key={row.id}>
              <Link
                href={`/admin/imoveis/${row.id}#publicacao`}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 hover:bg-marfim"
              >
                <span className="grid min-w-0">
                  <span className="font-semibold">{row.title}</span>
                  <span className="text-small text-rocha">Rascunho: complete e publique</span>
                </span>
                <Badge tone="warning">Rascunho</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
