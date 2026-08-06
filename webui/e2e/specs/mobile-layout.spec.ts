import { test, expect } from '../harness/fixtures';
import { backrestClient, seedInstance, seedPlan, seedRepo } from '../harness/seed';

test.describe('mobile backup console', () => {
  test('shows readable scope cards and a full-width plan editor without horizontal overflow', async ({
    page,
    backrest,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
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

    await page.goto(backrest.url);

    await expect(page.getByText('Backup scope')).toBeVisible();
    await expect(page.getByText('Docker services')).toBeVisible();
    await expect(page.getByText('Git history')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByTestId('sidebar-add-plan').filter({ visible: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('What is backed up')).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    expect(dialogBox?.width).toBeLessThanOrEqual(390);
    expect(dialogBox?.x).toBeGreaterThanOrEqual(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
});
