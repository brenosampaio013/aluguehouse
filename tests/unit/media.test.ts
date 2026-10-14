import { describe, expect, it } from "vitest";

import { mediaSrcSet, variantWidths } from "@/lib/media";

describe("variantWidths", () => {
  it("gera as larguras padrão até o tamanho original", () => {
    expect(variantWidths(4032)).toEqual([640, 1280, 1920]);
    expect(variantWidths(1280)).toEqual([640, 1280]);
    expect(variantWidths(1000)).toEqual([640, 1000]);
    expect(variantWidths(500)).toEqual([500]);
  });

  it("monta o srcset com as variantes", () => {
    expect(mediaSrcSet("https://x.supabase.co", "p/m", 1280)).toBe(
      "https://x.supabase.co/storage/v1/object/public/property-media/p/m/640.webp 640w, " +
        "https://x.supabase.co/storage/v1/object/public/property-media/p/m/1280.webp 1280w",
    );
  });
});
