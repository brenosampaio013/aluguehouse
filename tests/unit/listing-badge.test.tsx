import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ListingBadge } from "@/components/property/listing-badge";
import { listingStatus } from "@/lib/properties/listing";

describe("selo de situação do imóvel", () => {
  it("só imóveis oferecidos para venda recebem o selo", () => {
    expect(listingStatus({ offers_sale: true })).toBe("sale");
    expect(listingStatus({ offers_sale: false })).toBeNull();
  });

  it("mostra exatamente CASA À VENDA", () => {
    render(<ListingBadge status="sale" />);
    expect(screen.getByText("CASA À VENDA")).toBeInTheDocument();
  });

  it("já tem textos para aluguel e vendido", () => {
    const { rerender } = render(<ListingBadge status="rent" />);
    expect(screen.getByText("PARA ALUGAR")).toBeInTheDocument();
    rerender(<ListingBadge status="sold" />);
    expect(screen.getByText("VENDIDO")).toBeInTheDocument();
  });

  it("sem situação, não mostra nada", () => {
    const { container } = render(<ListingBadge status={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
