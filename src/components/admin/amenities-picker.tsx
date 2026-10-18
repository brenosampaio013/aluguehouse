"use client";

import { useId, useMemo, useState } from "react";

import { AmenityIcon } from "@/components/amenities/amenity-icon";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  amenityCatalog,
  amenityCategories,
  matchesAmenity,
  type AmenityCategory,
} from "@/lib/amenities";

/**
 * Seleção de comodidades do painel: busca por nome (ou sinônimo), filtro por
 * categoria e "só as marcadas". As marcadas vão no formulário como campos
 * ocultos `amenity` (slugs), então filtrar a lista nunca desmarca nada.
 */
export function AmenitiesPicker({ initial = [] }: { initial?: string[] }) {
  const id = useId();
  const [selected, setSelected] = useState(() => new Set(initial));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AmenityCategory | "">("");
  const [onlySelected, setOnlySelected] = useState(false);

  const groups = useMemo(
    () =>
      amenityCategories
        .filter((c) => !category || c.id === category)
        .map((c) => ({
          ...c,
          total: amenityCatalog.filter((a) => a.category === c.id).length,
          items: amenityCatalog.filter(
            (a) =>
              a.category === c.id &&
              matchesAmenity(a, query) &&
              (!onlySelected || selected.has(a.slug)),
          ),
        }))
        .filter((g) => g.items.length > 0),
    [category, query, onlySelected, selected],
  );

  function toggle(slug: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  const countLabel =
    selected.size === 0
      ? "Nenhuma comodidade marcada"
      : `${selected.size} ${selected.size === 1 ? "comodidade marcada" : "comodidades marcadas"}`;

  return (
    <div className="grid gap-5">
      {[...selected].map((slug) => (
        <input key={slug} type="hidden" name="amenity" value={slug} />
      ))}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] sm:items-end">
        <div className="grid gap-1.5">
          <label htmlFor={`${id}-busca`} className="text-small font-semibold">
            Buscar comodidade
          </label>
          <input
            id={`${id}-busca`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: piscina, berço, garagem"
            className="min-h-11 w-full rounded-control border border-junco bg-branco px-3 text-body text-abismo"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={`${id}-categoria`} className="text-small font-semibold">
            Categoria
          </label>
          <select
            id={`${id}-categoria`}
            value={category}
            onChange={(event) => setCategory(event.target.value as AmenityCategory | "")}
            className="min-h-11 w-full rounded-control border border-junco bg-branco px-3 text-body text-abismo"
          >
            <option value="">Todas as categorias</option>
            {amenityCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small font-semibold text-abismo" role="status">
          {countLabel}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex min-h-11 items-center gap-2 text-small">
            <input
              type="checkbox"
              checked={onlySelected}
              onChange={(event) => setOnlySelected(event.target.checked)}
              className="size-5 accent-petroleo"
            />
            Mostrar só as marcadas
          </label>
          {selected.size > 0 ? (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="min-h-11 text-small font-semibold text-petroleo underline underline-offset-3"
            >
              Desmarcar todas
            </button>
          ) : null}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-small text-rocha">Nenhuma comodidade encontrada com esse filtro.</p>
      ) : (
        groups.map((group) => {
          const chosen = amenityCatalog.filter(
            (a) => a.category === group.id && selected.has(a.slug),
          ).length;
          return (
            <fieldset key={group.id} className="grid gap-3">
              <legend className="mb-2 flex w-full items-baseline justify-between gap-3 font-semibold">
                <span>{group.label}</span>
                <span className="text-small font-normal text-rocha">
                  {chosen} de {group.total}
                </span>
              </legend>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((amenity) => {
                  const checked = selected.has(amenity.slug);
                  return (
                    <label
                      key={amenity.slug}
                      className={cn(
                        "relative flex min-h-12 cursor-pointer items-center gap-3 rounded-control border px-3 py-2 transition-colors",
                        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo",
                        checked
                          ? "border-petroleo bg-nevoa font-semibold text-abismo"
                          : "border-areia bg-branco text-abismo hover:border-junco",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => toggle(amenity.slug, event.target.checked)}
                        className="absolute inset-0 size-full cursor-pointer opacity-0"
                      />
                      <AmenityIcon
                        name={amenity.slug}
                        size={22}
                        className="shrink-0 text-petroleo"
                      />
                      <span className="min-w-0 flex-1 text-small leading-snug">
                        {amenity.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full border",
                          checked ? "border-petroleo bg-petroleo text-branco" : "border-junco",
                        )}
                      >
                        {checked ? <CheckIcon width={12} height={12} strokeWidth={3} /> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })
      )}
    </div>
  );
}
