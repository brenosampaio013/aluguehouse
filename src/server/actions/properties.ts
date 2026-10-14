"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { addDaysISO, slugify } from "@/lib/format";
import {
  createPropertySchema,
  feeSchema,
  fieldErrors,
  generalSchema,
  privateSchema,
  seasonalRateSchema,
} from "@/lib/properties/schemas";
import { publishChecklist } from "@/lib/properties/publish";

import type { FormState } from "./auth";

type DbError = { code?: string; message?: string } | null;

/** Traduz erros do banco para mensagens do painel. */
function dbErrorMessage(
  error: DbError,
  fallback = "Não foi possível salvar. Tente de novo.",
): string {
  switch (error?.code) {
    case "23505":
      return "Já existe um imóvel com esse endereço na web (slug). Escolha outro.";
    case "23P01":
      return "Já existe uma tarifa nesse período. Ajuste as datas ou remova a outra.";
    case "23514":
      return "Algum valor está fora do permitido. Confira os campos e tente de novo.";
    case "42501":
      return "Sua sessão não tem permissão para esta ação. Entre de novo no painel.";
    default:
      return fallback;
  }
}

const idSchema = z.uuid();

function propertyPath(id: string) {
  return `/admin/imoveis/${id}`;
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createProperty(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = createPropertySchema.safeParse(formObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const { supabase } = await requireAdmin();
  const base = slugify(`${parsed.data.title} ${parsed.data.city}`) || "imovel";

  // Tenta o slug base e, se já existir, acrescenta um sufixo curto.
  let id: string | null = null;
  for (let attempt = 0; attempt < 5 && !id; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 4)}`;
    const { data, error } = await supabase
      .from("properties")
      .insert({ ...parsed.data, slug })
      .select("id")
      .single();
    if (data) id = data.id;
    else if (error?.code !== "23505") return { status: "error", message: dbErrorMessage(error) };
  }
  if (!id) return { status: "error", message: "Não foi possível gerar o endereço do imóvel." };

  revalidatePath("/admin/imoveis");
  redirect(propertyPath(id));
}

export async function updateGeneral(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Imóvel inválido." };

  const parsed = generalSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Confira os campos destacados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const { supabase } = await requireAdmin();
  const values = {
    ...parsed.data,
    area_m2: parsed.data.area_m2 ?? null,
    distance_to_beach_m: parsed.data.distance_to_beach_m ?? null,
    nightly_price: parsed.data.nightly_price ?? null,
    monthly_price: parsed.data.monthly_price ?? null,
    sale_price: parsed.data.sale_price ?? null,
    condo_fee: parsed.data.condo_fee ?? null,
    iptu_yearly: parsed.data.iptu_yearly ?? null,
  };
  const { error } = await supabase.from("properties").update(values).eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };

  revalidatePath(propertyPath(id.data));
  revalidatePath("/admin/imoveis");
  return { status: "success", message: "Dados gerais salvos." };
}

export async function updatePrivate(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Imóvel inválido." };

  const parsed = privateSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("property_private").upsert({
    property_id: id.data,
    full_address: parsed.data.full_address,
    exact_lat: parsed.data.exact_lat ?? null,
    exact_lng: parsed.data.exact_lng ?? null,
    owner_notes: parsed.data.owner_notes,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };

  revalidatePath(propertyPath(id.data));
  return { status: "success", message: "Localização e anotações salvas." };
}

export async function updateAmenities(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = idSchema.safeParse(formData.get("id"));
  const amenityIds = z.array(z.uuid()).safeParse(formData.getAll("amenity"));
  if (!id.success || !amenityIds.success) return { status: "error", message: "Dados inválidos." };

  const { supabase } = await requireAdmin();
  const { error: deleteError } = await supabase
    .from("property_amenities")
    .delete()
    .eq("property_id", id.data);
  if (deleteError) return { status: "error", message: dbErrorMessage(deleteError) };

  if (amenityIds.data.length > 0) {
    const { error } = await supabase
      .from("property_amenities")
      .insert(amenityIds.data.map((amenity_id) => ({ property_id: id.data, amenity_id })));
    if (error) return { status: "error", message: dbErrorMessage(error) };
  }

  revalidatePath(propertyPath(id.data));
  return { status: "success", message: "Comodidades salvas." };
}

export async function addSeasonalRate(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Imóvel inválido." };

  const parsed = seasonalRateSchema.safeParse(formObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const { supabase } = await requireAdmin();
  // O formulário pede o último dia (inclusivo); o banco guarda [início, fim).
  const period = `[${parsed.data.start_date},${addDaysISO(parsed.data.end_date, 1)})`;
  const { error } = await supabase.from("seasonal_rates").insert({
    property_id: id.data,
    label: parsed.data.label,
    period,
    nightly_price: parsed.data.nightly_price!,
    min_nights: parsed.data.min_nights ?? null,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };

  revalidatePath(propertyPath(id.data));
  return { status: "success", message: `Tarifa "${parsed.data.label}" adicionada.` };
}

export async function deleteSeasonalRate(formData: FormData) {
  const id = idSchema.parse(formData.get("id"));
  const rateId = idSchema.parse(formData.get("rateId"));
  const { supabase } = await requireAdmin();
  await supabase.from("seasonal_rates").delete().eq("id", rateId).eq("property_id", id);
  revalidatePath(propertyPath(id));
}

export async function addFee(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Imóvel inválido." };

  const parsed = feeSchema.safeParse(formObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const { supabase } = await requireAdmin();
  const { count } = await supabase
    .from("property_fees")
    .select("id", { count: "exact", head: true })
    .eq("property_id", id.data);
  const { error } = await supabase
    .from("property_fees")
    .insert({ property_id: id.data, ...parsed.data, position: count ?? 0 });
  if (error) return { status: "error", message: dbErrorMessage(error) };

  revalidatePath(propertyPath(id.data));
  return { status: "success", message: `Taxa "${parsed.data.label}" adicionada.` };
}

export async function deleteFee(formData: FormData) {
  const id = idSchema.parse(formData.get("id"));
  const feeId = idSchema.parse(formData.get("feeId"));
  const { supabase } = await requireAdmin();
  await supabase.from("property_fees").delete().eq("id", feeId).eq("property_id", id);
  revalidatePath(propertyPath(id));
}

const statusSchema = z.enum(["publish", "unpublish", "archive", "restore"]);

export async function changeStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = idSchema.safeParse(formData.get("id"));
  const action = statusSchema.safeParse(formData.get("action"));
  if (!id.success || !action.success) return { status: "error", message: "Ação inválida." };

  const { supabase } = await requireAdmin();

  if (action.data === "publish") {
    const { data: property } = await supabase
      .from("properties")
      .select(
        "title, offers_seasonal, offers_monthly, offers_sale, nightly_price, monthly_price, sale_price, published_at",
      )
      .eq("id", id.data)
      .single();
    if (!property) return { status: "error", message: "Imóvel não encontrado." };

    const { count } = await supabase
      .from("property_media")
      .select("id", { count: "exact", head: true })
      .eq("property_id", id.data)
      .eq("kind", "image");

    const checks = publishChecklist({ ...property, imageCount: count ?? 0 });
    const missing = checks.filter((check) => !check.ok);
    if (missing.length > 0) {
      return {
        status: "error",
        message: `Para publicar, falta: ${missing.map((m) => m.label.toLowerCase()).join("; ")}.`,
      };
    }

    const { error } = await supabase
      .from("properties")
      .update({
        status: "published",
        published_at: property.published_at ?? new Date().toISOString(),
      })
      .eq("id", id.data);
    if (error) return { status: "error", message: dbErrorMessage(error) };
  } else {
    const status = action.data === "archive" ? "archived" : "draft";
    const { error } = await supabase.from("properties").update({ status }).eq("id", id.data);
    if (error) return { status: "error", message: dbErrorMessage(error) };
  }

  revalidatePath(propertyPath(id.data));
  revalidatePath("/admin/imoveis");
  const messages = {
    publish: "Imóvel publicado. Ele já aparece para os visitantes.",
    unpublish: "Imóvel voltou para rascunho e saiu do site.",
    archive: "Imóvel arquivado e fora do site.",
    restore: "Imóvel restaurado como rascunho.",
  };
  return { status: "success", message: messages[action.data] };
}
