"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";

import { COAST_BOUNDS } from "@/lib/destinations";
import { roundCoord } from "@/lib/geocode";
import { mapStyleUrl } from "@/lib/map";

type Point = { lat: number; lng: number };
type Status = "loading" | "ready" | "error";

/** Zoom de rua: dá para conferir a quadra e a avenida. */
const STREET_ZOOM = 16;

/**
 * Mapa do painel para marcar a localização EXATA do imóvel: clique no mapa
 * ou arraste o marcador. A posição volta para os campos de latitude e
 * longitude; nada é salvo até "Salvar localização".
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: Point | null;
  onChange: (point: Point) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initial = useRef(value);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    async function load() {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !container) return;
        libRef.current = maplibre;
        maplibre.setWorkerUrl(
          new URL(
            `/vendor/maplibre-gl-${maplibre.getVersion()}/maplibre-gl-worker.mjs`,
            window.location.origin,
          ).href,
        );
        const start = initial.current;
        const map = new maplibre.Map({
          container,
          style: mapStyleUrl(),
          ...(start
            ? { center: [start.lng, start.lat] as [number, number], zoom: STREET_ZOOM }
            : { bounds: COAST_BOUNDS }),
          dragRotate: false,
          attributionControl: { compact: true },
          locale: {
            "NavigationControl.ZoomIn": "Aproximar",
            "NavigationControl.ZoomOut": "Afastar",
          },
        });
        mapRef.current = map;
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        map.on("error", () => {
          if (!cancelled && !map.isStyleLoaded()) setStatus("error");
        });
        map.on("load", () => !cancelled && setStatus("ready"));
        map.on("click", (event) => {
          const point = { lat: roundCoord(event.lngLat.lat), lng: roundCoord(event.lngLat.lng) };
          placeMarker(point);
          onChangeRef.current(point);
        });
        if (start) placeMarker(start);
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    void load();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  function placeMarker(point: Point) {
    const map = mapRef.current;
    const maplibre = libRef.current;
    if (!map || !maplibre) return;
    if (!markerRef.current) {
      const marker = new maplibre.Marker({ color: "#103b40", draggable: true });
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        onChangeRef.current({ lat: roundCoord(lat), lng: roundCoord(lng) });
      });
      markerRef.current = marker;
    }
    markerRef.current.setLngLat([point.lng, point.lat]).addTo(map);
  }

  // Coordenada digitada ou vinda da busca de endereço: move o marcador e o mapa.
  const lat = value?.lat;
  const lng = value?.lng;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat === undefined || lng === undefined) return;
    const current = markerRef.current?.getLngLat();
    if (current && roundCoord(current.lat) === lat && roundCoord(current.lng) === lng) return;
    placeMarker({ lat, lng });
    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), STREET_ZOOM) });
  }, [lat, lng, status]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa para marcar a localização exata do imóvel"
      data-map-status={status}
      className="relative h-80 overflow-hidden rounded-photo bg-nevoa"
    >
      {status !== "ready" ? (
        <p className="absolute inset-0 z-10 grid place-items-center p-4 text-center text-small text-abismo">
          {status === "error"
            ? "Não foi possível carregar o mapa. Digite a latitude e a longitude nos campos."
            : "Carregando mapa…"}
        </p>
      ) : null}
    </div>
  );
}
