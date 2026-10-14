import type { Metadata } from "next";
import Link from "next/link";

import { ReviewForm } from "@/components/reviews/review-form";
import { Stars } from "@/components/reviews/stars";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getSessionState } from "@/lib/auth/session";
import { bookingStatusLabels } from "@/lib/booking/labels";
import { formatDateISO } from "@/lib/format";
import { reviewStatusLabels } from "@/lib/reviews";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyStays } from "@/server/queries/reviews";

export const metadata: Metadata = {
  title: "Minhas estadias",
  robots: { index: false },
};

export default async function MinhasEstadiasPage() {
  const session = await getSessionState();

  if (session.status === "anonymous") {
    return (
      <main id="conteudo" className="flex-1 py-16">
        <Container className="grid gap-6">
          <h1 className="font-serif text-h1 font-normal">Minhas estadias</h1>
          <p className="max-w-[60ch] text-rocha">
            Entre com o mesmo e-mail usado na solicitação de reserva para ver suas estadias e
            avaliar as que já terminaram.
          </p>
          <div>
            <Link href="/entrar?next=/minhas-estadias" className={buttonClasses("primary")}>
              Entrar para ver estadias
            </Link>
          </div>
        </Container>
      </main>
    );
  }

  const stays = await getMyStays(await createSupabaseServerClient(), session.userId);

  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid max-w-3xl gap-8">
        <div className="grid gap-2">
          <h1 className="font-serif text-h1 font-normal">Minhas estadias</h1>
          <p className="text-rocha">
            Solicitações feitas com <strong className="text-abismo">{session.email}</strong>.
          </p>
        </div>

        {stays.length === 0 ? (
          <p className="max-w-[60ch]">
            Nenhuma solicitação com este e-mail. Se você reservou com outro endereço, entre com ele.
          </p>
        ) : (
          <ul className="grid gap-6">
            {stays.map((stay) => (
              <li key={stay.booking_request_id}>
                <article
                  aria-labelledby={`estadia-${stay.booking_request_id}`}
                  className="grid gap-4 rounded-photo border border-areia p-5"
                >
                  <div className="grid gap-1">
                    <h2
                      id={`estadia-${stay.booking_request_id}`}
                      className="font-serif text-h3 font-normal"
                    >
                      <Link
                        href={`/imoveis/${stay.property_slug}`}
                        className="underline-offset-3 hover:underline"
                      >
                        {stay.property_title}
                      </Link>
                    </h2>
                    <p className="text-rocha tabular-nums">
                      {formatDateISO(stay.check_in)} a {formatDateISO(stay.check_out)} ·{" "}
                      {bookingStatusLabels[stay.status]}
                    </p>
                  </div>

                  {stay.review ? (
                    <div className="grid gap-2 border-t border-areia pt-4">
                      <p className="flex flex-wrap items-center gap-3">
                        <span className="font-semibold">Sua avaliação</span>
                        <Stars rating={stay.review.rating} />
                        <span className="rounded-full bg-areia px-3 py-0.5 text-small font-semibold">
                          {reviewStatusLabels[stay.review.status]}
                        </span>
                      </p>
                      {stay.review.status === "pending" ? (
                        <p className="text-small text-rocha">
                          Obrigado! Ela aparece no site depois de revisada.
                        </p>
                      ) : null}
                      {stay.review.comment ? (
                        <p className="max-w-[68ch] whitespace-pre-line">{stay.review.comment}</p>
                      ) : null}
                      {stay.review.admin_reply && stay.review.status === "approved" ? (
                        <p className="max-w-[68ch] border-l-2 border-junco pl-3 text-rocha">
                          <span className="font-semibold text-abismo">
                            Resposta da Alugue Houses:
                          </span>{" "}
                          {stay.review.admin_reply}
                        </p>
                      ) : null}
                    </div>
                  ) : stay.can_review ? (
                    <div className="border-t border-areia pt-4">
                      <ReviewForm
                        bookingId={stay.booking_request_id}
                        propertyTitle={stay.property_title}
                      />
                    </div>
                  ) : stay.status === "approved" ? (
                    <p className="text-small text-rocha">
                      Você poderá avaliar depois do check-out.
                    </p>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
