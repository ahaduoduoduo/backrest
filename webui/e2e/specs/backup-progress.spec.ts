import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { create } from '@bufbuild/protobuf';
import { PlanSchema, Schedule_Clock } from '../../gen/ts/v1/config_pb';
import { test, expect } from '../harness/fixtures';
import { backrestClient, seedInstance, seedRepo } from '../harness/seed';

/**
 * Real-time backup progress in the detailed operation history.
 *
 * Seeds an instance/repo/plan whose backup source is incompressible
 * (crypto-random) data, rate-limited via a restic backup flag so the backup
 * runs long enough (~10-15s) to observe live progress. The test stays on the
 * plan view's Operation History tab and, without ever reloading the page,
 * watches the backup stream in:
 *
 *   1. the Backup operation row appears and reports data-status="in progress",
 *   2. the streamed "Bytes Done/Total" progress line CHANGES
 *      between two samples — the "real time" part,
 *   3. the same row then transitions to
 *      data-status="success" with snapshot evidence.
 */

/**
 * Size of the random source data and the restic upload rate cap. Unthrottled,
 * restic's throughput on this data varies wildly with the page cache (observed
 * 75-300 MiB/s: a 600MB backup once finished in 2s — too fast to observe
 * streamed progress). Capping uploads via `--limit-upload` pins the backup
 * duration at DATA_TOTAL_MB / UPLOAD_LIMIT_MIB_S ≈ 12s regardless of machine
 * speed, which is ample to observe live progress without slowing the test.
 */
const DATA_TOTAL_MB = 256;
const DATA_FILE_MB = 64;
const UPLOAD_LIMIT_MIB_S = 20;

test.describe('real-time backup progress (operation history)', () => {
  test('backup streams live progress into operation history without reload', async ({
    page,
    backrest,
  }) => {
    test.setTimeout(180_000);

    // 1. Seed instance + repo + plan. The backup source is written here in the
    //    spec (not via makeTestData) because it must be large and
    //    incompressible: crypto.randomBytes defeats restic's compression and
    //    dedup so the upload actually takes several seconds.
    await seedInstance(backrest);
    await seedRepo(backrest, 'local-repo');

    const sourceDir = path.join(backrest.dataDir, 'progress-source');
    await fs.mkdir(sourceDir, { recursive: true });
    for (let i = 0; i * DATA_FILE_MB < DATA_TOTAL_MB; i++) {
      await fs.writeFile(
        path.join(sourceDir, `random-${i}.bin`),
        crypto.randomBytes(DATA_FILE_MB * 1024 * 1024),
      );
    }

    // Seed the plan directly (rather than via seedPlan) so it can carry a
    // backup flag that rate-limits restic's upload; schedule stays disabled
    // just like seedPlan so no background backups fire.
    const client = backrestClient(backrest);
    const config = await client.getConfig({});
    config.plans.push(
      create(PlanSchema, {
        id: 'my-plan',
        repo: 'local-repo',
        paths: [sourceDir],
        backupFlags: [`--limit-upload=${UPLOAD_LIMIT_MIB_S * 1024}`],
        schedule: {
          schedule: { case: 'disabled', value: true },
          clock: Schedule_Clock.LOCAL,
        },
      }),
    );
    await client.setConfig(config);

    // 2. Open the plan before any backup exists, then enter detailed operation
    //    history. The page is never reloaded from here on.
    await page.goto(`${backrest.url}/#/plan/my-plan`);
    await expect(page.getByTestId('plan-backup-now')).toBeVisible();
    await page.getByTestId('view-tab-list').click();
    // The disabled schedule means anything that appears later arrived through
    // the live operation stream.
    await expect(page.getByText('No operations yet')).toBeVisible();

    // 3. Trigger the backup.
    await page.getByTestId('plan-backup-now').click();

    // 4a. The Backup row arrives through the live stream and reports its
    //     in-progress state directly in the diagnostics list.
    const backupRow = page.locator('[data-testid="operation-row"][data-op-type="Backup"]');
    await expect(backupRow).toBeVisible({ timeout: 15_000 });
    await expect(backupRow).toHaveAttribute('data-status', 'in progress', {
      timeout: 30_000,
    });

    // 4b. Real-time check: the details panel's "Bytes Done/Total" line (fed by
    //     streamed OperationBackup.lastStatus events) must CHANGE between two
    //     samples — all without reloading.
    const sampleProgress = async (): Promise<string | null> => {
      // Short timeout + catch: if the row is mid-rerender when sampled, treat
      // it as "no sample yet" and let the poll retry rather than hanging.
      const text = await backupRow.innerText({ timeout: 1_000 }).catch(() => '');
      const match = text.match(/Bytes Done\/Total\s*\n?\s*([^\n]+)/);
      return match ? match[1].trim() : null;
    };

    let firstSample: string | null = null;
    await expect
      .poll(
        async () => {
          firstSample = await sampleProgress();
          return firstSample;
        },
        { timeout: 30_000, message: 'first in-progress bytes sample appears' },
      )
      .not.toBeNull();

    // Second sample: only a genuinely different bytes line, or completion (the
    // summary replaces the bytes line and the row reaches success), counts as
    // a change — a transiently unreadable row keeps polling instead of faking
    // progress.
    await expect
      .poll(
        async () => {
          const sample = await sampleProgress();
          if (sample !== null) return sample;
          const status = await backupRow
            .getAttribute('data-status', { timeout: 1_000 })
            .catch(() => null);
          return status === 'success' ? '<completed>' : firstSample;
        },
        {
          timeout: 60_000,
          message: `progress advances beyond first sample (${firstSample})`,
        },
      )
      .not.toBe(firstSample);

    // 4c. Still without reload, the same row reaches success.
    await expect(backupRow).toHaveAttribute('data-status', 'success', {
      timeout: 90_000,
    });

    // 5. Snapshot evidence in the same details panel: the flow gains an
    //    indexed-snapshot operation with its snapshot id.
    const snapshotRow = page.locator('[data-testid="operation-row"][data-op-type="Snapshot"]');
    await expect(snapshotRow).toBeVisible({ timeout: 30_000 });
    await expect(snapshotRow).toHaveAttribute('data-status', 'success');
    await expect(snapshotRow).toContainText('Snapshot ID:');
  });
});
