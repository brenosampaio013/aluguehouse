import type { Metadata } from "next";
import Link from "next/link";

import { controllerLabel, LegalPage } from "@/components/legal/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como a Alugue Houses trata dados pessoais, conforme a LGPD.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  const { dpoEmail } = siteConfig.legal;
  const dpo = <a href={`mailto:${dpoEmail}`}>{dpoEmail}</a>;

  return (
    <LegalPage
      title="Política de privacidade"
      intro={
        <>
          <p>
            Esta política explica quais dados pessoais a {siteConfig.name} coleta neste site, para
            que usa, com quem compartilha, por quanto tempo guarda e como você exerce seus direitos,
            conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
          </p>
          <p>
            Resumo: pedimos só o necessário para responder a você; não vendemos dados; não usamos
            cookies de publicidade ou de rastreamento.
          </p>
        </>
      }
      sections={[
        {
          id: "controlador",
          title: "Quem é o responsável",
          content: (
            <>
              <p>
                Controlador dos dados: {controllerLabel()}. Encarregado pelo tratamento de dados
                (canal para qualquer assunto desta política): {dpo}.
              </p>
            </>
          ),
        },
        {
          id: "dados",
          title: "Quais dados coletamos e para quê",
          content: (
            <ul>
              <li>
                <strong>Solicitação de reserva</strong>: nome, e-mail, telefone, datas, número de
                hóspedes, mensagem, valor estimado e a data e hora em que você concordou com esta
                política. Usamos para analisar o pedido, responder e organizar a estadia. Base
                legal: procedimentos preliminares a um contrato, a seu pedido (art. 7º, V).
              </li>
              <li>
                <strong>Contato, pedido de visita e interesse em compra</strong>: nome, e-mail,
                telefone (opcional), mensagem, imóvel e data preferida da visita. Usamos para
                responder ao seu pedido (art. 7º, V).
              </li>
              <li>
                <strong>Entrar com e-mail</strong> (para favoritos, avaliações e minhas estadias):
                e-mail e registros técnicos do acesso. Usamos para manter sua conta e mostrar suas
                estadias, localizadas pelo mesmo e-mail da solicitação (art. 7º, V).
              </li>
              <li>
                <strong>Favoritos</strong>: os imóveis que você salvou (art. 7º, V).
              </li>
              <li>
                <strong>Avaliações</strong>: nota, comentário e o vínculo com a sua estadia. No site
                aparece apenas o seu primeiro nome, depois da nossa moderação. Base legal: seu
                consentimento ao enviar a avaliação (art. 7º, I), que pode ser revogado.
              </li>
              <li>
                <strong>Segurança e prevenção de abusos</strong>: o endereço IP e o e-mail de quem
                envia formulários são convertidos em um código (hash) irreversível para limitar
                envios repetidos, e o formulário pode passar por uma verificação anti-robô da
                Cloudflare (Turnstile). Base legal: legítimo interesse em proteger o site e os
                usuários (art. 7º, IX).
              </li>
            </ul>
          ),
        },
        {
          id: "compartilhamento",
          title: "Com quem compartilhamos",
          content: (
            <>
              <p>
                Não vendemos nem alugamos dados pessoais. Compartilhamos apenas o necessário com:
              </p>
              <ul>
                <li>
                  <strong>Proprietário do imóvel</strong>: os imóveis anunciados são de terceiros.
                  Quando necessário para viabilizar a estadia ou a visita, informamos nome, datas e
                  número de hóspedes.
                </li>
                <li>
                  <strong>Prestadores de serviço</strong> que tratam dados em nosso nome: Supabase
                  (banco de dados, fotos e login), Cloudflare (hospedagem, segurança e Turnstile),
                  Resend (envio de avisos por e-mail) e OpenFreeMap (mapa: recebe o endereço IP de
                  quem abre o mapa, sem dados de cadastro).
                </li>
                <li>
                  <strong>Autoridades</strong>, quando houver obrigação legal ou ordem judicial.
                </li>
              </ul>
              <p>
                Alguns desses prestadores mantêm servidores fora do Brasil. A transferência ocorre
                com as garantias previstas nos artigos 33 a 36 da LGPD.
              </p>
            </>
          ),
        },
        {
          id: "prazos",
          title: "Por quanto tempo guardamos",
          content: (
            <ul>
              <li>
                <strong>Solicitações de reserva</strong> (com a avaliação ligada a elas): 5 anos
                após o fim da estadia, para cumprir obrigações legais e permitir a defesa em
                eventuais reclamações.
              </li>
              <li>
                <strong>Mensagens de contato e pedidos de visita</strong>: 2 anos após o envio.
              </li>
              <li>
                <strong>Conta e favoritos</strong>: até você excluir a conta.
              </li>
              <li>
                <strong>Códigos de prevenção de abusos</strong>: 1 dia.
              </li>
            </ul>
          ),
        },
        {
          id: "direitos",
          title: "Seus direitos",
          content: (
            <>
              <p>
                Você pode pedir, a qualquer momento: confirmação de que tratamos seus dados; acesso
                a eles; correção; anonimização, bloqueio ou eliminação de dados desnecessários;
                portabilidade; informação sobre com quem compartilhamos; revogação do consentimento
                e oposição a tratamentos (art. 18 da LGPD).
              </p>
              <p>
                Envie o pedido para {dpo}, do mesmo e-mail usado no site. Respondemos em até 15
                dias. Se tiver conta, você também pode{" "}
                <Link href="/entrar">excluí-la sozinho na página Entrar</Link>.
              </p>
              <p>
                Se não ficar satisfeito, você pode reclamar à Autoridade Nacional de Proteção de
                Dados (ANPD).
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies",
          content: (
            <>
              <p>Usamos apenas cookies essenciais, sem publicidade nem rastreamento:</p>
              <ul>
                <li>
                  <strong>Sessão de login</strong> (Supabase): mantém você conectado depois de
                  entrar pelo link do e-mail.
                </li>
                <li>
                  <strong>Retorno após o login</strong>: guarda por até 1 hora a página para onde
                  voltar depois do link.
                </li>
              </ul>
              <p>Como não há cookies opcionais, não exibimos aviso de consentimento de cookies.</p>
            </>
          ),
        },
        {
          id: "seguranca",
          title: "Segurança",
          content: (
            <p>
              Conexão criptografada (HTTPS), acesso administrativo com verificação em duas etapas,
              regras de acesso no banco de dados que separam o que cada pessoa pode ver, política de
              segurança de conteúdo no navegador e coleta mínima. O mapa mostra só a área aproximada
              dos imóveis. Em caso de incidente de segurança relevante, avisaremos os afetados e a
              ANPD.
            </p>
          ),
        },
        {
          id: "menores",
          title: "Crianças e adolescentes",
          content: (
            <p>
              O site não é direcionado a menores de 18 anos. Solicitações de reserva devem ser
              feitas por maiores de idade.
            </p>
          ),
        },
        {
          id: "alteracoes",
          title: "Alterações",
          content: (
            <p>
              Podemos atualizar esta política. A data da versão fica no topo da página; mudanças
              importantes serão destacadas no site. Veja também os{" "}
              <Link href="/termos">Termos de uso</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
