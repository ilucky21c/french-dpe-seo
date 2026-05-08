/**
 * One-time script: generates AI prose for all 96 department pages via OpenRouter.
 * Output: lib/dept-content.json (committed to repo, read at build time — no API calls during build).
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... node scripts/generate-content.mjs
 *
 * Re-run whenever you want to refresh the content (every few months).
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "../lib/dept-content.json");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY env var");
  process.exit(1);
}

// Load departments
const depts = JSON.parse(readFileSync(join(__dirname, "../lib/departments-data.json"), "utf-8"));

// Load existing output if partial run
const existing = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, "utf-8")) : {};

async function generateForDept(dept, stats) {
  const { num, name, city, region, zone } = dept;
  const { total, passoirePct, passoireCount, avgConsumption, rgeCount } = stats;

  const prompt = `Tu es rédacteur spécialisé en rénovation énergétique en France.
Rédige 3 paragraphes courts (2-3 phrases chacun) en français pour la page web du département ${name} (${num}), région ${region}.

Données réelles ADEME pour ce département :
- ${total.toLocaleString("fr-FR")} logements enregistrés dans la base DPE
- ${passoirePct}% classés F ou G (${passoireCount.toLocaleString("fr-FR")} passoires thermiques)
- Consommation moyenne : ${avgConsumption ?? "non disponible"} kWh/m²/an
- ${rgeCount.toLocaleString("fr-FR")} artisans RGE certifiés
- Zone climatique : ${zone}
- Ville principale : ${city}

Paragraphe 1 — contexte local : décris la situation énergétique du département en utilisant les chiffres réels. Varie le ton selon la réalité (urgence si taux élevé, encourageant si faible).
Paragraphe 2 — impact des interdictions locatives 2025-2028 : relie les chiffres locaux aux échéances réglementaires. Sois précis sur ce que ça signifie concrètement pour les propriétaires de ce département.
Paragraphe 3 — appel à l'action : mentionne les artisans RGE disponibles localement et les aides accessibles. Reste factuel, pas de superlatifs marketing.

Règles :
- Utilise les vrais chiffres fournis
- Ne mentionne pas de villes spécifiques sauf ${city}
- Pas de titres ni de balises HTML
- Chaque paragraphe séparé par une ligne vide
- Ton professionnel et informatif, pas commercial
- Maximum 150 mots au total`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

// Fetch ADEME stats for a department (same logic as lib/ademe.ts)
async function fetchStats(deptNum) {
  const apiCode = deptNum;
  const prefix = (deptNum === "2A" || deptNum === "2B") ? "20" : deptNum.padStart(2, "0");
  const BASE = "https://data.ademe.fr/data-fair/api/v1/datasets";

  const byClass = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
  let total = 0;
  let avgConsumption = null;
  let rgeCount = 0;

  try {
    const classRes = await fetch(
      `${BASE}/dpe-france/values_agg?field=classe_consommation_energie&qs=${encodeURIComponent(`tv016_departement_code:${apiCode}`)}&agg_size=12`,
      { headers: { Accept: "application/json" } }
    );
    if (classRes.ok) {
      const d = await classRes.json();
      for (const a of d.aggs ?? []) {
        if (byClass[a.value] !== undefined) { byClass[a.value] = a.total; total += a.total; }
      }
    }

    const metricRes = await fetch(
      `${BASE}/dpe-france/metric_agg?field=consommation_energie&metric_field=consommation_energie&metric=avg&qs=${encodeURIComponent(`tv016_departement_code:${apiCode}`)}`,
      { headers: { Accept: "application/json" } }
    );
    if (metricRes.ok) {
      const d = await metricRes.json();
      if (typeof d.metric === "number") avgConsumption = Math.round(d.metric);
    }

    const rgeRes = await fetch(
      `${BASE}/liste-des-entreprises-rge-2/lines?size=0&qs=${encodeURIComponent(`code_postal:${prefix}*`)}`,
      { headers: { Accept: "application/json" } }
    );
    if (rgeRes.ok) {
      const d = await rgeRes.json();
      rgeCount = d.total ?? 0;
    }
  } catch (e) {
    console.warn(`  ADEME fetch failed for ${deptNum}:`, e.message);
  }

  const passoireCount = (byClass.F ?? 0) + (byClass.G ?? 0);
  const passoirePct = total > 0 ? Math.round((passoireCount / total) * 100) : 0;
  return { total, passoirePct, passoireCount, avgConsumption, rgeCount };
}

async function main() {
  console.log(`Generating content for ${depts.length} departments...\n`);
  const results = { ...existing };
  let done = 0;

  for (const dept of depts) {
    if (results[dept.slug]) {
      console.log(`  ✓ ${dept.name} (cached)`);
      done++;
      continue;
    }

    process.stdout.write(`  → ${dept.name} (${dept.num})... `);
    try {
      const stats = await fetchStats(dept.num);
      const prose = await generateForDept(dept, stats);
      results[dept.slug] = { prose, generatedAt: new Date().toISOString() };
      done++;
      console.log("done");

      // Save after each dept — safe to interrupt and resume
      writeFileSync(OUTPUT, JSON.stringify(results, null, 2));

      // Rate limit: 2 req/s
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }

  console.log(`\nDone: ${done}/${depts.length} departments. Output: lib/dept-content.json`);
}

main();
