import path from "node:path";
import type { NextConfig } from "next";

const projectRoot = import.meta.dirname;
const localNodeModules = path.join(projectRoot, "node_modules");

const nextConfig: NextConfig = {
  // Parent-folder lockfiles can make Turbopack resolve from `C:\Users\ibrah` instead of this app.
  turbopack: {
    root: projectRoot,
    // Paths are relative to `root` so resolution does not depend on process.cwd().
    resolveAlias: {
      tailwindcss: "./node_modules/tailwindcss",
      "@tailwindcss/postcss": "./node_modules/@tailwindcss/postcss",
    },
  },
  // Webpack (e.g. `next dev --webpack` / some CSS pipelines) ignores turbopack.resolveAlias — fix resolution here too.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      tailwindcss: path.join(localNodeModules, "tailwindcss"),
      "@tailwindcss/postcss": path.join(localNodeModules, "@tailwindcss", "postcss"),
    };
    const prev = config.resolve.modules;
    const rest = Array.isArray(prev) ? prev : prev != null ? [prev] : [];
    config.resolve.modules = [localNodeModules, ...rest];
    return config;
  },
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
