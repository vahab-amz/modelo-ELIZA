import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exportación 100 % estática: `next build` genera la carpeta `out/`,
  // que se puede servir desde cualquier servidor de ficheros (o sin conexión).
  output: "export",
};

export default nextConfig;
