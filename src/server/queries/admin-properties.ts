import "server-only";

import { notFound } from "next/navigation";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function listPropertiesForAdmin(supabase: Client) {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, title, city, neighborhood, status, offers_seasonal, offers_monthly, offers_sale, updated_at",
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPropertyForEdit(supabase: Client, id: string) {
  const [property, privateData, media, amenities, selected, rates, fees] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase.from("property_private").select("*").eq("property_id", id).maybeSingle(),
    supabase
      .from("property_media")
      .select("*")
      .eq("property_id", id)
      .order("position")
      .order("created_at"),
    supabase.from("amenities").select("id, label").order("label"),
    supabase.from("property_amenities").select("amenity_id").eq("property_id", id),
    supabase.from("seasonal_rates").select("*").eq("property_id", id).order("period"),
    supabase
      .from("property_fees")
      .select("*")
      .eq("property_id", id)
      .order("position")
      .order("created_at"),
  ]);

  if (property.error) throw property.error;
  if (!property.data) notFound();

  return {
    property: property.data,
    privateData: privateData.data,
    media: media.data ?? [],
    amenities: amenities.data ?? [],
    selectedAmenityIds: new Set((selected.data ?? []).map((row) => row.amenity_id)),
    rates: rates.data ?? [],
    fees: fees.data ?? [],
  };
}
