import { expect, test } from "@playwright/test";

/**
 * Smoke E2E — render publik (tanpa autentikasi) + flow login nyata.
 *
 * Landing memakai FALLBACK_BRANDING bila API offline, jadi h1 branding selalu
 * muncul selama aplikasi web hidup.
 *
 * LOGIN: user dev dari seed (packages/database/prisma/seed.ts):
 *   - admin  / password → SUPERADMIN → /superadmin/dashboard
 *   - siswa1 / password → SISWA      → /siswa/dashboard
 * Password "password" DIDOKUMENTASIKAN sebagai dev-only di seed — bukan
 * secret produksi. Override via env E2E_ADMIN_* / E2E_SISWA_* bila ingin
 * memakai kredensial lain (mis. secrets CI).
 */

// Kredensial user dev seed — default = nilai seed (admin, siswa1, "password").
// CI menyuntikkan env eksplisit (lihat .github/workflows/ci.yml → web-e2e).
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "password";
const SISWA_USERNAME = process.env.E2E_SISWA_USERNAME ?? "siswa1";
const SISWA_PASSWORD = process.env.E2E_SISWA_PASSWORD ?? "password";

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

test.describe("auth — login nyata (user dev seed)", () => {
  test("login admin → redirect ke dashboard SUPERADMIN", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email atau Username").fill(ADMIN_USERNAME);
    await page.getByLabel("Kata sandi").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();

    // login-form mendarat di roleHome("SISWA") dulu (/siswa/dashboard),
    // lalu AppShell hard-redirect (role mismatch) ke roleHome SUPERADMIN.
    await page.waitForURL("**/superadmin/dashboard", { timeout: 30_000 });

    // Dashboard ter-render (heading statis PageHeader) + shell role tampil.
    await expect(page.getByRole("heading", { name: "Statistik Sekolah" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin Sistem" })).toBeVisible();
  });

  test("login siswa1 → dashboard SISWA + sidebar tampil", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email atau Username").fill(SISWA_USERNAME);
    await page.getByLabel("Kata sandi").fill(SISWA_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();

    await page.waitForURL("**/siswa/dashboard", { timeout: 30_000 });

    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.getByRole("link", { name: "Kelas" })).toBeVisible();
  });
});
