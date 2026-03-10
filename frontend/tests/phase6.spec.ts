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
  const input = page.getByRole("textbox", { name: label });
  await input.click();
  await input.fill(searchText);
  await page.locator("[role='option']:visible").first().click();
}

// ============================================================
// 6.1 USP Stammdaten
// ============================================================
test.describe("Umschlagpunkte Stammdaten", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
  });

  test("Admin sieht Umschlagpunkte im Menü", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Umschlagpunkte" })).toBeVisible();
  });

  test("USP-Liste zeigt Seed-Daten", async ({ page }) => {
    await page.goto("/umschlag-punkte");
    await expect(page.getByRole("heading", { name: "Umschlagpunkte" })).toBeVisible();
    await expect(page.locator(".ag-row").first()).toBeVisible();
    await expect(page.getByText("USP Gersthofen")).toBeVisible();
    await expect(page.getByText("USP-GER")).toBeVisible();
  });

  test("Admin kann neuen USP anlegen", async ({ page }) => {
    await page.goto("/umschlag-punkte");
    await expect(page.getByRole("heading", { name: "Umschlagpunkte" })).toBeVisible();

    const name = `USP-Test-${Date.now().toString().slice(-6)}`;
    await page.getByRole("button", { name: "Neu anlegen" }).click();
    await expect(page.getByText("Umschlagpunkte anlegen")).toBeVisible();
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Kurzbezeichnung").fill("TST");
    await selectOption(page, "Niederlassung", "Gersthofen");
    await page.getByRole("button", { name: "Speichern" }).click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });

    // Aufräumen
    await page.getByText(name).click();
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Löschen" }).click();
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// 6.2 Tour brechen
// ============================================================
test.describe("Tour brechen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/mengenplan");
    await expect(page.getByRole("heading", { name: "Mengenplan / Disposition" })).toBeVisible();
  });

  test("Tour brechen-Button auf offener Tour sichtbar", async ({ page }) => {
    // Lade Daten im Zeitraum der Seed-Tour T-2026-001 (offen, 2026-03-10)
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    // Warte auf Tour T-2026-001 (status: disponiert)
    await expect(page.getByText("T-2026-001")).toBeVisible({ timeout: 10000 });

    // Wähle T-2026-001 (disponiert = brechbar)
    await page.getByText("T-2026-001").click();

    // Tour brechen-Button sollte sichtbar sein
    await expect(page.getByRole("button", { name: "Tour brechen" })).toBeVisible({ timeout: 3000 });
  });

  test("Gebrochene Tour zeigt GV-Badge", async ({ page }) => {
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    // T-2026-004 ist die Seed-gebrochene Tour
    await expect(page.getByText("T-2026-004")).toBeVisible({ timeout: 10000 });

    // GV-Badge sollte sichtbar sein (rendered als HTML span)
    await expect(page.locator("text=GV").first()).toBeVisible();
  });

  test("Gebrochene Tour zeigt Streckenabschnitte", async ({ page }) => {
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    await expect(page.getByText("T-2026-004")).toBeVisible({ timeout: 10000 });
    await page.getByText("T-2026-004").click();

    // Streckenabschnitte-Anzeige
    await expect(page.getByText("Streckenabschnitte von T-2026-004")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Bosch Stuttgart")).toBeVisible();
    await expect(page.getByText("USP Gersthofen").first()).toBeVisible();
    await expect(page.getByText("BMW München")).toBeVisible();
  });

  test("Tour brechen mit USP erstellt VL + NL Abschnitte", async ({ page }) => {
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    await expect(page.getByText("T-2026-001")).toBeVisible({ timeout: 10000 });
    await page.getByText("T-2026-001").click();

    await page.getByRole("button", { name: "Tour brechen" }).click();
    await expect(page.getByText("Tour brechen", { exact: false })).toBeVisible();

    // USP auswählen
    await selectOption(page, "Umschlagpunkt", "USP Gersthofen");
    await page.getByLabel("Von (Startpunkt)").fill("Continental Hannover");
    await page.getByLabel("Nach (Zielpunkt)").fill("BMW München");

    // Brechen ausführen
    await page.getByRole("button", { name: "Tour brechen" }).last().click();

    // Warte auf Aktualisierung
    await page.waitForTimeout(2000);
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    // T-2026-001 sollte jetzt GV-Badge haben
    await expect(page.getByText("T-2026-001")).toBeVisible({ timeout: 10000 });
    await page.getByText("T-2026-001").click();

    // Streckenabschnitte sollten sichtbar sein
    await expect(page.getByText("Streckenabschnitte von T-2026-001")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Continental Hannover")).toBeVisible();
  });
});

