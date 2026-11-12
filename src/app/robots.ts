import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const origin = getEnv().APP_ORIGIN.replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/r/"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
