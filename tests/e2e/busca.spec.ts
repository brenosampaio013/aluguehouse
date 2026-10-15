import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Data daqui a N dias no fuso de São Paulo (o mesmo do servidor). */
function isoInDays(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

async function openSearch(page: Page, isMobile: boolean) {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: /Onde e quando/ }).click();
}

const datesDialog = (page: Page) => page.getByRole("dialog", { name: "Escolher datas" });

/** Avança os meses até o dia aparecer e clica nele. */
async function pickDate(page: Page, iso: string) {
  const day = datesDialog(page).locator(`[data-date="${iso}"]`);
  for (let i = 0; i < 14 && !(await day.isVisible()); i += 1) {
    await datesDialog(page).getByRole("button", { name: "Próximo mês" }).click();
  }
  await day.click();
}

test.describe("busca da página inicial", () => {
  test("destino com sugestões: digitar, escolher pelo teclado e pelo clique", async ({
    page,
    isMobile,
  }) => {
    await openSearch(page, isMobile);
    const onde = page.getByRole("combobox", { name: "Onde?" });
    await onde.fill("berti");
    const lista = page.getByRole("listbox", { name: "Destinos" });
    await expect(lista.getByRole("option", { name: /Riviera de São Lourenço/ })).toBeVisible();
    await expect(lista.getByRole("option", { name: /Ubatuba/ })).toHaveCount(0);
    await expect(lista.getByRole("option", { name: /Riviera/ })).toHaveId(
      (await onde.getAttribute("aria-activedescendant"))!,
    );
    await onde.press("Enter");
    await expect(onde).toHaveValue("Riviera de São Lourenço");
    // Setas percorrem as opções.
    await onde.fill("");
    await onde.press("ArrowDown");
    await expect(lista.getByRole("option", { name: /^Riviera de São Lourenço/ })).toHaveId(
      (await onde.getAttribute("aria-activedescendant"))!,
    );
    await onde.press("Escape");
    await onde.fill("berti");
    await onde.press("Enter");
    await expect(lista).toBeHidden();

    await onde.fill("paris");
    await expect(page.getByText("Nenhum destino com esse nome.")).toBeVisible();
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Escolha um destino da lista." }),
    ).toBeVisible();

    await onde.fill("ilha");
    await lista.getByRole("option", { name: /Ilhabela/ }).click();
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL("/temporada?regiao=ilhabela");
  });

  test("calendário: meses conforme a tela, passado bloqueado, período destacado e limpar", async ({
    page,
    isMobile,
  }) => {
    await openSearch(page, isMobile);
    await page.getByRole("button", { name: /^Check-in/ }).click();
    const dialog = datesDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("table")).toHaveCount(isMobile ? 1 : 2);
    await expect(dialog.getByRole("button", { name: "Mês anterior" })).toBeDisabled();
    await expect(dialog.getByRole("table").first()).toHaveAccessibleName(
      /^[A-ZÇ][a-zç]+ de \d{4}$/,
    );

    const yesterday = isoInDays(-1);
    if (yesterday.slice(0, 7) === isoInDays(0).slice(0, 7)) {
      await expect(dialog.locator(`[data-date="${yesterday}"]`)).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }

    const checkIn = isoInDays(30);
    const checkOut = isoInDays(34);
    await pickDate(page, checkIn);
    await expect(dialog.getByRole("status")).toHaveText("Escolha a data de check-out");
    await pickDate(page, checkOut);
    await expect(dialog.getByRole("status")).toContainText("4 noites");
    await expect(dialog.locator(`[data-date="${checkIn}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(dialog.locator("td.bg-nevoa")).toHaveCount(3);
    // Rótulos em português nos campos.
    await expect(page.getByRole("button", { name: /^Check-in/ })).toContainText(/\d+ de \w+/);

    await dialog.getByRole("button", { name: "Limpar datas" }).click();
    await expect(page.getByRole("button", { name: /^Check-in/ })).toContainText("Adicionar data");
    await expect(dialog.locator("td.bg-nevoa")).toHaveCount(0);
  });

  test("temporada vai até 29 noites; mensal começa em 30", async ({ page, isMobile }) => {
    await openSearch(page, isMobile);
    await page.getByRole("button", { name: /^Check-in/ }).click();
    await pickDate(page, isoInDays(5));
    const tooLong = datesDialog(page).locator(`[data-date="${isoInDays(5 + 30)}"]`);
    for (let i = 0; i < 3 && !(await tooLong.isVisible()); i += 1) {
      await datesDialog(page).getByRole("button", { name: "Próximo mês" }).click();
    }
    await expect(tooLong).toHaveAttribute("aria-disabled", "true");
    await datesDialog(page).getByRole("button", { name: "Concluir" }).click();

    const mensal = page.getByRole("radio", { name: "Mensal" });
    await page.locator("label", { has: mensal }).click();
    await page.getByRole("button", { name: /^Check-out/ }).click();
    await expect(datesDialog(page).getByText("A partir de 30 noites.")).toBeVisible();
    const short = datesDialog(page).locator(`[data-date="${isoInDays(5 + 10)}"]`);
    for (let i = 0; i < 3 && !(await short.isVisible()); i += 1) {
      await datesDialog(page).getByRole("button", { name: "Próximo mês" }).click();
    }
    await expect(short).toHaveAttribute("aria-disabled", "true");
    await pickDate(page, isoInDays(5 + 31));
    await datesDialog(page).getByRole("button", { name: "Concluir" }).click();
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(`/mensal?chegada=${isoInDays(5)}&saida=${isoInDays(36)}`);
  });

  test("hóspedes: adultos e crianças, sem negativos, somados na busca", async ({
    page,
    isMobile,
  }) => {
    await openSearch(page, isMobile);
    await page.getByRole("button", { name: /^Quem/ }).click();
    const dialog = page.getByRole("dialog", { name: "Hóspedes" });
    await expect(dialog.getByRole("button", { name: "Remover adulto" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Remover criança" })).toBeDisabled();
    // Criança sem adulto inclui um adulto.
    await dialog.getByRole("button", { name: "Adicionar criança" }).click();
    await expect(dialog.getByRole("status", { name: "1 adulto" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Remover adulto" })).toBeDisabled();
    await dialog.getByRole("button", { name: "Adicionar adulto" }).click();
    await expect(page.getByRole("button", { name: /^Quem/ })).toContainText("3 hóspedes");

    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL("/temporada?hospedes=3");
  });

  test("painéis: fecham ao clicar fora e com Esc, e mantêm os valores", async ({
    page,
    isMobile,
  }) => {
    await openSearch(page, isMobile);
    const quem = page.getByRole("button", { name: /^Quem/ });
    await quem.click();
    await page
      .getByRole("dialog", { name: "Hóspedes" })
      .getByRole("button", { name: "Adicionar adulto" })
      .click();
    await page.getByRole("heading", { level: 1 }).click();
    await expect(page.getByRole("dialog", { name: "Hóspedes" })).toBeHidden();
    await expect(quem).toContainText("1 hóspede");

    const checkIn = page.getByRole("button", { name: /^Check-in/ });
    await checkIn.click();
    await pickDate(page, isoInDays(3));
    await page.keyboard.press("Escape");
    await expect(datesDialog(page)).toBeHidden();
    await expect(checkIn).toBeFocused();
    await checkIn.click();
    await expect(datesDialog(page).locator(`[data-date="${isoInDays(3)}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("teclado: abrir datas, percorrer com setas e escolher com Enter", async ({
    page,
    isMobile,
  }) => {
    await openSearch(page, isMobile);
    const checkIn = page.getByRole("button", { name: /^Check-in/ });
    await checkIn.focus();
    await page.keyboard.press("Enter");
    const today = datesDialog(page).locator(`[data-date="${isoInDays(0)}"]`);
    await expect(today).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(datesDialog(page).locator(`[data-date="${isoInDays(7)}"]`)).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(datesDialog(page).getByRole("status")).toContainText("2 noites");
  });

  test("busca completa chega à listagem com os filtros preenchidos", async ({ page, isMobile }) => {
    await openSearch(page, isMobile);
    await page.getByRole("combobox", { name: "Onde?" }).fill("Ubatuba");
    await page.getByRole("option", { name: /Ubatuba/ }).click();
    await page.getByRole("button", { name: /^Check-in/ }).click();
    await pickDate(page, isoInDays(20));
    await pickDate(page, isoInDays(25));
    await datesDialog(page).getByRole("button", { name: "Concluir" }).click();
    await page.getByRole("button", { name: /^Quem/ }).click();
    const adicionar = page
      .getByRole("dialog", { name: "Hóspedes" })
      .getByRole("button", { name: "Adicionar adulto" });
    await adicionar.click();
    await adicionar.click();
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(
      `/temporada?regiao=ubatuba&chegada=${isoInDays(20)}&saida=${isoInDays(25)}&hospedes=2`,
    );
    if (isMobile) await page.getByRole("button", { name: /^Filtros/ }).click();
    const filtros = page.getByRole("form", { name: "Filtros" });
    await expect(filtros.getByLabel("Região")).toHaveValue("ubatuba");
    await expect(filtros.getByLabel("Chegada")).toHaveValue(isoInDays(20));
    await expect(filtros.getByLabel("Hóspedes")).toHaveValue("2");
  });

  test("painéis abertos: sem violações WCAG 2.1 AA e sem cortes na tela", async ({
    page,
    isMobile,
  }) => {
    await openSearch(page, isMobile);
    const width = page.viewportSize()!.width;
    for (const [trigger, panel] of [
      [page.getByRole("combobox", { name: "Onde?" }), page.getByRole("listbox")],
      [page.getByRole("button", { name: /^Check-in/ }), datesDialog(page)],
      [page.getByRole("button", { name: /^Quem/ }), page.getByRole("dialog", { name: "Hóspedes" })],
    ] as const) {
      await trigger.click();
      await expect(panel).toBeVisible();
      const box = (await panel.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      // Nada da página fica por cima do painel: amostra uma grade de pontos.
      await panel.scrollIntoViewIfNeeded();
      const covered = await panel.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const points: string[] = [];
        for (let i = 1; i < 10; i += 1) {
          for (let j = 1; j < 10; j += 1) {
            const x = r.left + (r.width * i) / 10;
            const y = Math.min(r.top + (r.height * j) / 10, window.innerHeight - 1);
            const hit = document.elementFromPoint(x, y);
            // A barra fixa do celular fica por cima de tudo que rola, como esperado.
            if (hit?.closest("nav[aria-label=Atalhos]")) continue;
            if (hit && !el.contains(hit)) points.push(hit.outerHTML.slice(0, 60));
          }
        }
        return points;
      });
      expect(covered).toEqual([]);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      await page.keyboard.press("Escape");
    }
  });
});
