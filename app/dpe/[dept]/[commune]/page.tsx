import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEPARTMENTS } from "@/lib/departments";
import communeContent from "@/lib/commune-content.json";
import type { CommuneContent } from "@/lib/communes";
import { ContractorSection } from "./ContractorSection";

export const revalidate = 604800; // 1 week

// ─── Static generation ───────────────────────────────────────────────────────

export async function generateStaticParams() {
  const deptByNum = Object.fromEntries(DEPARTMENTS.map((d) => [d.num, d]));
  return Object.values(communeContent as Record<string, CommuneContent>).map((c) => {
    const dept = deptByNum[c.commune.dept];
    return { dept: dept?.slug ?? c.commune.dept, commune: c.commune.slug };
  });
}

export async function generateMetadata({
  params,
}: {
  params: { dept: string; commune: string };
}): Promise<Metadata> {
  const data = (communeContent as Record<string, CommuneContent>)[params.commune];
  if (!data) return {};
  const { commune, stats } = data;
  const dept = DEPARTMENTS.find((d) => d.slug === params.dept);
  return {
    title: `DPE ${commune.name} — Statistiques & Artisans RGE 2026`,
    description: `${stats.passoirePct.toFixed(1)}% de passoires thermiques à ${commune.name} (${dept?.name ?? commune.dept}). Classes énergétiques, artisans RGE certifiés et aides à la rénovation.`,
    alternates: {
      canonical: `https://www.dpeinfo.com/dpe/${params.dept}/${params.commune}`,
    },
  };
}

// ─── Shared sub-components (server-safe) ─────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full border font-medium"
      style={{ borderColor: "hsl(220 15% 90%)", color: "hsl(220 10% 46%)", background: "white" }}
    >
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold" style={{ color: "hsl(220 25% 10%)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 space-y-1"
      style={{ borderColor: "hsl(220 15% 90%)", background: "white" }}
    >
      <p className="text-[10px] uppercase tracking-wide" style={{ color: "hsl(220 10% 55%)" }}>
        {label}
      </p>
      <p
        className="text-xl font-bold"
        style={{ color: valueColor ?? "hsl(220 25% 10%)" }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px]" style={{ color: "hsl(220 10% 55%)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

const DPE_COLORS: Record<string, string> = {
  A: "hsl(145,60%,40%)",
  B: "hsl(80,55%,45%)",
  C: "hsl(55,70%,50%)",
  D: "hsl(45,80%,55%)",
  E: "hsl(25,80%,55%)",
  F: "hsl(10,70%,50%)",
  G: "hsl(0,65%,45%)",
};

