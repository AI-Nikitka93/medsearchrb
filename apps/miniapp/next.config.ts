import type { NextConfig } from "next";

const explicitBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
const basePath =
  explicitBasePath ??
  (process.env.NODE_ENV === "production" ? "/medsearchrb" : "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
