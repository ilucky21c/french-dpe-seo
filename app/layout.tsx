import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "DPE Info — Statistiques et Rénovation Énergétique",
  description: "Consultez les statistiques DPE par département et commune. Trouvez des artisans RGE certifiés et accédez aux aides MaPrimeRénov'.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${spaceGrotesk.className} min-h-full antialiased`} style={{ background: "hsl(220 20% 97%)", color: "hsl(220 25% 10%)" }}>
        <nav className="border-b sticky top-0 z-10 bg-white" style={{ borderColor: "hsl(220 15% 90%)" }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <a href="https://www.dpeinfo.com" className="text-sm font-bold" style={{ color: "hsl(220 25% 10%)" }}>
              DPE Info
            </a>
            <div className="flex items-center gap-2">
              <a
                href="https://www.dpeinfo.com/analyse-dpe"
                className="hidden sm:block text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                style={{ borderColor: "hsl(220 15% 90%)", color: "hsl(220 25% 10%)" }}
              >
                Analyser mon DPE
              </a>
              <a
                href="https://www.dpeinfo.com/devis?track=b"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors"
                style={{ background: "hsl(215 90% 42%)" }}
              >
                Devis gratuit
              </a>
            </div>
          </div>
        </nav>
        {children}
        <footer className="border-t mt-16 py-8" style={{ borderColor: "hsl(220 15% 90%)" }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs" style={{ color: "hsl(220 10% 46%)" }}>
              Données ADEME · Licence Ouverte Etalab · dpeinfo.com
            </p>
            <div className="flex items-center gap-4 text-xs" style={{ color: "hsl(220 10% 46%)" }}>
              <a href="https://www.dpeinfo.com" className="hover:underline">Accueil</a>
              <a href="https://www.dpeinfo.com/devis?track=b" className="hover:underline">Demander des devis</a>
              <a href="https://www.dpeinfo.com/analyse-dpe" className="hover:underline">Analyser mon PDF</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
