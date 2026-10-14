import type { MetadataRoute } from "next";

import { privatePaths } from "./indexing";

/** robots.txt: tudo bloqueado até a indexação ser ligada. */
export function buildRobots(siteUrl: string, indexing: boolean): MetadataRoute.Robots {
  if (!indexing) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: privatePaths },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
