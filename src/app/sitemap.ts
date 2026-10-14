import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { getPublicEnv } from "@/lib/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/** Páginas públicas e imóveis publicados, com a data da última mudança. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const site = getPublicEnv().NEXT_PUBLIC_SITE_URL;
  const url = (path: string) => new URL(path, site).toString();

  const { data, error } = await createSupabasePublicClient()
    .from("properties")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5000);
  if (error) throw error;

  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/temporada"), changeFrequency: "daily", priority: 0.8 },
    { url: url("/mensal"), changeFrequency: "daily", priority: 0.8 },
    { url: url("/venda"), changeFrequency: "daily", priority: 0.8 },
    { url: url("/contato"), changeFrequency: "yearly", priority: 0.3 },
    { url: url("/privacidade"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/termos"), changeFrequency: "yearly", priority: 0.2 },
    ...data.map((property) => ({
      url: url(`/imoveis/${property.slug}`),
      lastModified: new Date(property.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
