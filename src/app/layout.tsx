import type { Metadata, Viewport } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

// Serif itálica para el logo y los títulos de sección — es la identidad
// visual central de este diseño ("estudio boutique").
const displaySerif = Cormorant_Garamond({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["italic", "normal"],
});

export const metadata: Metadata = {
  title: "Agenda tu cita",
  description: "Sistema de agendamiento de citas",
};

// Fuerza el ancho real del dispositivo y evita el zoom automático de iOS
// al hacer foco en inputs, que es lo que suele romper la experiencia mobile.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${displaySerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  );
}
