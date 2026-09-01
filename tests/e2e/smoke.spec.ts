import { test, expect } from "@playwright/test";

test("anonymous user reads a law as one continuous document", async ({ page }) => {
  await page.goto("/leyes/codigo-de-trabajo");

  // La ley completa se sirve en una sola página: los artículos están en el HTML
  // inicial, sin navegar a un capítulo.
  await expect(page.locator('[id^="articulo-"]').first()).toBeVisible();
  expect(await page.locator('[id^="articulo-"]').count()).toBeGreaterThan(50);
});

test("the table of contents scrolls to a chapter", async ({ page }) => {
  await page.goto("/leyes/codigo-de-trabajo");

  const tocLink = page.locator("a[data-toc-id]").nth(1);
  const anchor = await tocLink.getAttribute("href");
  await tocLink.click();

  await expect(page.locator(anchor!)).toBeInViewport({ timeout: 5000 });
});

test("cmd+k search navigates to an article anchor", async ({ page }) => {
  await page.goto("/leyes");

  const overlay = page.locator("form").filter({ has: page.locator("kbd", { hasText: "ESC" }) });
  // El atajo vive en un listener de ShellClient: reintentar hasta que hidrate.
  await expect(async () => {
    await page.keyboard.press("ControlOrMeta+k");
    await expect(overlay).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20000 });

  await overlay.getByPlaceholder("Buscar leyes, artículos, palabras clave…").fill("contrato");

  const result = page.locator("ul li button").first();
  await expect(result).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(/\/leyes\/[^/#]+#articulo-/);
});

const FREE_EMAIL = process.env.PLAYWRIGHT_FREE_USER_EMAIL;
const FREE_PASSWORD = process.env.PLAYWRIGHT_FREE_USER_PASSWORD;

test.describe("authenticated free user", () => {
  test.skip(
    !FREE_EMAIL || !FREE_PASSWORD,
    "Requires PLAYWRIGHT_FREE_USER_EMAIL / PLAYWRIGHT_FREE_USER_PASSWORD"
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/correo|email/i).fill(FREE_EMAIL!);
    await page.getByLabel(/contraseña|password/i).fill(FREE_PASSWORD!);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL("/leyes");
  });

  test("saves a yellow highlight and it persists on reload", async ({ page }) => {
    await page.goto("/leyes/ley-de-orden-publico");

    const paragraph = page.locator("[data-paragraph-id]").filter({ hasText: /.{40,}/ }).first();
    const text = await paragraph.innerText();

    await paragraph.evaluate((el) => {
      const range = document.createRange();
      const textNode = el.firstChild!;
      range.setStart(textNode, 0);
      range.setEnd(textNode, Math.min(10, textNode.textContent?.length ?? 0));
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
    });
    await page.mouse.up();

    await page.getByRole("button", { name: "Destacar" }).click();

    const highlighted = page.locator("mark").filter({ hasText: text.slice(0, 10) });
    await expect(highlighted).toBeVisible();

    await page.reload();
    await expect(highlighted).toBeVisible();
  });

  test("free user opens the right panel and the notes tab shows the paywall", async ({ page }) => {
    await page.goto("/leyes/ley-de-orden-publico");

    await page.getByRole("button", { name: "Notas" }).click();
    await page.getByRole("button", { name: "Conocer Pro" }).click();

    await expect(page.getByText("LexGT Pro")).toBeVisible();
  });
});
