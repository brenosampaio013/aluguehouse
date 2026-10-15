#!/usr/bin/env node
// Gera as versões WebP da foto do topo da página inicial em public/inicio/.
// Uso: pnpm hero:photo caminho/da/foto.jpg [nome]
// Depois, preencha `heroPhoto` em src/lib/home/hero-photo.ts.
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// O sharp vem com o Next.js (otimização de imagens); usa a mesma cópia.
const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [path.dirname(require.resolve("next"))] }));

const WIDTHS = [960, 1600, 2400];
const [source, name = "capa"] = process.argv.slice(2);
if (!source) {
  console.error("Uso: pnpm hero:photo caminho/da/foto.jpg [nome]");
  process.exit(1);
}

const meta = await sharp(source).metadata();
if (!meta.width || meta.width < 1600) {
  console.error(`A foto tem ${meta.width ?? "?"} px de largura; use uma com pelo menos 1600 px.`);
  process.exit(1);
}

const outDir = path.join(process.cwd(), "public/inicio");
await mkdir(outDir, { recursive: true });
const widths = WIDTHS.filter((width) => width <= meta.width);
for (const width of widths) {
  const file = path.join(outDir, `${name}-${width}.webp`);
  // Sem metadados (EXIF/GPS) na versão publicada.
  const info = await sharp(source).rotate().resize({ width }).webp({ quality: 74 }).toFile(file);
  console.log(
    `${path.relative(process.cwd(), file)}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`,
  );
}
console.log(`\nbasePath: "/inicio/${name}", widths: [${widths.join(", ")}]`);
