import { expect, test } from '@playwright/test';

test.describe('Gate Pass Monitor', () => {
  test('admin dapat membuka halaman monitoring gate pass', async ({ page }) => {
    await page.goto('./#/login');
    await page.locator('#nrp').fill('1000001');
    await page.locator('#pin').fill('123456');
    await page.getByRole('button', { name: 'Masuk' }).click();

    await page.goto('./#/admin/gatepass-monitor');

    await expect(page).toHaveURL(/\/admin\/gatepass-monitor/);
    await expect(page.locator('main').getByRole('heading', { name: 'Monitoring Gate Pass' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset Filter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print Laporan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Muat Ulang' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hari ini' })).toBeVisible();
    await expect(page.getByRole('button', { name: '7 hari' })).toBeVisible();
    await expect(page.getByRole('button', { name: '30 hari' })).toBeVisible();
    await expect(page.getByPlaceholder('Cari nama, NRP, tujuan, atau keperluan')).toBeVisible();
    await expect(page.getByLabel('Tanggal keluar dari')).toBeVisible();
    await expect(page.getByLabel('Tanggal keluar sampai')).toBeVisible();
  });

  test('filter dapat diubah lalu direset', async ({ page }) => {
    await page.goto('./#/login');
    await page.locator('#nrp').fill('1000001');
    await page.locator('#pin').fill('123456');
    await page.getByRole('button', { name: 'Masuk' }).click();

    await page.goto('./#/admin/gatepass-monitor');

    const searchInput = page.getByPlaceholder('Cari nama, NRP, tujuan, atau keperluan');
    const statusFilter = page.getByRole('combobox');
    const startDate = page.getByLabel('Tanggal keluar dari');
    const endDate = page.getByLabel('Tanggal keluar sampai');

    await searchInput.fill('andi');
    await statusFilter.selectOption('checked_in');
    await startDate.fill('2026-04-10');
    await endDate.fill('2026-04-20');

    await page.getByRole('button', { name: 'Reset Filter' }).click();

    await expect(searchInput).toHaveValue('');
    await expect(statusFilter).toHaveValue('all');
    await expect(startDate).toHaveValue('');
    await expect(endDate).toHaveValue('');
  });

  test('status filter menampilkan opsi checked_in dan completed', async ({ page }) => {
    await page.goto('./#/login');
    await page.locator('#nrp').fill('1000001');
    await page.locator('#pin').fill('123456');
    await page.getByRole('button', { name: 'Masuk' }).click();

    await page.goto('./#/admin/gatepass-monitor');

    const statusFilter = page.getByRole('combobox');
    await statusFilter.selectOption('checked_in');
    await expect(statusFilter).toHaveValue('checked_in');

    await statusFilter.selectOption('completed');
    await expect(statusFilter).toHaveValue('completed');
  });

  test('preset tanggal mengisi rentang tanggal', async ({ page }) => {
    await page.goto('./#/login');
    await page.locator('#nrp').fill('1000001');
    await page.locator('#pin').fill('123456');
    await page.getByRole('button', { name: 'Masuk' }).click();

    await page.goto('./#/admin/gatepass-monitor');

    const startDate = page.getByLabel('Tanggal keluar dari');
    const endDate = page.getByLabel('Tanggal keluar sampai');

    await page.getByRole('button', { name: '7 hari' }).click();

    await expect(startDate).not.toHaveValue('');
    await expect(endDate).not.toHaveValue('');
  });
});
