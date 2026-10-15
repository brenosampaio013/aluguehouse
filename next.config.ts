import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // A Content-Security-Policy completa entra quando Supabase, mapa e
  // Turnstile estiverem integrados (domínios conhecidos).
];

const nextConfig: NextConfig = {
  // Cache Components fica desligado: no runtime do Cloudflare Workers ele
  // trava a resposta (testado com @opennextjs/cloudflare 1.20.11).
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

/**
 * O Next grava as variáveis NEXT_PUBLIC_* no código durante o build. Sem
 * elas, o build terminaria "com sucesso" e o site iria ao ar quebrado (ex.:
 * Cloudflare Workers Builds sem as variáveis de build). Aqui o build de
 * produção para logo, dizendo o que falta. Só os nomes aparecem, nunca os
 * valores.
 */
function assertPublicBuildEnv() {
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
    throw new Error(
      `Build interrompido: variáveis públicas ausentes ou inválidas: ${problems.join(", ")}. ` +
        "Defina-as no ambiente do build (no Cloudflare: Settings → Build → Variables and secrets). " +
        "Veja docs/publicacao.md.",
    );
  }
}

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) assertPublicBuildEnv();
  return nextConfig;
}

// Disponibiliza os bindings do Cloudflare durante o `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
