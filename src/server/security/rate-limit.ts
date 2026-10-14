import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * IP de quem enviou. No Cloudflare, `cf-connecting-ip` é definido pela própria
 * Cloudflare e não pode ser forjado pelo visitante; `x-forwarded-for` só vale
 * fora dela (desenvolvimento e testes).
 */
export function clientIp(headers: Headers): string | null {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || null;
}

/** HMAC-SHA256 em hexadecimal: o banco nunca recebe IP ou e-mail em texto. */
export async function hashKey(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

export type RateRule = { bucket: string; windowSeconds: number; max: number };

/**
 * Registra a tentativa em cada regra. Devolve false se alguma estourou.
 * Se o banco falhar, recusa (falha fechada).
 */
export async function withinRateLimits(client: AdminClient, rules: RateRule[]) {
  for (const rule of rules) {
    const { data, error } = await client.rpc("hit_rate_limit", {
      p_bucket: rule.bucket,
      p_window_seconds: rule.windowSeconds,
      p_max: rule.max,
    });
    if (error || data !== true) return false;
  }
  return true;
}
