import "server-only";

import { getPublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/server-env";
import { siteConfig } from "@/lib/site-config";

import { sendEmail } from "./send";

let warnedDisabled = false;

/**
 * Aviso por e-mail ao administrador. Os dados já estão gravados quando isto é
 * chamado: falhas só são registradas no log, nunca mostradas ao visitante.
 */
export async function notifyAdmin({
  subject,
  lines,
  path,
  replyTo,
}: {
  subject: string;
  lines: string[];
  /** Caminho no painel para tratar o aviso, ex.: "/admin/contatos". */
  path: string;
  replyTo?: string;
}) {
  const env = getServerEnv();
  const panel = new URL(path, getPublicEnv().NEXT_PUBLIC_SITE_URL).toString();
  const result = await sendEmail(
    {
      to: env.ADMIN_NOTIFY_EMAIL ?? siteConfig.contact.email,
      subject: `[${siteConfig.name}] ${subject}`,
      text: [...lines, "", `Abrir no painel: ${panel}`].join("\n"),
      replyTo,
    },
    env,
  );
  if (result === "failed") console.error(`Falha ao enviar aviso por e-mail: ${subject}`);
  if (result === "disabled" && !warnedDisabled) {
    warnedDisabled = true;
    console.warn("RESEND_API_KEY ausente: avisos por e-mail ao administrador desativados.");
  }
  return result;
}
