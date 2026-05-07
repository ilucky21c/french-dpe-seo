export interface DeptStats {
  total: number;
  byClass: Record<string, number>;
  avgConsumption: number | null;
  passoireCount: number;
  passoirePct: number;
  rgeCount: number;
}

const DPE_API = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines";
const RGE_API = "https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines";

// Corse dept numbers map to postcode prefix "20"
function postcodePrefix(deptNum: string): string {
  if (deptNum === "2A" || deptNum === "2B") return "20";
  return deptNum.padStart(2, "0");
}

export async function fetchDeptStats(deptNum: string): Promise<DeptStats> {
  const prefix = postcodePrefix(deptNum);

  const byClass: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
  let total = 0;
  let consumptionSum = 0;
  let consumptionCount = 0;

  try {
    // Use qs= for prefix match on code_postal — avoids false matches from text search
    const params = new URLSearchParams({
      size: "1000",
      select: "classe_energie,consommation_energie",
      qs: `code_postal:${prefix}*`,
    });

    const res = await fetch(`${DPE_API}?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 604800 },
    });

    if (res.ok) {
      const data = await res.json();
      // Use total from API for accurate count, sample for distribution
      total = data.total ?? 0;
      for (const row of data.results ?? []) {
        const cls = row.classe_energie as string;
        if (cls && byClass[cls] !== undefined) byClass[cls]++;
        const c = Number(row.consommation_energie);
        if (c > 0 && c < 2000) { consumptionSum += c; consumptionCount++; }
      }
      // Scale byClass counts to reflect total (sample-based percentages, actual total)
      const sampleTotal = Object.values(byClass).reduce((a, b) => a + b, 0);
      if (sampleTotal > 0 && total > sampleTotal) {
        const factor = total / sampleTotal;
        for (const k of Object.keys(byClass)) byClass[k] = Math.round(byClass[k] * factor);
      }
    }
  } catch {
    // Return zeros on failure — page still renders with graceful fallback
  }

  const passoireCount = (byClass.F ?? 0) + (byClass.G ?? 0);
  const passoirePct = total > 0 ? Math.round((passoireCount / total) * 100) : 0;
  const avgConsumption = consumptionCount > 0 ? Math.round(consumptionSum / consumptionCount) : null;

  // Fetch RGE count
  let rgeCount = 0;
  try {
    const rgeParams = new URLSearchParams({
      size: "1",
      qs: `code_postal:${prefix}*`,
    });
    const rgeRes = await fetch(`${RGE_API}?${rgeParams}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 604800 },
    });
    if (rgeRes.ok) {
      const rgeData = await rgeRes.json();
      rgeCount = rgeData.total ?? 0;
    }
  } catch { /* ignore */ }

  return { total, byClass, avgConsumption, passoireCount, passoirePct, rgeCount };
}
