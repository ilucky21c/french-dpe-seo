const VITE_APP = "https://www.dpeinfo.com";

export function CTABlock({ deptNum, deptName }: { deptNum: string; deptName: string }) {
  const postcode = deptNum.padStart(2, "0") + "000";

  return (
    <div className="rounded-xl border-2 border-[#18181b]/20 bg-gradient-to-br from-[#18181b]/5 to-[#3b82f6]/5 p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-1">
          Obtenez des devis de professionnels RGE en {deptName}
        </p>
        <p className="text-xs text-gray-500">
          Les estimations ci-dessus sont basées sur les données ADEME de votre département.
          Importez votre PDF pour une analyse sur mesure.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {/* Track B — free quote */}
        <div className="flex-1 space-y-1">
          <a
            href={`${VITE_APP}/devis?track=b&postcode=${postcode}`}
            className="flex items-center justify-center w-full gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
          >
            Demande gratuite
          </a>
          <p className="text-[10px] text-gray-400 text-center">Basé sur les données publiques</p>
        </div>

        {/* Track A — AI PDF analysis */}
        <div className="flex-1 space-y-1">
          <a
            href={`${VITE_APP}/devis?track=a`}
            className="flex items-center justify-center w-full gap-2 rounded-md bg-[#18181b] px-4 py-2 text-sm font-medium text-white hover:bg-[#27272a] transition-colors"
          >
            Analyser mon PDF DPE — 9,90 €
          </a>
          <p className="text-[10px] text-gray-400 text-center">
            R-values réels · facture précise · brief artisan
          </p>
        </div>
      </div>

      <p className="text-[10px] text-gray-400">
        Jusqu&apos;à 3 artisans certifiés RGE vous contactent sous 48h.
      </p>
    </div>
  );
}
