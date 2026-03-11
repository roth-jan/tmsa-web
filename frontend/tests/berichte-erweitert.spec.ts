import { test, expect } from "@playwright/test";

async function loginViaApi(page: any, user = "admin", pass = "Admin1!") {
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

test.describe("Erweiterte Berichte", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/berichte");
    await expect(
      page.getByRole("heading", { name: "Berichte" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("Berichte-Seite zeigt 10 Tabs", async ({ page }) => {
    const tabs = [
      "Touren", "Avise", "TU-Kosten", "Abfahrten", "Sendungen",
      "Abrechnungen", "Ausfallfrachten", "DFUE", "Fahrzeugliste", "Konditionen",
    ];
    for (const tab of tabs) {
      await expect(page.getByRole("tab", { name: tab, exact: true })).toBeVisible();
    }
  });

  test("Ausfallfrachten laden", async ({ page }) => {
    await page.getByRole("tab", { name: "Ausfallfrachten" }).click();
    await page.waitForTimeout(500);

    // Datum setzen auf breiten Bereich
    const vonInput = page.getByLabel("Datum von");
    await vonInput.fill("2026-01-01");
    const bisInput = page.getByLabel("Datum bis");
    await bisInput.fill("2026-12-31");

    await page.getByRole("button", { name: "Laden" }).click();
    await page.waitForTimeout(1500);

    // Grid sollte sichtbar sein
    await expect(page.locator(".ag-root-wrapper")).toBeVisible();
    await expect(page.getByText(/Einträge gefunden/)).toBeVisible();
  });

  test("Fahrzeugliste laden", async ({ page }) => {
    await page.getByRole("tab", { name: "Fahrzeugliste" }).click();
    await page.waitForTimeout(500);

    const vonInput = page.getByLabel("Datum von");
    await vonInput.fill("2026-01-01");
    const bisInput = page.getByLabel("Datum bis");
    await bisInput.fill("2026-12-31");

    await page.getByRole("button", { name: "Laden" }).click();
    await page.waitForTimeout(1500);

    await expect(page.locator(".ag-root-wrapper")).toBeVisible();
    await expect(page.getByText(/Einträge gefunden/)).toBeVisible();
  });

  test("Konditionsübersicht zeigt Seed-Daten", async ({ page }) => {
    await page.getByRole("tab", { name: "Konditionen" }).click();
    await page.waitForTimeout(500);

    // Kein Datumsfilter nötig bei Konditionen
    await page.getByRole("button", { name: "Laden" }).click();
    await page.waitForTimeout(1500);

    await expect(page.locator(".ag-root-wrapper")).toBeVisible();
    // Seed hat mindestens 1 Kondition
    await expect(page.getByText(/Einträge gefunden/)).toBeVisible();
    // Es sollte mindestens 1 Eintrag da sein
    const rows = page.locator(".ag-row");
    await expect(rows.first()).toBeVisible({ timeout: 3000 });
  });
});
