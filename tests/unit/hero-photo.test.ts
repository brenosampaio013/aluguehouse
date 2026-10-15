import { describe, expect, it } from "vitest";

import { heroSrc, heroSrcSet, type HeroPhoto } from "@/lib/home/hero-photo";

const photo: HeroPhoto = {
  basePath: "/inicio/capa",
  widths: [960, 1600, 2400],
  alt: "Casa com piscina",
  illustrative: true,
};

describe("foto do topo", () => {
  it("monta o srcset com todas as larguras", () => {
    expect(heroSrcSet(photo)).toBe(
      "/inicio/capa-960.webp 960w, /inicio/capa-1600.webp 1600w, /inicio/capa-2400.webp 2400w",
    );
  });

  it("usa a largura do meio como imagem padrão", () => {
    expect(heroSrc(photo)).toBe("/inicio/capa-1600.webp");
    expect(heroSrc({ ...photo, widths: [960, 1600] })).toBe("/inicio/capa-1600.webp");
  });
});
