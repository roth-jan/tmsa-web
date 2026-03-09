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
// 5.1 Navigation
// ============================================================
test.describe("Navigation Phase 5", () => {
  test("Admin sieht Berichte im Menü", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");

    await expect(page.getByText("Berichte", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Berichte" })).toBeVisible();
  });

  test("Disponent sieht Berichte im Menü", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page, "dispo", "dispo");
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Berichte" })).toBeVisible();
  });
});

// ============================================================
// 5.2 Tabs laden — je ein Test pro Bericht
// ============================================================
test.describe("Berichte — Tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/berichte");
    await expect(page.getByRole("heading", { name: "Berichte" })).toBeVisible();
  });

  test("Seite laden — 6 Tabs sichtbar", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Touren" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Avise" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "TU-Kosten" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Abfahrten" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sendungen" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Abrechnungen" })).toBeVisible();
  });

  test("Touren-Tab: Laden zeigt Tour-Daten", async ({ page }) => {
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Laden" }).click();
    await expect(page.getByText("T-2026-").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Einträge gefunden")).toBeVisible();
  });

  test("Avise-Tab: Laden zeigt Avis-Daten", async ({ page }) => {
    await page.getByRole("tab", { name: "Avise" }).click();
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Laden" }).click();
    await expect(page.getByText("AV-2026-").first()).toBeVisible({ timeout: 10000 });
  });

  test("TU-Kosten-Tab: Laden zeigt gruppierte Daten", async ({ page }) => {
    await page.getByRole("tab", { name: "TU-Kosten" }).click();
    await page.getByLabel("Datum von").fill("2026-01-01");
    await page.getByLabel("Datum bis").fill("2026-12-31");
    await page.getByRole("button", { name: "Laden" }).click();
    // Tour T-2026-003 hat kostenKondition=385.55 für Meyer
    await expect(page.getByText("Einträge gefunden")).toBeVisible({ timeout: 10000 });
  });

  test("Abfahrten-Tab: Laden zeigt Abfahrt-Daten", async ({ page }) => {
    await page.getByRole("tab", { name: "Abfahrten" }).click();
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Laden" }).click();
    await expect(page.getByText("AF-2026-").first()).toBeVisible({ timeout: 10000 });
  });

  test("Sendungen-Tab: Laden zeigt Sendungs-Daten", async ({ page }) => {
    await page.getByRole("tab", { name: "Sendungen" }).click();
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Laden" }).click();
    await expect(page.getByText("S-2026-").first()).toBeVisible({ timeout: 10000 });
  });

  test("Abrechnungen-Tab: Laden zeigt Buchungsjahr-Filter", async ({ page }) => {
    await page.getByRole("tab", { name: "Abrechnungen" }).click();
    await expect(page.getByLabel("Buchungsjahr")).toBeVisible();
    await page.getByRole("button", { name: "Laden" }).click();
    await expect(page.getByText("Einträge gefunden")).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// 5.3 CSV-Export
// ============================================================
test.describe("Berichte — CSV-Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/berichte");
  });

  test("CSV-Download-Button sichtbar nach Laden", async ({ page }) => {
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Laden" }).click();
    await expect(page.getByText("T-2026-").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "CSV herunterladen" })).toBeVisible();
  });

  test("CSV-Endpoint liefert korrekten Content-Type", async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch(
        "http://localhost:3001/api/berichte/touren?datumVon=2026-03-01&datumBis=2026-03-31&format=csv",
        { credentials: "include" }
      );
      return {
        status: res.status,
        contentType: res.headers.get("content-type"),
        contentDisposition: res.headers.get("content-disposition"),
        bodyLength: (await res.text()).length,
      };
    });
    expect(response.status).toBe(200);
    expect(response.contentType).toContain("text/csv");
    expect(response.contentDisposition).toContain("touren-");
    expect(response.bodyLength).toBeGreaterThan(10);
  });
});

// ============================================================
// 5.4 Filter
// ============================================================
test.describe("Berichte — Filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/berichte");
  });

  test("Datum-Filter ändert Ergebnis", async ({ page }) => {
    // Zuerst mit korrektem Zeitraum laden
    await page.getByLabel("Datum von").fill("2026-03-01");
    await page.getByLabel("Datum bis").fill("2026-03-31");
    await page.getByRole("button", { name: "Laden", exact: true }).click();
    await expect(page.getByText("T-2026-").first()).toBeVisible({ timeout: 10000 });

    // Anderer Zeitraum (keine Daten)
    await page.getByLabel("Datum von").fill("2020-01-01");
    await page.getByLabel("Datum bis").fill("2020-01-31");
    await page.getByRole("button", { name: "Laden", exact: true }).click();
    await expect(page.getByText("0 Einträge gefunden")).toBeVisible({ timeout: 10000 });
  });
});
