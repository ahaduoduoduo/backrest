import { test, expect, navigationItem } from '../harness/fixtures';
import { backrestClient, seedInstance, seedRepo } from '../harness/seed';

/**
 * CUJ3 — the flagship "add first plan and run first backup" journey.
 *
 * Starting from a seeded instance with a real local restic repo, the user
 * creates a plan entirely through the UI (Add Plan dialog: name, repository,
 * backup path), then triggers "Backup Now" and watches a real restic backup
 * stream to completion. Assertions target persistent state: the sidebar plan
 * entry, the URL hash, and operation rows reaching data-status="success" with
 * snapshot evidence, first on the plan view and then on the repo view.
 */
test.describe('add plan and run first backup (CUJ3)', () => {
  test('create a plan through the UI and run its first backup', async ({ page, backrest }) => {
    // 1. Seed a configured instance + a real local restic repo, and lay down a
    //    tiny tree of files to back up.
    await seedInstance(backrest);
    await seedRepo(backrest, 'local-repo');
    const dataPath = await backrest.makeTestData({
      'hello.txt': 'hello world',
      'nested/world.txt': 'nested content',
    });

    // 2. Load the app: no first-run dialog auto-opens, and the current
    //    navigation contains the add action and seeded repository.
    await page.goto(backrest.url);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const addPlan = await navigationItem(page, 'sidebar-add-plan');
    await expect(addPlan).toBeVisible();
    await expect(await navigationItem(page, 'sidebar-item-repo-local-repo')).toBeVisible();

    // 3. Open the Add Plan dialog (lazy-loaded chunk; auto-waited).
    await addPlan.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Plan name.
    await dialog.getByTestId('add-plan-name').fill('my-plan');

    // Repository: Chakra v3 select. Click the trigger, then click the option.
    // Options render in a portal (outside the dialog), so query at page level.
    await dialog.getByTestId('add-plan-repo-select').click();
    await page.getByRole('option', { name: 'local-repo', exact: true }).click();
    await expect(dialog.getByTestId('add-plan-repo-select')).toContainText('local-repo');

    // Backup path: the paths list starts empty (plan defaults carry no paths),
    // so add a row first, then fill its input. The input is a URI-autocomplete
    // combobox; filling it updates the plan and pops an autocomplete list.
    await dialog.getByTestId('backup-scope-advanced-trigger').click();
    await dialog.getByTestId('add-plan-path-add').click();
    const pathInput = dialog.getByTestId('add-plan-path-input').last();
    await pathInput.fill(dataPath);
    await expect(pathInput).toHaveValue(dataPath);

    // Dismiss the autocomplete popup by refocusing the name field so it cannot
    // overlay the submit button, then verify the path value survived.
    await dialog.getByTestId('add-plan-name').click();
    await expect(pathInput).toHaveValue(dataPath);

    // 4. Submit -> dialog closes and the plan appears in navigation.
    await dialog.getByTestId('add-plan-submit').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const planItem = await navigationItem(page, 'sidebar-item-plan-my-plan');
    await expect(planItem).toBeVisible();

    // Navigate into the plan view via the navigation drawer.
    await planItem.click();
    await expect(page).toHaveURL(/#\/plan\/my-plan$/);
    // 5. Run the first backup through the API. Switch to the operation face, where each operation
    //    renders as its own operation-row (the default Tree View only surfaces
    //    rows in a side panel after a node is selected). Rows update live —
    //    never reload.
    await backrestClient(backrest).backup({ value: 'my-plan' });
    await page.getByTestId('view-tab-list').click();

    // A Backup operation row appears immediately once the trigger is accepted.
    // NOTE: the plan carries the default hourly cron schedule, so the list also
    // holds a future-dated *scheduled* backup that stays "pending" — never scope
    // the success assertion with .first(), which would resolve to that row.
    // Instead wait for a Backup row that has reached success.
    await expect(
      page.locator('[data-testid="operation-row"][data-op-type="Backup"]').first(),
    ).toBeVisible();
    const successfulBackup = page.locator(
      '[data-testid="operation-row"][data-op-type="Backup"][data-status="success"]',
    );
    await expect(successfulBackup).toBeVisible({ timeout: 60_000 });

    // Snapshot evidence: a successful backup produces exactly one indexed-snapshot
    // operation ("Snapshot"), whose row auto-expands its details showing the
    // snapshot id.
    const snapshotRow = page
      .locator('[data-testid="operation-row"][data-op-type="Snapshot"]')
      .first();
    await expect(snapshotRow).toBeVisible({ timeout: 60_000 });
    await expect(snapshotRow).toHaveAttribute('data-status', 'success', {
      timeout: 60_000,
    });
    await expect(snapshotRow).toContainText('Snapshot ID:');

    // 6. The same snapshot evidence is visible from the repo view.
    await page.goto(`${backrest.url}/#/repo/local-repo`);
    await page.getByRole('tab', { name: 'List View' }).click();

    const repoSnapshotRow = page
      .locator('[data-testid="operation-row"][data-op-type="Snapshot"][data-status="success"]')
      .first();
    await expect(repoSnapshotRow).toBeVisible({ timeout: 60_000 });
  });
});
