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
    title: `DPE ${department.name} (${department.num}) — Statistiques & Rénovation 2026`,
    description: `Statistiques DPE officielles ADEME en ${department.name} : répartition des classes, passoires thermiques, consommation moyenne, artisans RGE et aides disponibles.`,
    alternates: { canonical: `https://www.dpeinfo.com/dpe/${dept}` },
    openGraph: {
      title: `DPE ${department.name} — Statistiques & rénovation 2026`,
      description: `Données ADEME complètes pour ${department.name} : classes DPE, GES, interdictions locatives et artisans RGE.`,
    },
  };
}

const DPE_BG: Record<string, string> = {
  A: "hsl(145,60%,40%)", B: "hsl(80,55%,45%)", C: "hsl(55,70%,50%)",
  D: "hsl(45,80%,55%)", E: "hsl(25,80%,55%)", F: "hsl(10,70%,50%)", G: "hsl(0,65%,45%)",
};
const DPE_TEXT: Record<string, string> = {
  A: "white", B: "white", C: "hsl(220 25% 10%)", D: "hsl(220 25% 10%)", E: "white", F: "white", G: "white",
};

const NATIONAL_AVG_CONSUMPTION = 230;

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export default async function DeptPage({ params }: { params: Promise<{ dept: string }> }) {
  const { dept } = await params;
  const department = getDeptBySlug(dept);
  if (!department) notFound();

  const stats = await fetchDeptStats(department.num);
  const zone = ZONE_LABELS[department.zone];
  const hasData = stats.total > 0;

  const passoirePct = stats.passoirePct;
  const vsNational = passoirePct - 17;
  const vsNationalText = vsNational > 0
    ? `${vsNational} point${vsNational > 1 ? "s" : ""} au-dessus de la moyenne nationale (17%)`
    : vsNational < 0
    ? `${Math.abs(vsNational)} point${Math.abs(vsNational) > 1 ? "s" : ""} en dessous de la moyenne nationale (17%)`
    : "dans la moyenne nationale (17%)";

  const urgencyLevel = passoirePct >= 20 ? "élevé" : passoirePct >= 12 ? "modéré" : "faible";
  const urgencyColor = urgencyLevel === "élevé" ? "hsl(0,72%,51%)" : urgencyLevel === "modéré" ? "hsl(25,80%,45%)" : "hsl(160,70%,40%)";
  const urgencyBg = urgencyLevel === "élevé" ? "hsl(0,72%,97%)" : urgencyLevel === "modéré" ? "hsl(25,80%,97%)" : "hsl(160,70%,97%)";
  const urgencyBorder = urgencyLevel === "élevé" ? "hsl(0,72%,82%)" : urgencyLevel === "modéré" ? "hsl(25,80%,82%)" : "hsl(160,70%,82%)";

  const aboveNational = stats.avgConsumption !== null && stats.avgConsumption > NATIONAL_AVG_CONSUMPTION;
  const postcode = department.num.match(/^\d+$/) ? department.num.padStart(2, "0") + "000" : "75000";

  const totalBuildings = stats.buildingTypes.maison + stats.buildingTypes.appartement + stats.buildingTypes.autre;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(220 10% 46%)" }}>
        <a href="https://www.dpeinfo.com" className="hover:underline">Accueil</a>
        <span>/</span>
        <span>Départements</span>
        <span>/</span>
        <span style={{ color: "hsl(220 25% 10%)" }}>{department.name}</span>
      </nav>

      {/* Hero */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 shadow-sm"
            style={{ background: "hsl(215 90% 42%)", color: "white" }}>
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
            Sur <strong style={{ color: "hsl(220 25% 10%)" }}>{fmt(stats.total)} logements</strong> enregistrés dans la base ADEME,{" "}
            <strong style={{ color: urgencyColor }}>{passoirePct}% sont classés F ou G</strong>{" "}
            ({fmt(stats.passoireCount)} passoires thermiques) — {vsNationalText}.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <TrustBadge color="hsl(215 90% 42%)" border="hsl(215 90% 75%)">Données ADEME officielles</TrustBadge>
          <TrustBadge color="hsl(160 70% 40%)" border="hsl(160 70% 75%)">Licence Ouverte Etalab</TrustBadge>
          <TrustBadge color="hsl(220 10% 46%)" border="hsl(220 15% 80%)">Réglementation 2026</TrustBadge>
          <TrustBadge color="hsl(220 10% 46%)" border="hsl(220 15% 80%)">{fmt(stats.total)} DPE enregistrés</TrustBadge>
        </div>
      </div>

      {/* Key stat cards */}
      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Logements DPE" value={fmt(stats.total)} sub="base ADEME complète" />
          <StatCard
            label="Passoires F+G"
            value={`${passoirePct}%`}
            sub={`${fmt(stats.passoireCount)} logements`}
            highlight urgencyColor={urgencyColor} urgencyBg={urgencyBg} urgencyBorder={urgencyBorder}
          />
          {stats.avgConsumption && (
            <StatCard
              label="Conso. moyenne"
              value={`${stats.avgConsumption}`}
              sub="kWh/m²/an"
              highlight={aboveNational}
              urgencyColor="hsl(25,80%,45%)"
              urgencyBg="hsl(25,80%,97%)"
              urgencyBorder="hsl(25,80%,82%)"
            />
          )}
          <StatCard label="Artisans RGE" value={fmt(stats.rgeCount)} sub={`certifiés dept. ${department.num}`} />
        </div>
      )}

      {/* DPE + GES class breakdown */}
      {hasData && (
        <Section>
          <h2 className="text-lg font-semibold mb-5" style={{ color: "hsl(220 25% 10%)" }}>
            Répartition des classes DPE — {department.name}
          </h2>
          <div className="space-y-2.5 mb-6">
            {(["A","B","C","D","E","F","G"] as const).map((cls) => {
              const count = stats.byClass[cls] ?? 0;
              const p = pct(count, stats.total);
              const isPassoire = cls === "F" || cls === "G";
              return (
                <div key={cls} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: DPE_BG[cls], color: DPE_TEXT[cls] }}>
                    {cls}
                  </div>
                  <div className="flex-1 rounded-full h-2.5" style={{ background: "hsl(220 15% 92%)" }}>
                    <div className="h-2.5 rounded-full" style={{ width: `${Math.max(p, 0.5)}%`, background: DPE_BG[cls] }} />
                  </div>
                  <span className="text-sm font-semibold w-10 text-right"
                    style={{ color: isPassoire ? urgencyColor : "hsl(220 25% 10%)" }}>
                    {p}%
                  </span>
                  <span className="text-xs w-20 text-right hidden sm:block" style={{ color: "hsl(220 10% 46%)" }}>
                    {fmt(count)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* GES */}
          <div className="pt-5 border-t" style={{ borderColor: "hsl(220 15% 90%)" }}>
            <p className="text-sm font-semibold mb-3" style={{ color: "hsl(220 25% 10%)" }}>
              Émissions de gaz à effet de serre (GES)
            </p>
            <div className="grid grid-cols-7 gap-1">
              {(["A","B","C","D","E","F","G"] as const).map((cls) => {
                const count = stats.byGes[cls] ?? 0;
                const gesTotal = Object.values(stats.byGes).reduce((a,b) => a+b, 0);
                const p = pct(count, gesTotal);
                return (
                  <div key={cls} className="text-center">
                    <div className="w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold mb-1"
                      style={{ background: DPE_BG[cls], color: DPE_TEXT[cls] }}>
                      {cls}
                    </div>
                    <p className="text-[10px] font-medium" style={{ color: "hsl(220 25% 10%)" }}>{p}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Building types */}
          {totalBuildings > 0 && (
            <div className="pt-5 border-t mt-5" style={{ borderColor: "hsl(220 15% 90%)" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "hsl(220 25% 10%)" }}>
                Type de logements
              </p>
              <div className="flex gap-4 text-sm flex-wrap">
                <div>
                  <span className="font-semibold" style={{ color: "hsl(220 25% 10%)" }}>{pct(stats.buildingTypes.maison, totalBuildings)}%</span>
                  <span className="ml-1" style={{ color: "hsl(220 10% 46%)" }}>Maisons individuelles</span>
                </div>
                <div>
                  <span className="font-semibold" style={{ color: "hsl(220 25% 10%)" }}>{pct(stats.buildingTypes.appartement, totalBuildings)}%</span>
                  <span className="ml-1" style={{ color: "hsl(220 10% 46%)" }}>Logements collectifs</span>
                </div>
              </div>
            </div>
          )}

          {stats.avgConsumption && (
            <div className="pt-4 border-t mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ borderColor: "hsl(220 15% 90%)" }}>
              <span className="text-sm" style={{ color: "hsl(220 10% 46%)" }}>Consommation énergétique moyenne</span>
              <div className="text-right">
                <span className="text-base font-bold" style={{ color: aboveNational ? "hsl(25,80%,45%)" : "hsl(160,70%,40%)" }}>
                  {stats.avgConsumption} kWh/m²/an
                </span>
                <span className="text-xs ml-2" style={{ color: "hsl(220 10% 46%)" }}>
                  {aboveNational ? "▲" : "▼"} moyenne nationale : {NATIONAL_AVG_CONSUMPTION}
                </span>
              </div>
            </div>
          )}

          <p className="text-[10px] mt-4 pt-3 border-t" style={{ borderColor: "hsl(220 15% 90%)", color: "hsl(220 10% 46%)" }}>
            Source : base ADEME DPE logements existants (dataset «&nbsp;dpe-france&nbsp;») · {fmt(stats.total)} DPE enregistrés dans le département {department.num} · données issues des DPE réalisés principalement après juillet 2021 (nouvelle méthode 3CL). Les logements sans DPE récent ne sont pas inclus — la part réelle de passoires thermiques sur l&apos;ensemble du parc peut être supérieure.
          </p>
        </Section>
      )}

      {/* Rental ban */}
      <div className="rounded-xl border-2 p-5 space-y-4"
        style={{ background: urgencyBg, borderColor: urgencyBorder }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg"
            style={{ background: urgencyColor, color: "white" }}>!</div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "hsl(220 25% 10%)" }}>
              Calendrier des interdictions locatives — {department.name}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "hsl(220 10% 46%)" }}>
              Niveau d&apos;urgence : <span className="font-semibold" style={{ color: urgencyColor }}>{urgencyLevel}</span>
              {hasData && ` · environ ${fmt(stats.passoireCount)} logements concernés (F+G)`}
            </p>
          </div>
        </div>
        {[
          { cls: "G", color: DPE_BG.G, date: "Depuis janvier 2025", badge: "En vigueur", desc: "Interdiction de mise en location ou de renouvellement de bail. Les propriétaires de logements G ne peuvent pas signer de nouveau bail ni reconduire un bail existant." },
          { cls: "F", color: DPE_BG.F, date: "À partir de janvier 2028", badge: "Dans ~2 ans", desc: "Interdiction prochaine — les propriétaires bailleurs de logements F disposent de moins de 2 ans pour engager une rénovation énergétique." },
          { cls: "E", color: DPE_BG.E, date: "À partir de janvier 2034", badge: "Dans ~8 ans", desc: "Échéance à anticiper. Les travaux de rénovation peuvent prendre 2 à 3 ans entre les démarches et la réalisation." },
        ].map(({ cls, color, date, badge, desc }) => (
          <div key={cls} className="flex gap-3 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.6)" }}>
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: color, color: "white" }}>
              {cls}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-sm font-semibold" style={{ color: "hsl(220 25% 10%)" }}>{date}</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: color + "33", color }}>
                  {badge}
                </span>
              </div>
              <p className="text-xs" style={{ color: "hsl(220 10% 46%)" }}>{desc}</p>
            </div>
          </div>
        ))}
        <p className="text-[10px]" style={{ color: "hsl(220 10% 46%)" }}>
          ⚠️ Ces informations sont fournies à titre indicatif uniquement. Elles ne constituent pas un conseil juridique. Consultez un notaire ou un avocat spécialisé pour toute décision relative à la location ou la vente de votre bien.
        </p>
      </div>

      {/* CTA */}
      <CTABlock deptName={department.name} postcode={postcode} />

      {/* Climate zone */}
      <Section>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
            style={{ background: "hsl(215 90% 42%)", color: "white" }}>
            {department.zone}
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "hsl(220 25% 10%)" }}>{zone.label}</h2>
            <p className="text-sm mt-0.5" style={{ color: "hsl(220 10% 46%)" }}>{zone.desc}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "hsl(220 15% 90%)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "hsl(220 10% 46%)" }}>
            Priorité de rénovation dans cette zone
          </p>
          <p className="text-sm" style={{ color: "hsl(220 25% 10%)" }}>{zone.priority}</p>
        </div>
      </Section>

      {/* RGE */}
      <Section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: "hsl(220 25% 10%)" }}>
          Artisans RGE en {department.name}
        </h2>
        <p className="text-sm mb-4" style={{ color: "hsl(220 10% 46%)" }}>
          {stats.rgeCount > 0
            ? `${fmt(stats.rgeCount)} entreprises certifiées RGE sont référencées dans le département ${department.num} par l'ADEME. La certification RGE (Reconnu Garant de l'Environnement) est obligatoire pour bénéficier des aides MaPrimeRénov' et de l'éco-PTZ.`
            : `La certification RGE est obligatoire pour accéder aux aides de rénovation énergétique dans le département ${department.num}.`}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {["Isolation thermique", "Chauffage / PAC", "VMC double flux", "Fenêtres & menuiseries"].map((work) => (
            <div key={work} className="rounded-lg px-3 py-2.5 text-center text-xs font-medium border"
              style={{ borderColor: "hsl(220 15% 90%)", color: "hsl(220 25% 10%)", background: "hsl(220 20% 97%)" }}>
              {work}
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-3" style={{ color: "hsl(220 10% 46%)" }}>
          Source : annuaire RGE ADEME · données mises à jour régulièrement · certifications incluant RGE QualiPAC, Qualibat, Qualigaz, etc.
        </p>
      </Section>

      {/* Aides */}
      <Section>
        <h2 className="text-lg font-semibold mb-1" style={{ color: "hsl(220 25% 10%)" }}>
          Aides à la rénovation énergétique — {department.name} 2026
        </h2>
        <p className="text-sm mb-4" style={{ color: "hsl(220 10% 46%)" }}>
          Les aides nationales sont identiques sur tout le territoire. Certaines régions et collectivités proposent des compléments locaux.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { title: "MaPrimeRénov'", amount: "Jusqu'à 70%", desc: "du coût des travaux selon les revenus. Réservé aux artisans RGE certifiés. Cumulable avec les CEE." },
            { title: "CEE", amount: "Variable", desc: "Certificats d'économie d'énergie financés par les fournisseurs d'énergie. Cumulables avec MaPrimeRénov'." },
            { title: "Éco-PTZ", amount: "50 000 €", desc: "Prêt à taux zéro sans conditions de revenus pour financer le reste à charge des travaux." },
          ].map(({ title, amount, desc }) => (
            <div key={title} className="rounded-xl border p-4 space-y-2 bg-white" style={{ borderColor: "hsl(220 15% 90%)" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "hsl(220 25% 10%)" }}>{title}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "hsl(160 70% 92%)", color: "hsl(160 70% 28%)" }}>
                  {amount}
                </span>
              </div>
              <p className="text-xs" style={{ color: "hsl(220 10% 46%)" }}>{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px]" style={{ color: "hsl(220 10% 46%)" }}>
          ⚠️ Les montants des aides varient selon les revenus, la nature des travaux et la composition du foyer. Ces informations sont indicatives et ne constituent pas un conseil financier. Consultez un conseiller FAIRE (France Rénov&apos;) pour une évaluation personnalisée et gratuite.
        </p>
      </Section>

      {/* Second CTA */}
      <CTABlock deptName={department.name} postcode={postcode} />

      {/* Legal disclaimer */}
      <div className="rounded-xl border p-5 space-y-2" style={{ borderColor: "hsl(220 15% 90%)", background: "hsl(220 20% 97%)" }}>
        <p className="text-xs font-semibold" style={{ color: "hsl(220 25% 10%)" }}>Avertissement</p>
        <p className="text-xs leading-relaxed" style={{ color: "hsl(220 10% 46%)" }}>
          Les informations présentées sur cette page sont fournies à titre informatif uniquement, sur la base des données officielles de l&apos;ADEME (Agence de la transition écologique) publiées sous Licence Ouverte Etalab. Elles ne constituent pas un conseil juridique, fiscal ou financier et ne sauraient engager la responsabilité de dpeinfo.com. Les statistiques de consommation et de classement DPE sont issues de la base de données des diagnostics réalisés (principalement post-juillet 2021) et peuvent ne pas refléter l&apos;intégralité du parc immobilier du département. Pour toute décision relative à la location, la vente, ou la rénovation d&apos;un bien immobilier, consultez un professionnel qualifié : notaire, diagnostiqueur certifié, ou conseiller France Rénov&apos; (service public gratuit, 0 808 800 700).
        </p>
        <p className="text-[10px]" style={{ color: "hsl(220 10% 60%)" }}>
          Données : ADEME · Licence Ouverte v2.0 (Etalab) · dpeinfo.com · {department.name} ({department.num})
        </p>
      </div>

    </main>
  );
}

