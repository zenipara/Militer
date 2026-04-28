import fs from 'fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

test.setTimeout(0);

type RoleKey = 'admin' | 'komandan' | 'prajurit' | 'guard' | 'staf';
const ALL_ROLES: RoleKey[] = ['admin', 'komandan', 'prajurit', 'guard', 'staf'];

const ROLE_CREDENTIALS: Record<RoleKey, { nrp: string; pin: string; dashboardPath: string }> = {
  admin: {
    nrp: process.env.E2E_ADMIN_NRP ?? '1000001',
    pin: process.env.E2E_ADMIN_PIN ?? '123456',
    dashboardPath: '/admin/dashboard',
  },
  komandan: {
    nrp: process.env.E2E_KOMANDAN_NRP ?? '2000001',
    pin: process.env.E2E_KOMANDAN_PIN ?? '123456',
    dashboardPath: '/komandan/dashboard',
  },
  prajurit: {
    nrp: process.env.E2E_PRAJURIT_NRP ?? '3000001',
    pin: process.env.E2E_PRAJURIT_PIN ?? '123456',
    dashboardPath: '/prajurit/dashboard',
  },
  guard: {
    nrp: process.env.E2E_GUARD_NRP ?? '4000001',
    pin: process.env.E2E_GUARD_PIN ?? '123456',
    dashboardPath: '/guard/gatepass-scan',
  },
  staf: {
    nrp: process.env.E2E_STAF_NRP ?? '5000001',
    pin: process.env.E2E_STAF_PIN ?? '123456',
    dashboardPath: '/staf/dashboard',
  },
};

// Public pages accessible without authentication
const PUBLIC_PAGES = ['/login', '/error'];

const ROUTES_BY_ROLE: Record<RoleKey, string[]> = {
  admin: [
    '/admin/dashboard',
    '/admin/users',
    '/admin/announcements',
    '/admin/settings',
    '/admin/gatepass-monitor',
    '/admin/pos-jaga',
  ],
  komandan: [
    '/komandan/dashboard',
    '/komandan/tasks',
    '/komandan/personnel',
    '/komandan/gatepass-monitor',
  ],
  prajurit: [
    '/prajurit/dashboard',
    '/prajurit/tasks',
    '/prajurit/profile',
    '/prajurit/gatepass',
  ],
  guard: [
    '/guard/gatepass-scan',
    '/guard/discipline',
  ],
  staf: [
    '/staf/dashboard',
    '/staf/messages',
  ],
};

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

async function loginAsRole(page: Page, role: RoleKey): Promise<boolean> {
  const { nrp, pin, dashboardPath } = ROLE_CREDENTIALS[role];
  try {
    await page.goto('./#/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#nrp').fill(nrp);
    await page.locator('#pin').fill(pin);
    await page.getByRole('button', { name: /Masuk|Masuk Sekarang/ }).click();
    
    // Wait for redirect to dashboard or error
    try {
      await expect(page).toHaveURL(new RegExp(dashboardPath), { timeout: 8000 });
      return true;
    } catch {
      console.warn(`⚠️  Login failed for ${role} (${nrp}). Skipping authenticated pages.`);
      return false;
    }
  } catch (err) {
    console.warn(`⚠️  Login attempt failed for ${role}: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function capturePublicPages(context: BrowserContext, viewportName: string, width: number, height: number): Promise<void> {
  const dir = `test-results/screenshots/${viewportName}/public`;
  fs.mkdirSync(dir, { recursive: true });

  const page = await context.newPage();
  await page.setViewportSize({ width, height });

  for (const route of PUBLIC_PAGES) {
    try {
      const hashPath = `/#${route}`.replace(/\/\/+/, '/');
      await page.goto(hashPath, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const name = route.replace(/\//g, '_').replace(/^_/, '') || 'root';
      const filename = `${dir}/${name}-${width}x${height}.png`;
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`✓ Saved public page: ${filename}`);
    } catch (err) {
      console.warn(`✗ Failed to capture ${route}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await page.close();
}

async function captureAuthenticatedPages(context: BrowserContext, role: RoleKey, viewportName: string, width: number, height: number): Promise<void> {
  const dir = `test-results/screenshots/${viewportName}/${role}`;
  fs.mkdirSync(dir, { recursive: true });

  const page = await context.newPage();
  await page.setViewportSize({ width, height });

  const loginSuccess = await loginAsRole(page, role);

  if (!loginSuccess) {
    console.warn(`⊘ Skipping authenticated pages for ${role} (login failed)`);
    await page.close();
    return;
  }

  for (const route of ROUTES_BY_ROLE[role]) {
    try {
      const hashPath = `/#${route}`.replace(/\/\/+/, '/');
      await page.goto(hashPath, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const name = route.replace(/\//g, '_').replace(/^_/, '') || 'root';
      const filename = `${dir}/${name}-${width}x${height}.png`;
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`✓ Saved ${role} page: ${filename}`);
    } catch (err) {
      console.warn(`✗ Failed to capture ${role} ${route}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Also capture error page in role context
  try {
    await page.goto('/#/error', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const errorFile = `${dir}/error-${width}x${height}.png`;
    await page.screenshot({ path: errorFile, fullPage: true });
    console.log(`✓ Saved error page: ${errorFile}`);
  } catch (err) {
    console.warn(`✗ Failed to capture error page for ${role}`);
  }

  await page.close();
}

test('capture screenshots for all accessible pages', async ({ browser }) => {
  fs.rmSync('test-results/screenshots', { recursive: true, force: true });
  fs.mkdirSync('test-results/screenshots', { recursive: true });

  console.log('\n📸 Starting screenshot capture across responsive viewports...\n');

  const selectedRoles = (process.env.E2E_SCREENSHOT_ROLES
    ? process.env.E2E_SCREENSHOT_ROLES.split(',').map((r) => r.trim().toLowerCase())
    : ALL_ROLES
  ).filter((role): role is RoleKey => ALL_ROLES.includes(role as RoleKey));

  for (const vp of viewports) {
    console.log(`\n📱 Viewport: ${vp.name} (${vp.width}x${vp.height})`);

    // Capture public pages (login, error)
    const publicContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await capturePublicPages(publicContext, vp.name, vp.width, vp.height);
    await publicContext.close();

    // Capture authenticated pages per role
    for (const role of selectedRoles) {
      const authContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      await captureAuthenticatedPages(authContext, role, vp.name, vp.width, vp.height);
      await authContext.close();
    }
  }

  console.log('\n✅ Screenshot capture complete. Check test-results/screenshots/\n');
});
