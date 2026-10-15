import Link from "next/link";

import { Container } from "@/components/ui/container";
import { ChatIcon, MailIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site-config";

const steps = [
  {
    title: "Escolha a casa e as datas",
    text: "Veja fotos, vídeos, comodidades e as datas livres de cada imóvel.",
  },
  {
    title: "Envie a solicitação",
    text: "Sem pagamento nesta etapa e sem precisar criar conta: só nome, e-mail e telefone.",
  },
  {
    title: "Receba a confirmação",
    text: "Conferimos a disponibilidade e respondemos por e-mail ou WhatsApp com os próximos passos.",
  },
];

/**
 * Atendimento personalizado (Etapa 6 do redesign): como funciona a reserva,
 * feita por pessoas, e os canais reais de contato.
 */
export function PersonalService() {
  const { contact } = siteConfig;
  return (
    <section aria-labelledby="titulo-atendimento" className="bg-areia py-20 sm:py-24">
      <Container className="grid gap-12">
        <div className="revelar grid gap-3">
          <p className="flex items-center gap-3 text-small font-semibold tracking-[0.18em] text-rocha uppercase">
            <span aria-hidden="true" className="h-px w-10 bg-dourado" />
            Atendimento personalizado
          </p>
          <h2 id="titulo-atendimento" className="max-w-[22ch] font-serif text-h2 font-normal">
            Cada pedido é conferido por uma pessoa.
          </h2>
          <p className="max-w-[58ch] text-abismo">
            Do primeiro contato à confirmação, você fala direto com quem cuida dos imóveis — para
            temporada, aluguel mensal ou compra.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16">
          <div className="grid content-start gap-6">
            <h3 id="titulo-como-funciona" className="text-h3 font-semibold">
              Como funciona a reserva
            </h3>
            <ol aria-labelledby="titulo-como-funciona" className="grid gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="revelar grid content-start gap-3 border-t border-dourado pt-5"
                >
                  <span
                    aria-hidden="true"
                    className="font-serif text-h1 leading-none text-petroleo"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h4 className="font-semibold">{step.title}</h4>
                  <p className="text-abismo">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="revelar grid content-start gap-5 rounded-photo bg-branco p-6 shadow-[0_18px_40px_-24px_rgb(20_43_58/0.35)] sm:p-8">
            <h3 className="font-serif text-[1.5rem] leading-tight font-normal">
              Prefere conversar antes?
            </h3>
            <p className="text-rocha">
              Tire dúvidas sobre um imóvel, peça indicações para as suas datas ou combine uma visita
              a um imóvel à venda.
            </p>
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-petroleo px-6 font-semibold text-marfim transition-[background-color,transform] duration-200 hover:bg-abismo active:scale-[0.98]"
            >
              <ChatIcon width={20} height={20} />
              Fale no WhatsApp
              <span className="sr-only"> {contact.whatsappDisplay} (abre em nova aba)</span>
            </a>
            <ul className="grid gap-3 border-t border-areia pt-5 text-small">
              <li className="flex items-center gap-2">
                <ChatIcon width={18} height={18} className="shrink-0 text-petroleo" />
                <span>
                  WhatsApp <span className="whitespace-nowrap">{contact.whatsappDisplay}</span>
                </span>
              </li>
              <li>
                <Link
                  href="/contato"
                  className="font-semibold text-petroleo underline underline-offset-3"
                >
                  Formulário de contato
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <MailIcon width={18} height={18} className="shrink-0 text-petroleo" />
                <a
                  href={`mailto:${contact.email}`}
                  className="[overflow-wrap:anywhere] text-petroleo underline underline-offset-3"
                >
                  {contact.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
