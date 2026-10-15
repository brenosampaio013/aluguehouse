import { z } from "@/lib/zod";

/** Variáveis exclusivas do servidor. Nunca use o prefixo NEXT_PUBLIC_. */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Cloudflare Turnstile. Obrigatória em produção (veja docs/reserva.md). */
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  /** Resend (avisos por e-mail). Sem a chave, os avisos ficam desativados. */
  RESEND_API_KEY: z.string().min(1).optional(),
  /** Remetente dos avisos, ex.: "Alugue Houses <avisos@seudominio.com.br>". */
  EMAIL_FROM: z.string().min(3).optional(),
  /** Quem recebe os avisos do site. Padrão: o e-mail de contato. */
  ADMIN_NOTIFY_EMAIL: z.email().optional(),
  /** Só desenvolvimento e testes: caixa de e-mail local (Mailpit). */
  MAILPIT_URL: z.url().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function format(error: z.ZodError) {
  return error.issues.map((issue) => issue.path.join(".")).join(", ");
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Variáveis de ambiente do servidor ausentes ou inválidas: ${format(result.error)}`,
    );
  }
  return result.data;
}
