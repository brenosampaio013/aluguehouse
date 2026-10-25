#!/usr/bin/env node
// Monta assets/audio/narracao.wav a partir das locuções gravadas listadas em
// assets/audio/narracao.json (campo "arquivo"): cada fala entra no seu
// "inicio", com a "velocidade" indicada, e o conjunto é normalizado a -16 LUFS.
// Uso: node tools/montar-narracao.mjs && node tools/export.mjs --so-audio
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const audioDir = path.join(root, "assets/audio");
const { falas } = JSON.parse(await readFile(path.join(audioDir, "narracao.json"), "utf8"));
const RATE = 48000;

const seconds = (file) =>
  parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());

let previousEnd = 0;
const filters = [];
for (const [i, fala] of falas.entries()) {
  const file = path.join(audioDir, fala.arquivo);
  const len = seconds(file) / (fala.velocidade ?? 1);
  const end = fala.inicio + len;
  const overlap = fala.inicio < previousEnd - 0.01 ? "  ⚠ sobrepõe a fala anterior" : "";
  console.log(`fala ${i + 1}: ${fala.inicio.toFixed(2)}–${end.toFixed(2)} s${overlap}`);
  previousEnd = end;
  filters.push(`[${i}:a]aresample=${RATE},atempo=${fala.velocidade ?? 1},adelay=${Math.round(fala.inicio * 1000)}:all=1[d${i}]`);
}

const out = path.join(audioDir, "narracao.wav");
execFileSync("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  ...falas.flatMap((f) => ["-i", path.join(audioDir, f.arquivo)]),
  "-filter_complex",
  `${filters.join(";")};${falas.map((_, i) => `[d${i}]`).join("")}amix=inputs=${falas.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]`,
  "-map",
  "[a]",
  "-ar",
  String(RATE),
  out,
]);
console.log(`${path.relative(root, out)} (${seconds(out).toFixed(2)} s)`);
