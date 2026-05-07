import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DEPARTMENTS, getDeptBySlug, ZONE_LABELS } from "@/lib/departments";
import { fetchDeptStats } from "@/lib/ademe";

export async function generateStaticParams() {
  return DEPARTMENTS.map((d) => ({ dept: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ dept: string }> }): Promise<Metadata> {
  const { dept } = await params;
  const department = getDeptBySlug(dept);
  if (!department) return {};
  return {
    title: `DPE ${department.name} (${department.num}) — Passoires Thermiques & Rénovation 2026`,
    description: `Statistiques DPE officielles en ${department.name} : part de logements F et G, interdictions locatives 2026, artisans RGE et aides MaPrimeRénov'.`,
    alternates: { canonical: `https://www.dpeinfo.com/dpe/${dept}` },
    openGraph: {
      title: `DPE ${department.name} — Passoires thermiques & rénovation`,
      description: `Statistiques ADEME, interdictions locatives 2026 et artisans RGE en ${department.name}.`,
    },
  };
}

// Exact DPE colors from the Vite app
const DPE_BG: Record<string, string> = {
  A: "hsl(145,60%,40%)", B: "hsl(80,55%,45%)", C: "hsl(55,70%,50%)",
  D: "hsl(45,80%,55%)", E: "hsl(25,80%,55%)", F: "hsl(10,70%,50%)", G: "hsl(0,65%,45%)",
};
const DPE_TEXT: Record<string, string> = {
  A: "white", B: "white", C: "hsl(220 25% 10%)", D: "hsl(220 25% 10%)", E: "white", F: "white", G: "white",
};
const DPE_BAR: Record<string, string> = {
  A: "hsl(145,60%,40%)", B: "hsl(80,55%,45%)", C: "hsl(55,70%,50%)",
  D: "hsl(45,80%,55%)", E: "hsl(25,80%,55%)", F: "hsl(10,70%,50%)", G: "hsl(0,65%,45%)",
};

const NATIONAL_AVG_PASSOIRE = 17; // % national average F+G
const NATIONAL_AVG_CONSUMPTION = 230; // kWh/m²/an

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

export default async function DeptPage({ params }: { params: Promise<{ dept: string }> }) {
  const { dept } = await params;
  const department = getDeptBySlug(dept);
  if (!department) notFound();

  const stats = await fetchDeptStats(department.num);
  const zone = ZONE_LABELS[department.zone];
  const hasData = stats.total > 0;

  const vsNational = hasData ? stats.passoirePct - NATIONAL_AVG_PASSOIRE : 0;
  const vsNationalText = vsNational > 0
    ? `${vsNational} point${vsNational > 1 ? "s" : ""} au-dessus de la moyenne nationale`
    : vsNational < 0
    ? `${Math.abs(vsNational)} point${Math.abs(vsNational) > 1 ? "s" : ""} en dessous de la moyenne nationale`
    : "dans la moyenne nationale";

  const urgencyLevel = stats.passoirePct >= 25 ? "critique" : stats.passoirePct >= 17 ? "élevé" : "modéré";
  const urgencyColor = urgencyLevel === "critique" ? "hsl(0,72%,51%)" : urgencyLevel === "élevé" ? "hsl(25,80%,55%)" : "hsl(160,70%,40%)";
  const urgencyBg = urgencyLevel === "critique" ? "hsl(0,72%,97%)" : urgencyLevel === "élevé" ? "hsl(25,80%,97%)" : "hsl(160,70%,97%)";
  const urgencyBorder = urgencyLevel === "critique" ? "hsl(0,72%,80%)" : urgencyLevel === "élevé" ? "hsl(25,80%,80%)" : "hsl(160,70%,80%)";

  const aboveNationalConsumption = stats.avgConsumption !== null && stats.avgConsumption > NATIONAL_AVG_CONSUMPTION;

  const postcode = department.num.match(/^\d+$/) ? department.num.padStart(2, "0") + "000" : "75000";

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(220 10% 46%)" }}>
        <a href="https://www.dpeinfo.com" className="hover:underline">Accueil</a>
        <span>/</span>
        <a href="https://www.dpeinfo.com/dpe" className="hover:underline">Départements</a>
        <span>/</span>
        <span style={{ color: "hsl(220 25% 10%)" }}>{department.name}</span>
      </nav>

      {/* Hero */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 shadow-sm"
            style={{ background: "hsl(215 90% 42%)", color: "white" }}
          >
            {department.num}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium" style={{ color: "hsl(220 10% 46%)" }}>
              {department.region} · {department.city}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ color: "hsl(220 25% 10%)" }}>
              DPE en {department.name}
            </h1>
          </div>
        </div>

        {hasData && (
          <p className="text-base" style={{ color: "hsl(220 10% 46%)" }}>
            <span className="font-semibold" style={{ color: urgencyColor }}>{stats.passoirePct}% de passoires thermiques</span>
            {" "}({fmt(stats.passoireCount)} logements) — {vsNationalText}.
            {" "}{stats.rgeCount > 0 && `${fmt(stats.rgeCount)} artisans RGE disponibles dans le département.`}
          </p>
        )}

        {/* Trust badges — matching homepage */}
        <div className="flex flex-wrap gap-2">
          <Badge color="hsl(215 90% 42%)" borderColor="hsl(215 90% 75%)">Données ADEME officielles</Badge>
          <Badge color="hsl(160 70% 40%)" borderColor="hsl(160 70% 75%)">Licence Ouverte Etalab</Badge>
          <Badge color="hsl(220 10% 46%)" borderColor="hsl(220 15% 80%)">Réglementation 2026</Badge>
        </div>
      </div>

      {/* Stat cards */}
      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Logements recensés" value={fmt(stats.total)} sub="base ADEME" />
          <StatCard
            label="Passoires F+G"
            value={`${stats.passoirePct}%`}
            sub={`${fmt(stats.passoireCount)} logements`}
            highlight
            highlightColor={urgencyColor}
            highlightBg={urgencyBg}
            highlightBorder={urgencyBorder}
          />
          {stats.avgConsumption && (
            <StatCard
              label="Conso. moyenne"
              value={`${stats.avgConsumption}`}
              sub="kWh/m²/an"
              highlight={aboveNationalConsumption ?? false}
              highlightColor="hsl(25,80%,55%)"
              highlightBg="hsl(25,80%,97%)"
              highlightBorder="hsl(25,80%,80%)"
            />
          )}
          <StatCard label="Artisans RGE" value={fmt(stats.rgeCount)} sub={`dept. ${department.num}`} />
        </div>
      )}

      {/* DPE class breakdown */}
      {hasData && (
        <Section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(220 25% 10%)" }}>
            Répartition des classes DPE — {department.name}
          </h2>
          <div className="space-y-2.5">
            {(["A", "B", "C", "D", "E", "F", "G"] as const).map((cls) => {
              const count = stats.byClass[cls] ?? 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              const isPassoire = cls === "F" || cls === "G";
              return (
                <div key={cls} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: DPE_BG[cls], color: DPE_TEXT[cls] }}
                  >
                    {cls}
                  </div>
                  <div className="flex-1 rounded-full h-2" style={{ background: "hsl(220 15% 92%)" }}>
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 1)}%`, background: DPE_BAR[cls] }}
                    />
                  </div>
                  <span className="text-sm font-medium w-10 text-right" style={{ color: isPassoire ? "hsl(0,72%,51%)" : "hsl(220 25% 10%)" }}>
                    {pct}%
                  </span>
                  <span className="text-xs w-20 text-right hidden sm:block" style={{ color: "hsl(220 10% 46%)" }}>
                    {fmt(count)}
                  </span>
                </div>
              );
            })}
          </div>
          {stats.avgConsumption && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm" style={{ borderColor: "hsl(220 15% 90%)" }}>
              <span style={{ color: "hsl(220 10% 46%)" }}>Consommation moyenne</span>
              <span className="font-semibold" style={{ color: aboveNationalConsumption ? "hsl(25,80%,55%)" : "hsl(160,70%,40%)" }}>
                {stats.avgConsumption} kWh/m²/an
                <span className="text-xs font-normal ml-1" style={{ color: "hsl(220 10% 46%)" }}>
                  (nationale : {NATIONAL_AVG_CONSUMPTION})
                </span>
              </span>
            </div>
          )}
          <p className="text-xs mt-3" style={{ color: "hsl(220 10% 46%)" }}>
            Source : base ADEME DPE logements existants · {fmt(stats.total)} logements · données 2024-2025
          </p>
        </Section>
      )}

      {/* Rental ban urgency */}
      <div className="rounded-xl border-2 p-5 space-y-4" style={{ background: urgencyBg, borderColor: urgencyBorder }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold" style={{ background: urgencyColor, color: "white" }}>
            !
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "hsl(220 25% 10%)" }}>
              Interdictions locatives en {department.name} — 2025-2034
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "hsl(220 10% 46%)" }}>
              Niveau d&apos;urgence : <span className="font-semibold" style={{ color: urgencyColor }}>{urgencyLevel}</span>
              {hasData && ` · ${fmt(stats.passoireCount)} logements concernés`}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { cls: "G", color: "hsl(0,65%,45%)", date: "Janvier 2025", status: "En vigueur", desc: "Interdiction de mise en location effective. Les baux ne peuvent pas être renouvelés." },
            { cls: "F", color: "hsl(10,70%,50%)", date: "Janvier 2028", status: "Dans 2 ans", desc: "Interdiction prochaine — anticipez la rénovation pour éviter l'impossibilité de louer." },
            { cls: "E", color: "hsl(25,80%,55%)", date: "Janvier 2034", status: "Dans 8 ans", desc: "Échéance à anticiper pour les propriétaires bailleurs." },
          ].map(({ cls, color, date, status, desc }) => (
            <div key={cls} className="flex gap-3 bg-white/60 rounded-lg p-3" >
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0" style={{ background: color, color: "white" }}>
                {cls}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "hsl(220 25% 10%)" }}>{date}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: color + "22", color }}>
                    {status}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "hsl(220 10% 46%)" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA — identical to homepage */}
      <CTABlock deptName={department.name} postcode={postcode} />

      {/* Climate zone */}
      <Section>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
            style={{ background: "hsl(215 90% 42%)", color: "white" }}>
            {department.zone}
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold" style={{ color: "hsl(220 25% 10%)" }}>{zone.label}</h2>
            <p className="text-sm" style={{ color: "hsl(220 10% 46%)" }}>{zone.desc}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "hsl(220 15% 90%)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "hsl(220 10% 46%)" }}>Priorité de rénovation recommandée</p>
          <p className="text-sm" style={{ color: "hsl(220 25% 10%)" }}>{zone.priority}</p>
        </div>
      </Section>

      {/* RGE contractors */}
      <Section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: "hsl(220 25% 10%)" }}>
          Artisans RGE en {department.name}
        </h2>
        <p className="text-sm mb-4" style={{ color: "hsl(220 10% 46%)" }}>
          {stats.rgeCount > 0
            ? `${fmt(stats.rgeCount)} entreprises certifiées RGE sont référencées dans le département ${department.num} par l'ADEME. La certification RGE (Reconnu Garant de l'Environnement) est obligatoire pour accéder aux aides MaPrimeRénov' et à l'éco-PTZ.`
            : `Les artisans certifiés RGE du département ${department.num} sont référencés par l'ADEME. La certification RGE est obligatoire pour accéder aux aides de rénovation énergétique.`}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {["Isolation", "Chauffage / PAC", "VMC double flux", "Fenêtres"].map((work) => (
            <div key={work} className="rounded-lg px-3 py-2 text-center text-xs font-medium border"
              style={{ borderColor: "hsl(220 15% 90%)", color: "hsl(220 25% 10%)", background: "white" }}>
              {work}
            </div>
          ))}
        </div>
      </Section>

      {/* MaPrimeRénov aides */}
      <Section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(220 25% 10%)" }}>
          Aides disponibles en {department.name} — 2026
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: "MaPrimeRénov'", amount: "Jusqu'à 70%", desc: "du coût des travaux selon les revenus du foyer. Obligatoirement via un artisan RGE certifié." },
            { title: "CEE", amount: "Variable", desc: "Certificats d'économie d'énergie, cumulables avec MaPrimeRénov'. Montant selon les travaux réalisés." },
            { title: "Éco-PTZ", amount: "50 000 €", desc: "Prêt à taux zéro pour financer le reste à charge. Cumulable avec les autres aides." },
          ].map(({ title, amount, desc }) => (
            <div key={title} className="rounded-xl border p-4 space-y-2 bg-white"
              style={{ borderColor: "hsl(220 15% 90%)" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "hsl(220 25% 10%)" }}>{title}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "hsl(160 70% 92%)", color: "hsl(160 70% 30%)" }}>
                  {amount}
                </span>
              </div>
              <p className="text-xs" style={{ color: "hsl(220 10% 46%)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Second CTA */}
      <CTABlock deptName={department.name} postcode={postcode} />

    </main>
  );
}