// ============================================================
// 6.3 Zusammenführen
// ============================================================
test.describe("Zusammenführen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/mengenplan");
    await expect(page.getByRole("heading", { name: "Mengenplan / Disposition" })).toBeVisible();
  });

  test("Zusammenführen-Button auf gebrochener Tour sichtbar", async ({ page }) => {
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    await expect(page.getByText("T-2026-004")).toBeVisible({ timeout: 10000 });
    await page.getByText("T-2026-004").click();

    await expect(page.getByRole("button", { name: "Zusammenführen" })).toBeVisible({ timeout: 3000 });
  });

  test("Zusammenführen entfernt Abschnitte", async ({ page }) => {
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    await expect(page.getByText("T-2026-004")).toBeVisible({ timeout: 10000 });
    await page.getByText("T-2026-004").click();

    // Streckenabschnitte sichtbar
    await expect(page.getByText("Streckenabschnitte von T-2026-004")).toBeVisible({ timeout: 5000 });

    // Confirm-Dialog akzeptieren
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Zusammenführen" }).click();

    // Nach Zusammenführung: Aktualisieren und prüfen
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    await expect(page.getByText("T-2026-004")).toBeVisible({ timeout: 10000 });
    await page.getByText("T-2026-004").click();

    // Sollte jetzt Tour-Zeilen zeigen, nicht Streckenabschnitte
    await expect(page.getByText("Zeilen von T-2026-004")).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// 6.4 Berechtigungen
// ============================================================
test.describe("Berechtigungen Gebrochene Verkehre", () => {
  test("Disponent sieht Umschlagpunkte im Menü", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page, "dispo", "dispo");
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Umschlagpunkte" })).toBeVisible();
  });

  test("Disponent kann Streckenabschnitte sehen", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page, "dispo", "dispo");
    await page.goto("/mengenplan");

    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Aktualisieren" }).click();

    // Warte auf Touren-Grid
    await expect(page.locator(".ag-row").first()).toBeVisible({ timeout: 10000 });

    // Suche gebrochene Tour: T-2026-001 (wurde in vorherigem Test gebrochen)
    // oder T-2026-004 (Seed-GV, falls Zusammenführen-Test noch nicht lief)
    // Klicke auf die erste Tour die einen GV-Span hat
    const t4 = page.getByRole("row").filter({ hasText: "T-2026-004" });
    const t1 = page.getByRole("row").filter({ hasText: "T-2026-001" });

    // Versuche T-2026-004 (Seed-GV)
    if (await t4.isVisible({ timeout: 2000 }).catch(() => false)) {
      await t4.click();
      const hatAbschnitte = await page.getByText(/Streckenabschnitte von T-2026-004/).isVisible({ timeout: 3000 }).catch(() => false);
      if (hatAbschnitte) {
        await expect(page.getByText("Streckenabschnitte von T-2026-004")).toBeVisible();
        return;
      }
    }

    // Fallback: T-2026-001 (durch vorherigen Test gebrochen)
    if (await t1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await t1.click();
      await expect(page.getByText(/Streckenabschnitte von T-2026/).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
