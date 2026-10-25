#!/usr/bin/env node
// Exporta o filme quadro a quadro: Chromium (Playwright) posiciona a timeline
// GSAP em cada instante e o FFmpeg monta o MP4 H.264 1920 × 1080 a 30 fps.
//
// Uso:
//   node tools/export.mjs                     → saida/alugue-houses.mp4 (versão publicada)
//   node tools/export.mjs --completo          → saida/alugue-houses-30s.mp4 (com as cenas 1 e 2)
//   node tools/export.mjs --stills=1,6,10     → saida/previa/quadro-XX.XX.jpg
//   node tools/export.mjs --contact           → saida/previa/folha-de-contato.jpg
//   node tools/export.mjs --allow-missing     → exporta mesmo com fotos pendentes
//   node tools/export.mjs --so-audio         → refaz só o áudio do MP4 já exportado
// Áudio: assets/audio/narracao.(wav|mp3) e/ou assets/audio/trilha.(mp3|wav).
// Com as duas, a trilha abaixa sozinha enquanto a narração fala.
import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "saida");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path.join(root, url === "/" ? "index.html" : url);
  if (!file.startsWith(root) || !existsSync(file) || !(await stat(file)).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/index.html?render=1${args.completo ? "&completo=1" : ""}`;

const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--hide-scrollbars"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("Erro na página:", e.message));
await page.goto(base, { waitUntil: "load" });
await page.evaluate(() => window.PROMO.ready);
const { duration, fps, cues, missing } = await page.evaluate(() => ({
  duration: window.PROMO.duration,
  fps: window.PROMO.fps,
  cues: window.PROMO.cues,
  missing: window.PROMO.missingPhotos(),
}));

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "pontos-de-sincronia.json"), JSON.stringify(cues, null, 2));
if (missing.length) console.warn(`Fotos pendentes (${missing.length}):\n  ${missing.join("\n  ")}`);

// Narração e trilha: entradas e filtros do FFmpeg (ou null, sem áudio).
function audioPlan(duration, firstInput) {
  const find = (name) => ["wav", "mp3"].map((e) => path.join(root, "assets/audio", `${name}.${e}`)).find(existsSync);
  const voz = find("narracao");
  const trilha = find("trilha");
  if (!voz && !trilha) return null;
  const inputs = [...(voz ? ["-i", voz] : []), ...(trilha ? ["-i", trilha] : [])];
  const v = voz ? `[${firstInput}:a]` : null;
  const m = trilha ? `[${firstInput + (voz ? 1 : 0)}:a]` : null;
  const end = `atrim=0:${duration},afade=t=out:st=${duration - 1.2}:d=1.2`;
  const graph =
    v && m
      ? `${v}apad,asplit=2[voz][chave];${m}volume=0.5,apad[mus];[mus][chave]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=450[duck];[duck][voz]amix=inputs=2:normalize=0,${end}[a]`
      : `${v ?? m}apad,${end}[a]`;
  return {
    inputs,
    args: ["-filter_complex", graph, "-map", "0:v", "-map", "[a]", "-c:a", "aac", "-b:a", "256k", "-ar", "48000"],
    label: [voz && "narração", trilha && "trilha"].filter(Boolean).join(" + "),
  };
}

const frame = (t) => page.evaluate((t) => window.PROMO.seek(t), t);

async function stills(times) {
  const dir = path.join(outDir, "previa");
  await mkdir(dir, { recursive: true });
  const files = [];
  for (const t of times) {
    await frame(t);
    const file = path.join(dir, `quadro-${t.toFixed(2).padStart(5, "0")}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 92 });
    files.push(file);
    console.log(path.relative(root, file));
  }
  return files;
}

function run(cmd, argv, input) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: [input ? "pipe" : "ignore", "inherit", "inherit"] });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} saiu com código ${code}`))));
    if (input) input(p.stdin);
  });
}

try {
  if (args["so-audio"]) {
    const video = path.join(outDir, args.out ?? (args.completo ? "alugue-houses-30s.mp4" : "alugue-houses.mp4"));
    const plan = audioPlan(duration, 1);
    if (!plan) throw new Error("Nenhum áudio em assets/audio/ (narracao.wav/mp3 ou trilha.mp3/wav).");
    const tmp = video.replace(/\.mp4$/, ".tmp.mp4");
    await run("ffmpeg", ["-y", "-loglevel", "error", "-i", video, ...plan.inputs, ...plan.args, "-c:v", "copy", "-movflags", "+faststart", tmp]);
    await rename(tmp, video);
    console.log(`${path.relative(root, video)} (${plan.label})`);
  } else if (args.stills) {
    await stills(String(args.stills).split(",").map(Number));
  } else if (args.contact) {
    const times = Array.from({ length: 18 }, (_, i) => Math.round((0.15 + (i * (duration - 0.6)) / 17) * 100) / 100);
    const files = await stills(times);
    const cols = 3;
    const filter = files.map((_, i) => `[${i}:v]scale=640:360[v${i}]`).join(";");
    const layout = files.map((_, i) => `${(i % cols) * 640}_${Math.floor(i / cols) * 360}`).join("|");
    await run("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      ...files.flatMap((f) => ["-i", f]),
      "-filter_complex",
      `${filter};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}`,
      path.join(outDir, "previa", "folha-de-contato.jpg"),
    ]);
    console.log("saida/previa/folha-de-contato.jpg");
  } else {
    if (missing.length && !args["allow-missing"]) {
      throw new Error("Há fotos pendentes; coloque os arquivos em assets/fotos/campanha/ ou use --allow-missing para uma versão de teste.");
    }
    const total = Math.round(duration * fps);
    const plan = audioPlan(duration, 1);
    const out = path.join(outDir, args.out ?? (args.completo ? "alugue-houses-30s.mp4" : "alugue-houses.mp4"));
    const started = Date.now();
    await run(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-f",
        "image2pipe",
        "-framerate",
        String(fps),
        "-c:v",
        "mjpeg",
        "-i",
        "-",
        ...(plan ? plan.inputs : []),
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "16",
        "-pix_fmt",
        "yuv420p",
        "-r",
        String(fps),
        "-frames:v",
        String(total),
        ...(plan ? plan.args : []),
        "-movflags",
        "+faststart",
        out,
      ],
      async (stdin) => {
        for (let i = 0; i < total; i++) {
          await frame(i / fps);
          const buf = await page.screenshot({ type: "jpeg", quality: 96 });
          if (!stdin.write(buf)) await new Promise((r) => stdin.once("drain", r));
          if (i % 30 === 0) process.stdout.write(`\rquadro ${i}/${total}`);
        }
        stdin.end();
      },
    );
    console.log(`\n${path.relative(root, out)} em ${Math.round((Date.now() - started) / 1000)} s${plan ? ` (${plan.label})` : " (sem áudio)"}`);
  }
} finally {
  await browser.close();
  server.close();
}
