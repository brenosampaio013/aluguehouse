"use server";

import { stayMode } from "@/lib/booking/calendar";
import { bookingErrorMessage, bookingRequestSchema } from "@/lib/booking/schema";
import { formatBRL, formatDateISO } from "@/lib/format";
import { notifyAdmin } from "@/server/email/notify-admin";
import { guardPublicForm } from "@/server/security/public-form";

export type BookingFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Valores para preencher de novo o formulário após um erro. */
  values?: { name?: string; email?: string; phone?: string; message?: string };
  /** Número de protocolo mostrado ao hóspede. */
  reference?: string;
};

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

  const data = parsed.data;
  const guard = await guardPublicForm(formData, { scope: "booking", email: data.email });
  if (!guard.ok) return { status: "error", message: guard.message, values };
  const { admin } = guard;

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

  const reference = id.slice(0, 8).toUpperCase();
  const { data: request } = await admin
    .from("booking_requests")
    .select("quoted_total, properties(title)")
    .eq("id", id)
    .single();
  await notifyAdmin({
    subject: `Nova solicitação de reserva ${reference}`,
    lines: [
      `Imóvel: ${request?.properties?.title ?? "—"}`,
      `Hóspede: ${data.name}`,
      `Datas: ${formatDateISO(data.checkIn)} a ${formatDateISO(data.checkOut)} · ${data.guests} hóspede(s)`,
      `Total estimado: ${formatBRL(request?.quoted_total)}`,
      "",
      "A solicitação está pendente: aprove ou recuse no painel.",
    ],
    path: `/admin/solicitacoes/${id}`,
    replyTo: data.email,
  });

  return { status: "success", message: "Solicitação enviada.", reference };
}
