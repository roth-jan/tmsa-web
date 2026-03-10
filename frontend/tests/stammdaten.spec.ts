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

test.describe("Werke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/werke");
    await expect(page.getByRole("heading", { name: "Werke" })).toBeVisible();
  });

  test("zeigt Werke-Tabelle mit Daten", async ({ page }) => {
    await expect(page.locator(".ag-row").first()).toBeVisible();
  });

  test("Neu anlegen öffnet Modal", async ({ page }) => {
    await page.getByRole("button", { name: "Neu anlegen" }).click();
    await expect(page.getByText("Werke anlegen")).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Werkscode")).toBeVisible();
  });

  test("Anlegen + Bearbeiten + Löschen eines Werks", async ({ page }) => {
    const name = `Testwerk-${Date.now()}`;

    // Anlegen
    await page.getByRole("button", { name: "Neu anlegen" }).click();
    await expect(page.getByText("Werke anlegen")).toBeVisible();
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Werkscode").fill("TST");
    // OEM-Dropdown auswählen (Pflichtfeld)
    await page.getByRole("textbox", { name: "OEM" }).click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Speichern" }).click();

    // Warten bis Modal geschlossen und Tabelle aktualisiert
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });

    // Zeile auswählen durch Klick auf den Text
    await page.getByText(name).click();

    // Bearbeiten
    await page.getByRole("button", { name: "Bearbeiten" }).click();
    await expect(page.getByText("Werke bearbeiten")).toBeVisible();
    await page.getByLabel("Werkscode").fill("TST2");
    await page.getByRole("button", { name: "Speichern" }).click();

    // Prüfen dass geändert
    await expect(page.getByText("TST2")).toBeVisible({ timeout: 5000 });

    // Zeile nochmal auswählen
    await page.getByText(name).click();

    // Löschen
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Löschen" }).click();

    // Prüfen dass weg
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe("KFZ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/kfz");
    await expect(
      page.getByRole("heading", { name: "Fahrzeuge (KFZ)" })
    ).toBeVisible();
  });

  test("zeigt KFZ-Tabelle mit Daten", async ({ page }) => {
    await expect(page.locator(".ag-row").first()).toBeVisible();
  });

  test("Neu anlegen öffnet Modal mit Dropdown", async ({ page }) => {
    await page.getByRole("button", { name: "Neu anlegen" }).click();
    await expect(page.getByText("Fahrzeuge (KFZ) anlegen")).toBeVisible();
    await expect(page.getByLabel("Kennzeichen")).toBeVisible();
    // TU-Dropdown — use textbox role to avoid ambiguity with listbox
    await expect(
      page.getByRole("textbox", { name: "Transport-Unternehmer" })
    ).toBeVisible();
  });

  test("Anlegen + Löschen eines KFZ", async ({ page }) => {
    const kennzeichen = `TEST-${Date.now().toString().slice(-5)}`;

    // Anlegen
    await page.getByRole("button", { name: "Neu anlegen" }).click();
    await expect(page.getByText("Fahrzeuge (KFZ) anlegen")).toBeVisible();
    await page.getByLabel("Kennzeichen").fill(kennzeichen);

    // TU-Dropdown auswählen (Mantine Select) — use textbox role
    await page
      .getByRole("textbox", { name: "Transport-Unternehmer" })
      .click();
    // Erste Option wählen
    await page.getByRole("option").first().click();

    await page.getByRole("button", { name: "Speichern" }).click();

    // Warten bis in Tabelle sichtbar
    await expect(page.getByText(kennzeichen)).toBeVisible({ timeout: 5000 });

    // Zeile auswählen
    await page.getByText(kennzeichen).click();

    // Löschen
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Löschen" }).click();

    // Prüfen dass weg
    await expect(page.getByText(kennzeichen)).not.toBeVisible({
      timeout: 5000,
    });
  });
});
