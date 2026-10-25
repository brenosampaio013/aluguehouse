#!/usr/bin/env node
// Gera assets/audio/narracao.wav a partir de assets/audio/narracao.json com o
// Google Cloud Text-to-Speech (voz neural em português do Brasil). Cada fala é
// sintetizada, acelerada se não couber na janela e posicionada no seu tempo.
//
// Uso:
//   GOOGLE_TTS_API_KEY=... node tools/narracao.mjs
//   GOOGLE_TTS_API_KEY=... TTS_VOZ=pt-BR-Chirp3-HD-Aoede node tools/narracao.mjs
// Depois: node tools/export.mjs --so-audio
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const key = process.env.GOOGLE_TTS_API_KEY;
if (!key) {
  console.error("Defina GOOGLE_TTS_API_KEY (chave de API do Google Cloud com a Text-to-Speech API ativada).");
  process.exit(1);
}
const voice = process.env.TTS_VOZ ?? "pt-BR-Chirp3-HD-Charon";
const RATE = 48000;

const { falas } = JSON.parse(await readFile(path.join(root, "assets/audio/narracao.json"), "utf8"));
const work = path.join(root, "saida/narracao");
await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });

async function synth(text, i) {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "pt-BR", name: voice },
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: RATE },
    }),
  });
  if (!res.ok) throw new Error(`Google TTS ${res.status}: ${await res.text()}`);
  const { audioContent } = await res.json();
  const file = path.join(work, `fala-${i}.wav`);
  await writeFile(file, Buffer.from(audioContent, "base64"));
  return file;
}

const seconds = (file) =>
  parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());

const parts = [];
for (const [i, fala] of falas.entries()) {
  let file = await synth(fala.texto, i);
  const len = seconds(file);
  const room = (falas[i + 1]?.inicio ?? 30.6) - 0.2 - fala.inicio;
  if (len > room) {
    // acelera sem mudar o tom, no máximo 15%; além disso, o roteiro precisa encurtar
    const tempo = Math.min(len / room, 1.15);
    const fast = path.join(work, `fala-${i}-r.wav`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", file, "-af", `atempo=${tempo.toFixed(3)}`, fast]);
    file = fast;
    const final = seconds(file);
    console.log(`fala ${i + 1}: ${len.toFixed(2)} s → ${final.toFixed(2)} s (janela ${room.toFixed(2)} s)${final > room + 0.05 ? "  ⚠ não coube: encurte o texto" : ""}`);
  } else {
    console.log(`fala ${i + 1}: ${len.toFixed(2)} s (janela ${room.toFixed(2)} s)`);
  }
  parts.push({ file, at: fala.inicio });
}

const out = path.join(root, "assets/audio/narracao.wav");
const inputs = parts.flatMap((p) => ["-i", p.file]);
const delays = parts.map((p, i) => `[${i}:a]aresample=${RATE},adelay=${Math.round(p.at * 1000)}:all=1[d${i}]`).join(";");
const mix = `${parts.map((_, i) => `[d${i}]`).join("")}amix=inputs=${parts.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${delays};${mix}`, "-map", "[a]", "-ar", String(RATE), out]);
console.log(`${path.relative(root, out)} · voz ${voice}`);
