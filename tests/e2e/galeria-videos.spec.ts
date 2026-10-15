import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { adminApi } from "./support/users";

const run = randomUUID().slice(0, 6);
const slug = `casa-videos-${run}`;
const plainSlug = `casa-sem-videos-${run}`;
const FOTOS = ["sala-jantar", "cozinha", "quarto-casal"];
const FOTO_DIR = path.join(process.cwd(), "media/recebidas/imovel-01");
const FIXTURES = path.join(process.cwd(), "tests/e2e/fixtures");

const storage = { media: [] as string[], videos: [] as string[] };

async function createProperty(propertySlug: string, title: string, withVideos: boolean) {
  const api = adminApi();
  const { data, error } = await api
    .from("properties")
    .insert({
      slug: propertySlug,
      title,
      property_type: "casa",
      city: "Bertioga",
      neighborhood: "Riviera de São Lourenço",
      offers_seasonal: true,
      nightly_price: 1500,
      max_guests: 8,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  const id = data.id;

  for (const [index, foto] of FOTOS.entries()) {
    const mediaId = randomUUID();
    const file = `${id}/${mediaId}/640.webp`;
    storage.media.push(file);
    await api.storage
      .from("property-media")
      .upload(file, readFileSync(path.join(FOTO_DIR, `${foto}.jpg`)), {
        contentType: "image/jpeg",
      });
    await api.from("property_media").insert({
      id: mediaId,
      property_id: id,
      kind: "image",
      storage_path: `${id}/${mediaId}`,
      width: 640,
      height: 480,
      alt_text: `Foto ${index + 1}: ${foto.replace("-", " ")}`,
      position: index,
      is_cover: index === 0,
    });
  }

  if (withVideos) {
    const videos = [
      { file: "video-teste.mp4", ext: "mp4", caption: "Área da piscina", w: 640, h: 360, d: 3 },
      { file: "video-vertical.webm", ext: "webm", caption: null, w: 360, h: 640, d: 2 },
    ];
    for (const [index, video] of videos.entries()) {
      const mediaId = randomUUID();
      const videoPath = `${id}/${mediaId}/video.${video.ext}`;
      const posterPath = `${id}/${mediaId}/poster.webp`;
      storage.videos.push(videoPath);
      storage.media.push(posterPath);
      await api.storage
        .from("property-videos")
        .upload(videoPath, readFileSync(path.join(FIXTURES, video.file)), {
          contentType: `video/${video.ext}`,
        });
      await api.storage
        .from("property-media")
        .upload(posterPath, readFileSync(path.join(FOTO_DIR, "banheiro.jpg")), {
          contentType: "image/jpeg",
        });
      const { error: mediaError } = await api.from("property_media").insert({
        id: mediaId,
        property_id: id,
        kind: "video",
        video_source: "file",
        storage_path: videoPath,
        poster_path: posterPath,
        caption: video.caption,
        alt_text: video.caption ? `Vídeo: ${video.caption}` : "Vídeo do imóvel",
        width: video.w,
        height: video.h,
        duration_seconds: video.d,
        position: index,
      });
      if (mediaError) throw mediaError;
    }
  }
}

/** Registra se algum arquivo de vídeo foi pedido ao Storage. */
function trackVideoRequests(page: Page) {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/property-videos/")) requested.push(request.url());
  });
  return requested;
}

/** Contador "Foto 2 de 3" / "Vídeo 1 de 2" do visualizador (anunciado ao trocar). */
function counter(dialog: Locator) {
  return dialog.locator("p[aria-live]");
}

function viewer(page: Page) {
  return page.getByRole("dialog", { name: "Fotos e vídeos do imóvel" });
}

