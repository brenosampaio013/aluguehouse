import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AmenitiesPicker } from "@/components/admin/amenities-picker";
import { AmenityIcon, amenityIcons } from "@/components/amenities/amenity-icon";
import { AmenitiesSection } from "@/components/property/amenities-section";
import {
  amenityCatalog,
  amenityCategories,
  findAmenity,
  groupByCategory,
  isAmenitySlug,
  matchesAmenity,
  sortForPreview,
} from "@/lib/amenities";

/** Slugs e nomes inseridos em public.amenities por todas as migrations. */
function migrationAmenities(): Map<string, string> {
  const dir = path.join(process.cwd(), "supabase/migrations");
  const rows = new Map<string, string>();
  for (const file of readdirSync(dir).sort()) {
    const sql = readFileSync(path.join(dir, file), "utf8");
    for (const block of sql.matchAll(
      /insert into public\.amenities \(slug, label\) values([\s\S]*?);/g,
    )) {
      for (const row of block[1]!.matchAll(/\('([a-z0-9-]+)', '((?:[^']|'')*)'\)/g)) {
        if (!rows.has(row[1]!)) rows.set(row[1]!, row[2]!.replace(/''/g, "'"));
      }
    }
  }
  return rows;
}

describe("catálogo de comodidades", () => {
  it("slugs únicos, estáveis e no formato do banco", () => {
    const slugs = amenityCatalog.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slugs.length).toBe(140);
  });

  it("toda categoria tem comodidades", () => {
    for (const category of amenityCategories) {
      expect(
        amenityCatalog.some((a) => a.category === category.id),
        category.id,
      ).toBe(true);
    }
  });

  it("igual ao que as migrations gravam no banco (slug e nome)", () => {
    const db = migrationAmenities();
    expect([...db.keys()].sort()).toEqual(amenityCatalog.map((a) => a.slug).sort());
    for (const amenity of amenityCatalog)
      expect(db.get(amenity.slug), amenity.slug).toBe(amenity.label);
  });

  it("as 15 comodidades antigas continuam com o mesmo slug e nome", () => {
    expect(findAmenity("portaria-24h")?.label).toBe("Portaria 24 horas");
    expect(findAmenity("roupa-de-cama")?.label).toBe("Roupa de cama e banho");
    expect(findAmenity("cozinha-equipada")?.label).toBe("Cozinha equipada");
    expect(isAmenitySlug("helicoptero")).toBe(false);
  });

  it("busca por nome e sinônimo, sem acentos", () => {
    const portaria = findAmenity("portaria-24h")!;
    expect(matchesAmenity(portaria, "porteiro")).toBe(true);
    expect(matchesAmenity(findAmenity("bide")!, "BIDE")).toBe(true);
    expect(matchesAmenity(findAmenity("caiaque")!, "kayak")).toBe(true);
    expect(matchesAmenity(portaria, "piscina")).toBe(false);
  });

  it("agrupa por categoria na ordem do catálogo e põe o desconhecido em Outras", () => {
    const groups = groupByCategory([
      { slug: "wi-fi", label: "Wi-Fi" },
      { slug: "piscina", label: "Piscina" },
      { slug: "fora-do-catalogo", label: "Algo antigo" },
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "Lazer e entretenimento",
      "Tecnologia e conectividade",
      "Outras",
    ]);
  });

  it("resumo mostra primeiro as mais procuradas", () => {
    const sorted = sortForPreview([
      { slug: "bide", label: "Bidê" },
      { slug: "piscina", label: "Piscina" },
    ]);
    expect(sorted[0]!.slug).toBe("piscina");
  });
});

describe("ícones", () => {
  it("cada comodidade tem o próprio ícone, sem repetir", () => {
    const slugs = amenityCatalog.map((a) => a.slug);
    expect(Object.keys(amenityIcons).sort()).toEqual([...slugs].sort());
    const icons = slugs.map((slug) => amenityIcons[slug]);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("todos renderizam um SVG 24×24 com traço fino e currentColor", () => {
    for (const { slug } of amenityCatalog) {
      const { container, unmount } = render(<AmenityIcon name={slug} />);
      const svg = container.querySelector("svg")!;
      expect(svg.getAttribute("viewBox"), slug).toBe("0 0 24 24");
      expect(svg.getAttribute("stroke")).toBe("currentColor");
      expect(svg.getAttribute("stroke-width")).toBe("1.75");
      expect(svg.getAttribute("stroke-linecap")).toBe("round");
      expect(
        svg.querySelectorAll("path, circle, rect, line, polyline, ellipse").length,
      ).toBeGreaterThan(0);
      unmount();
    }
  });

  it("tamanhos, decorativo por padrão e nome acessível quando pedido", () => {
    const { container, rerender } = render(<AmenityIcon name="wi-fi" size={16} />);
    let svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("aria-hidden", "true");

    rerender(<AmenityIcon name="wi-fi" size={32} aria-label="Wi-Fi" />);
    svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", "32");
    expect(screen.getByRole("img", { name: "Wi-Fi" })).toBe(svg);
  });

  it("slug desconhecido usa um ícone genérico, sem quebrar", () => {
    const { container } = render(<AmenityIcon name="nao-existe" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("seleção no painel", () => {
  it("marca, filtra e mantém as marcadas ocultas no formulário", async () => {
    const { container } = render(<AmenitiesPicker initial={["piscina"]} />);
    const hidden = () =>
      [...container.querySelectorAll<HTMLInputElement>('input[type=hidden][name="amenity"]')].map(
        (input) => input.value,
      );
    expect(hidden()).toEqual(["piscina"]);
    expect(screen.getByRole("status")).toHaveTextContent("1 comodidade marcada");

    await userEvent.type(screen.getByLabelText("Buscar comodidade"), "porteiro");
    expect(screen.getAllByRole("checkbox", { name: /Portaria 24 horas/ })).toHaveLength(1);
    expect(screen.queryByRole("checkbox", { name: "Piscina" })).toBeNull();
    await userEvent.click(screen.getByRole("checkbox", { name: "Portaria 24 horas" }));
    // Piscina sumiu da lista filtrada, mas continua marcada.
    expect(hidden().sort()).toEqual(["piscina", "portaria-24h"]);

    await userEvent.clear(screen.getByLabelText("Buscar comodidade"));
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "seguranca");
    expect(screen.queryByRole("checkbox", { name: "Piscina" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Portaria 24 horas" })).toBeChecked();

    await userEvent.click(screen.getByRole("button", { name: "Desmarcar todas" }));
    expect(hidden()).toEqual([]);
  });
});

describe("página do imóvel", () => {
  it("sem comodidades, não mostra a seção", () => {
    const { container } = render(<AmenitiesSection amenities={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra só as marcadas, com nome, e o botão para ver todas quando passa de 10", () => {
    const some = amenityCatalog.slice(0, 12).map(({ slug, label }) => ({ slug, label }));
    render(<AmenitiesSection amenities={some} />);
    const list = screen.getAllByRole("list")[0]!;
    expect(list.querySelectorAll("li")).toHaveLength(10);
    expect(
      screen.getByRole("button", { name: "Mostrar todas as 12 comodidades" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("ar-condicionado")).toBeNull();
  });
});
