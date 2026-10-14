import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeNextPath("/favoritos")).toBe("/favoritos");
    expect(safeNextPath("/imoveis/casa-1?x=1")).toBe("/imoveis/casa-1?x=1");
  });

  it.each([
    "https://exemplo.com",
    "//exemplo.com",
    "/\\exemplo.com",
    "favoritos",
    "",
    "/a\nb",
    null,
    undefined,
    42,
  ])("recusa %j", (value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});
