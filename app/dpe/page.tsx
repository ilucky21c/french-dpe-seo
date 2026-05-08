import type { Metadata } from "next";
import { DEPARTMENTS } from "@/lib/departments";

export const metadata: Metadata = {
  title: "DPE par département — Statistiques & Rénovation 2026",
  description: "Consultez les statistiques DPE officielles ADEME pour chaque département français : passoires thermiques, classes énergétiques, artisans RGE et aides disponibles.",
  alternates: { canonical: "https://www.dpeinfo.com/dpe" },
};

const REGIONS = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne",
  "Centre-Val de Loire", "Corse", "Grand Est", "Hauts-de-France",
  "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie",
  "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
];

export default function DeptIndex() {
  const byRegion = REGIONS.map((region) => ({
    region,
    depts: DEPARTMENTS.filter((d) => d.region === region),
  }));

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: "hsl(220 25% 10%)" }}>
          DPE par département
        </h1>
        <p className="text-base" style={{ color: "hsl(220 10% 46%)" }}>
          Statistiques officielles ADEME · Classes énergétiques · Passoires thermiques · Artisans RGE · Réglementation 2026
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip>96 départements</Chip>
          <Chip>Données ADEME complètes</Chip>
          <Chip>Mises à jour trimestriellement</Chip>
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-xl border-2 p-5 space-y-3"
        style={{ borderColor: "hsl(215 90% 75%)", background: "hsl(215 90% 97%)" }}>
        <p className="text-sm font-semibold" style={{ color: "hsl(220 25% 10%)" }}>
          Votre logement est classé F ou G ?
        </p>
        <p className="text-xs" style={{ color: "hsl(220 10% 46%)" }}>
          Depuis janvier 2025, les logements G sont interdits à la location. Les logements F suivront en 2028.
          Obtenez des devis d&apos;artisans RGE certifiés pour anticiper.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <a href="https://www.dpeinfo.com/devis?track=b"
            className="flex-1 flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
            style={{ borderColor: "hsl(220 15% 90%)", color: "hsl(220 25% 10%)" }}>
            Demande gratuite
          </a>
          <a href="https://www.dpeinfo.com/devis?track=a"
            className="flex-1 flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: "hsl(215 90% 42%)" }}>
            Analyser mon PDF DPE — 9,90 €
          </a>
        </div>
      </div>

      {/* Departments by region */}
      <div className="space-y-6">
        {byRegion.map(({ region, depts }) => (
          <div key={region}>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: "hsl(220 10% 46%)" }}>
              {region}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {depts.map((d) => (
                <a
                  key={d.slug}
                  href={`https://www.dpeinfo.com/dpe/${d.slug}`}
                  className="flex items-center gap-3 rounded-xl border bg-white p-3 hover:border-blue-300 hover:shadow-sm transition-all group"
                  style={{ borderColor: "hsl(220 15% 90%)" }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "hsl(215 90% 42%)", color: "white" }}
                  >
                    {d.num}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors"
                      style={{ color: "hsl(220 25% 10%)" }}>
                      {d.name}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: "hsl(220 10% 46%)" }}>
                      {d.city}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom note */}
      <p className="text-[10px] text-center" style={{ color: "hsl(220 10% 60%)" }}>
        Données : ADEME · Licence Ouverte Etalab · dpeinfo.com · Les pages communes arrivent prochainement.
      </p>

    </main>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs px-2.5 py-1 rounded-full border font-medium"
      style={{ borderColor: "hsl(220 15% 90%)", color: "hsl(220 10% 46%)", background: "white" }}>
      {children}
    </span>
  );
}
