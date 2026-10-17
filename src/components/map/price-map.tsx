"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CloseIcon, HouseIcon, StarIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { COAST_BOUNDS, type MapView } from "@/lib/destinations";
import { formatPrice } from "@/lib/format";
import { mapStyleUrl } from "@/lib/map";
import { publicMediaUrl, variantPath, variantWidths } from "@/lib/media";
import {
  markerAriaLabel,
  markerPriceLabel,
  markersGeoJSON,
  pointsBounds,
  visibleArea,
} from "@/lib/search/map-markers";
import type { MapArea } from "@/lib/search/params";
import type { RentalMarker } from "@/server/queries/search";

type Status = "waiting" | "loading" | "ready" | "error";
type MapLibre = typeof import("maplibre-gl");
type MapInstance = import("maplibre-gl").Map;
type MarkerInstance = import("maplibre-gl").Marker;

const SOURCE = "imoveis";
/** A partir deste zoom, nada é agrupado: cada imóvel tem o próprio preço. */
const CLUSTER_MAX_ZOOM = 14;
/** Zoom ao mostrar um imóvel que está dentro de um grupo (sem aproximar demais). */
const FOCUS_ZOOM = CLUSTER_MAX_ZOOM + 1;
const FIT_PADDING = 64;
const FIT_MAX_ZOOM = 14;

const pillBase =
  "pointer-events-auto inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-small font-bold whitespace-nowrap tabular-nums shadow-[0_2px_8px_rgb(20_43_58/0.25)] transition-[transform,background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petroleo";
const pillIdle = "border-abismo/15 bg-branco text-abismo hover:scale-105";
const pillHover = "scale-110 border-abismo bg-branco text-abismo";
const pillSelected = "scale-110 border-abismo bg-abismo text-branco";

export type PriceMapProps = {
  markers: RentalMarker[];
  selectedId: string | null;
  hoveredId: string | null;
  /** Pedido para centralizar um imóvel (clique em "Ver no mapa" na lista). */
  focus: { id: string; nonce: number } | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  /** Área pesquisada (parâmetro area): o mapa abre nela. */
  area?: MapArea;
  /** Enquadramento do destino, usado só quando não há imóveis com localização. */
  fallbackView?: MapView;
  onSearchArea: (area: MapArea) => void;
  searching: boolean;
  detailHref: (slug: string) => string;
  supabaseUrl: string;
  className?: string;
};

/**
 * Mapa de preços da busca: um marcador com o preço de cada imóvel na
 * localização APROXIMADA (pública) e grupos com a contagem quando há muitos
 * próximos. Clicar no marcador mostra um resumo; mover o mapa oferece
 * "Pesquisar nesta área". O MapLibre só é baixado quando o mapa aparece.
 */