test.describe("vídeos na galeria do imóvel", () => {
  test.beforeAll(async () => {
    await createProperty(slug, `Casa com vídeos ${run}`, true);
    await createProperty(plainSlug, `Casa sem vídeos ${run}`, false);
  });

  test.afterAll(async () => {
    const api = adminApi();
    await api.storage.from("property-media").remove(storage.media);
    await api.storage.from("property-videos").remove(storage.videos);
    await api.from("properties").delete().in("slug", [slug, plainSlug]);
  });

  test("miniatura com play, nada carregado antes do clique; reproduz, navega e fecha", async ({
    page,
    isMobile,
  }) => {
    const requested = trackVideoRequests(page);
    await page.goto(`/imoveis/${slug}`);

    const tile = page
      .getByRole("button", { name: "Assistir ao vídeo “Área da piscina” (1 de 2 vídeos)" })
      .filter({ visible: true });
    await expect(tile).toBeVisible();
    await expect(tile).toContainText("Vídeo · 0:03 · +1");
    if (isMobile) {
      // No celular, o vídeo é o 2º item do carrossel.
      const items = page.getByRole("list", { name: "Fotos do imóvel" }).getByRole("listitem");
      await expect(items.nth(1).getByRole("button")).toHaveAccessibleName(/Assistir ao vídeo/);
    }

    // Sem player e sem download de vídeo ao abrir a página.
    await expect(page.locator("video")).toHaveCount(0);
    expect(requested).toEqual([]);

    await tile.click();
    const dialog = viewer(page);
    await expect(dialog).toBeVisible();
    await expect(counter(dialog)).toHaveText("Vídeo 1 de 2");
    await expect(dialog.getByText("Área da piscina · 0:03")).toBeVisible();
    // Abrir o visualizador ainda não carrega o vídeo: só a capa com o play.
    await expect(dialog.locator("video")).toHaveCount(0);
    expect(requested).toEqual([]);

    await dialog.getByRole("button", { name: "Reproduzir o vídeo “Área da piscina”" }).click();
    const player = dialog.locator("video");
    await expect(player).toHaveCount(1);
    await expect(player).toHaveAttribute("controls", "");
    await expect
      .poll(() => player.evaluate((video: HTMLVideoElement) => video.currentTime))
      .toBeGreaterThan(0);
    // Respeita a proporção do vídeo (640×360).
    const box = await player.boundingBox();
    expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);

    // Próximo: o vídeo anterior para (o player sai da página).
    await dialog.getByRole("button", { name: "Próximo" }).filter({ visible: true }).click();
    await expect(counter(dialog)).toHaveText("Vídeo 2 de 2");
    await expect(dialog.locator("video")).toHaveCount(0);

    // Volta ao início pelas fotos (a lista dá a volta).
    await dialog.getByRole("button", { name: "Próximo" }).filter({ visible: true }).click();
    await expect(counter(dialog)).toHaveText("Foto 1 de 3");
    await expect(dialog.getByRole("img", { name: "Foto 1: sala jantar" })).toBeVisible();

    // Miniaturas: o vídeo é identificado e abre direto.
    await dialog.getByRole("button", { name: "Vídeo 2 de 2" }).click();
    await expect(counter(dialog)).toHaveText("Vídeo 2 de 2");
    // A faixa de miniaturas rola sozinha: o visualizador não fica mais
    // largo que a tela e o contador continua visível.
    await expect(counter(dialog)).toBeInViewport();
    expect(
      await dialog.evaluate((element) => element.scrollWidth - element.clientWidth),
    ).toBeLessThanOrEqual(0);

    // Teclado (computador): setas navegam.
    if (!isMobile) {
      await page.keyboard.press("ArrowLeft");
      await expect(counter(dialog)).toHaveText("Vídeo 1 de 2");
    }

    await dialog.getByRole("button", { name: "Fechar" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("video")).toHaveCount(0);
  });

  test("botão Vídeos e fotos ampliadas no mesmo visualizador", async ({ page }) => {
    await page.goto(`/imoveis/${slug}`);
    // Fechado, o visualizador não tem imagens: nenhuma foto grande é baixada
    // ao abrir a página (disputaria banda com a primeira foto).
    await expect(page.locator('dialog[aria-label="Fotos e vídeos do imóvel"] img')).toHaveCount(0);
    await page.getByRole("button", { name: "Vídeos (2)" }).click();
    await expect(counter(viewer(page))).toHaveText("Vídeo 1 de 2");
    await page.keyboard.press("Escape");
    await expect(viewer(page)).toBeHidden();

    await page
      .getByRole("button", { name: "Ampliar foto 1: Foto 1: sala jantar" })
      .filter({ visible: true })
      .click();
    await expect(counter(viewer(page))).toHaveText("Foto 1 de 3");
    await viewer(page).getByRole("button", { name: "Fechar" }).click();

    // A janela "Ver todas as fotos" continua só com as fotos.
    await page.getByRole("button", { name: "Ver todas as fotos (3)" }).click();
    await expect(page.getByRole("dialog", { name: "Todas as fotos" }).getByRole("img")).toHaveCount(
      3,
    );
  });

  test("celular: deslizar troca de item", async ({ page, isMobile }) => {
    test.skip(!isMobile, "gesto de toque");
    await page.goto(`/imoveis/${slug}`);
    await page
      .getByRole("button", { name: "Ampliar foto 1: Foto 1: sala jantar" })
      .filter({ visible: true })
      .click();
    const stage = viewer(page).getByRole("img", { name: "Foto 1: sala jantar" });
    const box = (await stage.boundingBox())!;
    const y = box.y + box.height / 2;
    await stage.dispatchEvent("touchstart", {
      touches: [{ identifier: 1, clientX: box.x + box.width - 20, clientY: y }],
    });
    await stage.dispatchEvent("touchend", {
      changedTouches: [{ identifier: 1, clientX: box.x + 20, clientY: y }],
    });
    await expect(counter(viewer(page))).toHaveText("Foto 2 de 3");
  });

  test("anúncio sem vídeos continua igual", async ({ page }) => {
    await page.goto(`/imoveis/${plainSlug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Casa sem vídeos ${run}`);
    await expect(page.getByRole("button", { name: /^Vídeos/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Assistir ao vídeo/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ver todas as fotos (3)" })).toBeVisible();
  });

  test("sem violações WCAG 2.1 AA e sem rolagem lateral, com o vídeo aberto", async ({ page }) => {
    await page.goto(`/imoveis/${slug}`);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
    const closed = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(closed.violations).toEqual([]);

    await page.getByRole("button", { name: "Vídeos (2)" }).click();
    await expect(viewer(page)).toBeVisible();
    const open = await new AxeBuilder({ page })
      .include("dialog[open]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(open.violations).toEqual([]);
  });
});
