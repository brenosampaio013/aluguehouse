// Copia o worker do MapLibre (módulo ES) para public/, numa pasta com a
// versão no nome. O empacotador do Next.js não publica esse arquivo sozinho.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const dist = path.join(path.dirname(pkgPath), "dist");
const target = path.join(process.cwd(), "public", "vendor", `maplibre-gl-${version}`);

mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(path.join(dist, file), path.join(target, file));
}
console.log(`maplibre-gl ${version}: worker copiado para ${path.relative(process.cwd(), target)}`);
