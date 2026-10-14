import { z } from "zod";

/**
 * Variáveis públicas: podem ir para o navegador.
 * Valores reais ficam em `.env.local` (não versionado) ou nos segredos do
 * provedor de hospedagem. Veja `.env.example`.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  /** Cloudflare Turnstile (anti-robô). Sem ela, o widget não aparece. */
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
});

/** Variáveis exclusivas do servidor. Nunca use o prefixo NEXT_PUBLIC_. */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Cloudflare Turnstile. Obrigatória em produção (veja docs/reserva.md). */
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function format(error: z.ZodError) {
  return error.issues.map((issue) => issue.path.join(".")).join(", ");
}

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Variáveis de ambiente públicas ausentes ou inválidas: ${format(result.error)}`,
    );
  }
  return result.data;
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

/**
 * Lido sob demanda para não quebrar o build quando o Supabase ainda não está
 * configurado. As referências explícitas permitem que o Next.js embuta os
 * valores públicos no código do navegador.
 */
export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
  });
}
