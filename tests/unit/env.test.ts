import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/lib/env";
import { parseServerEnv } from "@/lib/server-env-schema";

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

  it("limites de vídeo têm padrão e são configuráveis dentro do teto do banco", () => {
    const base = { SUPABASE_SERVICE_ROLE_KEY: "x" };
    expect(parseServerEnv(base)).toMatchObject({
      VIDEO_MAX_UPLOAD_MB: 50,
      VIDEO_MAX_PER_PROPERTY: 6,
    });
    expect(
      parseServerEnv({ ...base, VIDEO_MAX_UPLOAD_MB: "200", VIDEO_MAX_PER_PROPERTY: "10" }),
    ).toMatchObject({ VIDEO_MAX_UPLOAD_MB: 200, VIDEO_MAX_PER_PROPERTY: 10 });
    expect(() => parseServerEnv({ ...base, VIDEO_MAX_PER_PROPERTY: "21" })).toThrowError(
      /VIDEO_MAX_PER_PROPERTY/,
    );
  });
});
