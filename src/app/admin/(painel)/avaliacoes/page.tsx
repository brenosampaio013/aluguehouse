import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewModeration } from "@/components/admin/review-moderation";
import { Card } from "@/components/admin/ui/card";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { ListToolbar } from "@/components/admin/ui/list-toolbar";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { ListPagination } from "@/components/admin/ui/pagination";
import { StatusTabs } from "@/components/admin/ui/status-tabs";
import { Stars } from "@/components/reviews/stars";
import { FormMessage } from "@/components/ui/form-message";
import { StarIcon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseReviewFilters, type ReviewFilters } from "@/lib/admin/filters";
import { buildHref, first, outOfRangeHref, PAGE_SIZE, pageRange } from "@/lib/admin/list-params";
import { reviewTabs } from "@/lib/reviews";
import { listPropertyOptions } from "@/server/queries/admin-dashboard";
import { searchReviewsForAdmin } from "@/server/queries/reviews";
import { getStatusCounts } from "@/server/queries/status-counts";

export const metadata: Metadata = { title: "Avaliações" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function listParams(filters: ReviewFilters) {
  return { situacao: filters.tab.slug, imovel: filters.propertyId, nota: filters.rating };
}

export default async function AvaliacoesPage({ searchParams }: PageProps<"/admin/avaliacoes">) {
  const params = await searchParams;
  const filters = parseReviewFilters(params);
  const notice =
    first(params.aviso) === "publicada"
      ? "Avaliação publicada no site."
      : first(params.aviso) === "nao-publicada"
        ? "Avaliação não será publicada."
        : null;
  const { supabase } = await requireAdmin();
  const [{ rows, count }, counts, properties] = await Promise.all([
    searchReviewsForAdmin(supabase, filters, pageRange(filters.page)),
    getStatusCounts().then((all) => all.reviews),
    listPropertyOptions(supabase),
  ]);
  // Página além da última (ex.: excluiu o último item dela): vai para a última válida.
  const validPage = outOfRangeHref("/admin/avaliacoes", params, filters.page, count);
  if (validPage) redirect(validPage);
  const base = listParams(filters);
  const filtered = Boolean(filters.propertyId || filters.rating);

  return (
    <AdminPage>
      <PageHeader
        title="Avaliações"
        description="Só hóspedes com estadia aprovada e concluída avaliam. Nada aparece no site antes de você publicar."
      />

      {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}

      <StatusTabs
        label="Situação das avaliações"
        current={filters.tab.slug}
        tabs={reviewTabs.map((tab) => ({
          slug: tab.slug,
          label: tab.label,
          href: buildHref("/admin/avaliacoes", { ...base, situacao: tab.slug }),
          count: counts[tab.status],
        }))}
      />

      <Card as="div">
        <ListToolbar
          action="/admin/avaliacoes"
          hidden={{ situacao: filters.tab.slug }}
          selects={[
            {
              name: "imovel",
              label: "Imóvel",
              value: filters.propertyId,
              allLabel: "Todos",
              options: properties,
            },
            {
              name: "nota",
              label: "Nota",
              value: filters.rating ? String(filters.rating) : null,
              allLabel: "Todas",
              options: [5, 4, 3, 2, 1].map((n) => ({
                value: String(n),
                label: `${n} ${n === 1 ? "estrela" : "estrelas"}`,
              })),
            },
          ]}
          active={filtered}
          clearHref={buildHref("/admin/avaliacoes", { situacao: filters.tab.slug })}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={<StarIcon />}
            title={filtered ? "Nenhuma avaliação encontrada" : "Nenhuma avaliação nesta situação"}
            description={
              filtered
                ? "Nenhuma avaliação corresponde aos filtros escolhidos."
                : "As avaliações enviadas pelos hóspedes aparecem aqui."
            }
          />
        ) : (
          <ul className="divide-y divide-areia">
            {rows.map((review) => (
              <li key={review.id}>
                <article
                  aria-labelledby={`avaliacao-${review.id}`}
                  className="grid gap-4 p-5 lg:grid-cols-[1fr_380px]"
                >
                  <div className="grid content-start gap-2">
                    <h2 id={`avaliacao-${review.id}`} className="font-semibold">
                      {review.author_display_name || "Hóspede"} ·{" "}
                      {review.properties ? (
                        <Link
                          href={`/imoveis/${review.properties.slug}`}
                          className="text-petroleo hover:underline"
                        >
                          {review.properties.title}
                        </Link>
                      ) : (
                        "Imóvel removido"
                      )}
                    </h2>
                    <Stars rating={review.rating} />
                    {review.comment ? (
                      <p className="max-w-[68ch] rounded-control bg-marfim px-4 py-3 whitespace-pre-line">
                        {review.comment}
                      </p>
                    ) : (
                      <p className="text-rocha">Sem comentário.</p>
                    )}
                    <p className="text-small text-rocha">
                      Enviada em {dateTime.format(new Date(review.created_at))} ·{" "}
                      <Link
                        href={`/admin/solicitacoes/${review.booking_request_id}`}
                        className="font-semibold text-petroleo hover:underline"
                      >
                        ver reserva
                      </Link>
                    </p>
                  </div>
                  <ReviewModeration
                    reviewId={review.id}
                    status={review.status}
                    reply={review.admin_reply ?? ""}
                    tab={filters.tab.slug}
                  />
                </article>
              </li>
            ))}
          </ul>
        )}
        <ListPagination
          page={filters.page}
          pageSize={PAGE_SIZE}
          count={count}
          hrefFor={(page) => buildHref("/admin/avaliacoes", { ...base, pagina: page })}
        />
      </Card>
    </AdminPage>
  );
}
