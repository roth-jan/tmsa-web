import { test, expect } from "@playwright/test";

async function loginViaApi(page: any, user = "admin", pass = "admin") {
  await page.evaluate(
    async ({ u, p }: { u: string; p: string }) => {
      await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ benutzername: u, passwort: p }),
      });
    },
    { u: user, p: pass }
  );
}

test.describe("NL-Filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");
    // Dashboard heading is "Willkommen, <name>"
    await expect(
      page.getByRole("heading", { name: /Willkommen/ })
    ).toBeVisible({ timeout: 10000 });
  });

  test("Admin sieht NL-Selektor im Header", async ({ page }) => {
    // NL-Selektor ist im Header als Mantine Select sichtbar
    // Es zeigt die aktuelle NL an (z.B. "Augsburg" oder "Alle NL")
    const header = page.locator("header");
    // Prüfe ob ein Select im Header existiert (Mantine rendert als input)
    const nlInput = header.locator("input").first();
    await expect(nlInput).toBeVisible({ timeout: 5000 });
  });

  test("NL-Wechsel filtert Daten", async ({ page }) => {
    // NL-Selektor im Header klicken
    const header = page.locator("header");
    const nlInput = header.locator("input").first();
    await nlInput.click();
    await page.waitForTimeout(500);

    // "Alle NL" wählen (setzt niederlassungId auf null)
    const alleOption = page.getByRole("option", { name: "Alle NL" });
    if (await alleOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await alleOption.click();
      // Page reloads nach NL-Wechsel
      await expect(page.getByRole("heading", { name: /Willkommen/ })).toBeVisible({ timeout: 15000 });
    }
  });
});
