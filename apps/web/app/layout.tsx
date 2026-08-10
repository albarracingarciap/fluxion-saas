import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fluxion SaaS",
  description: "Plataforma B2B de Gobierno de Inteligencia Artificial",
};

// Script inline para aplicar tema/densidad antes del render de React
// y evitar el flash al cargar (FOUC). Lee de localStorage la última
// preferencia conocida; el ThemeApplier la sincroniza con la BD al montar.
const themeBootstrapScript = `
(function(){
  try {
    var t = localStorage.getItem('fluxion_theme') || 'light';
    var d = localStorage.getItem('fluxion_density') || 'comfortable';
    var resolved = t;
    if (t === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (resolved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    if (d === 'compact') {
      document.documentElement.setAttribute('data-density', 'compact');
    }
  } catch (e) {}
})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="font-sans bg-ltbg text-ltt" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
