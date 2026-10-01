import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Jost } from "next/font/google";
import "./globals.css";

// next/font descarga las fuentes al compilar y las sirve desde /_next:
// en tiempo de ejecución no hay ninguna petición a Google.
const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ELIZA (1966) · Demo en español",
  description:
    "Demostración en directo de ELIZA, el chatbot de Joseph Weizenbaum (MIT, 1966): palabras clave, patrones, cambio de pronombres y plantillas. Sin IA, solo reglas.",
};

export const viewport: Viewport = {
  themeColor: "#F7F3EA",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${jost.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
