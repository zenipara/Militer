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
		await expect(page.locator('main').getByRole('heading', { name: 'Gate Pass', exact: true })).toBeVisible();
		await expect(page.locator('main').getByRole('heading', { name: 'Ajukan Izin Keluar' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Ajukan Gate Pass' })).toBeVisible();
		await expect(page.getByText('Tunjukkan QR ini ke pos jaga')).toHaveCount(0);
	});

	test('prajurit dapat submit gate pass lalu status approved tampil di riwayat', async ({ page }) => {
		await loginAsPrajurit(page);

		await page.goto('./#/prajurit/gatepass');

		const suffix = `${Date.now()}`;
		const tujuan = `Tes Workflow ${suffix}`;
		const now = new Date();
		now.setSeconds(0, 0);
		const keluar = new Date(now.getTime() + 60 * 60 * 1000);
		const kembali = new Date(now.getTime() + 2 * 60 * 60 * 1000);
		const toLocalInputValue = (value: Date) => {
			const tzOffsetMs = value.getTimezoneOffset() * 60_000;
			return new Date(value.getTime() - tzOffsetMs).toISOString().slice(0, 16);
		};
		await page.getByLabel('Keperluan').fill('Keperluan test alur baru');
		await page.getByLabel('Tujuan').fill(tujuan);
		await page.getByLabel('Waktu Keluar').fill(toLocalInputValue(keluar));
		await page.getByLabel('Waktu Kembali').fill(toLocalInputValue(kembali));
		await page.getByRole('button', { name: 'Ajukan Gate Pass' }).click();

		await expect(page.getByText(tujuan)).toBeVisible();
		const row = page.locator('main .app-card').filter({ hasText: tujuan }).first();
		await expect(row.getByText(/Disetujui|Menunggu/i)).toBeVisible();
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
