import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import PwaRegister from "./pwa-register";

// Fredoka: títulos/marca, bem arredondada e divertida. Nunito: corpo, redondinha e legível.
const fredoka = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quintal Brincante",
  description: "Gestão do quintal brincante — uso interno da equipe.",
  applicationName: "Quintal Brincante",
  appleWebApp: { capable: true, title: "Quintal" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-slate-800">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