export function PriceMap(props: PriceMapProps) {
  const { markers, selectedId, focus, area, fallbackView, className } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const libRef = useRef<MapLibre | null>(null);
  const pointMarkers = useRef(new Map<string, { marker: MarkerInstance; el: HTMLButtonElement }>());
  const clusterMarkers = useRef(new Map<number, MarkerInstance>());
  // Valores atuais para os eventos do mapa (registrados uma vez só).
  const latest = useRef(props);
  latest.current = props;

  const [status, setStatus] = useState<Status>("waiting");
  const [attempt, setAttempt] = useState(0);
  const [moved, setMoved] = useState(false);
  const [tooWide, setTooWide] = useState(false);

  const markersKey = JSON.stringify(markers.map((m) => [m.id, m.lat, m.lng]));
  const areaKey = area?.join(",") ?? "";
  const viewKey = fallbackView ? JSON.stringify(fallbackView) : "";
  const selected = markers.find((m) => m.id === selectedId) ?? null;

  // Cria o mapa uma vez (ou de novo em "Tentar de novo").
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    async function load() {
      setStatus("loading");
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !container) return;
        libRef.current = maplibre;
        // Worker publicado por scripts/copy-maplibre-worker.mjs.
        maplibre.setWorkerUrl(
          new URL(
            `/vendor/maplibre-gl-${maplibre.getVersion()}/maplibre-gl-worker.mjs`,
            window.location.origin,
          ).href,
        );

        const map = new maplibre.Map({
          container,
          style: mapStyleUrl(),
          bounds: COAST_BOUNDS,
          cooperativeGestures: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          attributionControl: { compact: true },
          locale: {
            "NavigationControl.ZoomIn": "Aproximar",
            "NavigationControl.ZoomOut": "Afastar",
            "Map.Title": "Mapa",
          },
        });
        map.touchZoomRotate.disableRotation();
        map.keyboard.disableRotation();
        mapRef.current = map;
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

        map.on("error", () => {
          if (!cancelled && !map.isStyleLoaded()) setStatus("error");
        });

        // Movimento feito pela pessoa (arrastar, zoom, botões): oferece pesquisar a área.
        map.on("movestart", (event) => {
          if ("originalEvent" in event && event.originalEvent) setMoved(true);
        });
        map.on("moveend", () => {
          const b = map.getBounds();
          setTooWide(
            visibleArea({
              west: b.getWest(),
              south: b.getSouth(),
              east: b.getEast(),
              north: b.getNorth(),
            }) === null,
          );
        });
        map.on("click", (event) => {
          // Clique fora de um marcador fecha o resumo.
          const target = event.originalEvent?.target as HTMLElement | null;
          if (!target?.closest("[data-map-marker]")) latest.current.onSelect(null);
        });

        map.on("load", () => {
          if (cancelled) return;
          map.addSource(SOURCE, {
            type: "geojson",
            data: markersGeoJSON([]),
            cluster: true,
            clusterRadius: 48,
            clusterMaxZoom: CLUSTER_MAX_ZOOM,
          });
          // Camada invisível: mantém a fonte carregada para os marcadores em HTML.
          map.addLayer({
            id: `${SOURCE}-pontos`,
            type: "circle",
            source: SOURCE,
            paint: { "circle-radius": 0, "circle-opacity": 0 },
          });
          map.on("render", () => syncMarkers());
          setStatus("ready");
        });

        resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(container);
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    // Só baixa o mapa quando ele fica visível (no celular, ao tocar em "Mapa").
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void load();
        }
      },
      // No computador o mapa carrega logo; no celular, ao abrir "Mapa" (antes fica oculto).
      { rootMargin: "100% 0px" },
    );
    observer.observe(container);

    const points = pointMarkers.current;
    const clusters = clusterMarkers.current;
    return () => {
      cancelled = true;
      observer.disconnect();
      resizeObserver?.disconnect();
      points.forEach(({ marker }) => marker.remove());
      clusters.forEach((marker) => marker.remove());
      points.clear();
      clusters.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // syncMarkers usa só refs; o mapa é criado de novo apenas em "Tentar de novo".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  /** Cria, atualiza e remove os marcadores em HTML conforme o que está visível. */
  function syncMarkers() {
    const map = mapRef.current;
    const maplibre = libRef.current;
    if (!map || !maplibre || !map.getSource(SOURCE) || !map.isSourceLoaded(SOURCE)) return;

    const byId = new Map(latest.current.markers.map((m) => [m.id, m]));
    const seenPoints = new Set<string>();
    const seenClusters = new Set<number>();

    for (const feature of map.querySourceFeatures(SOURCE)) {
      if (feature.geometry.type !== "Point") continue;
      const coords = feature.geometry.coordinates as [number, number];
      const props = feature.properties ?? {};

      if (props.cluster) {
        const clusterId = Number(props.cluster_id);
        if (seenClusters.has(clusterId)) continue;
        seenClusters.add(clusterId);
        if (!clusterMarkers.current.has(clusterId)) {
          const count = Number(props.point_count);
          const el = document.createElement("button");
          el.type = "button";
          el.dataset.mapMarker = "cluster";
          el.textContent = String(count);
          el.setAttribute("aria-label", `${count} imóveis nesta região. Aproximar o mapa`);
          el.className = cn(
            "pointer-events-auto grid size-11 cursor-pointer place-items-center rounded-full border-2 border-branco bg-petroleo text-small font-bold text-branco shadow-[0_2px_10px_rgb(20_43_58/0.35)] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abismo",
            count >= 50 && "size-14",
          );
          el.addEventListener("click", (event) => {
            event.stopPropagation();
            setMoved(true);
            const source = map.getSource(SOURCE) as import("maplibre-gl").GeoJSONSource;
            void source.getClusterExpansionZoom(clusterId).then((zoom) => {
              map.easeTo({ center: coords, zoom: Math.min(zoom, FOCUS_ZOOM + 2) });
            });
          });
          clusterMarkers.current.set(
            clusterId,
            new maplibre.Marker({ element: el }).setLngLat(coords).addTo(map),
          );
        }
        continue;
      }

      const id = String(props.id);
      const data = byId.get(id);
      if (!data || seenPoints.has(id)) continue;
      seenPoints.add(id);
      if (!pointMarkers.current.has(id)) {
        const el = document.createElement("button");
        el.type = "button";
        el.dataset.mapMarker = "imovel";
        el.dataset.id = id;
        // Texto vindo do banco só como textContent/atributo: nada de HTML.
        el.textContent = markerPriceLabel(data.price);
        el.setAttribute("aria-label", markerAriaLabel(data));
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          latest.current.onSelect(id);
        });
        el.addEventListener("mouseenter", () => latest.current.onHover(id));
        el.addEventListener("mouseleave", () => latest.current.onHover(null));
        el.addEventListener("focus", () => latest.current.onHover(id));
        el.addEventListener("blur", () => latest.current.onHover(null));
        // O MapLibre controla as classes do elemento do marcador; o botão vai dentro.
        const wrapper = document.createElement("div");
        wrapper.append(el);
        pointMarkers.current.set(id, {
          el,
          marker: new maplibre.Marker({ element: wrapper }).setLngLat(coords).addTo(map),
        });
        paintMarker(id, el);
      }
    }

    for (const [id, { marker }] of pointMarkers.current) {
      if (!seenPoints.has(id)) {
        marker.remove();
        pointMarkers.current.delete(id);
      }
    }
    for (const [clusterId, marker] of clusterMarkers.current) {
      if (!seenClusters.has(clusterId)) {
        marker.remove();
        clusterMarkers.current.delete(clusterId);
      }
    }
  }

  function paintMarker(id: string, el: HTMLButtonElement) {
    const { selectedId, hoveredId } = latest.current;
    const state = id === selectedId ? "selected" : id === hoveredId ? "hover" : "idle";
    el.className = cn(
      pillBase,
      state === "selected" ? pillSelected : state === "hover" ? pillHover : pillIdle,
    );
    el.setAttribute("aria-pressed", String(state === "selected"));
    // O marcador em destaque fica por cima dos vizinhos.
    const wrapper = pointMarkers.current.get(id)?.marker.getElement();
    if (wrapper) wrapper.style.zIndex = state === "idle" ? "" : state === "selected" ? "3" : "2";
  }

  // Destaque do selecionado e do que está sob o cursor (na lista ou no mapa).
  useEffect(() => {
    // paintMarker lê de latest; basta repintar quando a seleção muda.
    for (const [id, { el }] of pointMarkers.current) paintMarker(id, el);
  }, [props.selectedId, props.hoveredId]);

  // Nova busca: atualiza os pontos e enquadra (área pesquisada > imóveis > destino > litoral).
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    const points = JSON.parse(markersKey) as [string, number, number][];
    const source = map.getSource(SOURCE) as import("maplibre-gl").GeoJSONSource | undefined;
    pointMarkers.current.forEach(({ marker }) => marker.remove());
    pointMarkers.current.clear();
    clusterMarkers.current.forEach((marker) => marker.remove());
    clusterMarkers.current.clear();
    source?.setData(markersGeoJSON(points.map(([id, lat, lng]) => ({ id, lat, lng }))));

    const searched = areaKey ? (areaKey.split(",").map(Number) as MapArea) : null;
    const bounds = pointsBounds(points.map(([id, lat, lng]) => ({ id, lat, lng })));
    const view = viewKey ? (JSON.parse(viewKey) as MapView) : null;
    if (searched) {
      map.fitBounds(
        [
          [searched[0], searched[1]],
          [searched[2], searched[3]],
        ],
        { padding: 0, duration: 0 },
      );
    } else if (bounds) {
      map.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]],
        ],
        { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, duration: 0 },
      );
    } else if (view) {
      map.jumpTo({ center: view.center, zoom: view.zoom });
    } else {
      map.fitBounds(COAST_BOUNDS, { padding: 16, duration: 0 });
    }
    setMoved(false);
  }, [status, markersKey, areaKey, viewKey]);

  // "Ver no mapa" na lista: centraliza o imóvel; só aproxima se ele estiver num grupo.
  useEffect(() => {
    const map = mapRef.current;
    if (!focus || status !== "ready" || !map) return;
    const target = latest.current.markers.find((m) => m.id === focus.id);
    if (!target) return;
    const visibleAlone = pointMarkers.current.has(target.id);
    map.easeTo({
      center: [target.lng, target.lat],
      zoom: visibleAlone ? map.getZoom() : Math.max(map.getZoom(), FOCUS_ZOOM),
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500,
    });
  }, [focus, status]);

  // Esc fecha o resumo, onde quer que esteja o foco.
  useEffect(() => {
    if (!selectedId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") latest.current.onSelect(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  function searchHere() {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const next = visibleArea({
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
    });
    if (!next) {
      setTooWide(true);
      return;
    }
    setMoved(false);
    props.onSearchArea(next);
  }

  const coverWidth = selected?.cover ? variantWidths(selected.cover.width)[0]! : 0;

  return (
    <div className={cn("relative overflow-hidden bg-nevoa", className)}>
      <div
        ref={containerRef}
        role="region"
        aria-label="Mapa com a localização aproximada dos imóveis encontrados"
        aria-describedby="mapa-legenda"
        data-map-status={status}
        data-map-markers={markers.length}
        className="size-full"
      />

      <p id="mapa-legenda" className="sr-only">
        {markers.length === 0
          ? "Nenhum imóvel desta busca tem localização no mapa."
          : `${markers.length} ${markers.length === 1 ? "imóvel" : "imóveis"} no mapa, em localização aproximada. Use Tab para percorrer os preços.`}
      </p>

      {status !== "ready" ? (
        <div className="absolute inset-0 grid place-items-center bg-nevoa p-6 text-center">
          {status === "error" ? (
            <div className="grid justify-items-center gap-3">
              <p className="text-body text-abismo">
                Não foi possível carregar o mapa agora. A lista continua funcionando.
              </p>
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="inline-flex min-h-11 items-center rounded-full border border-abismo px-5 font-semibold text-abismo"
              >
                Tentar de novo
              </button>
            </div>
          ) : (
            <p className="animate-pulse text-small text-abismo" role="status">
              Carregando mapa…
            </p>
          )}
        </div>
      ) : null}

      {status === "ready" && markers.length === 0 && !moved ? (
        <p className="pointer-events-none absolute inset-x-4 top-4 mx-auto w-fit max-w-[calc(100%-5rem)] rounded-full bg-branco px-4 py-2 text-center text-small font-semibold text-abismo shadow-flutuante">
          Nenhum imóvel com localização para mostrar aqui.
        </p>
      ) : null}

      {status === "ready" && (moved || props.searching) ? (
        <div className="absolute inset-x-0 top-4 flex justify-center px-16">
          <button
            type="button"
            onClick={searchHere}
            disabled={props.searching || tooWide}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-branco px-5 text-small font-bold text-abismo shadow-flutuante transition-opacity hover:bg-marfim disabled:cursor-not-allowed disabled:opacity-80"
          >
            {props.searching
              ? "Pesquisando…"
              : tooWide
                ? "Aproxime o mapa para pesquisar"
                : "Pesquisar nesta área"}
          </button>
        </div>
      ) : null}

      {selected ? (
        <div
          role="dialog"
          aria-label={`Resumo: ${selected.title}`}
          className="absolute inset-x-3 bottom-3 z-10 grid grid-cols-[7rem_minmax(0,1fr)] overflow-hidden rounded-photo bg-branco shadow-flutuante sm:right-auto sm:w-[22rem]"
        >
          <div className="relative bg-areia">
            {selected.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={publicMediaUrl(
                  props.supabaseUrl,
                  variantPath(selected.cover.path, coverWidth),
                )}
                alt={selected.cover.alt}
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <HouseIcon
                width={28}
                height={28}
                aria-hidden="true"
                className="absolute inset-0 m-auto text-rocha"
              />
            )}
          </div>
          <div className="grid min-w-0 content-start gap-1 p-3 pr-10">
            {selected.place ? (
              <p className="truncate text-[0.75rem] font-semibold tracking-[0.1em] text-rocha uppercase">
                {selected.place}
              </p>
            ) : null}
            <p className="line-clamp-2 font-serif text-body leading-snug text-abismo">
              {selected.title}
            </p>
            {selected.rating ? (
              <p className="inline-flex items-center gap-1 text-small text-abismo">
                <StarIcon width={14} height={14} className="text-dourado" aria-hidden="true" />
                {selected.rating.average.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                <span className="text-rocha">({selected.rating.count})</span>
              </p>
            ) : null}
            <p className="text-small text-abismo tabular-nums">
              {selected.price === null ? (
                "Preço sob consulta"
              ) : (
                <>
                  <strong>{formatPrice(Math.round(selected.price))}</strong>{" "}
                  {selected.priceKind === "night"
                    ? selected.nights
                      ? "por noite (média)"
                      : "por noite"
                    : "por mês"}
                </>
              )}
            </p>
            {selected.total !== null && selected.nights ? (
              <p className="text-small text-rocha tabular-nums">
                {formatPrice(selected.total)} no total com taxas
              </p>
            ) : null}
            <Link
              href={props.detailHref(selected.slug)}
              className="mt-1 w-fit font-semibold text-petroleo underline underline-offset-3"
            >
              Ver imóvel
            </Link>
          </div>
          <button
            type="button"
            onClick={() => props.onSelect(null)}
            aria-label="Fechar resumo"
            className="absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-full text-abismo hover:bg-nevoa"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
