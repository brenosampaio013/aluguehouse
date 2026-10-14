import "server-only";

import { siteConfig } from "@/lib/site-config";
import type { ServerEnv } from "@/lib/env";

export type Email = { to: string; subject: string; text: string; replyTo?: string };
export type SendResult = "sent" | "disabled" | "failed";

type MailerEnv = Pick<ServerEnv, "RESEND_API_KEY" | "EMAIL_FROM" | "MAILPIT_URL">;

/** O visitante espera a resposta do formulário: o envio não pode travar. */
const TIMEOUT_MS = 5000;

const DEFAULT_FROM = `${siteConfig.name} <onboarding@resend.dev>`;

/** "Nome <email>" → { name, email }. */
function parseAddress(value: string) {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1]!, email: match[2]! } : { name: "", email: value.trim() };
}

/**
 * Envia um e-mail de texto. Ordem: Resend (produção) → Mailpit (desenvolvimento
 * e testes) → desativado. Nunca lança erro: quem chama já gravou os dados e só
 * registra a falha.
 */
export async function sendEmail(
  email: Email,
  env: MailerEnv,
  fetcher: typeof fetch = fetch,
): Promise<SendResult> {
  const from = env.EMAIL_FROM ?? DEFAULT_FROM;
  try {
    if (env.RESEND_API_KEY) {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email.to],
          subject: email.subject,
          text: email.text,
          reply_to: email.replyTo,
        }),
      });
      return response.ok ? "sent" : "failed";
    }

    if (env.MAILPIT_URL) {
      const sender = parseAddress(from);
      const response = await fetcher(new URL("/api/v1/send", env.MAILPIT_URL), {
        method: "POST",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          From: { Email: sender.email, Name: sender.name },
          To: [{ Email: email.to }],
          ReplyTo: email.replyTo ? [{ Email: email.replyTo }] : [],
          Subject: email.subject,
          Text: email.text,
        }),
      });
      return response.ok ? "sent" : "failed";
    }

    return "disabled";
  } catch {
    return "failed";
  }
}
