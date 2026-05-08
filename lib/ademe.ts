export interface DeptStats {
  total: number;
  byClass: Record<string, number>;
  byGes: Record<string, number>;
  buildingTypes: { maison: number; appartement: number; autre: number };
  avgConsumption: number | null;
  passoireCount: number;    // F + G
  passoirePct: number;      // % of classified (excl. N)
  rgeCount: number;
}

const BASE = "https://data.ademe.fr/data-fair/api/v1/datasets";
const DPE_DATASET = "dpe-france";
const RGE_DATASET = "liste-des-entreprises-rge-2";

// Some departments use a non-numeric code in the ADEME tv016_departement_code field
// Corse uses "2A"/"2B"; all others use the numeric string as-is
function deptApiCode(num: string): string {
  return num; // "33", "75", "2A", "2B" — all work as-is in Elasticsearch qs
}

// Postcode prefix for RGE dataset (still filters by postcode)
function postcodePrefix(num: string): string {
  if (num === "2A" || num === "2B") return "20";
  return num.padStart(2, "0");
}

async function valuesAgg(dataset: string, field: string, filter: string, size = 12): Promise<Array<{ value: string; total: number }>> {
  const url = `${BASE}/${dataset}/values_agg?field=${field}&qs=${encodeURIComponent(filter)}&agg_size=${size}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 604800 } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.aggs ?? []).map((a: any) => ({ value: String(a.value), total: Number(a.total) }));
}

async function metricAgg(dataset: string, field: string, metric: string, filter: string): Promise<number | null> {
  const url = `${BASE}/${dataset}/metric_agg?field=${field}&metric_field=${field}&metric=${metric}&qs=${encodeURIComponent(filter)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 604800 } });
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data.metric === "number" ? Math.round(data.metric) : null;
}

async function totalCount(dataset: string, filter: string): Promise<number> {
  const url = `${BASE}/${dataset}/lines?size=0&qs=${encodeURIComponent(filter)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 604800 } });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.total ?? 0;
}

export async function fetchDeptStats(deptNum: string): Promise<DeptStats> {
  const apiCode = deptApiCode(deptNum);
  const prefix = postcodePrefix(deptNum);
  const deptFilter = `tv016_departement_code:${apiCode}`;
  const rgeFilter = `code_postal:${prefix}*`;

  const byClass: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
  const byGes: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
  const buildingTypes = { maison: 0, appartement: 0, autre: 0 };
  let total = 0;
  let avgConsumption: number | null = null;
  let rgeCount = 0;

  try {
    // DPE class distribution — full dataset, no sampling
    const classAggs = await valuesAgg(DPE_DATASET, "classe_consommation_energie", deptFilter);
    for (const { value, total: count } of classAggs) {
      if (byClass[value] !== undefined) { byClass[value] = count; total += count; }
    }

    // GES class distribution
    const gesAggs = await valuesAgg(DPE_DATASET, "classe_estimation_ges", deptFilter);
    for (const { value, total: count } of gesAggs) {
      if (byGes[value] !== undefined) byGes[value] = count;
    }

    // Average energy consumption (kWh/m²/an)
    avgConsumption = await metricAgg(DPE_DATASET, "consommation_energie", "avg", deptFilter);

    // Building type breakdown
    const typeAggs = await valuesAgg(DPE_DATASET, "tr002_type_batiment_description", deptFilter, 10);
    for (const { value, total: count } of typeAggs) {
      const v = value.toLowerCase();
      if (v.includes("maison")) buildingTypes.maison += count;
      else if (v.includes("logement") || v.includes("collectif") || v.includes("appartement")) buildingTypes.appartement += count;
      else buildingTypes.autre += count;
    }
  } catch { /* silent fallback — page renders with zeros */ }

  // RGE contractor count (separate dataset, uses postcode prefix)
  try {
    rgeCount = await totalCount(RGE_DATASET, rgeFilter);
  } catch { /* ignore */ }

  const passoireCount = (byClass.F ?? 0) + (byClass.G ?? 0);
  const passoirePct = total > 0 ? Math.round((passoireCount / total) * 100) : 0;

  return { total, byClass, byGes, buildingTypes, avgConsumption, passoireCount, passoirePct, rgeCount };
}
