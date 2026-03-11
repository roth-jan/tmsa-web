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

test.describe("Forecast", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/forecast");
    await expect(
      page.getByRole("heading", { name: "Forecast" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("Forecast-Seite zeigt zwei Tabs", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Forecasts" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Ist vs Soll" })).toBeVisible();
  });

  test("Forecast-Liste zeigt Seed-Daten", async ({ page }) => {
    await page.waitForTimeout(1500);
    await expect(page.locator(".ag-root-wrapper")).toBeVisible();
    const rows = page.locator(".ag-row");
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
    // Seed: "BMW München Q2 2026"
    await expect(page.getByText("BMW München Q2 2026")).toBeVisible();
  });

  test("Neuer Forecast anlegen", async ({ page }) => {
    await page.getByRole("button", { name: "Neuer Forecast" }).click();
    await page.waitForTimeout(500);

    await page.getByLabel("Bezeichnung").fill("Test Forecast KW20");

    // OEM auswählen
    await page.getByRole("textbox", { name: "OEM" }).click();
    await page.getByRole("option").first().click();

    // Werk auswählen
    await page.getByRole("textbox", { name: "Werk" }).click();
    await page.getByRole("option").first().click();

    await page.getByLabel("Gültig von").fill("2026-05-01");
    await page.getByLabel("Gültig bis").fill("2026-05-31");

    // KW-Detail ausfüllen (bereits 1 vorhanden)
    const kwInputs = page.getByLabel("KW");
    await kwInputs.fill("20");
    const mengeInputs = page.getByLabel("Menge");
    await mengeInputs.fill("500");

    await page.getByRole("button", { name: "Speichern" }).click();
    await page.waitForTimeout(2000);

    // Modal sollte geschlossen sein und neuer Eintrag in der Liste
    await expect(page.getByText("Test Forecast KW20")).toBeVisible({ timeout: 5000 });
  });

  test("Ist vs Soll Vergleich laden", async ({ page }) => {
    await page.getByRole("tab", { name: "Ist vs Soll" }).click();
    await page.waitForTimeout(500);

    // Forecast auswählen
    const select = page.getByRole("textbox", { name: "Forecast" });
    await select.click();
    await page.getByRole("option").first().click();

    await page.getByRole("button", { name: "Laden" }).click();
    await page.waitForTimeout(2000);

    await expect(page.locator(".ag-root-wrapper")).toBeVisible();
    // Seed hat 3 KW-Details
    const rows = page.locator(".ag-row");
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
  });
});
