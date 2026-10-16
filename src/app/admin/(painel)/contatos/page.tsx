import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InquiryDeleteButton, InquiryStatusForm } from "@/components/admin/inquiry-status-form";
import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { Card } from "@/components/admin/ui/card";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { ListToolbar } from "@/components/admin/ui/list-toolbar";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { ListPagination } from "@/components/admin/ui/pagination";
import { StatusTabs } from "@/components/admin/ui/status-tabs";
import { buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { ChatIcon, DownloadIcon, InboxIcon, MailIcon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseInquiryFilters, type InquiryFilters } from "@/lib/admin/filters";
import { buildHref, first, outOfRangeHref, PAGE_SIZE, pageRange } from "@/lib/admin/list-params";
import {
  formatVisit,
  inquiryKindLabels,
  inquiryStatusLabels,
  inquiryTabs,
  type InquiryStatus,
} from "@/lib/inquiries";
import { guestWhatsappLink } from "@/lib/whatsapp";
import { listPropertyOptions } from "@/server/queries/admin-dashboard";
import { searchInquiries } from "@/server/queries/inquiries";
import { getStatusCounts } from "@/server/queries/status-counts";

export const metadata: Metadata = { title: "Contatos" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const statusTones: Record<InquiryStatus, BadgeTone> = {
  new: "info",
  in_progress: "warning",
  closed: "muted",
};

function listParams(filters: InquiryFilters) {
  const defaultDir = filters.tab.status === "new" ? "asc" : "desc";
  return {
    situacao: filters.tab.slug,
    q: filters.q,
    tipo: filters.kind,
    imovel: filters.propertyId,
    dir: filters.dir === defaultDir ? null : filters.dir,
  };
}

export default async function ContatosPage({ searchParams }: PageProps<"/admin/contatos">) {
  const params = await searchParams;
  const filters = parseInquiryFilters(params);
  const moved = first(params.movido);
  const notice =
    moved && moved in inquiryStatusLabels
      ? `Mensagem movida para “${inquiryStatusLabels[moved as InquiryStatus]}”.`
      : first(params.aviso) === "excluido"
        ? "Mensagem excluída."
        : null;
  const { supabase } = await requireAdmin();
  const [{ rows, count }, counts, properties] = await Promise.all([
    searchInquiries(supabase, filters, pageRange(filters.page)),
    getStatusCounts().then((all) => all.inquiries),
    listPropertyOptions(supabase),
  ]);
  // Página além da última (ex.: excluiu o último item dela): vai para a última válida.
  const validPage = outOfRangeHref("/admin/contatos", params, filters.page, count);
  if (validPage) redirect(validPage);
  const base = listParams(filters);
  const href = (extra: Record<string, string | number | null>) =>
    buildHref("/admin/contatos", { ...base, ...extra });
  const returnTo = href({ pagina: filters.page > 1 ? filters.page : null });
  const filtered = Boolean(filters.q || filters.kind || filters.propertyId);
  const total = counts.new + counts.in_progress + counts.closed;

  return (
    <AdminPage>
      <PageHeader
        title="Contatos"
        description="Mensagens do formulário de contato, pedidos de visita e interesse em compra."
        actions={
          <Link
            href={buildHref("/admin/exportar/contatos", base)}
            prefetch={false}
            className={buttonClasses("secondary", "min-h-10 px-4")}
          >
            <DownloadIcon width={18} height={18} />
            Exportar CSV
          </Link>
        }
      />

      {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}

      <StatusTabs
        label="Situação dos contatos"
        current={filters.tab.slug}
        tabs={inquiryTabs.map((tab) => ({
          slug: tab.slug,
          label: tab.label,
          href: buildHref("/admin/contatos", { ...base, situacao: tab.slug, dir: null }),
          count: tab.status ? counts[tab.status] : total,
        }))}
      />

      <Card as="div">
        <ListToolbar
          action="/admin/contatos"
          search={filters.q}
          searchLabel="Buscar por nome, e-mail ou texto da mensagem"
          hidden={{ situacao: filters.tab.slug }}
          selects={[
            {
              name: "tipo",
              label: "Tipo",
              value: filters.kind,
              allLabel: "Todos",
              options: Object.entries(inquiryKindLabels).map(([value, label]) => ({
                value,
                label,
              })),
            },
            {
              name: "imovel",
              label: "Imóvel",
              value: filters.propertyId,
              allLabel: "Todos",
              options: properties,
            },
            {
              name: "dir",
              label: "Ordem",
              value: filters.dir,
              allLabel: "Padrão",
              options: [
                { value: "desc", label: "Mais recentes primeiro" },
                { value: "asc", label: "Mais antigos primeiro" },
              ],
            },
          ]}
          active={filtered}
          clearHref={buildHref("/admin/contatos", { situacao: filters.tab.slug })}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={<InboxIcon />}
            title={filtered ? "Nenhuma mensagem encontrada" : "Nenhuma mensagem nesta situação"}
            description={
              filtered
                ? "Nenhuma mensagem corresponde à busca e aos filtros escolhidos."
                : "As mensagens enviadas pelo site aparecem aqui."
            }
          />
        ) : (
          <ul className="divide-y divide-areia">
            {rows.map((inquiry) => (
              <li key={inquiry.id}>
                <article
                  aria-labelledby={`contato-${inquiry.id}`}
                  className="grid gap-4 p-5 lg:grid-cols-[1fr_300px]"
                >
                  <div className="grid min-w-0 content-start gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-small text-rocha">
                      <Badge tone={statusTones[inquiry.status]}>
                        {inquiryStatusLabels[inquiry.status]}
                      </Badge>
                      <span className="font-semibold">{inquiryKindLabels[inquiry.kind]}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={inquiry.created_at} className="tabular-nums">
                        {dateTime.format(new Date(inquiry.created_at))}
                      </time>
                    </div>
                    <h2 id={`contato-${inquiry.id}`} className="text-h3 font-semibold">
                      {inquiry.name}
                    </h2>
                    {inquiry.properties ? (
                      <p className="text-small">
                        Imóvel:{" "}
                        <Link
                          href={`/admin/imoveis/${inquiry.properties.id}`}
                          className="font-semibold text-petroleo hover:underline"
                        >
                          {inquiry.properties.title}
                        </Link>
                      </p>
                    ) : null}
                    {inquiry.preferred_datetime ? (
                      <p className="text-small">
                        Visita preferida: {formatVisit(inquiry.preferred_datetime)}
                      </p>
                    ) : null}
                    <p className="max-w-[72ch] rounded-control bg-marfim px-4 py-3 whitespace-pre-line">
                      {inquiry.message}
                    </p>
                  </div>
                  <div className="grid content-start gap-3">
                    <a
                      href={`mailto:${inquiry.email}`}
                      className="inline-flex items-center gap-2 break-all text-petroleo hover:underline"
                    >
                      <MailIcon width={18} height={18} className="shrink-0" />
                      {inquiry.email}
                    </a>
                    {inquiry.phone ? (
                      <a
                        href={guestWhatsappLink(
                          inquiry.phone,
                          `Olá, ${inquiry.name.split(" ")[0]}! Aqui é da Alugue Houses, sobre sua mensagem pelo site.`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClasses("secondary", "min-h-10 px-4")}
                      >
                        <ChatIcon />
                        Responder no WhatsApp
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    ) : null}
                    <InquiryStatusForm
                      inquiryId={inquiry.id}
                      status={inquiry.status}
                      returnTo={returnTo}
                    />
                    <InquiryDeleteButton
                      inquiryId={inquiry.id}
                      name={inquiry.name}
                      returnTo={returnTo}
                    />
                  </div>
                </article>
              </li>
            ))}
          </ul>
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
