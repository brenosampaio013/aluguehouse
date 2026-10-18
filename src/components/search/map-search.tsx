"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { PriceMap } from "@/components/map/price-map";
import { cn } from "@/lib/cn";
import type { MapView } from "@/lib/destinations";
import { rentalHref, type MapArea, type RentalFilters } from "@/lib/search/params";
import type { RentalMarker } from "@/server/queries/search";

type Selection = {
  selectedId: string | null;
  hoveredId: string | null;
  hasMarker: (id: string) => boolean;
  hover: (id: string | null) => void;
  /** "Ver no mapa": seleciona, centraliza e, no celular, abre o mapa. */
  showOnMap: (id: string) => void;
};

const SelectionContext = createContext<Selection | null>(null);

function useSelection() {
  const value = useContext(SelectionContext);
  if (!value) throw new Error("useSelection fora de MapSearch");
  return value;
}

/**
 * Busca com lista e mapa: no computador, lista à esquerda e mapa fixo à
 * direita (metade da tela cada); no celular, "Lista" e "Mapa" se alternam.
 * Lista e mapa compartilham o imóvel selecionado e o que está sob o cursor.
 */
export function MapSearch({
  markers,
  filters,
  fallbackView,
  staySuffix,
  supabaseUrl,
  children,
}: {
  markers: RentalMarker[];
  filters: RentalFilters;
  fallbackView?: MapView;
  /** Datas e hóspedes repassados à página do imóvel. */
  staySuffix: string;
  supabaseUrl: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [searching, startSearch] = useTransition();
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // No celular, ao trocar de modo, leva a tela para o início do que aparece.
  const changeView = useCallback((next: "lista" | "mapa") => {
    setView(next);
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    requestAnimationFrame(() => {
      const target = next === "mapa" ? mapBoxRef.current : listRef.current;
      target?.scrollIntoView({ block: "start" });
    });
  }, []);

  const markerIds = useMemo(() => new Set(markers.map((m) => m.id)), [markers]);

  const showOnMap = useCallback(
    (id: string) => {
      setSelectedId(id);
      changeView("mapa");
      setFocus((current) => ({ id, nonce: (current?.nonce ?? 0) + 1 }));
    },
    [changeView],
  );

  const selection = useMemo<Selection>(
    () => ({
      selectedId,
      hoveredId,
      hasMarker: (id) => markerIds.has(id),
      hover: setHoveredId,
      showOnMap,
    }),
    [selectedId, hoveredId, markerIds, showOnMap],
  );

  function searchArea(area: MapArea) {
    setSelectedId(null);
    // A área substitui o destino; os demais filtros continuam.
    const href = rentalHref(pathname, filters, {
      area,
      regiao: undefined,
      destino: undefined,
      pagina: 1,
    });
    startSearch(() => router.push(href, { scroll: false }));
  }

  return (
    <SelectionContext value={selection}>
      <div className="lg:grid lg:grid-cols-2 lg:items-start">
        <div
          ref={listRef}
          className={cn(
            "min-w-0 scroll-mt-4 px-4 pb-24 sm:px-6 lg:px-8 lg:pb-12",
            view === "mapa" && "max-lg:hidden",
            searching && "opacity-60 transition-opacity",
          )}
          aria-busy={searching || undefined}
        >
          {children}
        </div>

        <div
          ref={mapBoxRef}
          className={cn(
            "h-[calc(100dvh-9rem)] scroll-mt-3 max-lg:mx-4 max-lg:overflow-hidden max-lg:rounded-photo sm:max-lg:mx-6 lg:sticky lg:top-0 lg:h-dvh",
            view === "lista" && "max-lg:hidden",
          )}
        >
          <PriceMap
            markers={markers}
            selectedId={selectedId}
            hoveredId={hoveredId}
            focus={focus}
            onSelect={setSelectedId}
            onHover={setHoveredId}
            area={filters.area}
            fallbackView={fallbackView}
            onSearchArea={searchArea}
            searching={searching}
            detailHref={(slug) => `/imoveis/${slug}${staySuffix}`}
            supabaseUrl={supabaseUrl}
            className="size-full"
          />
        </div>
      </div>

      {/* Celular: alterna entre lista e mapa, acima da barra de navegação. */}
      <div
        role="group"
        aria-label="Ver resultados como"
        className="fixed bottom-20 left-1/2 z-20 inline-flex -translate-x-1/2 rounded-full bg-abismo p-1 shadow-flutuante lg:hidden"
      >
        {(["lista", "mapa"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => changeView(option)}
            className={cn(
              "inline-flex min-h-11 min-w-20 items-center justify-center rounded-full px-4 font-semibold transition-colors",
              view === option ? "bg-branco text-abismo" : "text-branco",
            )}
          >
            {option === "lista" ? "Lista" : "Mapa"}
          </button>
        ))}
      </div>
    </SelectionContext>
  );
}

/**
 * Item da lista ligado ao mapa: passar o cursor (ou o foco) destaca o
 * marcador; "Ver no mapa" seleciona e centraliza.
 */
export function MapResultItem({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const { selectedId, hover, hasMarker, showOnMap } = useSelection();
  const onMap = hasMarker(id);
  const selected = selectedId === id;

  return (
    <li
      data-result-id={id}
      data-selected={selected || undefined}
      onMouseEnter={() => hover(id)}
      onMouseLeave={() => hover(null)}
      onFocus={() => hover(id)}
      onBlur={() => hover(null)}
      className={cn(
        "grid content-start gap-2 rounded-photo transition-shadow",
        selected && "ring-2 ring-petroleo ring-offset-4 ring-offset-marfim",
      )}
    >
      {children}
      {onMap ? (
        <button
          type="button"
          onClick={() => showOnMap(id)}
          aria-label={`Ver no mapa: ${title}`}
          className="relative z-10 inline-flex min-h-11 w-fit items-center text-small font-semibold text-petroleo underline underline-offset-3"
        >
          Ver no mapa
        </button>
      ) : (
        <p className="py-3 text-small text-rocha">Sem localização no mapa</p>
      )}
    </li>
  );
}
