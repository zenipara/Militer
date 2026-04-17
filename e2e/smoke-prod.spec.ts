import { expect, test } from '@playwright/test';

test.describe('Smoke production', () => {
  test('halaman login tampil', async ({ page }) => {
    await page.goto('./#/login');
    await expect(page).toHaveTitle(/KARYO OS/i);
    await expect(page.getByRole('heading', { name: 'Masuk ke Sistem' })).toBeVisible();
    await expect(page.locator('#nrp')).toBeVisible();
    await expect(page.locator('#pin')).toBeVisible();
  });

  test('login admin berhasil redirect dashboard', async ({ page }) => {
    await page.goto('./#/login');
    await page.locator('#nrp').fill('1000001');
    await page.locator('#pin').fill('123456');
    await page.getByRole('button', { name: 'Masuk' }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByText(/dashboard|admin/i).first()).toBeVisible();
  });

  test('login komandan berhasil redirect dashboard', async ({ page }) => {
    await page.goto('./#/login');
    await page.locator('#nrp').fill('2000001');
    await page.locator('#pin').fill('123456');
    await page.getByRole('button', { name: 'Masuk' }).click();

    await expect(page).toHaveURL(/\/komandan\/dashboard/);
    await expect(page.getByText(/dashboard|komandan/i).first()).toBeVisible();
  });

  test('login prajurit berhasil redirect dashboard', async ({ page }) => {
    await page.goto('./#/login');
    await page.locator('#nrp').fill('3000001');
    await page.locator('#pin').fill('123456');
    await page.getByRole('button', { name: 'Masuk' }).click();

    await expect(page).toHaveURL(/\/prajurit\/dashboard/);
    await expect(page.getByText(/dashboard|prajurit/i).first()).toBeVisible();
  });

  test('login salah menampilkan pesan error', async ({ page }) => {
    await page.goto('./#/login');
    await page.locator('#nrp').fill('9999999');
    await page.locator('#pin').fill('123456');
    await page.getByRole('button', { name: 'Masuk' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('alert')).toContainText(/salah|kesalahan|tidak ditemukan/i);
  });
});