const NATIONAL_PASSOIRE_PCT = 17;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CommunePage({
  params,
}: {
  params: { dept: string; commune: string };
}) {
  const data = (communeContent as Record<string, CommuneContent>)[params.commune];
  if (!data) notFound();

  const { commune, stats, contractors, prose } = data;
  const dept = DEPARTMENTS.find((d) => d.slug === params.dept);
  if (!dept) notFound();

  const vsNational =
    stats.passoirePct > NATIONAL_PASSOIRE_PCT + 3
      ? `${(stats.passoirePct - NATIONAL_PASSOIRE_PCT).toFixed(1)} pts au-dessus de la moyenne nationale`
      : stats.passoirePct < NATIONAL_PASSOIRE_PCT - 3
      ? `${(NATIONAL_PASSOIRE_PCT - stats.passoirePct).toFixed(1)} pts en dessous de la moyenne nationale`
      : "dans la moyenne nationale";

  const urgency =
    stats.passoirePct >= 20
      ? { label: "Élevée", color: "hsl(0,65%,45%)", bg: "hsl(0,65%,97%)" }
      : stats.passoirePct >= 12
      ? { label: "Modérée", color: "hsl(30,80%,45%)", bg: "hsl(30,80%,97%)" }
      : { label: "Faible", color: "hsl(145,60%,40%)", bg: "hsl(145,60%,97%)" };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">

      {/* Breadcrumb */}
      <nav className="text-xs" style={{ color: "hsl(220 10% 55%)" }}>
        <a href="https://www.dpeinfo.com" className="hover:underline">Accueil</a>
        {" › "}
        <a href="https://www.dpeinfo.com/dpe" className="hover:underline">DPE</a>
        {" › "}
        <a href={`https://www.dpeinfo.com/dpe/${dept.slug}`} className="hover:underline">{dept.name}</a>
        {" › "}
        <span>{commune.name}</span>
      </nav>

      {/* Hero */}
      <div className="space-y-4">
        <div className="flex items-start gap-4 flex-wrap">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: "hsl(215 90% 42%)" }}
          >
            {dept.num}
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: "hsl(220 25% 10%)" }}>
              DPE {commune.name}
            </h1>
            <p className="text-sm" style={{ color: "hsl(220 10% 46%)" }}>
              {dept.name} · {commune.population.toLocaleString("fr-FR")} hab. · {stats.total.toLocaleString("fr-FR")} diagnostics ADEME
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip>{stats.passoirePct.toFixed(1)}% passoires thermiques</Chip>
          <Chip>Données ADEME officielles</Chip>
          {stats.isFallback && <Chip>Statistiques du département</Chip>}
          {contractors.length > 0 && <Chip>{contractors.length} artisans RGE locaux</Chip>}
        </div>
      </div>

      {/* DPE distribution */}
      <Section title={`Bilan énergétique à ${commune.name}`}>
        <div className="space-y-2">
          {(["A", "B", "C", "D", "E", "F", "G"] as const).map((cls) => {
            const pct = stats.byClass[cls] ?? 0;
            return (
              <div key={cls} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: DPE_COLORS[cls] }}
                >
                  {cls}
                </div>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "hsl(220 15% 93%)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%`, background: DPE_COLORS[cls] }}
                  />
                </div>
                <span className="text-xs font-medium w-10 text-right" style={{ color: "hsl(220 25% 10%)" }}>
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          <StatCard label="Passoires (F+G)" value={`${stats.passoirePct.toFixed(1)}%`} sub={vsNational} />
          {stats.avgConsumption && (
            <StatCard label="Consommation moyenne" value={`${stats.avgConsumption} kWh/m²/an`} sub="tous logements" />
          )}
          <StatCard label="Urgence rénovation" value={urgency.label} sub="" valueColor={urgency.color} />
        </div>
      </Section>

      {/* AI prose */}
      {prose && (
        <Section title={`Contexte énergétique à ${commune.name}`}>
          <div className="space-y-3">
            {prose.split("\n\n").filter(Boolean).map((p, i) => (
              <p key={i} className="text-sm leading-relaxed" style={{ color: "hsl(220 15% 30%)" }}>
                {p}
              </p>
            ))}
          </div>
        </Section>
      )}

      {/* Rental ban urgency */}
      <div
        className="rounded-xl p-5 space-y-2 border"
        style={{ background: urgency.bg, borderColor: urgency.color + "40" }}
      >
        <p className="text-sm font-semibold" style={{ color: urgency.color }}>
          Interdictions de location — logements classés F et G
        </p>
        <p className="text-sm" style={{ color: "hsl(220 15% 30%)" }}>
          Depuis janvier 2025, les logements classés <strong>G</strong> sont interdits à la mise en
          location. Les logements <strong>F</strong> seront concernés en janvier 2028. À {commune.name},{" "}
          <strong>{stats.passoirePct.toFixed(1)}% du parc</strong> est concerné. La mise en conformité
          nécessite des travaux de rénovation énergétique réalisés par un artisan certifié RGE.
        </p>
      </div>

      {/* Contractor multi-select (client component) */}
      {contractors.length > 0 && (
        <ContractorSection contractors={contractors} communeName={commune.name} />
      )}

      {/* Equal Track A / B CTA */}
      <Section title="Obtenir de l'aide pour votre bien">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="https://www.dpeinfo.com/devis?track=b"
            className="flex flex-col gap-3 rounded-xl border p-5 hover:shadow-md transition-shadow"
            style={{ borderColor: "hsl(220 15% 88%)", background: "white" }}
          >
            <p className="text-sm font-semibold" style={{ color: "hsl(220 25% 10%)" }}>
              Devis gratuit
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "hsl(220 10% 46%)" }}>
              Décrivez votre projet en quelques questions. Des artisans RGE certifiés de votre zone vous rappellent sous 48h.
            </p>
            <span
              className="mt-auto inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium border"
              style={{ borderColor: "hsl(215 90% 42%)", color: "hsl(215 90% 42%)", background: "white" }}
            >
              Demander des devis gratuits
            </span>
          </a>

          <a
            href="https://www.dpeinfo.com/devis?track=a"
            className="flex flex-col gap-3 rounded-xl border p-5 hover:shadow-md transition-shadow"
            style={{ borderColor: "hsl(220 15% 88%)", background: "white" }}
          >
            <p className="text-sm font-semibold" style={{ color: "hsl(220 25% 10%)" }}>
              Analyse IA de votre PDF DPE — 9,90 €
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "hsl(220 10% 46%)" }}>
              Importez votre rapport DPE. L'IA extrait composant par composant vos priorités de rénovation avec ROI estimé.
            </p>
            <span
              className="mt-auto inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: "hsl(215 90% 42%)" }}
            >
              Analyser mon DPE
            </span>
          </a>
        </div>
      </Section>

      {/* Aides */}
      <Section title="Aides financières disponibles">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              name: "MaPrimeRénov'",
              desc: "Aide de l'État calculée selon vos revenus et le type de travaux. Jusqu'à 90% pour les ménages modestes.",
              href: "https://www.maprimerenov.gouv.fr",
            },
            {
              name: "CEE",
              desc: "Certificats d'Économies d'Énergie versés par les fournisseurs d'énergie. Cumulable avec MaPrimeRénov'.",
              href: null,
            },
            {
              name: "Éco-PTZ",
              desc: "Prêt à taux zéro jusqu'à 50 000 € pour financer une rénovation globale sans avance de trésorerie.",
              href: null,
            },
          ].map((aide) => (
            <div
              key={aide.name}
              className="rounded-xl border p-4 space-y-1.5"
              style={{ borderColor: "hsl(220 15% 90%)", background: "white" }}
            >
              <p className="text-sm font-semibold" style={{ color: "hsl(220 25% 10%)" }}>
                {aide.name}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "hsl(220 10% 46%)" }}>
                {aide.desc}
              </p>
              {aide.href && (
                <a
                  href={aide.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "hsl(215 90% 42%)" }}
                >
                  En savoir plus →
                </a>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Back link */}
      <div className="text-center">
        <a
          href={`https://www.dpeinfo.com/dpe/${dept.slug}`}
          className="text-sm hover:underline"
          style={{ color: "hsl(215 90% 42%)" }}
        >
          ← Voir toutes les communes du {dept.name}
        </a>
      </div>

      {/* Legal */}
      <p className="text-[10px] text-center" style={{ color: "hsl(220 10% 60%)" }}>
        Données : ADEME · Licence Ouverte Etalab · dpeinfo.com ·
        Cette page est fournie à titre informatif uniquement et ne constitue pas un conseil juridique ou financier.
        {stats.isFallback &&
          " Les statistiques présentées sont celles du département (données communales insuffisantes)."}
      </p>

    </main>
  );
}
