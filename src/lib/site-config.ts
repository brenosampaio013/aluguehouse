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
} as const;
