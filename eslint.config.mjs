import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // O zod passa por src/lib/zod.ts, que desliga o uso de eval (CSP).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/zod.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "zod", message: 'Use import { z } from "@/lib/zod".' }] },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Saídas do Cloudflare, Supabase e testes
    ".open-next/**",
    ".wrangler/**",
    "cloudflare-env.d.ts",
    "supabase/.temp/**",
    "playwright-report/**",
    "test-results/**",
    "public/vendor/**",
  ]),
]);

export default eslintConfig;
