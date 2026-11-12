import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  poweredByHeader: false,

  async headers() {
    const imageCache = "public, max-age=86400, stale-while-revalidate=604800";
    return [
      { source: "/opengraph-image", headers: [{ key: "Cache-Control", value: imageCache }] },
      { source: "/icon", headers: [{ key: "Cache-Control", value: imageCache }] },
      { source: "/apple-icon", headers: [{ key: "Cache-Control", value: imageCache }] },
    ];
  },

  trailingSlash: false,

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
