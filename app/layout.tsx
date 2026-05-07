import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DPE Info — Statistiques et Rénovation Énergétique",
  description: "Consultez les statistiques DPE par département et commune. Trouvez des artisans RGE certifiés et accédez aux aides MaPrimeRénov'.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} min-h-full bg-white text-gray-900 antialiased`}>
        <nav className="border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="https://www.dpeinfo.com" className="text-sm font-bold text-gray-900">
              DPE Info
            </a>
            <a
              href="https://www.dpeinfo.com/devis?track=b"
              className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors"
            >
              Demander des devis
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
