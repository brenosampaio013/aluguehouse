"use client";

import { useState } from "react";

import { AreaMap, type MapArea } from "@/components/map/area-map";
import { cn } from "@/lib/cn";

/**
 * Lista de resultados com mapa: lado a lado no desktop; no celular, um
 * botão alterna entre lista e mapa (aprovado na Etapa 2).
 */
export function ResultsWithMap({
  areas,
  children,
}: {
  areas: MapArea[];
  children: React.ReactNode;
}) {
  const [showMap, setShowMap] = useState(false);
  if (areas.length === 0) return <>{children}</>;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,38%)] lg:items-start">
      <div className={cn("min-w-0", showMap && "max-lg:hidden")}>{children}</div>
      <div className={cn("lg:sticky lg:top-6", !showMap && "max-lg:hidden")}>
        <AreaMap
          areas={areas}
          label="Mapa com a área aproximada dos imóveis encontrados"
          className="h-[70vh] lg:h-[calc(100vh-3rem)]"
        />
      </div>
      <button
        type="button"
        aria-pressed={showMap}
        onClick={() => setShowMap((value) => !value)}
        className="fixed bottom-20 left-1/2 z-10 inline-flex min-h-11 -translate-x-1/2 items-center rounded-full bg-abismo px-5 font-semibold text-branco shadow-flutuante lg:hidden"
      >
        {showMap ? "Ver lista" : "Ver mapa"}
      </button>
    </div>
  );
}
