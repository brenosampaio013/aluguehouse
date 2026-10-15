#!/usr/bin/env node
// Roda antes do `next build` (script "build"). O Next grava as variáveis
// NEXT_PUBLIC_* no código durante o build; sem elas, o build terminaria "com
// sucesso" e o site iria ao ar quebrado (ex.: Cloudflare Workers Builds sem as
// variáveis de build). Lê os arquivos .env do mesmo jeito que o Next.
// Mostra só os nomes que faltam, nunca os valores.
import { createRequire } from "node:module";
import path from "node:path";

// O @next/env vem com o Next.js; usa a mesma cópia.
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require(
  require.resolve("@next/env", { paths: [path.dirname(require.resolve("next"))] }),
);
loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

const required = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];
const urls = new Set(["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);

const problems = required.filter((name) => {
  const value = process.env[name]?.trim();
  if (!value) return true;
  if (!urls.has(name)) return false;
  try {
    new URL(value);
    return false;
  } catch {
    return true;
  }
});

if (problems.length > 0) {
  console.error(
    `Build interrompido: variáveis públicas ausentes ou inválidas: ${problems.join(", ")}.\n` +
      "Defina-as no ambiente do build (no Cloudflare: Settings → Build → Variables and secrets).\n" +
      "Veja docs/publicacao.md.",
  );
  process.exit(1);
}
