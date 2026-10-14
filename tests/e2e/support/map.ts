import type { Page } from "@playwright/test";

/**
 * Estilo mínimo de mapa servido pelo próprio teste no lugar do OpenFreeMap:
 * os testes não dependem de serviço externo. Verifica o componente do mapa,
 * não a aparência dos mapas reais.
 */
export async function stubMapTiles(page: Page) {
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        version: 8,
        sources: {},
        layers: [{ id: "fundo", type: "background", paint: { "background-color": "#dcebec" } }],
      }),
    }),
  );
}