function Badge({ children, color, borderColor }: { children: React.ReactNode; color: string; borderColor: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium"
      style={{ color, borderColor, background: color + "11" }}>
      {children}
    </span>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-5 sm:p-6" style={{ borderColor: "hsl(220 15% 90%)" }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, highlight = false, highlightColor, highlightBg, highlightBorder }: {
  label: string; value: string; sub: string;
  highlight?: boolean; highlightColor?: string; highlightBg?: string; highlightBorder?: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 space-y-1"
      style={{
        background: highlight && highlightBg ? highlightBg : "white",
        borderColor: highlight && highlightBorder ? highlightBorder : "hsl(220 15% 90%)",
      }}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "hsl(220 10% 46%)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: highlight && highlightColor ? highlightColor : "hsl(220 25% 10%)" }}>
        {value}
      </p>
      <p className="text-[10px]" style={{ color: "hsl(220 10% 46%)" }}>{sub}</p>
    </div>
  );
}

function CTABlock({ deptName, postcode }: { deptName: string; postcode: string }) {
  return (
    <div className="rounded-xl border-2 p-5 space-y-4"
      style={{ borderColor: "hsl(215 90% 75%)", background: "hsl(215 90% 97%)" }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: "hsl(220 25% 10%)" }}>
          Obtenez des devis de professionnels RGE en {deptName}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "hsl(220 10% 46%)" }}>
          Les estimations ci-dessus sont basées sur les données ADEME locales.
          Importez votre PDF DPE pour une analyse sur mesure de votre logement.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 space-y-1">
          <a
            href={`https://www.dpeinfo.com/devis?track=b&postcode=${postcode}`}
            className="flex items-center justify-center w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors bg-white hover:bg-gray-50"
            style={{ borderColor: "hsl(220 15% 90%)", color: "hsl(220 25% 10%)" }}
          >
            Demande gratuite
          </a>
          <p className="text-[10px] text-center" style={{ color: "hsl(220 10% 46%)" }}>
            Basé sur les données publiques
          </p>
        </div>

        <div className="flex-1 space-y-1">
          <a
            href="https://www.dpeinfo.com/devis?track=a"
            className="flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "hsl(215 90% 42%)" }}
          >
            Analyser mon PDF DPE — 9,90 €
          </a>
          <p className="text-[10px] text-center" style={{ color: "hsl(220 10% 46%)" }}>
            R-values réels · facture précise · brief artisan
          </p>
        </div>
      </div>

      <p className="text-[10px]" style={{ color: "hsl(220 10% 46%)" }}>
        Jusqu&apos;à 3 artisans certifiés RGE vous contactent sous 48h.
      </p>
    </div>
  );
}
