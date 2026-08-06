import { test, expect } from '../harness/fixtures';
import { devices } from '@playwright/test';
import { backrestClient, seedInstance, seedPlan, seedRepo } from '../harness/seed';

test.describe('mobile backup console', () => {
  test('uses the real device viewport, editorial navigation, and a full-screen editor', async ({
    browser,
    backrest,
  }) => {
    await seedInstance(backrest);
    await seedRepo(backrest, 'offsite');
    await seedPlan(backrest, 'nas-config', 'offsite', [
      '/source/docker',
      '/source/home-assistant',
      '/staging',
    ]);

    const client = backrestClient(backrest);
    const config = await client.getConfig({});
    config.plans[0].excludes = ['**/@eaDir/**', '**/.git/**', '/source/docker/alist/data.db*'];
    await client.setConfig(config);

    const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
    const page = await context.newPage();
    await page.goto(backrest.url);

    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
    }));
    expect(viewport.width).toBe(390);
    expect(viewport.viewportMeta).toContain('width=device-width');

    const contentCard = page.getByTestId('backup-content-card');
    await expect(contentCard).toBeVisible();
    await expect(page.getByText('CONTENT / OFFSITE')).toBeVisible();
    await expect(page.getByText('Backup content')).toBeVisible();
    await expect(page.getByText('Docker services')).toBeVisible();
    await expect(page.getByText('Git history')).toBeVisible();
    const contentBox = await contentCard.boundingBox();
    expect(contentBox?.y).toBeLessThan(80);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await page.getByRole('button', { name: 'Menu' }).click();
    const navigation = page.getByRole('dialog');
    await expect(navigation.getByText('CONTENT / NAVIGATION')).toBeVisible();
    await expect(navigation.getByText('nas-config')).toBeVisible();
    await expect
      .poll(async () => {
        const box = await navigation.boundingBox();
        return (
          box && {
            x: Math.round(box.x),
            width: Math.round(box.width),
            height: Math.round(box.height),
          }
        );
      })
      .toEqual({ x: 0, width: viewport.width, height: viewport.height });
    await page.keyboard.press('Escape');
    await expect(navigation).not.toBeVisible();

    await page.getByTestId('edit-backup-content-nas-config').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Content' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Content' }).click();
    await expect(dialog.getByText('Backed up')).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    expect(dialogBox?.x).toBe(0);
    expect(dialogBox?.y).toBe(0);
    expect(dialogBox?.width).toBe(viewport.width);
    expect(dialogBox?.height).toBe(viewport.height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await context.close();
  });
});
