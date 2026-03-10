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

async function selectOption(page: any, label: string, searchText: string) {
  const input = page.getByRole("textbox", { name: label, exact: true });
  await input.click();
  await input.fill(searchText);
  await page.locator("[role='option']:visible").first().click();
}

// ════════════════════════════════════════════════════════════════
// KOMPLETTER TMSA DURCHLAUF
// Avis → Disposition → Abfahrt → Nacharbeit → Abrechnung → Bericht
// ════════════════════════════════════════════════════════════════
test.describe("Kompletter TMSA Durchlauf", () => {
  test("End-to-End: Avis → Disposition → Abfahrt → Nacharbeit → Abrechnung → Bericht", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/");
    await loginViaApi(page);

    const ts = Date.now().toString().slice(-4);
    const avisNr = `AV-E2E-${ts}`;
    const tourNr = `T-E2E-${ts}`;
    const tourDatum = "2026-04-15";
    const beschreibung = "Stoßdämpfer-Satz E2E";

    // ═══════════════════════════════════════════════════
    // SCHRITT 1: Avis anlegen + Artikelzeile
    // ═══════════════════════════════════════════════════
    await test.step("1. Avis anlegen", async () => {
      await page.goto("/avise");
      await expect(page.getByRole("heading", { name: "Avise" })).toBeVisible();

      await page.getByRole("button", { name: "Neues Avis" }).click();
      await expect(page.getByRole("heading", { name: "Neues Avis" })).toBeVisible();
      await page.getByLabel("Avis-Nummer").fill(avisNr);
      await page.getByLabel("Ladedatum").fill(tourDatum);
      await selectOption(page, "Lieferant", "Bosch");
      await selectOption(page, "Werk", "BMW Werk München");
      await selectOption(page, "Niederlassung", "Gersthofen");
      await page.getByRole("button", { name: "Speichern" }).click();

      await expect(page.getByText(avisNr)).toBeVisible({ timeout: 5000 });
    });

    await test.step("1b. Artikelzeile hinzufügen", async () => {
      await page.getByText(avisNr).click();
      await expect(page.getByText(`Artikelzeilen von ${avisNr}`)).toBeVisible();

      await page.getByRole("button", { name: "+ Neue Zeile" }).click();
      await expect(page.getByText("Neue Artikelzeile")).toBeVisible();
      await page.getByLabel("Beschreibung").fill(beschreibung);
      await page.getByLabel("Menge").fill("200");
      await page.getByRole("button", { name: "Speichern" }).click();

      await page.waitForTimeout(1000);
      await page.getByText(avisNr).click();
      await expect(page.getByText(beschreibung)).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: "test-results/e2e-01-avis.png", fullPage: true });
    });

    // ═══════════════════════════════════════════════════
    // SCHRITT 2: Mengenplan — Tour erstellen + zuweisen
    // ═══════════════════════════════════════════════════
    await test.step("2. Mengenplan: Tour erstellen", async () => {
      await page.goto("/mengenplan");
      await expect(page.getByRole("heading", { name: "Mengenplan / Disposition" })).toBeVisible();

      await page.getByLabel("Datum von").fill("2026-04-01");
      await page.getByLabel("Datum bis").fill("2026-04-30");
      await page.getByRole("button", { name: "Aktualisieren" }).click();

      // Offene Zeile sichtbar
      await expect(page.getByText(avisNr).first()).toBeVisible({ timeout: 10000 });

      // Neue Tour
      await page.getByRole("button", { name: /Neue Tour/ }).click();
      await expect(page.getByText("Schnell-Tour erstellen")).toBeVisible();
      await page.getByLabel("Tour-Nummer").fill(tourNr);
      await page.getByLabel("Tour-Datum").fill(tourDatum);
      await selectOption(page, "Niederlassung", "Gersthofen");
      await page.getByRole("button", { name: "Erstellen" }).click();

      await expect(page.getByText(tourNr)).toBeVisible({ timeout: 5000 });
    });

    await test.step("2b. Artikelzeile der Tour zuweisen", async () => {
      // Tour auswählen (rechts)
      await page.getByText(tourNr).click();

      // Artikelzeile auswählen (links — Checkbox)
      const zeileRow = page.locator(".ag-row", { hasText: beschreibung });
      await zeileRow.locator(".ag-checkbox-input").first().click();

      // Zuweisen
      const zuweisBtn = page.getByRole("button", { name: /zuweisen/i });
      await expect(zuweisBtn).toBeVisible({ timeout: 3000 });
      await zuweisBtn.click();

      await page.waitForTimeout(2000);
      await page.screenshot({ path: "test-results/e2e-02-mengenplan.png", fullPage: true });
    });

    // ═══════════════════════════════════════════════════
    // SCHRITT 3: Abfahrt aus Tour erstellen
    // ═══════════════════════════════════════════════════
    await test.step("3. Abfahrt aus Tour erstellen", async () => {
      await page.goto("/abfahrten");
      await expect(page.getByRole("heading", { name: "Abfahrten" })).toBeVisible();

      await page.getByRole("button", { name: "Abfahrt aus Tour" }).click();
      await selectOption(page, "Tour auswählen", tourNr);
      await page.getByRole("button", { name: "Erstellen" }).click();

      // Abfahrt erscheint in Tabelle
      await page.waitForTimeout(2000);
      await expect(page.locator(".ag-row").first()).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: "test-results/e2e-03-abfahrt.png", fullPage: true });
    });

    // ═══════════════════════════════════════════════════
    // SCHRITT 4: Nacharbeit — TU, Kondition, km, Quittung
    // ═══════════════════════════════════════════════════
    await test.step("4. Nacharbeit: TU + Kondition + km + Quittung setzen", async () => {
      await page.goto("/nacharbeit");
      await expect(page.getByRole("heading", { name: "Nacharbeit" })).toBeVisible();

      // Filter auf April
      await page.getByLabel("Datum von").fill("2026-04-01");
      await page.getByLabel("Datum bis").fill("2026-04-30");
      await page.getByRole("button", { name: "Aktualisieren" }).click();

      // Tour finden und anklicken
      await expect(page.getByText(tourNr)).toBeVisible({ timeout: 5000 });
      await page.getByText(tourNr).click();

      // Detail-Panel
      await expect(page.getByText(`Detail: ${tourNr}`)).toBeVisible({ timeout: 3000 });

      // TU + Kondition setzen
      await selectOption(page, "TU", "Meyer");
      await selectOption(page, "Kondition", "Meyer");

      // Kilometer
      await page.getByLabel("Last-km").fill("100");
      await page.getByLabel("Leer-km").fill("50");
      await page.getByLabel("Maut-km").fill("80");

      // Quittung
      await page.getByRole("checkbox", { name: "Quittung" }).check();
      await page.getByLabel("Quittungsdatum").fill(tourDatum);

      // Speichern
      await page.getByRole("button", { name: "Speichern" }).click();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: "test-results/e2e-04-nacharbeit.png", fullPage: true });
    });

    // ═══════════════════════════════════════════════════
    // SCHRITT 5a: TU-Abrechnung — Bewerten
    // Kosten: tourFaktor(150) + stoppFaktor(25×1) +
    //         lastKm(100×1.25=125) + leerKm(50×0.85=42.5) +
    //         mautKm(80×0.19=15.2) = 357,70
    // ═══════════════════════════════════════════════════
    await test.step("5a. TU-Abrechnung: Bewerten", async () => {
      await page.goto("/tu-abrechnung");
      await expect(page.getByRole("heading", { name: "TU-Abrechnung" })).toBeVisible();

      await page.getByLabel("Datum von").fill("2026-04-01");
      await page.getByLabel("Datum bis").fill("2026-04-30");
      await page.getByRole("button", { name: "Vorschau" }).click();

      // Tour mit Kosten sichtbar
      await expect(page.getByText(tourNr)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("357,70")).toBeVisible();

      // Bewerten
      await page.getByRole("button", { name: /Jetzt bewerten/i }).click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: "test-results/e2e-05a-bewerten.png", fullPage: true });
    });

    // ═══════════════════════════════════════════════════
    // SCHRITT 5b: Freigeben
    // ═══════════════════════════════════════════════════
    await test.step("5b. TU-Abrechnung: Freigeben", async () => {
      await page.getByRole("tab", { name: "Freigeben & Erzeugen" }).click();
      await page.getByRole("button", { name: "Aktualisieren" }).click();

      // Bewertete Tour selektieren
      await expect(page.getByText(tourNr)).toBeVisible({ timeout: 5000 });
      const bewRow = page.locator(".ag-row", { hasText: tourNr });
      await bewRow.locator(".ag-checkbox-input").first().click();

      // Freigeben
      await page.getByRole("button", { name: /freigeben/i }).click();
      await page.waitForTimeout(1000);
    });

    // ═══════════════════════════════════════════════════
    // SCHRITT 5c: Abrechnung erzeugen
    // ═══════════════════════════════════════════════════
    await test.step("5c. TU-Abrechnung: Erzeugen", async () => {
      await page.getByRole("button", { name: "Aktualisieren" }).click();
      await page.waitForTimeout(1000);

      // Freigegebene Tour selektieren
      await expect(page.getByText(tourNr)).toBeVisible({ timeout: 5000 });
      const frgRow = page.locator(".ag-row", { hasText: tourNr });
      await frgRow.locator(".ag-checkbox-input").first().click();

      // Erzeugen
      await page.getByRole("button", { name: /Abrechnung erzeugen/i }).click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: "test-results/e2e-05c-erzeugen.png", fullPage: true });
    });

    // ═══════════════════════════════════════════════════
    // SCHRITT 5d: Abrechnung prüfen
    // ═══════════════════════════════════════════════════
    await test.step("5d. Abrechnung prüfen", async () => {
      await page.getByRole("tab", { name: "Abrechnungen" }).click();
      await page.getByRole("button", { name: "Aktualisieren" }).click();
      await page.waitForTimeout(1000);

      // Abrechnung sichtbar (ABR-YYYY-NNN) + Betrag
      await expect(page.getByRole("gridcell", { name: /ABR-\d{4}-/ }).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole("gridcell", { name: /357,70/ }).first()).toBeVisible();

      await page.screenshot({ path: "test-results/e2e-05d-abrechnung.png", fullPage: true });
    });

    // ═══════════════════════════════════════════════════
    // SCHRITT 6: Bericht prüfen
    // ═══════════════════════════════════════════════════
    await test.step("6. Touren-Bericht prüfen", async () => {
      await page.goto("/berichte");
      await expect(page.getByRole("heading", { name: "Berichte" })).toBeVisible();

      await page.getByLabel("Datum von").fill("2026-04-01");
      await page.getByLabel("Datum bis").fill("2026-04-30");
      await page.getByRole("button", { name: "Laden" }).click();

      // Tour im Bericht
      await expect(page.getByText(tourNr)).toBeVisible({ timeout: 5000 });
      // Kosten im Bericht
      await expect(page.getByRole("gridcell", { name: /357,70/ })).toBeVisible();

      await page.screenshot({ path: "test-results/e2e-06-bericht.png", fullPage: true });
    });
  });
});
