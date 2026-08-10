import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";
import {
  OperationBackupSchema,
  OperationSchema,
  OperationStatus,
} from "../../../gen/ts/v1/operations_pb";
import {
  BackupProgressEntrySchema,
  BackupProgressSummarySchema,
} from "../../../gen/ts/v1/restic_pb";
import {
  activityDateKey,
  backupActivityDayAppearance,
  summarizeBackupActivity,
  type ActivityDay,
} from "./backupActivitySummary";

const now = new Date(2026, 7, 10, 12, 0, 0);

function backupOperation({
  id,
  planId,
  hour,
  status,
  bytesAdded = 0,
  bytesProcessed = 0,
}: {
  id: number;
  planId: string;
  hour: number;
  status: OperationStatus;
  bytesAdded?: number;
  bytesProcessed?: number;
}) {
  const hasSummary = bytesAdded > 0 || bytesProcessed > 0;
  return create(OperationSchema, {
    id: BigInt(id),
    planId,
    status,
    unixTimeStartMs: BigInt(new Date(2026, 7, 10, hour).getTime()),
    op: {
      case: "operationBackup",
      value: create(OperationBackupSchema, {
        lastStatus: hasSummary
          ? create(BackupProgressEntrySchema, {
              entry: {
                case: "summary",
                value: create(BackupProgressSummarySchema, {
                  dataAdded: BigInt(bytesAdded),
                  totalBytesProcessed: BigInt(bytesProcessed),
                }),
              },
            })
          : undefined,
      }),
    },
  });
}

function day(overrides: Partial<ActivityDay>): ActivityDay {
  return {
    bytesAdded: 0,
    bytesProcessed: 0,
    success: 0,
    warning: 0,
    failed: 0,
    running: 0,
    pending: 0,
    stopped: 0,
    recovered: 0,
    ...overrides,
  };
}

describe("summarizeBackupActivity", () => {
  it("counts each plan by its final daily state and sums both plan additions", () => {
    const summary = summarizeBackupActivity(
      [
        backupOperation({
          id: 1,
          planId: "nas-config",
          hour: 5,
          status: OperationStatus.STATUS_ERROR,
        }),
        backupOperation({
          id: 2,
          planId: "nas-config",
          hour: 6,
          status: OperationStatus.STATUS_SUCCESS,
          bytesAdded: 100,
          bytesProcessed: 1000,
        }),
        backupOperation({
          id: 3,
          planId: "time-machine",
          hour: 7,
          status: OperationStatus.STATUS_SUCCESS,
          bytesAdded: 200,
          bytesProcessed: 2000,
        }),
      ],
      now,
    );

    expect(summary.days.get(activityDateKey(now))).toMatchObject({
      success: 2,
      failed: 0,
      recovered: 1,
      bytesAdded: 300,
      bytesProcessed: 3000,
    });
  });

  it("does not let a later scheduled operation replace a completed daily state", () => {
    const summary = summarizeBackupActivity(
      [
        backupOperation({
          id: 1,
          planId: "nas-config",
          hour: 5,
          status: OperationStatus.STATUS_SUCCESS,
        }),
        backupOperation({
          id: 2,
          planId: "nas-config",
          hour: 9,
          status: OperationStatus.STATUS_PENDING,
        }),
      ],
      now,
    );

    expect(summary.days.get(activityDateKey(now))).toMatchObject({
      success: 1,
      pending: 0,
    });
  });

  it("treats a user-stopped backup as neutral rather than failed", () => {
    const summary = summarizeBackupActivity(
      [
        backupOperation({
          id: 1,
          planId: "time-machine",
          hour: 7,
          status: OperationStatus.STATUS_USER_CANCELLED,
        }),
      ],
      now,
    );

    expect(summary.days.get(activityDateKey(now))).toMatchObject({
      failed: 0,
      warning: 0,
      stopped: 1,
      recovered: 0,
    });
  });
});

describe("backupActivityDayAppearance", () => {
  it("uses a red outline for a mixed success and failure day", () => {
    expect(backupActivityDayAppearance(day({ success: 1, failed: 1 }))).toBe(
      "partial-error",
    );
  });

  it("uses a solid red state when every task failed", () => {
    expect(backupActivityDayAppearance(day({ failed: 2 }))).toBe("error");
  });

  it("distinguishes mixed and all-running days", () => {
    expect(backupActivityDayAppearance(day({ success: 1, running: 1 }))).toBe(
      "partial-inprogress",
    );
    expect(backupActivityDayAppearance(day({ running: 2 }))).toBe("inprogress");
  });

  it("keeps an orange recovery outline after every task succeeds", () => {
    expect(backupActivityDayAppearance(day({ success: 2, recovered: 1 }))).toBe(
      "recovered",
    );
  });

  it("uses a neutral stopped state for a user cancellation", () => {
    expect(backupActivityDayAppearance(day({ stopped: 1 }))).toBe("stopped");
  });
});
