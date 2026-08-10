import { Operation, OperationStatus } from "../../../gen/ts/v1/operations_pb";

export interface ActivityDay {
  bytesAdded: number;
  bytesProcessed: number;
  success: number;
  warning: number;
  failed: number;
  running: number;
  pending: number;
  stopped: number;
  recovered: number;
}

export interface ActivitySummary {
  days: Map<string, ActivityDay>;
  bytesAdded: number;
  backupDays: number;
}

export type BackupActivityDayAppearance =
  | "success"
  | "recovered"
  | "warning"
  | "partial-warning"
  | "inprogress"
  | "partial-inprogress"
  | "error"
  | "partial-error"
  | "pending"
  | "stopped"
  | "empty";

interface PlanDayState {
  latestStatus?: OperationStatus;
  latestStartMs: bigint;
  latestId: bigint;
  pending: boolean;
  hadFailure: boolean;
}

interface ActivityDayAccumulator {
  bytesAdded: number;
  bytesProcessed: number;
  plans: Map<string, PlanDayState>;
}

export function activityStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function activityAddDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function activityDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isFailure(status: OperationStatus): boolean {
  return (
    status === OperationStatus.STATUS_ERROR ||
    status === OperationStatus.STATUS_SYSTEM_CANCELLED
  );
}

function backupMetrics(operation: Operation): {
  bytesAdded: number;
  bytesProcessed: number;
} {
  if (operation.op.case !== "operationBackup") {
    return { bytesAdded: 0, bytesProcessed: 0 };
  }
  const entry = operation.op.value.lastStatus?.entry;
  if (entry?.case !== "summary") {
    return { bytesAdded: 0, bytesProcessed: 0 };
  }
  return {
    bytesAdded: Number(entry.value.dataAdded),
    bytesProcessed: Number(entry.value.totalBytesProcessed),
  };
}

function operationIsLater(
  operation: Operation,
  current: PlanDayState,
): boolean {
  return (
    operation.unixTimeStartMs > current.latestStartMs ||
    (operation.unixTimeStartMs === current.latestStartMs &&
      operation.id > current.latestId)
  );
}

function emptyActivityDay(): ActivityDay {
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
  };
}

function finalizeDay(accumulator: ActivityDayAccumulator): ActivityDay {
  const day = emptyActivityDay();
  day.bytesAdded = accumulator.bytesAdded;
  day.bytesProcessed = accumulator.bytesProcessed;

  for (const plan of accumulator.plans.values()) {
    switch (plan.latestStatus) {
      case OperationStatus.STATUS_SUCCESS:
        day.success++;
        if (plan.hadFailure) day.recovered++;
        break;
      case OperationStatus.STATUS_WARNING:
      case OperationStatus.STATUS_UNKNOWN:
        day.warning++;
        break;
      case OperationStatus.STATUS_INPROGRESS:
        day.running++;
        break;
      case OperationStatus.STATUS_ERROR:
      case OperationStatus.STATUS_SYSTEM_CANCELLED:
        day.failed++;
        break;
      case OperationStatus.STATUS_USER_CANCELLED:
        day.stopped++;
        break;
      default:
        if (plan.pending) day.pending++;
        break;
    }
  }

  return day;
}

export function summarizeBackupActivity(
  operations: Operation[],
  now = new Date(),
  visibleDays = 365,
): ActivitySummary {
  const today = activityStartOfDay(now);
  const firstDay = activityAddDays(today, -(visibleDays - 1));
  const accumulators = new Map<string, ActivityDayAccumulator>();

  for (const operation of operations) {
    if (operation.op.case !== "operationBackup" || operation.op.value.dryRun) {
      continue;
    }

    const date = activityStartOfDay(
      new Date(Number(operation.unixTimeStartMs)),
    );
    if (date < firstDay || date > today) continue;

    const key = activityDateKey(date);
    const accumulator = accumulators.get(key) ?? {
      bytesAdded: 0,
      bytesProcessed: 0,
      plans: new Map<string, PlanDayState>(),
    };
    const metrics = backupMetrics(operation);
    accumulator.bytesAdded += metrics.bytesAdded;
    accumulator.bytesProcessed += metrics.bytesProcessed;

    const plan = accumulator.plans.get(operation.planId) ?? {
      latestStartMs: -1n,
      latestId: -1n,
      pending: false,
      hadFailure: false,
    };
    plan.hadFailure ||= isFailure(operation.status);

    if (operation.status === OperationStatus.STATUS_PENDING) {
      plan.pending = true;
    } else if (operationIsLater(operation, plan)) {
      plan.latestStatus = operation.status;
      plan.latestStartMs = operation.unixTimeStartMs;
      plan.latestId = operation.id;
    }
    accumulator.plans.set(operation.planId, plan);
    accumulators.set(key, accumulator);
  }

  const days = new Map<string, ActivityDay>();
  for (const [key, accumulator] of accumulators) {
    days.set(key, finalizeDay(accumulator));
  }

  return {
    days,
    bytesAdded: Array.from(days.values()).reduce(
      (total, day) => total + day.bytesAdded,
      0,
    ),
    backupDays: Array.from(days.values()).filter(
      (day) => day.success + day.warning > 0,
    ).length,
  };
}

export function backupActivityDayAppearance(
  day: ActivityDay | undefined,
): BackupActivityDayAppearance {
  if (!day) return "empty";

  const active = day.success + day.warning + day.failed + day.running;
  if (day.failed > 0) {
    return day.failed === active ? "error" : "partial-error";
  }
  if (day.running > 0) {
    return day.running === active ? "inprogress" : "partial-inprogress";
  }
  if (day.warning > 0) {
    return day.warning === active ? "warning" : "partial-warning";
  }
  if (day.success > 0) {
    if (day.recovered > 0) return "recovered";
    if (day.pending > 0) return "pending";
    return "success";
  }
  if (day.pending > 0) return "pending";
  if (day.stopped > 0) return "stopped";
  return "empty";
}
