"use client";

import { useId, useState } from "react";

import { destinationGroups } from "@/lib/destinations";

/**
 * Destino da busca (região, cidade ou bairro), agrupado por região. Se a
 * busca veio de "Pesquisar nesta área", a área segue junto com os filtros até
 * a pessoa escolher outro destino.
 */
export function DestinationSelect({ defaultValue, area }: { defaultValue: string; area?: string }) {
  const id = useId();
  const [keepArea, setKeepArea] = useState(Boolean(area));

  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="text-small font-semibold">
        Destino
      </label>
      <select
        id={id}
        name="destino"
        defaultValue={area ? "" : defaultValue}
        onChange={() => setKeepArea(false)}
        className="min-h-11 w-full min-w-0 rounded-control border border-junco bg-branco px-3 text-body text-abismo"
      >
        <option value="">{area ? "Área do mapa" : "Todos os destinos"}</option>
        {destinationGroups().map(({ region, options }) => (
          <optgroup key={region.slug} label={region.name}>
            {options.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.kind === "region" ? `${d.name} (toda a região)` : d.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {area && keepArea ? <input type="hidden" name="area" value={area} /> : null}
    </div>
  );
}
