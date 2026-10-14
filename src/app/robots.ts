import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { getPublicEnv } from "@/lib/env";
import { indexingEnabled } from "@/lib/seo/indexing";
import { buildRobots } from "@/lib/seo/robots";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Lido a cada requisição: SITE_INDEXING muda sem novo build.
  await connection();
  return buildRobots(getPublicEnv().NEXT_PUBLIC_SITE_URL, indexingEnabled());
}
