"use client";

import { useState } from "react";
import type { CommuneContractor } from "@/lib/communes";

const MAX = 3;

export function ContractorSection({
  contractors,
  communeName,
}: {
  contractors: CommuneContractor[];
  communeName: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (siret: string) => {
    setSelected((prev) => {
      if (prev.includes(siret)) return prev.filter((s) => s !== siret);
      if (prev.length >= MAX) return prev;
      return [...prev, siret];
    });
  };

  const siretParam = selected
    .map((siret) => {
      const c = contractors.find((x) => x.siret === siret)!;
      return `${siret}|${encodeURIComponent(c.name)}|`;
    })
    .join(",");

  const devisUrl =
    selected.length > 0
      ? `https://www.dpeinfo.com/devis?sirets=${siretParam}`
      : "https://www.dpeinfo.com/devis?track=b";

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: "hsl(220 25% 10%)" }}>
          Artisans RGE certifiés à {communeName}
        </h2>
        <p className="text-xs mt-1" style={{ color: "hsl(220 10% 46%)" }}>
          Sélectionnez jusqu'à {MAX} artisans puis demandez vos devis en une seule étape.
          Vos coordonnées ne sont pas partagées avant votre confirmation.
        </p>
      </div>

      <div className="grid gap-3">
        {contractors.map((c, idx) => {
          const isSelected = selected.includes(c.siret);
          const rank = selected.indexOf(c.siret) + 1;
          return (
            <button
              key={c.siret}
              onClick={() => toggle(c.siret)}
              className="text-left rounded-xl border p-4 flex items-start gap-4 transition-all hover:shadow-sm"
              style={{
                borderColor: isSelected ? "hsl(215 90% 42%)" : "hsl(220 15% 90%)",
                borderWidth: isSelected ? 2 : 1,
                background: isSelected ? "hsl(215 90% 98%)" : "white",
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: isSelected ? "hsl(215 90% 42%)" : "hsl(220 15% 93%)",
                  color: isSelected ? "white" : "hsl(220 10% 46%)",
                }}
              >
                {isSelected ? rank : idx + 1}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold truncate" style={{ color: "hsl(220 25% 10%)" }}>
                  {c.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {c.domaines.map((d) => (
                    <span
                      key={d}
                      className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                      style={{ borderColor: "hsl(220 15% 88%)", color: "hsl(220 10% 46%)" }}
                    >
                      {d}
                    </span>
                  ))}
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "hsl(160 60% 94%)", color: "hsl(160 70% 30%)" }}
                  >
                    RGE certifié
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: "hsl(220 10% 55%)" }}>
                  {c.commune} · {c.organisme}
                </p>
              </div>

              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  borderColor: isSelected ? "hsl(215 90% 42%)" : "hsl(220 15% 80%)",
                  background: isSelected ? "hsl(215 90% 42%)" : "transparent",
                }}
              >
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4l3 3 5-6"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <a
          href={devisUrl}
          className="flex-1 flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "hsl(215 90% 42%)" }}
        >
          {selected.length > 0
            ? `Demander des devis aux ${selected.length} artisan${selected.length > 1 ? "s" : ""} sélectionné${selected.length > 1 ? "s" : ""}`
            : "Demander des devis dans ma zone"}
        </a>
      </div>

      {selected.length > 0 && (
        <p className="text-[10px]" style={{ color: "hsl(220 10% 55%)" }}>
          Vos coordonnées resteront confidentielles jusqu'à votre confirmation. Vérification email requise.
        </p>
      )}
    </section>
  );
}
