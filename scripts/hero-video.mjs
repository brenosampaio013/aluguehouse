#!/usr/bin/env node
// Prepara o vídeo do mar do topo da página inicial em public/inicio/.
// Uso: pnpm hero:video caminho/do/video.mp4 [nome] [--inicio=0] [--duracao=12]
//
// Gera, sem áudio e sem metadados:
// - <nome>-960 e <nome>-1920 em WebM (VP9) e MP4 (H.264), para telas estreitas
//   e largas, com o fim emendado no começo por um esmaecer de 1 s (o loop não
//   "pula");
// - <nome>-capa-*.webp: o primeiro quadro do loop, que é a foto de capa (o
//   vídeo aparece por cima dela sem salto).
// Depois, preencha `heroMedia` em src/lib/home/hero-photo.ts.
// Precisa do ffmpeg instalado (não é dependência do projeto).
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [path.dirname(require.resolve("next"))] }));

const VIDEO_WIDTHS = [960, 1920];
const PHOTO_WIDTHS = [960, 1600, 2400];
const FADE = 1;
// Acima disso o vídeo pesa demais para o topo de uma página (por arquivo).
const WARN_BYTES = 6 * 1024 * 1024;

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? Number(arg.split("=")[1]) : fallback;
};
const [source, name = "mar"] = args.filter((a) => !a.startsWith("--"));
const start = option("inicio", 0);
const length = option("duracao", 12);
if (!source || !Number.isFinite(start) || !Number.isFinite(length)) {
  console.error("Uso: pnpm hero:video caminho/do/video.mp4 [nome] [--inicio=0] [--duracao=12]");
  process.exit(1);
}
if (spawnSync("ffmpeg", ["-version"]).status !== 0) {
  console.error("Instale o ffmpeg (https://ffmpeg.org/download.html) e rode de novo.");
  process.exit(1);
}

const probe = JSON.parse(
  execFileSync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration",
    "-of",
    "json",
    source,
  ]).toString(),
);
const { width, height } = probe.streams[0];
const duration = Math.min(length, Number(probe.format.duration) - start);
if (width < 1280) {
  console.error(`O vídeo tem ${width} px de largura; use um com pelo menos 1280 px (ideal 1920).`);
  process.exit(1);
}
if (!(duration >= 4 + FADE)) {
  console.error("O trecho precisa ter pelo menos 5 s para o loop ficar suave.");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "public/inicio");
await mkdir(outDir, { recursive: true });
const tmp = await mkdtemp(path.join(os.tmpdir(), "hero-video-"));

// Loop sem emenda: o trecho [FADE, fim] termina se fundindo em [0, FADE], que
// é exatamente o que vem antes do primeiro quadro. Duração final: fim - FADE.
const loopLength = duration - FADE;
const filter = (w) =>
  [
    `[0:v]fps=30,scale=${w}:-2:flags=lanczos,format=yuv420p,split[a][b]`,
    `[a]trim=start=${FADE}:duration=${duration - FADE},setpts=PTS-STARTPTS[corpo]`,
    `[b]trim=duration=${FADE},setpts=PTS-STARTPTS[inicio]`,
    `[corpo][inicio]xfade=transition=fade:duration=${FADE}:offset=${loopLength - FADE},format=yuv420p[saida]`,
  ].join(";");

const encoders = {
  webm: ["-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1", "-deadline", "good"],
  mp4: [
    "-c:v",
    "libx264",
    "-crf",
    "26",
    "-preset",
    "slow",
    "-profile:v",
    "high",
    "-level",
    "4.0",
    "-movflags",
    "+faststart",
  ],
};

const widths = VIDEO_WIDTHS.filter((w) => w <= width);
if (!widths.includes(width) && width < VIDEO_WIDTHS.at(-1)) widths.push(width);
for (const w of widths) {
  for (const [format, codec] of Object.entries(encoders)) {
    const file = path.join(outDir, `${name}-${w}.${format}`);
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-v",
        "error",
        "-ss",
        String(start),
        "-t",
        String(duration),
        "-i",
        source,
        "-filter_complex",
        filter(w),
        "-map",
        "[saida]",
        "-an",
        "-map_metadata",
        "-1",
        ...codec,
        file,
      ],
      { stdio: "inherit" },
    );
    const { size } = await stat(file);
    const warn = size > WARN_BYTES ? "  ⚠ pesado: encurte o trecho ou use um vídeo mais calmo" : "";
    console.log(
      `${path.relative(process.cwd(), file)}  ${(size / 1024 / 1024).toFixed(1)} MB${warn}`,
    );
  }
}

// Capa: o primeiro quadro do loop (instante FADE do trecho), em resolução cheia.
const frame = path.join(tmp, "capa.png");
execFileSync("ffmpeg", [
  "-y",
  "-v",
  "error",
  "-ss",
  String(start + FADE),
  "-i",
  source,
  "-frames:v",
  "1",
  frame,
]);
const photoWidths = PHOTO_WIDTHS.filter((w) => w <= width);
for (const w of photoWidths) {
  const file = path.join(outDir, `${name}-capa-${w}.webp`);
  const info = await sharp(frame).resize({ width: w }).webp({ quality: 74 }).toFile(file);
  console.log(
    `${path.relative(process.cwd(), file)}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`,
  );
}
await rm(tmp, { recursive: true, force: true });

const sorted = [...widths].sort((a, b) => a - b);
console.log(`
Loop de ${loopLength.toFixed(1)} s, ${width}×${height} na origem. Em src/lib/home/hero-photo.ts:

export const heroMedia: HeroMedia | null = {
  photo: {
    basePath: "/inicio/${name}-capa",
    widths: [${photoWidths.join(", ")}],
    alt: "…",
    illustrative: true,
  },
  video: { basePath: "/inicio/${name}", widths: [${sorted.join(", ")}], formats: ["webm", "mp4"] },
};`);
