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

// Korrekt formatierter VDA 4913 Text
const VDA_TEXT = [
  "511BMW       202603150001",
  "512LF001  BOSCH GMBH                            ",
  "513MUC    BMW WERK MUENCHEN                      ",
  "514001STOSSDAEMPFER VORN            000500ST  001250",
  "514002QUERLENKER-SATZ               000200ST  000800",
  "519ENDE",
].join("\n");

test.describe("EDI Import", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/edi-simulator");
    await expect(
      page.getByRole("heading", { name: "EDI Eingang" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("EDI-Seite zeigt drei Tabs", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Simulator" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Import" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Verlauf" })).toBeVisible();
  });

  test("Simulator-Tab funktioniert wie bisher", async ({ page }) => {
    await page.getByRole("textbox", { name: "OEM" }).click();
    await page.getByRole("option", { name: "BMW" }).click();
    await page.getByRole("textbox", { name: "Werk / Lieferant" }).click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Nachricht generieren" }).click();

    await expect(page.getByText("511BMW")).toBeVisible();
    await expect(page.getByText("519ENDE")).toBeVisible();
  });

  test("Import-Tab: Text-Paste und Format-Erkennung", async ({ page }) => {
    await page.getByRole("tab", { name: "Import" }).click();
    await page.waitForTimeout(500);

    // Mantine Textarea hat ein hidden helper textarea, daher spezifischer Locator
    const textarea = page.getByRole("textbox", { name: "EDI-Nachricht einfügen" });
    await textarea.fill(VDA_TEXT);

    await page.getByRole("button", { name: "Vorschau" }).click();
    await page.waitForTimeout(3000);

    // Format-Badge sollte erscheinen
    await expect(page.getByText("VDA4913")).toBeVisible({ timeout: 5000 });
  });

  test("Import-Tab: Vorschau zeigt geparste Daten", async ({ page }) => {
    await page.getByRole("tab", { name: "Import" }).click();
    await page.waitForTimeout(500);

    const textarea = page.getByRole("textbox", { name: "EDI-Nachricht einfügen" });
    await textarea.fill(VDA_TEXT);

    await page.getByRole("button", { name: "Vorschau" }).click();
    await page.waitForTimeout(3000);

    // Erkannte Avise Section
    await expect(page.getByText(/Erkannte Avise/)).toBeVisible({ timeout: 5000 });
    // Werk und Lieferant-Nr prüfen (genauer Locator wegen textarea die auch MUC enthält)
    await expect(page.getByText("Werk: MUC")).toBeVisible();
    await expect(page.getByText("Lieferant: LF001")).toBeVisible();
  });

  test("Import-Tab: Importieren erstellt Avis", async ({ page }) => {
    await page.getByRole("tab", { name: "Import" }).click();
    await page.waitForTimeout(500);

    const textarea = page.getByRole("textbox", { name: "EDI-Nachricht einfügen" });
    await textarea.fill(VDA_TEXT);

    await page.getByRole("button", { name: "Importieren" }).click();
    await page.waitForTimeout(5000);

    // Erfolgsmeldung prüfen (exakter Text um strict mode violation zu vermeiden)
    await expect(page.getByText("Import erfolgreich")).toBeVisible({ timeout: 10000 });
  });

  test("Verlauf-Tab zeigt Import-Historik", async ({ page }) => {
    // Erst einen Import machen
    await page.getByRole("tab", { name: "Import" }).click();
    await page.waitForTimeout(500);

    const textarea = page.getByRole("textbox", { name: "EDI-Nachricht einfügen" });
    await textarea.fill(VDA_TEXT);
    await page.getByRole("button", { name: "Importieren" }).click();
    await page.waitForTimeout(5000);

    // Dann Verlauf-Tab
    await page.getByRole("tab", { name: "Verlauf" }).click();
    await page.waitForTimeout(2000);

    // Grid sollte sichtbar sein
    await expect(page.locator(".ag-root-wrapper")).toBeVisible({ timeout: 5000 });
    const rows = page.locator(".ag-row");
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
  });
});
