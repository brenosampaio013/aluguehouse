/**
 * Dados públicos do negócio. Nada aqui é segredo.
 * O responsável técnico/CRECI será preenchido antes da publicação (risco R1).
 */
export const siteConfig = {
  name: "Alugue Houses",
  description:
    "Aluguel por temporada, aluguel mensal e venda de imóveis na Riviera de São Lourenço e no Litoral Norte de São Paulo.",
  locale: "pt-BR",
  timeZone: "America/Sao_Paulo",
  contact: {
    email: "contatoaluguehouses@gmail.com",
    /** Formato E.164 sem o sinal de +, usado em links wa.me. */
    whatsapp: "5513996195221",
    whatsappDisplay: "(13) 99619-5221",
  },
  responsible: {
    name: null as string | null,
    creci: null as string | null,
  },
  /**
   * LGPD: identificação do controlador (nome e CPF, ou razão social e CNPJ).
   * Preencher antes do lançamento (docs/privacidade.md).
   */
  legal: {
    controllerName: null as string | null,
    controllerDocument: null as string | null,
    /** Canal do encarregado de dados (pedidos de acesso, correção, exclusão). */
    dpoEmail: "contatoaluguehouses@gmail.com",
    /** Data da versão atual da política e dos termos (AAAA-MM-DD). */
    updatedAt: "2026-10-14",
  },
} as const;
