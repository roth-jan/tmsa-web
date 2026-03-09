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

// ============================================================
// 4.1 Navigation
// ============================================================
test.describe("Navigation Phase 4", () => {
  test("Abrechnung-Gruppe ist im Menü sichtbar (Admin)", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");

    await expect(page.getByText("Abrechnung", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "TU-Abrechnung" })).toBeVisible();
  });

  test("Disponent sieht TU-Abrechnung NICHT", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page, "dispo", "dispo");
    await page.goto("/");

    // Abrechnung-Gruppe sollte nicht sichtbar sein (Disponent hat kein tuabrechnung-Recht)
    const abrLinks = page.getByRole("link", { name: "TU-Abrechnung" });
    await expect(abrLinks).toHaveCount(0);
  });
});

// ============================================================
// 4.2 Tab: Bewerten
// ============================================================
test.describe("TU-Abrechnung — Bewerten", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/tu-abrechnung");
    await expect(page.getByRole("heading", { name: "TU-Abrechnung" })).toBeVisible();
  });

  test("Seite laden — 3 Tabs sichtbar", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Bewerten" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Freigeben & Erzeugen" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Abrechnungen" })).toBeVisible();
  });

  test("Vorschau laden zeigt Touren mit Kosten", async ({ page }) => {
    // Bewerten-Tab ist Standard
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Vorschau" }).click();

    // Seed-Tour T-2026-002 sollte sichtbar sein (Status 0, hat TU)
    await expect(page.getByText("T-2026-002").first()).toBeVisible({ timeout: 10000 });

    // Summe sollte sichtbar sein
    await expect(page.getByText("Summe:")).toBeVisible();
  });

  test("Bewerten-Button sichtbar nach Vorschau", async ({ page }) => {
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Vorschau" }).click();

    await expect(page.getByText("T-2026-002").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Jetzt bewerten/i })).toBeVisible();
  });
});

// ============================================================
// 4.3 Tab: Freigeben & Erzeugen
// ============================================================
test.describe("TU-Abrechnung — Freigeben & Erzeugen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/tu-abrechnung");
    await expect(page.getByRole("heading", { name: "TU-Abrechnung" })).toBeVisible();
  });

  test("Freigeben-Tab zeigt bewertete Touren", async ({ page }) => {
    await page.getByRole("tab", { name: "Freigeben & Erzeugen" }).click();
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    // T-2026-003 ist im Seed als abrechnungsStatus=1 (bewertet)
    await expect(page.getByText("T-2026-003").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Bewertete Touren")).toBeVisible();
    await expect(page.getByText("Freigegebene Touren")).toBeVisible();
  });
});

// ============================================================
// 4.4 Tab: Abrechnungen
// ============================================================
test.describe("TU-Abrechnung — Abrechnungen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/tu-abrechnung");
    await expect(page.getByRole("heading", { name: "TU-Abrechnung" })).toBeVisible();
  });

  test("Abrechnungen-Tab laden und Aktualisieren klicken", async ({ page }) => {
    await page.getByRole("tab", { name: "Abrechnungen" }).click();
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    // Zunächst leer (kein Seed-Abrechnung)
    await page.waitForTimeout(1000);
    // Grid mit Beleg-Nr. Spalte sollte existieren
    await expect(page.getByText("Beleg-Nr.")).toBeVisible();
  });
});

// ============================================================
// 4.5 Vollständiger Workflow: Bewerten → Freigeben → Erzeugen → Storno
// ============================================================
test.describe("TU-Abrechnung — Workflow", () => {
  test("Kompletter Workflow: Bewerten → Freigeben → Erzeugen → Storno", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/tu-abrechnung");

    // ---- Schritt 1: Bewerten ----
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Vorschau" }).click();
    await expect(page.getByText("T-2026-002").first()).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Jetzt bewerten/i }).click();
    await expect(page.getByText(/Tour\(en\) bewertet/)).toBeVisible({ timeout: 10000 });

    // ---- Schritt 2: Freigeben ----
    await page.getByRole("tab", { name: "Freigeben & Erzeugen" }).click();
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    // Bewertete Touren sollten sichtbar sein
    await expect(page.getByText("T-2026-002").first()).toBeVisible({ timeout: 10000 });

    // Bewertete Touren: erste Row-Checkbox klicken
    const bewRow = page.locator('.ag-center-cols-container .ag-row').first();
    await bewRow.locator('.ag-checkbox-input').click();

    await expect(page.getByRole("button", { name: /Tour\(en\) freigeben/i })).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: /Tour\(en\) freigeben/i }).click();
    await expect(page.getByText(/Tour\(en\) freigegeben/)).toBeVisible({ timeout: 10000 });

    // Freigegebene Touren: Row-Checkbox in der zweiten Tabelle klicken
    // Warte kurz, dann zweite Tabelle finden
    await page.waitForTimeout(500);
    const freiContainer = page.locator('.ag-center-cols-container').nth(1);
    await freiContainer.locator('.ag-row').first().locator('.ag-checkbox-input').click();

    await expect(page.getByRole("button", { name: /Abrechnung erzeugen/i })).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: /Abrechnung erzeugen/i }).click();
    await expect(page.getByText(/Abrechnung\(en\) erzeugt/)).toBeVisible({ timeout: 10000 });

    // ---- Schritt 3: Abrechnungen prüfen ----
    await page.getByRole("tab", { name: "Abrechnungen" }).click();
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    // ABR-2026-001 im Grid (gridcell) suchen
    await expect(page.locator('.ag-cell').filter({ hasText: "ABR-2026-001" }).first()).toBeVisible({ timeout: 10000 });

    // Abrechnung anklicken → Positionen sichtbar
    await page.locator('.ag-cell').filter({ hasText: "ABR-2026-001" }).first().click();
    await expect(page.getByText("Positionen: ABR-2026-001")).toBeVisible({ timeout: 5000 });

    // ---- Schritt 4: Storno ----
    await expect(page.getByRole("button", { name: /stornieren/i })).toBeVisible();
    await page.getByRole("button", { name: /stornieren/i }).click();
    await expect(page.getByText(/Position\(en\)/)).toBeVisible({ timeout: 10000 });
  });
});
