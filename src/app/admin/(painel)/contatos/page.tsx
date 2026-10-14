import type { Metadata } from "next";
import Link from "next/link";

import { InquiryStatusForm } from "@/components/admin/inquiry-status-form";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { FormMessage } from "@/components/ui/form-message";
import { ChatIcon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cn } from "@/lib/cn";
import {
  formatVisit,
  inquiryKindLabels,
  inquiryStatusLabels,
  inquiryTabs,
  parseInquiryTab,
  type InquiryStatus,
} from "@/lib/inquiries";
import { guestWhatsappLink } from "@/lib/whatsapp";
import { listInquiries } from "@/server/queries/inquiries";

export const metadata: Metadata = { title: "Contatos" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function ContatosPage({ searchParams }: PageProps<"/admin/contatos">) {
  const params = await searchParams;
  const tab = parseInquiryTab(params.situacao);
  const moved = Array.isArray(params.movido) ? params.movido[0] : params.movido;
  const notice =
    moved && moved in inquiryStatusLabels
      ? `Mensagem movida para “${inquiryStatusLabels[moved as InquiryStatus]}”.`
      : null;
  const { supabase } = await requireAdmin();
  const inquiries = await listInquiries(supabase, tab.status);

  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-8">
        <div className="grid gap-2">
          <h1 className="font-serif text-h1 font-normal">Contatos</h1>
          <p className="max-w-[68ch] text-rocha">
            Mensagens do formulário de contato, pedidos de visita e interesse em compra.
          </p>
        </div>

        {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}

        <nav aria-label="Situação dos contatos">
          <ul className="flex flex-wrap gap-2">
            {inquiryTabs.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/admin/contatos?situacao=${item.slug}`}
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

        {inquiries.length === 0 ? (
          <p className="text-rocha">Nenhuma mensagem nesta situação.</p>
        ) : (
          <ul className="grid gap-6">
            {inquiries.map((inquiry) => (
              <li key={inquiry.id}>
                <article
                  aria-labelledby={`contato-${inquiry.id}`}
                  className="grid gap-4 rounded-photo border border-areia p-5 lg:grid-cols-[1fr_320px]"
                >
                  <div className="grid min-w-0 content-start gap-2">
                    <p className="text-small font-semibold text-rocha">
                      {inquiryKindLabels[inquiry.kind]} ·{" "}
                      {dateTime.format(new Date(inquiry.created_at))}
                    </p>
                    <h2 id={`contato-${inquiry.id}`} className="font-serif text-h3 font-normal">
                      {inquiry.name}
                    </h2>
                    {inquiry.properties ? (
                      <p>
                        Imóvel:{" "}
                        <Link
                          href={`/imoveis/${inquiry.properties.slug}`}
                          className="text-petroleo underline underline-offset-3"
                        >
                          {inquiry.properties.title}
                        </Link>
                      </p>
                    ) : null}
                    {inquiry.preferred_datetime ? (
                      <p>Visita preferida: {formatVisit(inquiry.preferred_datetime)}</p>
                    ) : null}
                    <p className="max-w-[68ch] whitespace-pre-line">{inquiry.message}</p>
                  </div>
                  <div className="grid content-start gap-3">
                    <a
                      href={`mailto:${inquiry.email}`}
                      className="break-all text-petroleo underline underline-offset-3"
                    >
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
                        className={buttonClasses("secondary")}
                      >
                        <ChatIcon />
                        Responder no WhatsApp
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    ) : null}
                    <InquiryStatusForm
                      inquiryId={inquiry.id}
                      status={inquiry.status}
                      tab={tab.slug}
                    />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
