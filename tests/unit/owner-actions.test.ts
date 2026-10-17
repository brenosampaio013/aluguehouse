import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Ações do portal com o banco recusando ou fora do ar: nunca dizem que
 * gravaram, e só revalidam a tela quando o banco confirmou.
 */

const rpc = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("@/lib/auth/require-owner", () => ({
  requireOwner: async () => ({
    supabase: { rpc },
    session: { status: "owner", userId: "u1", email: "dono@teste.local" },
  }),
}));

const { requestOwnerBlock, requestPropertyChange, cancelOwnerRequest } =
  await import("@/server/actions/owner");

const PROPERTY = "18000000-0000-4000-8000-000000000001";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const block = (checkIn = "2030-01-10", checkOut = "2030-01-12") =>
  form({ propertyId: PROPERTY, checkIn, checkOut, message: "" });

beforeEach(() => {
  rpc.mockReset();
  revalidatePath.mockReset();
});

describe("pedido de bloqueio", () => {
  it("valida as datas antes de chamar o banco", async () => {
    const state = await requestOwnerBlock({ status: "idle" }, block("2030-01-12", "2030-01-10"));
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.checkOut).toMatch(/depois/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("datas ocupadas: explica e não diz que enviou", async () => {
    rpc.mockResolvedValue({ error: { message: "unavailable" } });
    const state = await requestOwnerBlock({ status: "idle" }, block());
    expect(state).toEqual({
      status: "error",
      message: "Essas datas já estão ocupadas no calendário. Escolha outro período.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("imóvel de outro proprietário (42501) não revela nada", async () => {
    rpc.mockResolvedValue({ error: { code: "42501", message: "forbidden" } });
    const state = await requestOwnerBlock({ status: "idle" }, block());
    expect(state.message).toMatch(/Imóvel não encontrado entre os seus/);
  });

  it("falha de rede: mensagem genérica, nada confirmado", async () => {
    rpc.mockResolvedValue({ error: { message: "TypeError: fetch failed" } });
    const state = await requestOwnerBlock({ status: "idle" }, block());
    expect(state).toEqual({
      status: "error",
      message: "Não foi possível enviar agora. Tente de novo.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("sucesso só depois do banco aceitar", async () => {
    rpc.mockResolvedValue({ data: "id", error: null });
    const state = await requestOwnerBlock({ status: "idle" }, block());
    expect(rpc).toHaveBeenCalledWith("request_owner_block", {
      p_property_id: PROPERTY,
      p_check_in: "2030-01-10",
      p_check_out: "2030-01-12",
      p_message: undefined,
    });
    expect(state.status).toBe("success");
    expect(revalidatePath).toHaveBeenCalledWith("/proprietario", "layout");
  });
});

describe("pedido de alteração e cancelamento", () => {
  it("descrição curta é recusada sem chamar o banco", async () => {
    const state = await requestPropertyChange(
      { status: "idle" },
      form({ propertyId: PROPERTY, message: "curto" }),
    );
    expect(state.fieldErrors?.message).toMatch(/10 caracteres/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("pedido já respondido não é cancelado", async () => {
    rpc.mockResolvedValue({ error: { message: "invalid_status" } });
    const state = await cancelOwnerRequest({ status: "idle" }, form({ id: PROPERTY }));
    expect(state.message).toBe("Este pedido já foi respondido ou cancelado.");
  });

  it("ID inválido nem chega ao banco", async () => {
    const state = await cancelOwnerRequest({ status: "idle" }, form({ id: "1 or 1=1" }));
    expect(state).toEqual({ status: "error", message: "Pedido inválido." });
    expect(rpc).not.toHaveBeenCalled();
  });
});
