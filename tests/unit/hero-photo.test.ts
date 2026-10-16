import { describe, expect, it } from "vitest";

import {
  heroSrc,
  heroSrcSet,
  pickHeroVideo,
  type HeroPhoto,
  type HeroVideo,
} from "@/lib/home/hero-photo";

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

describe("vídeo do topo", () => {
  const video: HeroVideo = {
    basePath: "/inicio/mar",
    widths: [1920, 960],
    formats: ["webm", "mp4"],
  };
  const all = () => true;

  it("usa o arquivo menor em tela estreita e o maior nas demais", () => {
    expect(pickHeroVideo(video, { narrow: true, canPlay: all })).toBe("/inicio/mar-960.webm");
    expect(pickHeroVideo(video, { narrow: false, canPlay: all })).toBe("/inicio/mar-1920.webm");
  });

  it("cai para o MP4 quando o navegador não toca WebM", () => {
    const canPlay = (type: string) => type.startsWith("video/mp4");
    expect(pickHeroVideo(video, { narrow: false, canPlay })).toBe("/inicio/mar-1920.mp4");
  });

  it("sem formato tocável ou sem larguras, não há vídeo (fica a foto)", () => {
    expect(pickHeroVideo(video, { narrow: false, canPlay: () => false })).toBeNull();
    expect(pickHeroVideo({ ...video, widths: [] }, { narrow: false, canPlay: all })).toBeNull();
  });
});
