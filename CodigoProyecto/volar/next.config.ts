import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true, // habilita forbidden() (US-30: HTTP 403 ante acceso no autorizado)
  },
};

export default nextConfig;
