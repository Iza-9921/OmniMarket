import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Fotos de perfil de los proveedores OAuth. Google las sirve desde varios
  // subdominios (lh3, lh4, lh5…): uno no permitido daría un error de consola.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
