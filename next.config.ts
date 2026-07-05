import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Foto da webcam (base64) no cadastro rápido estoura o limite padrão de 1MB
    // dos Server Actions e o envio falha. Sobe o teto para caber a foto.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
