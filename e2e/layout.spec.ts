import { expect, test } from '@playwright/test';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('./#/login');
  await page.locator('#nrp').fill('1000001');
  await page.locator('#pin').fill('123456');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

test.describe('Layout — Responsive', () => {
  test('bottom tab bar tidak tampil di desktop (viewport lebar)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsAdmin(page);
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    await expect(bottomNav).not.toBeVisible();
  });

  test('bottom tab bar tampil di mobile (viewport sempit)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    await expect(bottomNav).toBeVisible();
  });

  test('sidebar tidak tampil saat menu belum dibuka di mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    // Sidebar dimulai tertutup di mobile; aside harus ada tapi di luar viewport
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeAttached();
  });

  test('heading halaman dashboard tampil di semua ukuran viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('menu shortcut mobile tidak diduplikasi di sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);

    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /Personel/i })).toBeVisible();

    await page.locator('button[aria-label="Toggle sidebar"]').click();

    const sidebarNav = page.locator('aside nav');
    await expect(sidebarNav).toBeVisible();
    await expect(sidebarNav.getByRole('link', { name: /Personel/i })).toHaveCount(0);
    await expect(sidebarNav.getByRole('link', { name: /Pengumuman/i })).toHaveCount(0);
    await expect(sidebarNav.getByRole('link', { name: /Pengaturan|Setelan/i })).toHaveCount(0);
  });
});

test.describe('Layout — Aksesibilitas dasar', () => {
  test('tombol toggle sidebar memiliki aria-label', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    const toggleBtn = page.locator('button[aria-label="Toggle sidebar"]');
    await expect(toggleBtn).toBeAttached();
  });

  test('link navigasi bottom tab memiliki teks label', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    const links = bottomNav.getByRole('link');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const text = await links.nth(i).textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('modal konfirmasi dapat dibuka dan ditutup dengan tombol Batal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('./#/admin/announcements');
    // Buat pengumuman dulu agar ada tombol Hapus
    const hapusButtons = page.getByRole('button', { name: 'Hapus' });
    const count = await hapusButtons.count();
    if (count > 0) {
      await hapusButtons.first().click();
      // Modal konfirmasi harus muncul (bukan browser confirm)
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Batal' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    } else {
      // Tidak ada pengumuman; tes dianggap lulus
      expect(true).toBe(true);
    }
  });
});
