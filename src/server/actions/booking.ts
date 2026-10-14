"use server";

import { headers } from "next/headers";

import { stayMode } from "@/lib/booking/calendar";
import { bookingErrorMessage, bookingRequestSchema } from "@/lib/booking/schema";
import { getServerEnv } from "@/lib/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { clientIp, hashKey, withinRateLimits } from "@/server/security/rate-limit";
import { verifyTurnstile } from "@/server/security/turnstile";

export type BookingFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Valores para preencher de novo o formulário após um erro. */
  values?: { name?: string; email?: string; phone?: string; message?: string };
  /** Número de protocolo mostrado ao hóspede. */
  reference?: string;
};

/** Limites por IP e por e-mail (as chaves vão ao banco como hash). */
const RATE_RULES = {
  ip: { windowSeconds: 60 * 60, max: 5 },
  email: { windowSeconds: 24 * 60 * 60, max: 5 },
};

const RATE_LIMITED =
  "Recebemos muitos pedidos seguidos daqui. Aguarde um pouco ou fale com a gente pelo WhatsApp.";

let warnedTurnstile = false;

/** Visitante (sem conta): registra uma solicitação de reserva pendente. */
export async function submitBookingRequest(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const text = (key: string) => String(formData.get(key) ?? "");
  const values = {
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    message: text("message"),
  };

  // Campo-isca: invisível para pessoas, robôs costumam preencher.
  // Responde como se tivesse dado certo, sem gravar nada.
  if (text("website") !== "") {
    return { status: "success", message: "Solicitação enviada." };
  }

  const parsed = bookingRequestSchema.safeParse({
    propertyId: formData.get("propertyId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    guests: formData.get("guests"),
    name: values.name,
    email: values.email,
    phone: values.phone,
    message: values.message,
    consent: formData.get("consent") ?? undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] ??= issue.message;
    }
    const stayError = fieldErrors.propertyId ?? fieldErrors.checkIn ?? fieldErrors.checkOut;
    return {
      status: "error",
      message: stayError
        ? "As datas da solicitação são inválidas. Escolha as datas de novo no calendário."
        : "Confira os campos destacados.",
      fieldErrors,
      values,
    };
  }

  const env = getServerEnv();
  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);

  const turnstile = await verifyTurnstile(
    String(formData.get("cf-turnstile-response") ?? "") || null,
    ip,
    env.TURNSTILE_SECRET_KEY,
  );
  if (turnstile === "failed") {
    return {
      status: "error",
      message: "Não conseguimos confirmar que você não é um robô. Tente enviar de novo.",
      values,
    };
  }
  if (turnstile === "disabled" && process.env.NODE_ENV === "production" && !warnedTurnstile) {
    warnedTurnstile = true;
    console.warn("TURNSTILE_SECRET_KEY ausente: formulário de reserva sem verificação anti-robô.");
  }

  const data = parsed.data;
  const admin = createSupabaseAdminClient();
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  const allowed = await withinRateLimits(admin, [
    {
      bucket: `booking:ip:${await hashKey(ip ?? "desconhecido", secret)}`,
      ...RATE_RULES.ip,
    },
    {
      bucket: `booking:email:${await hashKey(data.email.toLowerCase(), secret)}`,
      ...RATE_RULES.email,
    },
  ]);
  if (!allowed) return { status: "error", message: RATE_LIMITED, values };

  const { data: id, error } = await admin.rpc("request_booking", {
    p_property_id: data.propertyId,
    p_mode: stayMode(data.checkIn, data.checkOut),
    p_check_in: data.checkIn,
    p_check_out: data.checkOut,
    p_guests: data.guests,
    p_name: data.name,
    p_email: data.email,
    p_phone: data.phone,
    p_message: data.message,
    p_privacy_consent: true,
  });

  if (error || !id) {
    return {
      status: "error",
      message: bookingErrorMessage(
        error?.message ?? "",
        error?.details ?? undefined,
        "Não foi possível enviar agora. Tente de novo em instantes.",
      ),
      values,
    };
  }

  return {
    status: "success",
    message: "Solicitação enviada.",
    reference: id.slice(0, 8).toUpperCase(),
  };
}
