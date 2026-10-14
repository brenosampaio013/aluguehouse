import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { clientIp, hashKey } = await import("@/server/security/rate-limit");
const { verifyTurnstile } = await import("@/server/security/turnstile");

describe("limite de envios", () => {
  it("prefere o IP informado pela Cloudflare", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.1, 10.0.0.1",
    });
    expect(clientIp(headers)).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe(
      "198.51.100.1",
    );
    expect(clientIp(new Headers())).toBeNull();
  });

  it("gera hash estável que não contém o valor original", async () => {
    const a = await hashKey("203.0.113.7", "segredo");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(await hashKey("203.0.113.7", "segredo"));
    expect(a).not.toBe(await hashKey("203.0.113.7", "outro"));
    expect(a).not.toContain("203");
  });
});

describe("Turnstile", () => {
  const ok = () =>
    vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));

  it("sem chave secreta fica desativado e não chama a Cloudflare", async () => {
    const fetcher = ok();
    expect(await verifyTurnstile("token", null, undefined, fetcher)).toBe("disabled");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("com chave, exige token", async () => {
    expect(await verifyTurnstile(null, null, "segredo", ok())).toBe("failed");
  });

  it("aceita token válido e envia o IP", async () => {
    const fetcher = ok();
    expect(await verifyTurnstile("token", "203.0.113.7", "segredo", fetcher)).toBe("ok");
    const body = (fetcher.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body;
    expect(body.get("remoteip")).toBe("203.0.113.7");
    expect(body.get("response")).toBe("token");
  });

  it("recusa token inválido ou falha de rede", async () => {
    const invalid = vi.fn(async () => new Response(JSON.stringify({ success: false })));
    expect(await verifyTurnstile("token", null, "segredo", invalid)).toBe("failed");
    const broken = vi.fn(async () => {
      throw new Error("rede");
    });
    expect(await verifyTurnstile("token", null, "segredo", broken)).toBe("failed");
  });
});
