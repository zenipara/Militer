import { expect, test } from '@playwright/test';

async function loginAsPrajurit(page: import('@playwright/test').Page) {
	await page.goto('./#/login');
	await page.locator('#nrp').fill('3000001');
	await page.locator('#pin').fill('123456');
	await page.getByRole('button', { name: 'Masuk' }).click();
	await expect(page).toHaveURL(/\/prajurit\/dashboard/);
}

test.describe('Gate Pass Pengajuan Baru', () => {
	test('prajurit melihat form submit auto-approve tanpa QR personal', async ({ page }) => {
		await loginAsPrajurit(page);

		await page.goto('./#/prajurit/gatepass');

		await expect(page).toHaveURL(/\/prajurit\/gatepass/);
		await expect(page.locator('main').getByRole('heading', { name: 'Pengajuan Gate Pass' })).toBeVisible();
		await expect(page.getByText(/otomatis disetujui/i)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
		await expect(page.getByText('Tunjukkan QR ini ke pos jaga')).toHaveCount(0);
	});

	test('prajurit dapat submit gate pass lalu status approved tampil di riwayat', async ({ page }) => {
		await loginAsPrajurit(page);

		await page.goto('./#/prajurit/gatepass');

		const suffix = `${Date.now()}`;
		const tujuan = `Tes Workflow ${suffix}`;
		await page.getByLabel('Keperluan').fill('Keperluan test alur baru');
		await page.getByLabel('Tujuan').fill(tujuan);
		await page.getByLabel('Waktu Keluar').fill('2026-04-18T10:00');
		await page.getByLabel('Waktu Kembali').fill('2026-04-18T12:00');
		await page.getByRole('button', { name: 'Submit' }).click();

		await expect(page.getByText(tujuan)).toBeVisible();
		await expect(page.locator('main').getByText('Approved').first()).toBeVisible();
	});

	test('halaman scan pos jaga tersedia untuk verifikasi keluar dan kembali', async ({ page }) => {
		await loginAsPrajurit(page);

		await page.goto('./#/prajurit/scan-pos');

		await expect(page).toHaveURL(/\/prajurit\/scan-pos/);
		await expect(page.locator('main').getByRole('heading', { name: 'Scan Pos Jaga' })).toBeVisible();
		await expect(page.getByText(/izin keluar\/kembali/i)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Mulai Scan' })).toBeVisible();
	});
});
