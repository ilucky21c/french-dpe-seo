import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DEPARTMENTS, getDeptBySlug } from "@/lib/departments";
import { fetchDeptStats } from "@/lib/ademe";
import { CTABlock } from "@/components/CTABlock";

export async function generateStaticParams() {
  return DEPARTMENTS.map((d) => ({ dept: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ dept: string }> }): Promise<Metadata> {
  const { dept } = await params;
  const department = getDeptBySlug(dept);
  if (!department) return {};
  return {
    title: `DPE ${department.name} (${department.num}) — Passoires Thermiques & Rénovation 2026`,
    description: `Statistiques DPE en ${department.name} : part de logements F et G, artisans RGE disponibles, aides MaPrimeRénov et interdictions locatives 2026.`,
    alternates: { canonical: `https://www.dpeinfo.com/dpe/${dept}` },
  };
}

const DPE_COLORS: Record<string, string> = {
  A: "bg-emerald-600 text-white",
  B: "bg-green-500 text-white",
  C: "bg-lime-500 text-gray-900",
  D: "bg-yellow-400 text-gray-900",
  E: "bg-orange-400 text-white",
  F: "bg-red-400 text-white",
  G: "bg-red-700 text-white",
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default async function DeptPage({ params }: { params: Promise<{ dept: string }> }) {
  const { dept } = await params;
  const department = getDeptBySlug(dept);
  if (!department) notFound();

  const stats = await fetchDeptStats(department.num);
  const hasData = stats.total > 0;

  const nationalAvgConsumption = 230; // kWh/m²/an national average
  const aboveNational = stats.avgConsumption !== null && stats.avgConsumption > nationalAvgConsumption;

  // Rental ban urgency: G already banned (Jan 2025), F banned Jan 2028
  const gBanned = true; // as of 2026
  const fBanned2028 = true;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          Département {department.num} · {department.city}
        </p>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">
          DPE en {department.name}
        </h1>
        <p className="text-base text-gray-500">
          Statistiques officielles ADEME · Réglementation 2026 · Artisans RGE
        </p>
      </div>

      {/* Stat cards */}
      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Logements DPE"
            value={fmt(stats.total)}
            sub="enregistrés ADEME"
          />
          <StatCard
            label="Passoires (F+G)"
            value={`${stats.passoirePct}%`}
            sub={`${fmt(stats.passoireCount)} logements`}
            highlight={stats.passoirePct > 20}
          />
          {stats.avgConsumption && (
            <StatCard
              label="Conso. moyenne"
              value={`${stats.avgConsumption}`}
              sub="kWh/m²/an"
              highlight={aboveNational ?? false}
            />
          )}
          <StatCard
            label="Artisans RGE"
            value={fmt(stats.rgeCount)}
            sub={`dans le ${department.num}`}
          />
        </div>
      )}

      {/* DPE class breakdown */}
      {hasData && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">
            Répartition des classes DPE en {department.name}
          </h2>
          <div className="space-y-2">
            {(["A", "B", "C", "D", "E", "F", "G"] as const).map((cls) => {
              const count = stats.byClass[cls] ?? 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={cls} className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${DPE_COLORS[cls]}`}>
                    {cls}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${cls === "F" || cls === "G" ? "bg-red-500" : "bg-gray-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{pct}%</span>
                  <span className="text-xs text-gray-400 w-20 text-right hidden sm:block">{fmt(count)}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400">
            Source : base ADEME DPE · données 2024-2025 · {fmt(stats.total)} logements recensés
          </p>
        </div>
      )}

      {/* Rental ban urgency */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
        <h2 className="text-base font-semibold text-red-800">
          Interdictions locatives en {department.name} — ce qui change en 2026
        </h2>
        <ul className="space-y-2 text-sm text-red-700">
          {gBanned && (
            <li className="flex gap-2">
              <span className="font-bold shrink-0">Classe G :</span>
              <span>interdite à la location depuis janvier 2025. Les baux en cours ne peuvent pas être renouvelés.</span>
            </li>
          )}
          {fBanned2028 && (
            <li className="flex gap-2">
              <span className="font-bold shrink-0">Classe F :</span>
              <span>interdiction à partir de janvier 2028 — 2 ans pour anticiper la rénovation.</span>
            </li>
          )}
          <li className="flex gap-2">
            <span className="font-bold shrink-0">Classe E :</span>
            <span>interdiction prévue en janvier 2034.</span>
          </li>
        </ul>
        {hasData && stats.passoireCount > 0 && (
          <p className="text-xs text-red-600 font-medium">
            {fmt(stats.passoireCount)} logements en {department.name} sont concernés par ces interdictions (classes F et G).
          </p>
        )}
      </div>

      {/* CTA — 2 tracks, identical to homepage */}
      <CTABlock deptNum={department.num} deptName={department.name} />

      {/* RGE context */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-2">
        <h2 className="text-base font-semibold text-gray-900">
          Artisans RGE en {department.name}
        </h2>
        <p className="text-sm text-gray-600">
          {stats.rgeCount > 0
            ? `${fmt(stats.rgeCount)} entreprises certifiées RGE sont référencées dans le département ${department.num} par l'ADEME. La certification RGE (Reconnu Garant de l'Environnement) est obligatoire pour bénéficier des aides MaPrimeRénov'.`
            : `Les artisans certifiés RGE sont référencés par l'ADEME. La certification RGE est obligatoire pour bénéficier des aides MaPrimeRénov'.`
          }
        </p>
        <ul className="text-xs text-gray-500 space-y-1 mt-2">
          <li>• Isolation des combles et des murs</li>
          <li>• Pompe à chaleur et chauffage</li>
          <li>• Ventilation VMC double flux</li>
          <li>• Fenêtres et menuiseries</li>
        </ul>
      </div>

      {/* MaPrimeRénov context */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">
          Aides disponibles pour les propriétaires en {department.name}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <AideCard
            title="MaPrimeRénov'"
            desc="Jusqu'à 70% du coût des travaux selon les revenus. Obligatoirement via un artisan RGE."
          />
          <AideCard
            title="CEE"
            desc="Certificats d'économie d'énergie cumulables avec MaPrimeRénov'. Montant variable selon les travaux."
          />
          <AideCard
            title="Éco-PTZ"
            desc="Prêt à taux zéro jusqu'à 50 000 € pour financer le reste à charge des travaux de rénovation."
          />
        </div>
      </div>

      {/* Second CTA */}
      <CTABlock deptNum={department.num} deptName={department.name} />

      {/* Footer credit */}
      <p className="text-[10px] text-gray-400 text-center">
        Données : ADEME (Licence Ouverte Etalab) · dpeinfo.com · {department.name} ({department.num})
      </p>

    </main>
  );
}

function StatCard({ label, value, sub, highlight = false }: {
  label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 space-y-1 ${highlight ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-red-700" : "text-gray-900"}`}>{value}</p>
      <p className="text-[10px] text-gray-400">{sub}</p>
    </div>
  );
}

function AideCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  );
}
