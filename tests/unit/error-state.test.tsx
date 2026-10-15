import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ErrorState } from "@/components/ui/error-state";

describe("página de erro", () => {
  it("explica, oferece tentar de novo e mostra o código", () => {
    const retry = vi.fn();
    render(<ErrorState digest="abc123" retry={retry} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Algo deu errado");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: /Falar no WhatsApp/ })).toHaveAttribute(
      "href",
      "https://wa.me/5513996195221",
    );
    expect(screen.getByText("Código do erro: abc123")).toBeInTheDocument();
  });
});
