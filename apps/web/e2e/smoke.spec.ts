import { expect, test } from "@playwright/test";

/**
 * Smoke E2E — hanya memverifikasi RENDER publik, tanpa autentikasi/DB.
 * Landing memakai FALLBACK_BRANDING bila API offline, jadi h1 branding
 * selalu muncul selama aplikasi web hidup. Flow lengkap (login → dashboard
 * siswa/guru → ujian) ada di roadmap README.e2e.md.
 */
test.describe("smoke — rendering publik", () => {
  test("landing page termuat dan elemen branding muncul", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.locator("main h1")).toBeVisible();
  });

  test("halaman login termuat dan tombol masuk ada", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /masuk/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
    await expect(page.getByLabel("Email atau Username")).toBeVisible();
  });
});
