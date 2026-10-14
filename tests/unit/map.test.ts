import { describe, expect, it } from "vitest";

import { APPROX_RADIUS_M, circlePolygon, distanceM } from "@/lib/map";

describe("circlePolygon", () => {
  const center = { lat: -23.8012, lng: -46.0123 };
  const polygon = circlePolygon(center.lat, center.lng);
  const ring = polygon.coordinates[0]!;

  it("fecha o anel (primeiro ponto igual ao último)", () => {
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it("todos os pontos ficam a ~600 m do centro", () => {
    for (const [lng, lat] of ring) {
      expect(Math.abs(distanceM(center, { lat, lng }) - APPROX_RADIUS_M)).toBeLessThan(5);
    }
  });
});

describe("distanceM", () => {
  it("calcula distâncias conhecidas", () => {
    // 0,01 grau de latitude ≈ 1,11 km
    expect(distanceM({ lat: -23.8, lng: -46 }, { lat: -23.81, lng: -46 })).toBeCloseTo(1112, -1);
  });
});
