export type BackupDayOutcome =
  "success" | "warning" | "inprogress" | "error" | "empty";

export interface BackupDayCounts {
  success?: number;
  warning?: number;
  inprogress?: number;
  error?: number;
}

// The calendar answers whether a usable backup exists for the day. Individual
// failures remain visible in tooltips and operation history, but a later good
// backup resolves the day's protection state.
export function backupDayOutcome({
  success = 0,
  warning = 0,
  inprogress = 0,
  error = 0,
}: BackupDayCounts): BackupDayOutcome {
  if (success > 0) return "success";
  if (warning > 0) return "warning";
  if (inprogress > 0) return "inprogress";
  if (error > 0) return "error";
  return "empty";
}
