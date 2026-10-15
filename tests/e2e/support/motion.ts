import type { Page } from "@playwright/test";

/**
 * Espera as animações curtas (entrada, revelação, transições) terminarem,
 * para medir o estado final que o visitante vê. Ignora as infinitas (ondas).
 */
export async function waitForAnimations(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.effect?.getTiming().iterations === Infinity ||
          animation.playState !== "running",
      ),
  );
}
