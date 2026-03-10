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
// PDF: Bordero (Seed-Daten: B-2026-001 existiert immer)
// ============================================================
test.describe("PDF Bordero", () => {
  test("PDF-Button bei Bordero-Auswahl sichtbar", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/abfahrten");
    await expect(page.getByRole("heading", { name: "Abfahrten" })).toBeVisible({ timeout: 10000 });

    // Abfahrt auswählen
    await expect(page.getByText("AF-2026-001")).toBeVisible({ timeout: 10000 });
    await page.getByText("AF-2026-001").click();
    await expect(page.getByText("Borderos von AF-2026-001")).toBeVisible({ timeout: 5000 });

    // Bordero auswählen
    await expect(page.getByText("B-2026-001")).toBeVisible({ timeout: 5000 });
    await page.getByText("B-2026-001").click();

    // PDF-Button sichtbar
    await expect(page.getByRole("button", { name: "PDF" }).first()).toBeVisible({ timeout: 3000 });
  });

  test("Bordero PDF Endpoint liefert application/pdf", async ({ request }) => {
    // Login via Playwright request context (server-seitig, keine Browser-Cookie-Probleme)
    const loginRes = await request.post("http://localhost:3001/api/auth/login", {
      data: { benutzername: "admin", passwort: "admin" },
    });
    expect(loginRes.ok()).toBeTruthy();

    // Abfahrten laden und eine mit Borderos finden
    const abfahrtenRes = await request.get("http://localhost:3001/api/abfahrten?limit=10");
    const abfahrten = await abfahrtenRes.json();
    let bordero: any = null;
    for (const af of abfahrten.data || []) {
      const detailRes = await request.get(`http://localhost:3001/api/abfahrten/${af.id}`);
      const detail = await detailRes.json();
      if (detail.data?.borderos?.length > 0) {
        bordero = detail.data.borderos[0];
        break;
      }
    }
    expect(bordero).toBeTruthy();

    // PDF abrufen
    const pdfRes = await request.get(`http://localhost:3001/api/pdf/bordero/${bordero.id}`);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()["content-type"]).toContain("application/pdf");
  });
});

// ============================================================
// PDF: TU-Abrechnung (non-destructive — nutzt nur existierende Daten)
// ============================================================
test.describe("PDF TU-Abrechnung", () => {
  test("Abrechnungen-Tab zeigt PDF-Button bei Auswahl", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/tu-abrechnung");
    await expect(page.getByRole("heading", { name: "TU-Abrechnung" })).toBeVisible({ timeout: 10000 });

    await page.getByRole("tab", { name: "Abrechnungen" }).click();
    await page.getByRole("button", { name: "Aktualisieren" }).click();
    await page.waitForTimeout(2000);

    const hasRows = await page.locator(".ag-row").first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasRows) {
      test.skip();
      return;
    }

    await page.locator(".ag-row").first().click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: "PDF" })).toBeVisible({ timeout: 3000 });
  });

  test("TU-Abrechnung PDF Endpoint liefert application/pdf", async ({ request }) => {
    const loginRes = await request.post("http://localhost:3001/api/auth/login", {
      data: { benutzername: "admin", passwort: "admin" },
    });
    expect(loginRes.ok()).toBeTruthy();

    const abrRes = await request.get("http://localhost:3001/api/tu-abrechnung");
    const json = await abrRes.json();
    const abr = json.data?.[0];
    if (!abr) {
      test.skip();
      return;
    }

    const pdfRes = await request.get(`http://localhost:3001/api/pdf/tu-abrechnung/${abr.id}`);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()["content-type"]).toContain("application/pdf");
  });
});
