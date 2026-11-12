import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/env";
import { INDEXABLE_PATHS } from "@/lib/seo";
import { OPERATOR } from "@/lib/legal/operator";

export const dynamic = "force-dynamic";

const LEGAL_PATHS = new Set(["/privacy", "/terms", "/cookies"]);

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getEnv().APP_ORIGIN.replace(/\/+$/, "");

  return INDEXABLE_PATHS.map((path) => ({
    url: path === "/" ? `${origin}/` : `${origin}${path}`,
    ...(LEGAL_PATHS.has(path)
      ? { lastModified: new Date(`${OPERATOR.lastUpdated}T00:00:00Z`) }
      : {}),
  }));
}
