import { test, expect } from "@playwright/test";

test("anonymous user reads an article", async ({ page }) => {
  await page.goto("/leyes/codigo-civil");

  const sectionLink = page.locator('a[href*="/leyes/codigo-civil/"]').first();
  await sectionLink.click();

  await expect(page.locator('[id^="articulo-"]').first()).toBeVisible();
});

test("cmd+k search navigates to an article anchor", async ({ page }) => {
  await page.goto("/leyes");

  await page.keyboard.press("ControlOrMeta+k");
  const overlay = page.locator("form").filter({ hasText: "ESC" });
  await overlay.getByPlaceholder("Buscar leyes, artículos, palabras clave…").fill("contrato");

  const result = page.locator("ul li button").first();
  await expect(result).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(/\/leyes\/[^/]+\/[^#]+#articulo-/);
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
    await page.goto("/leyes/codigo-civil");
    await page.locator('a[href*="/leyes/codigo-civil/"]').first().click();

    const paragraph = page.locator("p").filter({ hasText: /.{20,}/ }).first();
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
    await page.goto("/leyes/codigo-civil");
    await page.locator('a[href*="/leyes/codigo-civil/"]').first().click();

    await page.getByRole("button", { name: "Notas" }).click();
    await page.getByRole("button", { name: "Conocer Pro" }).click();

    await expect(page.getByText("LexGT Pro")).toBeVisible();
  });
});