function TrustBadge({ children, color, border }: { children: React.ReactNode; color: string; border: string }) {
  return (
    <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full border font-medium"
      style={{ color, borderColor: border, background: color + "11" }}>
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

function StatCard({ label, value, sub, highlight = false, urgencyColor, urgencyBg, urgencyBorder }: {
  label: string; value: string; sub: string;
  highlight?: boolean; urgencyColor?: string; urgencyBg?: string; urgencyBorder?: string;
}) {
  return (
    <div className="rounded-xl border p-4 space-y-1" style={{
      background: highlight && urgencyBg ? urgencyBg : "white",
      borderColor: highlight && urgencyBorder ? urgencyBorder : "hsl(220 15% 90%)",
    }}>
      <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "hsl(220 10% 46%)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: highlight && urgencyColor ? urgencyColor : "hsl(220 25% 10%)" }}>
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
          Importez votre PDF DPE pour une analyse sur mesure ou faites une demande gratuite basée sur les données publiques.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 space-y-1">
          <a href={`https://www.dpeinfo.com/devis?track=b&postcode=${postcode}`}
            className="flex items-center justify-center w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors bg-white hover:bg-gray-50"
            style={{ borderColor: "hsl(220 15% 90%)", color: "hsl(220 25% 10%)" }}>
            Demande gratuite
          </a>
          <p className="text-[10px] text-center" style={{ color: "hsl(220 10% 46%)" }}>Basé sur les données publiques</p>
        </div>
        <div className="flex-1 space-y-1">
          <a href="https://www.dpeinfo.com/devis?track=a"
            className="flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "hsl(215 90% 42%)" }}>
            Analyser mon PDF DPE — 9,90 €
          </a>
          <p className="text-[10px] text-center" style={{ color: "hsl(220 10% 46%)" }}>
            R-values réels · facture précise · brief artisan
          </p>
        </div>
      </div>
      <p className="text-[10px]" style={{ color: "hsl(220 10% 46%)" }}>
        Jusqu&apos;à 3 artisans certifiés RGE vous contactent sous 48h. Sans engagement.
      </p>
    </div>
  );
}
