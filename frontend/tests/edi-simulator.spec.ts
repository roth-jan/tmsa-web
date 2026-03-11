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

// ============================================================
// EDI Simulator
// ============================================================
test.describe("EDI Simulator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/edi-simulator");
    await expect(
      page.getByRole("heading", { name: "EDI Eingang" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("Seite laden — Heading sichtbar", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "EDI Eingang" })
    ).toBeVisible();
  });

  test("OEM wählen + Nachricht generieren → VDA-Text erscheint", async ({ page }) => {
    // OEM wählen
    await page.getByRole("textbox", { name: "OEM" }).click();
    await page.getByRole("option", { name: "BMW" }).click();

    // Werk/Lieferant wählen
    await page.getByRole("textbox", { name: "Werk / Lieferant" }).click();
    await page.getByRole("option").first().click();

    // Generieren
    await page.getByRole("button", { name: "Nachricht generieren" }).click();

    // VDA 4913 Text muss erscheinen
    await expect(page.getByText("511BMW")).toBeVisible();
    await expect(page.getByText("519ENDE")).toBeVisible();

    // Erkannte Daten
    await expect(page.getByText("Erkannte Daten:")).toBeVisible();
    await expect(page.getByText("AV-EDI-")).toBeVisible();
  });

  test("Importieren → Avis wird erstellt", async ({ page }) => {
    // OEM + Template wählen
    await page.getByRole("textbox", { name: "OEM" }).click();
    await page.getByRole("option", { name: "BMW" }).click();
    await page.getByRole("textbox", { name: "Werk / Lieferant" }).click();
    await page.getByRole("option").first().click();

    // Generieren
    await page.getByRole("button", { name: "Nachricht generieren" }).click();
    await expect(page.getByText("519ENDE")).toBeVisible();

    // Importieren
    await page.getByRole("button", { name: "Importieren" }).click();

    // Erfolgsmeldung
    await expect(page.getByText("erfolgreich importiert")).toBeVisible({ timeout: 10000 });
  });

  test("Nach Import — Link 'Zum Avis' navigiert zur Avis-Seite", async ({ page }) => {
    // OEM + Template wählen + Generieren
    await page.getByRole("textbox", { name: "OEM" }).click();
    await page.getByRole("option", { name: "Daimler" }).click();
    await page.getByRole("textbox", { name: "Werk / Lieferant" }).click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Nachricht generieren" }).click();
    await expect(page.getByText("519ENDE")).toBeVisible();

    // Importieren
    await page.getByRole("button", { name: "Importieren" }).click();
    await expect(page.getByText("erfolgreich importiert")).toBeVisible({ timeout: 10000 });

    // "Zum Avis" klicken
    await page.getByRole("button", { name: "Zum Avis" }).click();

    // Sollte auf /avise navigiert sein
    await expect(page).toHaveURL(/\/avise/);
    await expect(page.getByRole("heading", { name: "Avise" })).toBeVisible();
  });
});
