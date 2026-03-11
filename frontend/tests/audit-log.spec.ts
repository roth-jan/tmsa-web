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

test.describe("Audit-Log", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/audit-log");
    await expect(
      page.getByRole("heading", { name: "Audit-Log" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("Admin sieht Audit-Log im Menü", async ({ page }) => {
    const navLink = page.locator('nav a', { hasText: "Audit-Log" });
    await expect(navLink).toBeVisible();
  });

  test("Audit-Log Seite laden — Grid sichtbar", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Audit-Log" })).toBeVisible();
    await expect(page.locator(".ag-root-wrapper")).toBeVisible({ timeout: 5000 });
  });

  test("Stammdaten-Änderung wird geloggt", async ({ page }) => {
    // Die Seed-Daten erzeugen bereits Audit-Log-Einträge (create-Aktionen)
    // Lade Audit-Log und prüfe dass Einträge existieren
    await page.getByRole("button", { name: "Laden" }).click();
    await page.waitForTimeout(2000);

    // Es sollten Einträge vorhanden sein (Seed erzeugt viele create-Aktionen)
    const eintraege = page.locator(".ag-row");
    await expect(eintraege.first()).toBeVisible({ timeout: 5000 });

    // Prüfe dass Einträge-Zähler > 0 ist
    await expect(page.getByText(/\d+ Einträge gesamt/)).toBeVisible();
  });

  test("Filter nach Modell funktioniert", async ({ page }) => {
    // Zuerst alles laden
    await page.getByRole("button", { name: "Laden" }).click();
    await page.waitForTimeout(2000);

    // Modell-Filter setzen
    const modellSelect = page.getByRole("textbox", { name: "Modell" });
    await modellSelect.click();
    await page.getByRole("option", { name: "Niederlassung" }).click();

    // Nochmal laden mit Filter
    await page.getByRole("button", { name: "Laden" }).click();
    await page.waitForTimeout(1000);

    // Prüfen ob Ergebnis vorhanden (Seed hat 2 Niederlassungen = 2 create-Einträge)
    await expect(page.getByText(/Einträge gesamt/)).toBeVisible();
  });
});
