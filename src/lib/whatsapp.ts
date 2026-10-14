import { siteConfig } from "@/lib/site-config";

/** Link do WhatsApp do atendimento com a mensagem já preenchida. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${siteConfig.contact.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Link para conversar com um hóspede. Telefones brasileiros com DDD
 * (10 ou 11 dígitos) recebem o código do país 55.
 */
export function guestWhatsappLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const number = digits.length <= 11 ? `55${digits}` : digits;
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
