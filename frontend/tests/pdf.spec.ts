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
    await expect(page.getByRole("heading", { name: "Abfahrten" })).toBeVisible();

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

  test("Bordero PDF Endpoint liefert application/pdf", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);

    const result = await page.evaluate(async () => {
      const res = await fetch("http://localhost:3001/api/abfahrten?limit=10", {
        credentials: "include",
      });
      const json = await res.json();
      const abfahrt = json.data?.[0];
      if (!abfahrt) return { status: 0, contentType: "" };

      const detail = await fetch(`http://localhost:3001/api/abfahrten/${abfahrt.id}`, {
        credentials: "include",
      });
      const detailJson = await detail.json();
      const bordero = detailJson.data?.borderos?.[0];
      if (!bordero) return { status: 0, contentType: "" };

      const pdfRes = await fetch(`http://localhost:3001/api/pdf/bordero/${bordero.id}`, {
        credentials: "include",
      });
      return {
        status: pdfRes.status,
        contentType: pdfRes.headers.get("content-type"),
      };
    });

    expect(result.status).toBe(200);
    expect(result.contentType).toContain("application/pdf");
  });
});

// ============================================================
// PDF: TU-Abrechnung (non-destructive — nutzt nur existierende Daten)
// Diese Tests verändern KEINE Touren-Daten, um phase4-Tests nicht zu stören.
// ============================================================
test.describe("PDF TU-Abrechnung", () => {
  test("Abrechnungen-Tab zeigt PDF-Button bei Auswahl", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/tu-abrechnung");
    await expect(page.getByRole("heading", { name: "TU-Abrechnung" })).toBeVisible();

    // Zum Abrechnungen-Tab
    await page.getByRole("tab", { name: "Abrechnungen" }).click();
    await page.getByRole("button", { name: "Aktualisieren" }).click();
    await page.waitForTimeout(2000);

    // Prüfe ob Abrechnungen existieren
    const hasRows = await page.locator(".ag-row").first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasRows) {
      // Keine Abrechnungen — phase4 Workflow hat noch nicht erzeugt
      // Überspringen, aber kein Fehler
      test.skip();
      return;
    }

    await page.locator(".ag-row").first().click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: "PDF" })).toBeVisible({ timeout: 3000 });
  });

  test("TU-Abrechnung PDF Endpoint liefert application/pdf", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);

    const result = await page.evaluate(async () => {
      const res = await fetch("http://localhost:3001/api/tu-abrechnung", {
        credentials: "include",
      });
      const json = await res.json();
      const abr = json.data?.[0];
      if (!abr) return { status: 0, contentType: "", skipped: true };

      const pdfRes = await fetch(`http://localhost:3001/api/pdf/tu-abrechnung/${abr.id}`, {
        credentials: "include",
      });
      return {
        status: pdfRes.status,
        contentType: pdfRes.headers.get("content-type"),
        skipped: false,
      };
    });

    if ((result as any).skipped) {
      // Keine Abrechnungen vorhanden — PDF-Infrastruktur ist via Bordero-Test abgedeckt
      test.skip();
      return;
    }

    expect(result.status).toBe(200);
    expect(result.contentType).toContain("application/pdf");
  });
});
