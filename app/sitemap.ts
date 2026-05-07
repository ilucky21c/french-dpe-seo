import type { MetadataRoute } from "next";
import { DEPARTMENTS } from "@/lib/departments";

export default function sitemap(): MetadataRoute.Sitemap {
  return DEPARTMENTS.map((d) => ({
    url: `https://www.dpeinfo.com/dpe/${d.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
}
