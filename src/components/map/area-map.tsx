"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";

import { circlePolygon, mapStyleUrl } from "@/lib/map";

export type MapArea = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  href?: string;
};

type Status = "waiting" | "loading" | "ready" | "error";

const PETROLEO = "#13606e";

/**
 * Mapa com áreas aproximadas (círculos), nunca pontos exatos.
 * O MapLibre só é baixado quando o mapa entra na tela. Gestos cooperativos:
 * a rolagem da página não fica presa no mapa.
 */
export function AreaMap({
  areas,
  label,
  className,
}: {
  areas: MapArea[];
  label: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("waiting");
  // Recria o mapa só quando o conteúdo das áreas muda, não a cada renderização.
  const areasKey = JSON.stringify(areas);

  useEffect(() => {
    const container = containerRef.current;
    const areas = JSON.parse(areasKey) as MapArea[];
    if (!container || areas.length === 0) return;

    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;

    async function load() {
      setStatus("loading");
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !container) return;
        // Worker publicado por scripts/copy-maplibre-worker.mjs.
        maplibre.setWorkerUrl(
          new URL(
            `/vendor/maplibre-gl-${maplibre.getVersion()}/maplibre-gl-worker.mjs`,
            window.location.origin,
          ).href,
        );

        map = new maplibre.Map({
          container,
          style: mapStyleUrl(),
          center: [areas[0]!.lng, areas[0]!.lat],
          zoom: 14,
          cooperativeGestures: true,
          attributionControl: { compact: true },
          locale: {
            "CooperativeGesturesHandler.WindowsHelpText":
              "Use Ctrl + rolagem para aproximar o mapa",
            "CooperativeGesturesHandler.MacHelpText": "Use ⌘ + rolagem para aproximar o mapa",
            "CooperativeGesturesHandler.MobileHelpText": "Use dois dedos para mover o mapa",
            "NavigationControl.ZoomIn": "Aproximar",
            "NavigationControl.ZoomOut": "Afastar",
          },
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

        map.on("error", () => {
          if (!cancelled && map && !map.isStyleLoaded()) setStatus("error");
        });

        map.on("load", () => {
          if (cancelled || !map) return;
          map.addSource("areas", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: areas.map((area) => ({
                type: "Feature",
                id: area.id,
                properties: { id: area.id },
                geometry: circlePolygon(area.lat, area.lng),
              })),
            },
          });
          map.addLayer({
            id: "areas-fill",
            type: "fill",
            source: "areas",
            paint: { "fill-color": PETROLEO, "fill-opacity": 0.18 },
          });
          map.addLayer({
            id: "areas-line",
            type: "line",
            source: "areas",
            paint: { "line-color": PETROLEO, "line-width": 2 },
          });

          if (areas.some((area) => area.href)) {
            map.on("click", "areas-fill", (event) => {
              const id = event.features?.[0]?.properties?.id;
              const area = areas.find((a) => a.id === id);
              if (!area?.href || !map) return;
              // Conteúdo montado com textContent: nada de HTML vindo do banco.
              const link = document.createElement("a");
              link.href = area.href;
              link.textContent = area.label;
              link.className = "font-semibold text-petroleo underline";
              new maplibre.Popup({ closeButton: true, maxWidth: "240px" })
                .setLngLat(event.lngLat)
                .setDOMContent(link)
                .addTo(map);
            });
            map.on(
              "mouseenter",
              "areas-fill",
              () => map && (map.getCanvas().style.cursor = "pointer"),
            );
            map.on("mouseleave", "areas-fill", () => map && (map.getCanvas().style.cursor = ""));
          }

          const bounds = new maplibre.LngLatBounds();
          for (const area of areas) {
            for (const [lng, lat] of circlePolygon(area.lat, area.lng).coordinates[0]!)
              bounds.extend([lng, lat]);
          }
          map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 0 });
          setStatus("ready");
        });
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void load();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(container);

    return () => {
      cancelled = true;
      observer.disconnect();
      map?.remove();
    };
  }, [areasKey]);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        role="region"
        aria-label={label}
        data-map-status={status}
        className="relative size-full overflow-hidden rounded-photo bg-nevoa"
      >
        {status !== "ready" ? (
          <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-small text-abismo">
            {status === "error" ? "Não foi possível carregar o mapa agora." : "Carregando mapa…"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
