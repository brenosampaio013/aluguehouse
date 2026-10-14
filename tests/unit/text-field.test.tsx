import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextField } from "@/components/ui/text-field";

describe("TextField", () => {
  it("associa o rótulo ao campo", () => {
    render(<TextField label="Nome completo" />);
    expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
  });

  it("marca o campo como inválido e descreve o erro", () => {
    render(<TextField label="Telefone" hint="Com DDD" error="Informe o telefone com DDD." />);
    const input = screen.getByLabelText("Telefone");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Com DDD Informe o telefone com DDD.");
  });

  it("não marca como inválido sem erro", () => {
    render(<TextField label="E-mail" />);
    expect(screen.getByLabelText("E-mail")).not.toHaveAttribute("aria-invalid");
  });
});
