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

test.describe("Benutzer-Verwaltung", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/benutzer");
  });

  test("Admin sieht Benutzer-Seite mit Tabs", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Benutzer-Verwaltung" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Benutzer" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Rollen" })).toBeVisible();
  });

  test("Benutzer-Tabelle zeigt Seed-Daten", async ({ page }) => {
    // Warte auf Grid-Daten
    await expect(page.getByRole("gridcell", { name: "admin", exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("gridcell", { name: "Berger" })).toBeVisible();
    await expect(page.getByRole("gridcell", { name: "Maier" })).toBeVisible();
  });

  test("Neuen Benutzer anlegen", async ({ page }) => {
    await page.getByRole("button", { name: "Neuer Benutzer" }).click();
    await expect(page.getByRole("heading", { name: "Neuer Benutzer" })).toBeVisible();

    await page.getByLabel("Benutzername").fill("testuser");
    await page.getByLabel("Vorname").fill("Test");
    await page.getByLabel("Nachname").fill("Nutzer");
    await page.getByLabel("E-Mail").fill("test@example.com");
    await page.getByLabel("Passwort").fill("test1234");

    await page.getByRole("button", { name: "Speichern" }).click();

    // Modal schließt sich, neuer User in Liste
    await expect(page.getByRole("gridcell", { name: "testuser" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("gridcell", { name: "Nutzer" })).toBeVisible();
  });

  test("Benutzer bearbeiten", async ({ page }) => {
    // Warten bis Grid geladen
    await expect(page.getByRole("gridcell", { name: "admin", exact: true })).toBeVisible({ timeout: 10000 });

    // Doppelklick auf "Maier" Gridcell
    await page.getByRole("gridcell", { name: "Maier" }).dblclick();
    await expect(page.getByRole("heading", { name: "Benutzer bearbeiten" })).toBeVisible();

    // Nachname ändern
    const nachnameInput = page.getByLabel("Nachname");
    await nachnameInput.clear();
    await nachnameInput.fill("Maier-Test");

    await page.getByRole("button", { name: "Speichern" }).click();

    // Geänderter Name sichtbar
    await expect(page.getByRole("gridcell", { name: "Maier-Test" })).toBeVisible({ timeout: 10000 });
  });

  test("Benutzer deaktivieren", async ({ page }) => {
    // Warten bis Grid geladen
    await expect(page.getByRole("gridcell", { name: "admin", exact: true })).toBeVisible({ timeout: 10000 });

    // Falls testuser existiert (aus vorherigem Test), Zeile selektieren
    const testRow = page.getByRole("gridcell", { name: "testuser" });
    if (await testRow.isVisible().catch(() => false)) {
      await testRow.click();
      await expect(page.getByRole("button", { name: "Deaktivieren" })).toBeVisible();

      page.on("dialog", (d) => d.accept());
      await page.getByRole("button", { name: "Deaktivieren" }).click();
    }
  });
});

test.describe("Rollenverwaltung", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/benutzer");
    // Zum Rollen-Tab wechseln
    await page.getByRole("tab", { name: "Rollen" }).click();
  });

  test("Rollen-Tab zeigt Administrator und Disponent", async ({ page }) => {
    const tabPanel = page.getByRole("tabpanel");
    await expect(tabPanel.getByRole("gridcell", { name: "Administrator" })).toBeVisible({ timeout: 10000 });
    await expect(tabPanel.getByRole("gridcell", { name: "Disponent" })).toBeVisible();
  });

  test("Rolle bearbeiten zeigt Rechte-Matrix", async ({ page }) => {
    const tabPanel = page.getByRole("tabpanel");
    await expect(tabPanel.getByRole("gridcell", { name: "Administrator" })).toBeVisible({ timeout: 10000 });

    // Doppelklick auf Administrator im Rollen-Grid
    await tabPanel.getByRole("gridcell", { name: "Administrator" }).dblclick();
    await expect(page.getByRole("heading", { name: "Rolle bearbeiten" })).toBeVisible();

    // Rechte-Matrix prüfen
    await expect(page.getByText("Rechte-Matrix")).toBeVisible();
    await expect(page.getByText("Rechte ausgewählt")).toBeVisible();

    // Checkboxen vorhanden
    await expect(page.locator(".mantine-Modal-body .mantine-Checkbox-input").first()).toBeVisible();
  });
});

test.describe("Passwort ändern", () => {
  test("Passwort-ändern-Button im Header für alle User sichtbar", async ({ page }) => {
    // Disponent (kein benutzer.lesen) sieht den Button trotzdem im Header
    await page.goto("/");
    await loginViaApi(page, "dispo", "dispo");
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Passwort ändern" })).toBeVisible();
  });

  test("Passwort ändern — Erfolg und Re-Login", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");

    // Button im Header klicken
    await page.getByRole("button", { name: "Passwort ändern" }).click();
    await expect(page.getByRole("heading", { name: "Passwort ändern" })).toBeVisible();

    // Felder ausfüllen
    const modal = page.locator(".mantine-Modal-body");
    const passwordInputs = modal.locator("input[type='password']");

    await passwordInputs.nth(0).fill("admin");
    await passwordInputs.nth(1).fill("admin-neu");
    await passwordInputs.nth(2).fill("admin-neu");

    await modal.getByRole("button", { name: "Passwort ändern" }).click();
    await expect(page.getByText("Passwort wurde geändert")).toBeVisible({ timeout: 10000 });

    // Modal schließen
    await modal.getByRole("button", { name: "Abbrechen" }).click();

    // Abmelden + Re-Login mit neuem Passwort
    await page.getByRole("button", { name: "Abmelden" }).click();
    await page.goto("/");
    await loginViaApi(page, "admin", "admin-neu");
    await page.goto("/");
    await expect(page.getByText("Willkommen, Thomas Berger")).toBeVisible({ timeout: 10000 });

    // Passwort zurücksetzen
    await page.getByRole("button", { name: "Passwort ändern" }).click();
    const modal2 = page.locator(".mantine-Modal-body");
    const pwInputs2 = modal2.locator("input[type='password']");
    await pwInputs2.nth(0).fill("admin-neu");
    await pwInputs2.nth(1).fill("admin");
    await pwInputs2.nth(2).fill("admin");
    await modal2.getByRole("button", { name: "Passwort ändern" }).click();
    await expect(page.getByText("Passwort wurde geändert")).toBeVisible({ timeout: 10000 });
  });
});
