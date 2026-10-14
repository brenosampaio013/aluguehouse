import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { sendEmail } = await import("@/server/email/send");

const email = { to: "admin@exemplo.com", subject: "Assunto", text: "Corpo", replyTo: "ana@x.com" };
const ok = () => vi.fn(async () => new Response("{}", { status: 200 }));

describe("envio de e-mail", () => {
  it("usa o Resend quando há chave, com remetente e responder-para", async () => {
    const fetcher = ok();
    const result = await sendEmail(
      email,
      {
        RESEND_API_KEY: "re_teste",
        EMAIL_FROM: "AH <avisos@exemplo.com>",
        MAILPIT_URL: "http://m",
      },
      fetcher,
    );
    expect(result).toBe("sent");
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({ authorization: "Bearer re_teste" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      from: "AH <avisos@exemplo.com>",
      to: ["admin@exemplo.com"],
      reply_to: "ana@x.com",
    });
  });

  it("sem chave, usa o Mailpit local", async () => {
    const fetcher = ok();
    expect(await sendEmail(email, { MAILPIT_URL: "http://127.0.0.1:54324" }, fetcher)).toBe("sent");
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("http://127.0.0.1:54324/api/v1/send");
    expect(JSON.parse(String(init.body))).toMatchObject({
      From: { Email: "onboarding@resend.dev", Name: "Alugue Houses" },
      To: [{ Email: "admin@exemplo.com" }],
      Subject: "Assunto",
    });
  });

  it("sem configuração fica desativado e não chama ninguém", async () => {
    const fetcher = ok();
    expect(await sendEmail(email, {}, fetcher)).toBe("disabled");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("falha de rede ou resposta de erro não lança exceção", async () => {
    const broken = vi.fn(async () => {
      throw new Error("rede");
    });
    expect(await sendEmail(email, { RESEND_API_KEY: "x" }, broken)).toBe("failed");
    const refused = vi.fn(async () => new Response("{}", { status: 422 }));
    expect(await sendEmail(email, { RESEND_API_KEY: "x" }, refused)).toBe("failed");
  });
});
