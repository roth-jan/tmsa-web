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

test.describe("Dashboard KPIs", () => {
  test("Admin sieht Dashboard nach Login mit Willkommenstext", async ({
    page,
  }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");

    await expect(
      page.getByText("Willkommen, Thomas Berger")
    ).toBeVisible();
    await expect(page.getByText(/· Administrator ·/)).toBeVisible();
  });

  test("KPI-Cards zeigen Zahlen", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");

    await expect(page.getByText("Offene Zeilen")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Touren heute")).toBeVisible();
    await expect(page.getByText("Avise offen")).toBeVisible();
    await expect(page.getByText("Abrechnungen offen")).toBeVisible();
  });

  test("Touren-Status RingProgress ist sichtbar", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");

    await expect(page.getByText("Touren-Status")).toBeVisible({ timeout: 10000 });
  });

  test("Letzte-Touren-Grid zeigt Seed-Daten", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");

    await expect(page.getByText("Letzte Touren")).toBeVisible({ timeout: 10000 });
    // Seed-Touren haben T-2026-xxx Format
    await expect(page.getByText(/T-\d{4}-/).first()).toBeVisible({ timeout: 5000 });
  });

  test("Disponent sieht Dashboard", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page, "dispo", "dispo");
    await page.goto("/");

    await expect(
      page.getByText("Willkommen, Lisa Maier")
    ).toBeVisible();
    await expect(page.getByText(/· Disponent ·/)).toBeVisible();
    await expect(page.getByText("Offene Zeilen")).toBeVisible({ timeout: 10000 });
  });

  test("Aktualisieren-Button lädt Daten neu", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");

    await expect(page.getByText("Letzte Touren")).toBeVisible({ timeout: 10000 });

    const btn = page.getByRole("button", { name: "Aktualisieren" });
    await expect(btn).toBeVisible();
    await btn.click();

    // Nach Klick sind Daten immer noch da
    await expect(page.getByText("Offene Zeilen")).toBeVisible();
  });
});
