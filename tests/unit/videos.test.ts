import { describe, expect, it } from "vitest";

import {
  formatDuration,
  formatMegabytes,
  sniffVideoType,
  validateVideoFile,
  videoAltText,
  videoPaths,
} from "@/lib/videos";

const MB = 1024 * 1024;

function bytes(...parts: (number[] | string)[]) {
  return new Uint8Array(
    parts.flatMap((part) =>
      typeof part === "string" ? [...part].map((char) => char.charCodeAt(0)) : part,
    ),
  );
}

describe("validação do arquivo de vídeo", () => {
  it("aceita MP4 e WebM dentro do limite", () => {
    expect(
      validateVideoFile({ name: "casa.mp4", type: "video/mp4", size: 10 * MB }, 50 * MB),
    ).toBeNull();
    expect(
      validateVideoFile({ name: "Piscina.WEBM", type: "video/webm", size: MB }, 50 * MB),
    ).toBeNull();
  });

  it("recusa outros formatos e extensão que não bate com o tipo", () => {
    const max = 50 * MB;
    expect(validateVideoFile({ name: "casa.mov", type: "video/quicktime", size: MB }, max)).toMatch(
      /MP4 ou WebM/,
    );
    expect(validateVideoFile({ name: "casa.html", type: "video/mp4", size: MB }, max)).toMatch(
      /MP4 ou WebM/,
    );
    expect(validateVideoFile({ name: "casa.mp4", type: "text/html", size: MB }, max)).toMatch(
      /MP4 ou WebM/,
    );
  });

  it("recusa arquivo vazio ou acima do limite configurado", () => {
    expect(validateVideoFile({ name: "a.mp4", type: "video/mp4", size: 0 }, 50 * MB)).toMatch(
      /vazio/,
    );
    expect(validateVideoFile({ name: "a.mp4", type: "video/mp4", size: 60 * MB }, 50 * MB)).toBe(
      "O vídeo tem 60 MB; o limite é 50 MB. Envie uma versão menor ou mais curta.",
    );
  });
});

describe("tipo real pelo conteúdo", () => {
  it("reconhece MP4 pela caixa ftyp", () => {
    expect(sniffVideoType(bytes([0, 0, 0, 0x20], "ftypisom", [0, 0, 2, 0]))).toBe("mp4");
    expect(sniffVideoType(bytes([0, 0, 0, 0x18], "ftypmp42", [0, 0, 0, 0]))).toBe("mp4");
  });

  it("reconhece WebM pela assinatura EBML", () => {
    expect(sniffVideoType(bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]))).toBe("webm");
  });

  it("recusa QuickTime, HTML e arquivos curtos", () => {
    expect(sniffVideoType(bytes([0, 0, 0, 0x14], "ftypqt  ", [0, 0, 0, 0]))).toBeNull();
    expect(sniffVideoType(bytes("<!doctype html><script>"))).toBeNull();
    expect(sniffVideoType(bytes([0, 0]))).toBeNull();
  });
});

describe("caminhos, tamanho, duração e texto alternativo", () => {
  it("formata o tamanho do arquivo", () => {
    expect(formatMegabytes(116_455)).toBe("114 KB");
    expect(formatMegabytes(2.5 * MB)).toBe("2,5 MB");
    expect(formatMegabytes(48 * MB)).toBe("48 MB");
  });

  it("define os caminhos no servidor", () => {
    expect(videoPaths("p", "m", "webm")).toEqual({
      video: "p/m/video.webm",
      poster: "p/m/poster.webp",
    });
  });

  it("formata a duração", () => {
    expect(formatDuration(42)).toBe("0:42");
    expect(formatDuration(725)).toBe("12:05");
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("usa o título no texto alternativo da miniatura", () => {
    expect(videoAltText("Área da piscina")).toBe("Vídeo: Área da piscina");
    expect(videoAltText(null)).toBe("Vídeo do imóvel");
  });
});
