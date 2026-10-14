import { describe, expect, it } from "vitest";

import { parsePublicEnv, parseServerEnv } from "@/lib/env";

describe("variáveis de ambiente", () => {
  it("aceita configuração pública válida", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "chave-de-teste",
    });
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
  });

  it("aponta quais variáveis faltam sem expor valores", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SITE_URL: "não-é-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "segredo",
      }),
    ).toThrowError(/NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL$/);
  });

  it("exige a chave do servidor", () => {
    expect(() => parseServerEnv({})).toThrowError(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
