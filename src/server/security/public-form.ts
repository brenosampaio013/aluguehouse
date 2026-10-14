import "server-only";

import { headers } from "next/headers";

import { getServerEnv } from "@/lib/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { clientIp, hashKey, withinRateLimits } from "./rate-limit";
import { verifyTurnstile } from "./turnstile";

/** Limites por IP e por e-mail (as chaves vão ao banco como hash). */
const RATE_RULES = {
  ip: { windowSeconds: 60 * 60, max: 5 },
  email: { windowSeconds: 24 * 60 * 60, max: 5 },
};

const RATE_LIMITED =
  "Recebemos muitos pedidos seguidos daqui. Aguarde um pouco ou fale com a gente pelo WhatsApp.";

let warnedTurnstile = false;

/**
 * Proteções dos formulários públicos (sem login), depois da validação dos
 * campos: Cloudflare Turnstile (se configurado) e limite de envios por IP e
 * por e-mail, contado separadamente para cada formulário (`scope`).
 */
export async function guardPublicForm(
  formData: FormData,
  { scope, email }: { scope: "booking" | "inquiry"; email: string },
) {
  const env = getServerEnv();
  const ip = clientIp(await headers());

  const turnstile = await verifyTurnstile(
    String(formData.get("cf-turnstile-response") ?? "") || null,
    ip,
    env.TURNSTILE_SECRET_KEY,
  );
  if (turnstile === "failed") {
    return {
      ok: false as const,
      message: "Não conseguimos confirmar que você não é um robô. Tente enviar de novo.",
    };
  }
  if (turnstile === "disabled" && process.env.NODE_ENV === "production" && !warnedTurnstile) {
    warnedTurnstile = true;
    console.warn("TURNSTILE_SECRET_KEY ausente: formulários públicos sem verificação anti-robô.");
  }

  const admin = createSupabaseAdminClient();
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  const allowed = await withinRateLimits(admin, [
    { bucket: `${scope}:ip:${await hashKey(ip ?? "desconhecido", secret)}`, ...RATE_RULES.ip },
    {
      bucket: `${scope}:email:${await hashKey(email.toLowerCase(), secret)}`,
      ...RATE_RULES.email,
    },
  ]);
  if (!allowed) return { ok: false as const, message: RATE_LIMITED };

  return { ok: true as const, admin };
}
