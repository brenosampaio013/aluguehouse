import { randomUUID } from "node:crypto";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin } from "./support/admin";
import { adminApi, anonApi, createAdminWithTotp } from "./support/users";

const FIXTURES = path.join(process.cwd(), "tests/e2e/fixtures");
const MP4 = path.join(FIXTURES, "video-teste.mp4");
const WEBM = path.join(FIXTURES, "video-vertical.webm");
const FALSO = path.join(FIXTURES, "falso.mp4");

async function createProperty(title: string) {
  const { data, error } = await adminApi()
    .from("properties")
    .insert({
      slug: `video-${randomUUID().slice(0, 8)}`,
      title,
      property_type: "casa",
      city: "Bertioga",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function removeProperty(id: string) {
  const api = adminApi();
  const { data: media } = await api
    .from("property_media")
    .select("storage_path, poster_path")
    .eq("property_id", id)
    .eq("kind", "video");
  for (const item of media ?? []) {
    if (item.storage_path) await api.storage.from("property-videos").remove([item.storage_path]);
    if (item.poster_path) await api.storage.from("property-media").remove([item.poster_path]);
  }
  await api.from("properties").delete().eq("id", id);
}

async function videosInDb(propertyId: string) {
  const { data, error } = await adminApi()
    .from("property_media")
    .select("id, caption, position, storage_path, poster_path, video_source, width, height")
    .eq("property_id", propertyId)
    .eq("kind", "video")
    .order("position");
  if (error) throw error;
  return data;
}

function videoSection(page: Page) {
  return page.getByRole("region", { name: "Vídeos do imóvel" });
}

async function openVideos(page: Page, propertyId: string) {
  await page.goto(`/admin/imoveis/${propertyId}#videos`);
  await expect(videoSection(page)).toBeVisible();
}

async function uploadVideo(page: Page, file: string, caption?: string) {
  const section = videoSection(page);
  await section.getByLabel("Arquivo de vídeo").setInputFiles(file);
  await expect(section.getByLabel("Prévia do vídeo antes de salvar")).toBeVisible();
  await expect(
    section.getByRole("img", { name: "Miniatura que aparecerá na galeria" }),
  ).toBeVisible();
  if (caption) await section.getByLabel("Título ou legenda (opcional)").fill(caption);
  await section.getByRole("button", { name: "Salvar vídeo" }).click();
  await expect(section.getByRole("status").filter({ hasText: "Vídeo adicionado." })).toBeVisible({
    timeout: 30_000,
  });
}

function savedList(page: Page) {
  return videoSection(page).getByRole("list", { name: "Vídeos do imóvel" }).getByRole("listitem");
}

test("visitante não envia vídeos ao armazenamento", async () => {
  const { error } = await anonApi()
    .storage.from("property-videos")
    .upload(`${randomUUID()}/${randomUUID()}/video.mp4`, new Blob(["x"], { type: "video/mp4" }));
  expect(error).not.toBeNull();
});

test.describe("vídeos do imóvel no painel", () => {
  let propertyId = "";

  test.beforeEach(async ({}, testInfo) => {
    propertyId = await createProperty(`Casa com vídeos ${testInfo.project.name} ${Date.now()}`);
  });

  test.afterEach(async () => {
    await removeProperty(propertyId);
  });

  test("envia, mostra prévia, reordena, edita e remove; tudo persiste no banco", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await loginAsAdmin(page, await createAdminWithTotp());
    await openVideos(page, propertyId);
    await expect(videoSection(page).getByText("Nenhum vídeo ainda.")).toBeVisible();

    // 1. Primeiro vídeo (MP4) com título
    await uploadVideo(page, MP4, "Área da piscina");
    await expect(savedList(page)).toHaveCount(1);
    await expect(savedList(page).first()).toContainText("Vídeo 1");
    await expect(savedList(page).first()).toContainText("0:03");

    // 2. Segundo vídeo (WebM vertical) sem título
    await uploadVideo(page, WEBM);
    await expect(savedList(page)).toHaveCount(2);

    let rows = await videosInDb(propertyId);
    expect(rows.map((row) => row.caption)).toEqual(["Área da piscina", null]);
    expect(rows.every((row) => row.video_source === "file")).toBe(true);
    expect(rows[1]).toMatchObject({ width: 360, height: 640 });
    expect(rows[0]!.storage_path).toBe(`${propertyId}/${rows[0]!.id}/video.mp4`);

    // O arquivo e a miniatura estão de fato no armazenamento
    const folder = `${propertyId}/${rows[0]!.id}`;
    const videoFiles = await adminApi().storage.from("property-videos").list(folder);
    expect(videoFiles.data?.map((file) => file.name)).toEqual(["video.mp4"]);
    const posterFiles = await adminApi().storage.from("property-media").list(folder);
    expect(posterFiles.data?.map((file) => file.name)).toEqual(["poster.webp"]);

    // 3. Continua lá depois de recarregar
    await page.reload();
    await expect(savedList(page)).toHaveCount(2);
    await expect(
      savedList(page).first().getByLabel("Título ou legenda do vídeo 1 (opcional)"),
    ).toHaveValue("Área da piscina");

    // 4. Reordenar: o vídeo com título desce para a 2ª posição
    await page.getByRole("button", { name: "Mover para baixo (vídeo 1)" }).click();
    await expect(
      savedList(page).nth(1).getByLabel("Título ou legenda do vídeo 2 (opcional)"),
    ).toHaveValue("Área da piscina");
    rows = await videosInDb(propertyId);
    expect(rows.map((row) => row.caption)).toEqual([null, "Área da piscina"]);

    // 5. Editar o título do 1º
    const first = savedList(page).first();
    await first.getByLabel("Título ou legenda do vídeo 1 (opcional)").fill("Fachada ao entardecer");
    await first.getByRole("button", { name: "Salvar título (vídeo 1)" }).click();
    await expect(first.getByRole("status").filter({ hasText: "Título salvo." })).toBeVisible();
    await page.reload();
    await expect(
      savedList(page).first().getByLabel("Título ou legenda do vídeo 1 (opcional)"),
    ).toHaveValue("Fachada ao entardecer");

    // 6. Remover o 2º: some do banco e do armazenamento
    const removed = (await videosInDb(propertyId))[1]!;
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Remover (vídeo 2)" }).click();
    await expect(savedList(page)).toHaveCount(1);
    rows = await videosInDb(propertyId);
    expect(rows.map((row) => row.caption)).toEqual(["Fachada ao entardecer"]);
    const gone = await adminApi()
      .storage.from("property-videos")
      .list(`${propertyId}/${removed.id}`);
    expect(gone.data ?? []).toHaveLength(0);
  });

  test("recusa formatos não aceitos e arquivo falso, no navegador e no servidor", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await loginAsAdmin(page, await createAdminWithTotp());
    await openVideos(page, propertyId);
    const section = videoSection(page);
    const input = section.getByLabel("Arquivo de vídeo");

    // Extensão/tipo não aceitos
    await input.setInputFiles({
      name: "casa.mov",
      mimeType: "video/quicktime",
      buffer: Buffer.from("moov"),
    });
    await expect(section.getByText("Envie um vídeo em MP4 ou WebM.")).toBeVisible();

    // Texto com extensão .mp4: o navegador não consegue abrir
    await input.setInputFiles(FALSO);
    await expect(section.getByText(/Não conseguimos abrir este vídeo/)).toBeVisible();
    await expect(section.getByRole("button", { name: "Salvar vídeo" })).toBeDisabled();

    // Burlando o navegador: o envio troca o vídeo por HTML no caminho.
    // O servidor confere o conteúdo, recusa e apaga o arquivo.
    await page.route("**/storage/v1/object/upload/sign/property-videos/**", (route) =>
      route.continue({ postData: Buffer.from("<html><script>alert(1)</script></html>") }),
    );
    await input.setInputFiles(MP4);
    await expect(section.getByLabel("Prévia do vídeo antes de salvar")).toBeVisible();
    await section.getByRole("button", { name: "Salvar vídeo" }).click();
    await expect(
      section
        .getByRole("alert")
        .filter({ hasText: "O arquivo não é um vídeo MP4 ou WebM válido." }),
    ).toBeVisible({ timeout: 30_000 });
    expect(await videosInDb(propertyId)).toHaveLength(0);
    const { data: leftovers } = await adminApi().storage.from("property-videos").list(propertyId);
    expect(leftovers ?? []).toHaveLength(0);
  });

  test("envio interrompido não deixa arquivos; registro repetido não apaga o vídeo", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await loginAsAdmin(page, await createAdminWithTotp());
    await openVideos(page, propertyId);
    const section = videoSection(page);

    // A conexão cai no envio do vídeo (a miniatura já tinha ido).
    await page.route("**/storage/v1/object/upload/sign/property-videos/**", (route) =>
      route.abort("connectionreset"),
    );
    await section.getByLabel("Arquivo de vídeo").setInputFiles(MP4);
    await expect(section.getByLabel("Prévia do vídeo antes de salvar")).toBeVisible();
    await section.getByRole("button", { name: "Salvar vídeo" }).click();
    await expect(
      section.getByRole("alert").filter({ hasText: "Não foi possível enviar o vídeo." }),
    ).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => (await adminApi().storage.from("property-media").list(propertyId)).data)
      .toEqual([]);
    expect(await videosInDb(propertyId)).toHaveLength(0);
    await page.unroute("**/storage/v1/object/upload/sign/property-videos/**");

    // Envio normal, guardando a chamada de registro para repeti-la.
    const register = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        Boolean(request.headers()["next-action"]) &&
        (request.postData() ?? "").includes('"extension"'),
    );
    await uploadVideo(page, MP4, "Varanda");
    const request = await register;
    const [saved] = await videosInDb(propertyId);

    const replay = await page.request.post(request.url(), {
      headers: request.headers(),
      data: request.postData() ?? "",
    });
    expect(replay.ok()).toBe(true);
    expect(await videosInDb(propertyId)).toHaveLength(1);
    const files = await adminApi()
      .storage.from("property-videos")
      .list(`${propertyId}/${saved!.id}`);
    expect(files.data?.map((file) => file.name)).toEqual(["video.mp4"]);
  });

  test("respeita o limite de vídeos por imóvel", async ({ page }) => {
    // 6 vídeos já cadastrados (limite padrão)
    const { error } = await adminApi()
      .from("property_media")
      .insert(
        Array.from({ length: 6 }, (_, index) => ({
          property_id: propertyId,
          kind: "video" as const,
          video_source: "file",
          storage_path: `${propertyId}/${randomUUID()}/video.mp4`,
          poster_path: `${propertyId}/${randomUUID()}/poster.webp`,
          alt_text: "Vídeo do imóvel",
          position: index,
        })),
      );
    if (error) throw error;

    await loginAsAdmin(page, await createAdminWithTotp());
    await openVideos(page, propertyId);
    const section = videoSection(page);
    await expect(section.getByText("6 de 6 vídeos.", { exact: false })).toBeVisible();
    await expect(section.getByText(/atingiu o limite de 6 vídeos/)).toBeVisible();
    await expect(section.getByLabel("Arquivo de vídeo")).toHaveCount(0);
  });

  test("seção acessível e sem rolagem lateral, com prévia aberta", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsAdmin(page, await createAdminWithTotp());
    await openVideos(page, propertyId);
    await uploadVideo(page, MP4, "Sala integrada");
    await videoSection(page).getByLabel("Arquivo de vídeo").setInputFiles(WEBM);
    await expect(videoSection(page).getByLabel("Prévia do vídeo antes de salvar")).toBeVisible();

    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
    const results = await new AxeBuilder({ page })
      .include("#videos")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
