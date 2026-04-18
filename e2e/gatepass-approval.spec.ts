import { expect, test } from '@playwright/test';

async function loginAsKomandan(page: import('@playwright/test').Page) {
	await page.goto('./#/login');
	await page.locator('#nrp').fill('2000001');
	await page.locator('#pin').fill('123456');
	await page.getByRole('button', { name: 'Masuk' }).click();
	await expect(page).toHaveURL(/\/komandan\/dashboard/);
}

test.describe('Gate Pass Operasional Komandan', () => {
	test('halaman approval berubah menjadi status operasional tanpa tombol approve/reject', async ({ page }) => {
		await loginAsKomandan(page);

		await page.goto('./#/komandan/gatepass-approval');

		await expect(page).toHaveURL(/\/komandan\/gatepass-approval/);
		await expect(page.getByRole('heading', { name: 'Status Operasional Gate Pass' })).toBeVisible();
		await expect(page.getByText(/disetujui otomatis/i)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Reject' })).toHaveCount(0);
	});
});
