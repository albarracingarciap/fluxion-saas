import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fluxion SaaS",
  description: "Plataforma B2B de Gobierno de Inteligencia Artificial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="antialiased">
      <body className="font-sans bg-ltbg text-ltt" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
