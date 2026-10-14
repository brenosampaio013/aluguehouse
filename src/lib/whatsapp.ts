import { siteConfig } from "@/lib/site-config";

/** Link do WhatsApp do atendimento com a mensagem já preenchida. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${siteConfig.contact.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
