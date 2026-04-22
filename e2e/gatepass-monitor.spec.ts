import { expect, test, type Page } from '@playwright/test';

const ADMIN_NRP = process.env.E2E_ADMIN_NRP ?? '1000001';
const ADMIN_PIN = process.env.E2E_ADMIN_PIN ?? '123456';

async function loginAsAdmin(page: Page) {
  await page.goto('./#/login');
  await page.locator('#nrp').fill(ADMIN_NRP);
  await page.locator('#pin').fill(ADMIN_PIN);
  await page.getByRole('button', { name: 'Masuk' }).click();
}

test.describe('Gate Pass Monitor', () => {
  test('admin dapat membuka halaman monitoring gate pass', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('./#/admin/gatepass-monitor');

    await expect(page).toHaveURL(/\/admin\/gatepass-monitor/);
    await expect(page.locator('main').getByRole('heading', { name: 'Monitoring Gate Pass' })).toBeVisible();
    await expect(page.getByTestId('gatepass-monitor-reset-filters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print Laporan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    await expect(page.getByTestId('gatepass-monitor-refresh')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hari ini' })).toBeVisible();
    await expect(page.getByRole('button', { name: '7 hari' })).toBeVisible();
    await expect(page.getByRole('button', { name: '30 hari' })).toBeVisible();
    await expect(page.getByTestId('gatepass-monitor-critical-mode')).toBeVisible();
    await expect(page.getByTestId('gatepass-monitor-sort-mode')).toBeVisible();
    await expect(page.getByTestId('gatepass-monitor-unit-filter')).toBeVisible();
    await expect(page.getByTestId('gatepass-monitor-overdue-filter')).toBeVisible();
    await expect(page.getByTestId('gatepass-monitor-display-mode')).toBeVisible();
    await expect(page.getByTestId('gatepass-monitor-display-cards')).toBeVisible();
    await expect(page.getByTestId('gatepass-monitor-display-table')).toBeVisible();
    await expect(page.getByText('Ringkasan per Satuan')).toBeVisible();
    await expect(page.getByTestId('gatepass-monitor-unit-summary-export')).toBeVisible();
    await expect(page.getByPlaceholder('Cari nama, NRP, tujuan, atau keperluan')).toBeVisible();
    await expect(page.getByLabel('Tanggal keluar dari')).toBeVisible();
    await expect(page.getByLabel('Tanggal keluar sampai')).toBeVisible();
    await expect(page.getByTestId('gatepass-stat-personil-tersedia')).toBeVisible();
    await expect(page.getByTestId('gatepass-stat-personil-di-luar')).toBeVisible();
  });

  test('filter dapat diubah lalu direset', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('./#/admin/gatepass-monitor');

    const searchInput = page.getByPlaceholder('Cari nama, NRP, tujuan, atau keperluan');
    const statusFilter = page.getByTestId('gatepass-monitor-status-filter');
    const startDate = page.getByLabel('Tanggal keluar dari');
    const endDate = page.getByLabel('Tanggal keluar sampai');

    await searchInput.fill('andi');
    await statusFilter.selectOption('checked_in');
    await startDate.fill('2026-04-10');
    await endDate.fill('2026-04-20');

    await page.getByTestId('gatepass-monitor-reset-filters').click();

    await expect(searchInput).toHaveValue('');
    await expect(statusFilter).toHaveValue('all');
    await expect(startDate).toHaveValue('');
    await expect(endDate).toHaveValue('');
  });

  test('status filter menampilkan opsi checked_in dan completed', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('./#/admin/gatepass-monitor');

    const statusFilter = page.getByTestId('gatepass-monitor-status-filter');
    await statusFilter.selectOption('checked_in');
    await expect(statusFilter).toHaveValue('checked_in');

    await statusFilter.selectOption('completed');
    await expect(statusFilter).toHaveValue('completed');
  });

  test('mode kritis dan sort mode dapat diubah', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('./#/admin/gatepass-monitor');

    const criticalModeButton = page.getByTestId('gatepass-monitor-critical-mode');
    const sortMode = page.getByTestId('gatepass-monitor-sort-mode');

    await criticalModeButton.click();
    await expect(criticalModeButton).toHaveText(/Mode Kritis Aktif/i);

    await sortMode.selectOption('latest');
    await expect(sortMode).toHaveValue('latest');
  });

  test('mode tampilan dapat diubah ke tabel', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('./#/admin/gatepass-monitor');

    await page.getByTestId('gatepass-monitor-display-table').click();
    await expect(page.getByTestId('monitor-table')).toBeVisible();
  });

  test('filter satuan dan durasi terlambat dapat diubah', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('./#/admin/gatepass-monitor');

    const unitFilter = page.getByTestId('gatepass-monitor-unit-filter');
    const overdueFilter = page.getByTestId('gatepass-monitor-overdue-filter');

    await overdueFilter.selectOption('over_1h');
    await expect(overdueFilter).toHaveValue('over_1h');

    // Pilih opsi kedua jika tersedia agar test tetap robust meski data satuan dinamis.
    const unitOptions = await unitFilter.locator('option').count();
    if (unitOptions > 1) {
      const optionValue = await unitFilter.locator('option').nth(1).getAttribute('value');
      if (optionValue) {
        await unitFilter.selectOption(optionValue);
        await expect(unitFilter).toHaveValue(optionValue);
      }
    } else {
      await expect(unitFilter).toHaveValue('all');
    }
  });

  test('preset tanggal mengisi rentang tanggal', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('./#/admin/gatepass-monitor');

    const startDate = page.getByLabel('Tanggal keluar dari');
    const endDate = page.getByLabel('Tanggal keluar sampai');

    await page.getByRole('button', { name: '7 hari' }).click();

    await expect(startDate).not.toHaveValue('');
    await expect(endDate).not.toHaveValue('');
  });
});
