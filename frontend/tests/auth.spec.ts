import { test, expect } from "@playwright/test";

// Hilfsfunktion: Login via API (schneller als UI-Login)
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

test.describe("Login", () => {
  test("zeigt Login-Seite wenn nicht angemeldet", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Transport-Management-System Automotive")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Benutzername" })).toBeVisible();
  });

  test("Login mit gültigen Daten → Dashboard", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page, "admin", "admin");
    await page.goto("/");

    await expect(page.getByText("Willkommen, System Administrator")).toBeVisible();
    await expect(page.getByText("76 Rechte")).toBeVisible();
  });

  test("Login als Disponent → eingeschränkte Rechte", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page, "dispo", "dispo");
    await page.goto("/");

    await expect(page.getByText("Willkommen, Max Mustermann")).toBeVisible();
    await expect(page.getByText("Disponent")).toBeVisible();
    await expect(page.getByText("35 Rechte")).toBeVisible();
  });

  test("Abmelden funktioniert", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");

    await expect(page.getByText("Willkommen")).toBeVisible();
    await page.getByRole("button", { name: "Abmelden" }).click();

    // Warten bis Login-Seite erscheint
    await page.goto("/");
    await expect(page.getByText("Transport-Management-System Automotive")).toBeVisible();
  });
});

test.describe("Berechtigungen", () => {
  test("Admin sieht Benutzer-NavLink", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Benutzer" })).toBeVisible();
  });

  test("Disponent sieht keinen Benutzer-NavLink", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page, "dispo", "dispo");
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Benutzer" })).not.toBeVisible();
  });

  test("Disponent sieht keine Bearbeiten-Buttons auf Werke", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page, "dispo", "dispo");
    await page.goto("/werke");

    await expect(page.getByRole("heading", { name: "Werke" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Neu anlegen" })).not.toBeVisible();
  });

  test("Admin sieht Bearbeiten-Buttons auf Werke", async ({ page }) => {
    await page.goto("/");
    await loginViaApi(page);
    await page.goto("/werke");

    await expect(page.getByRole("heading", { name: "Werke" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Neu anlegen" })).toBeVisible();
  });
});
