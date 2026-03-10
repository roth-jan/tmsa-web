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

// EDIFACT IFTSTA message with tour reference + status
const IFTSTA_TEXT = [
  "UNA:+.? '",
  "UNB+UNOC:3+CARRIER+TMSA+260310:1400+1'",
  "UNH+1+IFTSTA:D:99B:UN'",
  "CNI+1+T-2026-001'",
  "STS+1+5'",
  "RFF+CU:T-2026-001'",
  "DTM+334:202603101400:203'",
  "LOC+5+MUENCHEN'",
  "UNT+7+1'",
  "UNZ+1+1'",
].join("");

test.describe("IFTSTA EDI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/edi-simulator");
    await expect(
      page.getByRole("heading", { name: "EDI Eingang" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("IFTSTA: Format-Erkennung im Import-Tab", async ({ page }) => {
    await page.getByRole("tab", { name: "Import" }).click();
    await page.waitForTimeout(500);

    const textarea = page.getByRole("textbox", { name: "EDI-Nachricht einfügen" });
    await textarea.fill(IFTSTA_TEXT);

    await page.getByRole("button", { name: "Vorschau" }).click();
    await page.waitForTimeout(3000);

    // Badge with format text (use locator that excludes textarea)
    await expect(page.locator(".mantine-Badge-label", { hasText: "IFTSTA" })).toBeVisible({ timeout: 5000 });
  });

  test("IFTSTA: Status-Updates in Vorschau", async ({ page }) => {
    await page.getByRole("tab", { name: "Import" }).click();
    await page.waitForTimeout(500);

    const textarea = page.getByRole("textbox", { name: "EDI-Nachricht einfügen" });
    await textarea.fill(IFTSTA_TEXT);

    await page.getByRole("button", { name: "Vorschau" }).click();
    await page.waitForTimeout(3000);

    await expect(page.getByText(/Erkannte Status-Updates/)).toBeVisible({ timeout: 5000 });
    // Referenz is in textarea too, so use more specific locator
    await expect(page.locator("text=Referenz: T-2026-001")).toBeVisible();
    await expect(page.getByText("Zugestellt")).toBeVisible();
  });

  test("IFTSTA: Import aktualisiert Tour-Status", async ({ page }) => {
    await page.getByRole("tab", { name: "Import" }).click();
    await page.waitForTimeout(500);

    const textarea = page.getByRole("textbox", { name: "EDI-Nachricht einfügen" });
    await textarea.fill(IFTSTA_TEXT);

    await page.getByRole("button", { name: "Importieren" }).click();
    await page.waitForTimeout(5000);

    await expect(page.getByText("Import erfolgreich")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Tour\(en\) aktualisiert/)).toBeVisible();
  });

  test("IFTSTA: Verlauf zeigt IFTSTA Import", async ({ page }) => {
    // Erst importieren
    await page.getByRole("tab", { name: "Import" }).click();
    await page.waitForTimeout(500);

    const textarea = page.getByRole("textbox", { name: "EDI-Nachricht einfügen" });
    await textarea.fill(IFTSTA_TEXT);
    await page.getByRole("button", { name: "Importieren" }).click();
    await page.waitForTimeout(5000);

    // Dann Verlauf prüfen
    await page.getByRole("tab", { name: "Verlauf" }).click();
    await page.waitForTimeout(2000);

    await expect(page.locator(".ag-root-wrapper")).toBeVisible({ timeout: 5000 });
    const rows = page.locator(".ag-row");
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
  });
});
