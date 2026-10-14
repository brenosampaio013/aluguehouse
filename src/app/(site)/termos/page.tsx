import type { Metadata } from "next";
import Link from "next/link";

import { controllerLabel, LegalPage } from "@/components/legal/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Regras de uso do site da Alugue Houses: reservas, avaliações e conduta.",
  alternates: { canonical: "/termos" },
};

export default function TermosPage() {
  const { email } = siteConfig.contact;
  return (
    <LegalPage
      title="Termos de uso"
      intro={
        <p>
          Ao usar este site você concorda com estes termos. Leia também a{" "}
          <Link href="/privacidade" className="text-petroleo underline underline-offset-3">
            Política de privacidade
          </Link>
          .
        </p>
      }
      sections={[
        {
          id: "sobre",
          title: "Sobre o site",
          content: (
            <p>
              O site da {siteConfig.name}, mantido por {controllerLabel()}, apresenta imóveis de
              terceiros para aluguel por temporada, aluguel mensal e venda na Riviera de São
              Lourenço e no Litoral Norte de São Paulo, e recebe solicitações de reserva, pedidos de
              visita e mensagens.
            </p>
          ),
        },
        {
          id: "reservas",
          title: "Reservas por solicitação",
          content: (
            <ul>
              <li>
                Enviar uma solicitação <strong>não é uma reserva confirmada</strong>. Conferimos a
                disponibilidade e respondemos pelo e-mail ou telefone informados.
              </li>
              <li>
                O valor mostrado no site é uma <strong>estimativa</strong> com base nas tarifas e
                taxas cadastradas; o valor final é informado na confirmação.
              </li>
              <li>
                <strong>Nada é cobrado pelo site.</strong> Formas de pagamento, caução e regras de
                cancelamento são informadas na confirmação, antes de qualquer pagamento.
              </li>
              <li>As datas só ficam bloqueadas no calendário depois da confirmação.</li>
            </ul>
          ),
        },
        {
          id: "imoveis",
          title: "Informações dos imóveis",
          content: (
            <ul>
              <li>
                Descrições, comodidades e regras da casa são fornecidas pelos proprietários.
                Procuramos mantê-las corretas; em caso de dúvida, pergunte antes de reservar.
              </li>
              <li>Fotos que não são do próprio imóvel aparecem com o aviso “Foto ilustrativa”.</li>
              <li>
                O mapa mostra a área aproximada; o endereço é informado na confirmação da reserva ou
                da visita.
              </li>
              <li>
                Para imóveis à venda, as informações são de referência; a negociação segue com
                acompanhamento de profissional habilitado, conforme a lei.
              </li>
            </ul>
          ),
        },
        {
          id: "conta",
          title: "Conta e acesso",
          content: (
            <p>
              Para salvar favoritos, ver suas estadias e avaliar, você entra com um link enviado ao
              seu e-mail. O link é pessoal: não o compartilhe. Você pode excluir a conta a qualquer
              momento na página <Link href="/entrar">Entrar</Link>.
            </p>
          ),
        },
        {
          id: "avaliacoes",
          title: "Avaliações",
          content: (
            <ul>
              <li>Só avalia quem teve estadia confirmada e concluída no imóvel.</li>
              <li>
                Toda avaliação passa por moderação antes de aparecer. Não publicamos conteúdo
                ofensivo, discriminatório, com dados pessoais de outras pessoas, propaganda ou sem
                relação com a estadia. A nota e o comentário não são alterados por nós.
              </li>
              <li>No site aparece apenas o primeiro nome de quem avaliou.</li>
            </ul>
          ),
        },
        {
          id: "conduta",
          title: "Uso adequado",
          content: (
            <p>
              Não é permitido usar o site para enviar spam ou informações falsas, coletar dados de
              forma automatizada, tentar acessar áreas restritas ou contornar as proteções de
              segurança. Podemos bloquear envios que violem estes termos.
            </p>
          ),
        },
        {
          id: "responsabilidade",
          title: "Disponibilidade e links externos",
          content: (
            <p>
              Trabalhamos para manter o site no ar e correto, mas ele pode passar por interrupções e
              manutenções. Links para outros serviços, como o WhatsApp, seguem as regras desses
              serviços.
            </p>
          ),
        },
        {
          id: "propriedade",
          title: "Propriedade intelectual",
          content: (
            <p>
              Textos, marca e layout do site pertencem à {siteConfig.name}. As fotos dos imóveis são
              publicadas com autorização dos proprietários. Não reproduza esse conteúdo sem
              autorização.
            </p>
          ),
        },
        {
          id: "lei",
          title: "Lei aplicável e contato",
          content: (
            <p>
              Estes termos seguem as leis brasileiras, incluindo o Código de Defesa do Consumidor.
              Fica eleito o foro do domicílio do consumidor. Dúvidas:{" "}
              <a href={`mailto:${email}`}>{email}</a> ou pela página{" "}
              <Link href="/contato">Contato</Link>. Podemos atualizar estes termos; a data da versão
              fica no topo da página.
            </p>
          ),
        },
      ]}
    />
  );
}
