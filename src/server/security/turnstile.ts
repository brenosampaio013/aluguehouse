import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult = "ok" | "failed" | "disabled";

/**
 * Confere o token do Cloudflare Turnstile. Sem `secret` configurado devolve
 * "disabled" (desenvolvimento e testes); em produção a chave é obrigatória
 * (docs/reserva.md).
 */
export async function verifyTurnstile(
  token: string | null,
  ip: string | null,
  secret: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<TurnstileResult> {
  if (!secret) return "disabled";
  if (!token) return "failed";

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetcher(VERIFY_URL, { method: "POST", body });
    if (!response.ok) return "failed";
    const data = (await response.json()) as { success?: boolean };
    return data.success === true ? "ok" : "failed";
  } catch {
    return "failed";
  }
}
