/**
 * Fetches ADEME stats + RGE contractors + AI prose for all French communes
 * with population >= 5000. Saves incrementally to lib/commune-content.json.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-... node scripts/fetch-commune-data.mjs
 *
 * Safe to interrupt and resume — skips already-generated slugs.
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = join(__dir, "../lib/commune-content.json");
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const ADEME_BASE = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe-france";
const RGE_BASE = "https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines";
const GEO_API = "https://geo.api.gouv.fr/communes?fields=code,nom,codeDepartement,codesPostaux,population&format=json&type=commune-actuelle";
const MIN_POP = 5000;
const MIN_RECORDS = 30; // below this, fall back to dept-level stats
const DELAY_MS = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(str) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function fetchJSON(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function fetchCommunes() {
  const data = await fetchJSON(GEO_API);
  return data.filter((c) => (c.population ?? 0) >= MIN_POP);
}

async function fetchCommuneStats(inseeCode, deptCode) {
  const filter = `code_insee_commune_actualise:"${inseeCode}"`;
  const deptFilter = `tv016_departement_code:"${deptCode}"`;

  // Total count at commune level
  const countData = await fetchJSON(
    `${ADEME_BASE}/lines?size=0&qs=${encodeURIComponent(filter)}`
  );
  const total = countData.total ?? 0;

  if (total < MIN_RECORDS) {
    return null; // caller will use dept fallback
  }

  // Class distribution
  const classData = await fetchJSON(
    `${ADEME_BASE}/values_agg?field=classe_consommation_energie&agg_size=10&qs=${encodeURIComponent(filter)}`
  );
  const classCounts = Object.fromEntries(
    (classData.aggs ?? []).map((a) => [a.value, a.count])
  );
  const classTotal = Object.values(classCounts).reduce((s, n) => s + n, 0);
  const byClass = {};
  for (const cls of ["A", "B", "C", "D", "E", "F", "G"]) {
    byClass[cls] = classTotal > 0
      ? Math.round(((classCounts[cls] ?? 0) / classTotal) * 1000) / 10
      : 0;
  }

  const passoirePct = (byClass["F"] ?? 0) + (byClass["G"] ?? 0);

  // Avg consumption
  let avgConsumption = null;
  try {
    const avgData = await fetchJSON(
      `${ADEME_BASE}/metric_agg?field=classe_consommation_energie&metric_field=consommation_energie&metric=avg&qs=${encodeURIComponent(filter)}`
    );
    avgConsumption = avgData.metric?.value
      ? Math.round(avgData.metric.value)
      : null;
  } catch {}

  return { total, byClass, passoirePct, avgConsumption, isFallback: false };
}

async function fetchDeptStats(deptCode) {
  const filter = `tv016_departement_code:"${deptCode}"`;

  const countData = await fetchJSON(`${ADEME_BASE}/lines?size=0&qs=${encodeURIComponent(filter)}`);
  const total = countData.total ?? 0;

  const classData = await fetchJSON(
    `${ADEME_BASE}/values_agg?field=classe_consommation_energie&agg_size=10&qs=${encodeURIComponent(filter)}`
  );
  const classCounts = Object.fromEntries((classData.aggs ?? []).map((a) => [a.value, a.count]));
  const classTotal = Object.values(classCounts).reduce((s, n) => s + n, 0);
  const byClass = {};
  for (const cls of ["A", "B", "C", "D", "E", "F", "G"]) {
    byClass[cls] = classTotal > 0
      ? Math.round(((classCounts[cls] ?? 0) / classTotal) * 1000) / 10
      : 0;
  }
  const passoirePct = (byClass["F"] ?? 0) + (byClass["G"] ?? 0);

  return { total, byClass, passoirePct, avgConsumption: null, isFallback: true };
}

async function fetchContractors(postcode, communeName) {
  const prefix = postcode.slice(0, 5);
  const params = new URLSearchParams({
    size: "20",
    page: "1",
    q: prefix,
    q_fields: "code_postal",
    qs: "particulier:true",
  });
  try {
    const data = await fetchJSON(`${RGE_BASE}?${params}`);
    const seen = new Set();
    const result = [];
    for (const r of (data.results ?? [])) {
      if (!r.siret) continue;
      if (seen.has(r.siret)) continue;
      // Skip if certification expired
      if (r.lien_date_fin && r.lien_date_fin < new Date().toISOString().slice(0, 10)) continue;
      seen.add(r.siret);
      result.push({
        siret: r.siret,
        name: r.nom_entreprise || r.nom_commercial || "",
        domaines: [r.domaine].filter(Boolean),
        organisme: r.organisme_certificateur || r.organisme || "",
        commune: r.commune || communeName,
        postcode: r.code_postal || prefix,
      });
      if (result.length >= 8) break;
    }
    return result;
  } catch {
    return [];
  }
}

async function generateProse(communeName, deptName, stats) {
  if (!OPENROUTER_KEY) return "";
  const urgency = stats.passoirePct >= 20 ? "élevée" : stats.passoirePct >= 12 ? "modérée" : "faible";
  const prompt = `Tu es un expert en rénovation énergétique. Rédige 2 paragraphes (max 120 mots total) sur la situation DPE à ${communeName} (${deptName}).
Données réelles : ${stats.total.toLocaleString("fr-FR")} DPEs, ${stats.passoirePct.toFixed(1)}% de passoires (F+G), urgence ${urgency}${stats.avgConsumption ? `, consommation moyenne ${stats.avgConsumption} kWh/m²/an` : ""}.
Ton factuel, utile, jamais alarmiste. Varie le style selon l'urgence. Pas de titre, pas de listes. Texte brut uniquement.`;

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });
    if (!r.ok) return "";
    const data = await r.json();
    return (data.choices?.[0]?.message?.content || "").trim();
  } catch {
    return "";
  }
}

async function main() {
  console.log("Fetching commune list from geo API...");
  const rawCommunes = await fetchCommunes();
  console.log(`Found ${rawCommunes.length} communes with pop >= ${MIN_POP}`);

  const content = JSON.parse(readFileSync(CONTENT_PATH, "utf8"));
  let saved = 0;
  let skipped = 0;

  for (const raw of rawCommunes) {
    const slug = slugify(raw.nom);
    if (content[slug]) {
      skipped++;
      continue;
    }

    const deptCode = raw.codeDepartement.padStart(2, "0");
    const postcode = raw.codesPostaux?.[0] ?? "";

    process.stdout.write(`[${saved + skipped + 1}/${rawCommunes.length}] ${raw.nom}... `);

    try {
      // Stats
      let stats = await fetchCommuneStats(raw.code, deptCode);
      await sleep(DELAY_MS);
      if (!stats) {
        stats = await fetchDeptStats(deptCode);
        await sleep(DELAY_MS);
      }

      // Contractors
      const contractors = postcode ? await fetchContractors(postcode, raw.nom) : [];
      await sleep(DELAY_MS);

      // AI prose
      const prose = await generateProse(raw.nom, raw.codeDepartement, stats);
      await sleep(DELAY_MS);

      const deptNum = deptCode;
      // Find dept slug from departments list - we'll derive it
      const deptSlug = slug; // placeholder; actual mapping done in page via dept code

      content[slug] = {
        commune: {
          code: raw.code,
          name: raw.nom,
          slug,
          dept: deptNum,
          deptSlug: "", // filled by page using dept num
          deptName: raw.codeDepartement,
          postcode,
          population: raw.population,
        },
        stats,
        contractors,
        prose,
        generatedAt: new Date().toISOString().slice(0, 10),
      };

      writeFileSync(CONTENT_PATH, JSON.stringify(content, null, 2));
      saved++;
      console.log(`done (${stats.total} DPEs, ${contractors.length} RGE${stats.isFallback ? " [dept fallback]" : ""})`);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  console.log(`\nDone. Generated: ${saved}, Skipped: ${skipped}`);
}

main().catch(console.error);
