import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
  experimental: {
    // Foto da webcam (base64) no cadastro rápido estoura o limite padrão de 1MB
    // dos Server Actions e o envio falha. Sobe o teto para caber a foto.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
