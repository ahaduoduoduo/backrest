import { test, expect } from '../harness/fixtures';
import { backrestClient, seedInstance, seedPlan, seedRepo } from '../harness/seed';

test.describe('mobile backup console', () => {
  test('prioritizes backup content and opens a true full-screen editor', async ({
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

    const contentCard = page.getByTestId('backup-content-card');
    await expect(contentCard).toBeVisible();
    await expect(page.getByText('Backup content')).toBeVisible();
    await expect(page.getByText('Docker services')).toBeVisible();
    await expect(page.getByText('Git history')).toBeVisible();
    const contentBox = await contentCard.boundingBox();
    expect(contentBox?.y).toBeLessThan(80);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await page.getByTestId('edit-backup-content-nas-config').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Content' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Content' }).click();
    await expect(dialog.getByText('Backed up')).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    expect(dialogBox?.x).toBe(0);
    expect(dialogBox?.y).toBe(0);
    expect(dialogBox?.width).toBe(390);
    expect(dialogBox?.height).toBe(844);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
});
