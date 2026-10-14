import type { Metadata } from "next";
import Link from "next/link";

import { ReviewModeration } from "@/components/admin/review-moderation";
import { Stars } from "@/components/reviews/stars";
import { Container } from "@/components/ui/container";
import { FormMessage } from "@/components/ui/form-message";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cn } from "@/lib/cn";
import { parseReviewTab, reviewTabs } from "@/lib/reviews";
import { listReviewsForAdmin } from "@/server/queries/reviews";

export const metadata: Metadata = { title: "Avaliações" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function AvaliacoesPage({ searchParams }: PageProps<"/admin/avaliacoes">) {
  const params = await searchParams;
  const tab = parseReviewTab(params.situacao);
  const notice =
    params.aviso === "publicada"
      ? "Avaliação publicada no site."
      : params.aviso === "nao-publicada"
        ? "Avaliação não será publicada."
        : null;
  const { supabase } = await requireAdmin();
  const reviews = await listReviewsForAdmin(supabase, tab.status);

  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-8">
        <div className="grid gap-2">
          <h1 className="font-serif text-h1 font-normal">Avaliações</h1>
          <p className="max-w-[68ch] text-rocha">
            Só hóspedes com estadia aprovada e concluída avaliam. Nada aparece no site antes de você
            publicar.
          </p>
        </div>

        {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}

        <nav aria-label="Situação das avaliações">
          <ul className="flex flex-wrap gap-2">
            {reviewTabs.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/admin/avaliacoes?situacao=${item.slug}`}
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

        {reviews.length === 0 ? (
          <p className="text-rocha">Nenhuma avaliação nesta situação.</p>
        ) : (
          <ul className="grid gap-6">
            {reviews.map((review) => (
              <li key={review.id}>
                <article
                  aria-labelledby={`avaliacao-${review.id}`}
                  className="grid gap-4 rounded-photo border border-areia p-5 lg:grid-cols-[1fr_380px]"
                >
                  <div className="grid content-start gap-2">
                    <h2 id={`avaliacao-${review.id}`} className="font-semibold">
                      {review.author_display_name || "Hóspede"} ·{" "}
                      {review.properties ? (
                        <Link
                          href={`/imoveis/${review.properties.slug}`}
                          className="text-petroleo underline underline-offset-3"
                        >
                          {review.properties.title}
                        </Link>
                      ) : (
                        "Imóvel removido"
                      )}
                    </h2>
                    <Stars rating={review.rating} />
                    {review.comment ? (
                      <p className="max-w-[68ch] whitespace-pre-line">{review.comment}</p>
                    ) : (
                      <p className="text-rocha">Sem comentário.</p>
                    )}
                    <p className="text-small text-rocha">
                      Enviada em {dateTime.format(new Date(review.created_at))} ·{" "}
                      <Link
                        href={`/admin/solicitacoes/${review.booking_request_id}`}
                        className="underline underline-offset-3"
                      >
                        ver reserva
                      </Link>
                    </p>
                  </div>
                  <ReviewModeration
                    reviewId={review.id}
                    status={review.status}
                    reply={review.admin_reply ?? ""}
                    tab={tab.slug}
                  />
                </article>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
