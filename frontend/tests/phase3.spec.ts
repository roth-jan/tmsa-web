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

/** Mantine Select: typ einen Text und wähle die erste sichtbare Option */
async function selectOption(page: any, label: string, searchText: string) {
  const input = page.getByRole("textbox", { name: label });
  await input.click();
  await input.fill(searchText);
  await page.locator("[role='option']:visible").first().click();
}

// ============================================================
// 3.1 Nacharbeit
// ============================================================
test.describe("Nacharbeit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/nacharbeit");
    await expect(page.getByRole("heading", { name: "Nacharbeit" })).toBeVisible();
  });

  test("Nacharbeit-Seite laden und Touren anzeigen", async ({ page }) => {
    // Datum-Filter setzen (breit genug für Seed-Daten)
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    // Seed-Touren sollten sichtbar sein
    await expect(page.getByText("T-2026-001").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("T-2026-002").first()).toBeVisible();
  });

  test("Tour-Detail anzeigen und Quittung-Checkbox sichtbar", async ({ page }) => {
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    await expect(page.getByText("T-2026-002").first()).toBeVisible({ timeout: 10000 });

    // Tour anklicken → Detail-Panel erscheint
    await page.getByText("T-2026-002").first().click();
    await expect(page.getByText("Detail: T-2026-002")).toBeVisible({ timeout: 5000 });

    // Quittung-Checkbox ist sichtbar
    await expect(page.getByRole("checkbox", { name: "Quittung" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Leerfahrt" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Abrechnungsstopp" })).toBeVisible();
  });

  test("Bulk-Quittung für ausgewählte Touren", async ({ page }) => {
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    await expect(page.getByText("T-2026-001").first()).toBeVisible({ timeout: 10000 });

    // Erste Checkbox im Grid anklicken
    const firstCheckbox = page.locator('.ag-row .ag-checkbox-input').first();
    await firstCheckbox.click();

    // Quittung-Button sollte erscheinen
    await expect(page.getByRole("button", { name: /Quittung für/i })).toBeVisible({ timeout: 3000 });
  });
});

// ============================================================
// 3.2 Abfahrten + Borderos
// ============================================================
test.describe("Abfahrten", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/abfahrten");
    await expect(page.getByRole("heading", { name: "Abfahrten" })).toBeVisible();
  });

  test("Abfahrten-Tabelle mit Seed-Daten", async ({ page }) => {
    await expect(page.locator(".ag-row").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AF-2026-001")).toBeVisible();
  });

  test("Abfahrt auswählen zeigt Borderos", async ({ page }) => {
    await expect(page.getByText("AF-2026-001")).toBeVisible({ timeout: 10000 });
    await page.getByText("AF-2026-001").click();

    // Bordero-Bereich zeigt "Borderos von AF-2026-001"
    await expect(page.getByText("Borderos von AF-2026-001")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("B-2026-001")).toBeVisible({ timeout: 5000 });
  });

  test("Abfahrt aus Tour Button ist sichtbar", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Abfahrt aus Tour" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Neue Abfahrt" })).toBeVisible();
  });

  test("Abfahrt aus Tour Modal öffnen", async ({ page }) => {
    await page.getByRole("button", { name: "Abfahrt aus Tour" }).click();
    await expect(page.getByText("Abfahrt aus Tour erstellen")).toBeVisible();
    await expect(page.getByText(/Tour-Status wird auf.*abgefahren/i)).toBeVisible();
  });
});

// ============================================================
// 3.3 Sendungsbildung
// ============================================================
test.describe("Sendungsbildung", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/sendungsbildung");
    await expect(page.getByRole("heading", { name: "Sendungsbildung" })).toBeVisible();
  });

  test("Sendungsbildung-Seite laden", async ({ page }) => {
    // Basis-Elemente sichtbar
    await expect(page.getByText("Verfügbare Artikelzeilen")).toBeVisible();
    await expect(page.getByText("Sendungen")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aktualisieren" })).toBeVisible();
  });

  test("Aktualisieren lädt Daten", async ({ page }) => {
    await page.getByRole("button", { name: "Aktualisieren" }).click();
    // Warten auf Daten-Laden (entweder Zeilen oder "0" Count)
    await page.waitForTimeout(2000);
    await expect(page.getByText(/Sendungen/)).toBeVisible();
  });

  test("Richtung-Filter ist vorhanden", async ({ page }) => {
    // Richtungs-Select Label im Filter-Bereich
    await expect(page.getByText("Richtung").first()).toBeVisible();
  });
});

// ============================================================
// Navigation: Operativ-Gruppe sichtbar
// ============================================================
test.describe("Navigation Phase 3", () => {
  test("Operativ-Gruppe ist im Menü sichtbar", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");

    await expect(page.getByText("Operativ")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abfahrten" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nacharbeit" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sendungsbildung" })).toBeVisible();
  });

  test("Disponent sieht Operativ-Menü", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page, "dispo", "dispo");
    await page.goto("/");

    await expect(page.getByText("Operativ")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abfahrten" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nacharbeit" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sendungsbildung" })).toBeVisible();
  });
});
