import { DEPARTMENTS } from "./departments";

export interface Commune {
  code: string;       // INSEE code e.g. "33063"
  name: string;       // "Bordeaux"
  slug: string;       // "bordeaux"
  dept: string;       // "33"
  deptSlug: string;   // "gironde"
  deptName: string;   // "Gironde"
  postcode: string;   // "33000"
  population: number;
}

export interface CommuneStats {
  total: number;
  byClass: Record<string, number>; // percentage per class A-G
  passoirePct: number;
  avgConsumption: number | null;
  isFallback: boolean; // true = using dept-level stats (commune too small)
}

export interface CommuneContractor {
  siret: string;
  name: string;
  domaines: string[];
  organisme: string;
  commune: string;
  postcode: string;
}

export interface CommuneContent {
  commune: Commune;
  stats: CommuneStats;
  contractors: CommuneContractor[];
  prose: string;
  generatedAt: string;
}

const deptByNum = Object.fromEntries(DEPARTMENTS.map((d) => [d.num, d]));

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildCommune(raw: {
  code: string;
  nom: string;
  codeDepartement: string;
  codesPostaux: string[];
  population: number;
}): Commune | null {
  const dept = deptByNum[raw.codeDepartement.padStart(2, "0")]
    ?? deptByNum[raw.codeDepartement]; // handles 2A, 2B
  if (!dept) return null;
  return {
    code: raw.code,
    name: raw.nom,
    slug: slugify(raw.nom),
    dept: dept.num,
    deptSlug: dept.slug,
    deptName: dept.name,
    postcode: raw.codesPostaux[0] ?? "",
    population: raw.population,
  };
}
