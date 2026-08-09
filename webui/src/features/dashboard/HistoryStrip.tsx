import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { OperationStatus } from "../../../gen/ts/v1/operations_pb";
import { SummaryDashboardResponse_DayStatusBucket } from "../../../gen/ts/v1/service_pb";
import { Tooltip } from "../../components/ui/tooltip";
import { formatBytes } from "../../lib/formatting";
import * as m from "../../paraglide/messages";
import { backupDayOutcome } from "./backupDayOutcome";

const HISTORY_DAYS = 30;

// Display category for one day; drives color, border, dimming, and tooltip via CELL_STYLE.
type CellKind =
  | "beforeStart"
  | "idle"
  | "overdue"
  | "inprogress"
  | "ok"
  | "recovered"
  | "warn"
  | "err"
  | "other";

interface DayCell {
  kind: CellKind;
  label: string; // local date label for the tooltip
  isToday: boolean;
  bucket?: SummaryDashboardResponse_DayStatusBucket; // present for in-window days
}

export function historyCellBoxShadow(kind: CellKind, isToday: boolean) {
  if (kind === "recovered") {
    return "0 0 0 1px var(--chakra-colors-orange-400)";
  }
  return isToday
    ? "0 0 0 2px var(--chakra-colors-bg-canvas), 0 0 0 3.5px var(--chakra-colors-fg-muted)"
    : undefined;
}

const CELL_STYLE: Record<CellKind, { bg: string; dim: boolean }> = {
  beforeStart: { bg: "bg.muted", dim: true },
  // No backup and none expected yet (e.g. a weekly plan between runs): stay quiet.
  idle: { bg: "bg.muted", dim: false },
  // The schedule expected a backup that never came: clearly visible neutral fill.
  overdue: { bg: "bg.emphasized", dim: false },
  inprogress: { bg: "blue.400", dim: false },
  ok: { bg: "green.500", dim: false },
  recovered: { bg: "green.500", dim: false },
  warn: { bg: "orange.400", dim: false },
  err: { bg: "red.500", dim: false },
  other: { bg: "bg.muted", dim: false },
};

// Status categories used both for ranking a day and for the tooltip breakdown.
type StatusCat = "inprogress" | "err" | "warn" | "ok";

// Single source of truth mapping each backup status to a category. The total
// Record makes this exhaustive: adding a status to operations.proto won't compile
// until it is categorized here. `null` = nothing to show for the day yet.
const STATUS_CAT: Record<OperationStatus, StatusCat | null> = {
  [OperationStatus.STATUS_SUCCESS]: "ok",
  [OperationStatus.STATUS_WARNING]: "warn",
  [OperationStatus.STATUS_ERROR]: "err",
  // A system cancellation aborts the backup unexpectedly — treat it as a failure.
  [OperationStatus.STATUS_SYSTEM_CANCELLED]: "err",
  // A backup running for the day when no usable result has completed yet.
  [OperationStatus.STATUS_INPROGRESS]: "inprogress",
  // A user-initiated cancellation is an incomplete backup, not a hard failure.
  [OperationStatus.STATUS_USER_CANCELLED]: "warn",
  // An unrecognized status shouldn't be silently dropped — flag it for attention.
  [OperationStatus.STATUS_UNKNOWN]: "warn",
  // Scheduled but not yet started: no outcome to summarize.
  [OperationStatus.STATUS_PENDING]: null,
};

function cellKind(
  bucket: SummaryDashboardResponse_DayStatusBucket | undefined,
): CellKind {
  const statusCounts = bucket?.statusCounts ?? [];
  if (statusCounts.length === 0) {
    // No backup this day: only alarming if the server says one was due.
    return bucket?.overdue ? "overdue" : "idle";
  }
  const categoryCounts: Record<StatusCat, number> = {
    ok: 0,
    warn: 0,
    err: 0,
    inprogress: 0,
  };
  for (const { status } of statusCounts) {
    const cat = STATUS_CAT[status];
    if (cat) categoryCounts[cat]++;
  }
  switch (
    backupDayOutcome({
      success: categoryCounts.ok,
      warning: categoryCounts.warn,
      inprogress: categoryCounts.inprogress,
      error: categoryCounts.err,
    })
  ) {
    case "success":
      return categoryCounts.err > 0 ? "recovered" : "ok";
    case "warning":
      return "warn";
    case "inprogress":
      return "inprogress";
    case "error":
      return "err";
    default:
      // A day with operations but no outcome yet (e.g. only pending).
      return "other";
  }
}

const MS_PER_DAY = 86_400_000;

// Fixed 30-cell strip in conventional timeline order: oldest day on the left,
// today on the right. Buckets are matched by day distance from the newest bucket
// (always "today" on the server), which tolerates timezone differences and gaps.
// Days before the plan's first backup render as dimmed "before start" cells.
export function toCells(
  buckets: SummaryDashboardResponse_DayStatusBucket[],
): DayCell[] {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const newestMs = buckets.length
    ? Number(buckets[buckets.length - 1].timestampMs)
    : 0;
  const byDaysAgo = new Map<number, SummaryDashboardResponse_DayStatusBucket>();
  let maxDaysAgo = -1;
  for (const b of buckets) {
    // Round to absorb DST-shifted midnights.
    const daysAgo = Math.round((newestMs - Number(b.timestampMs)) / MS_PER_DAY);
    byDaysAgo.set(daysAgo, b);
    maxDaysAgo = Math.max(maxDaysAgo, daysAgo);
  }

  return Array.from({ length: HISTORY_DAYS }, (_, index): DayCell => {
    const daysAgo = HISTORY_DAYS - 1 - index;
    const date = new Date(midnight);
    date.setDate(midnight.getDate() - daysAgo);
    const bucket = byDaysAgo.get(daysAgo);
    return {
      kind: daysAgo > maxDaysAgo ? "beforeStart" : cellKind(bucket),
      label: date.toLocaleDateString(),
      isToday: daysAgo === 0,
      bucket,
    };
  });
}

function summaryText(cells: DayCell[]): string {
  const active = cells.filter((c) => c.kind !== "beforeStart");
  if (active.length === 0) return m.dashboard_history_no_data();
  const missed = active.filter((c) => c.kind === "overdue").length;
  const issues = active.filter(
    (c) => c.kind === "recovered" || c.kind === "warn" || c.kind === "err",
  ).length;
  if (missed === 0 && issues === 0) return m.dashboard_history_all_backed_up();
  const parts: string[] = [];
  if (missed) parts.push(m.dashboard_history_missed({ count: missed }));
  if (issues) parts.push(m.dashboard_history_issues({ count: issues }));
  return m.dashboard_history_summary({ details: parts.join(" · ") });
}

// ─── Per-day hover tooltip ────────────────────────────────────────────────────

const CAT_COLOR: Record<StatusCat, string> = {
  inprogress: "blue.400",
  err: "red.400",
  warn: "orange.400",
  ok: "green.400",
};

const CAT_LABEL: Record<StatusCat, (p: { count: number }) => string> = {
  inprogress: m.dashboard_history_tooltip_status_inprogress,
  err: m.dashboard_repo_failed,
  warn: m.dashboard_history_tooltip_status_warn,
  ok: m.dashboard_history_tooltip_status_ok,
};

// Detail order remains urgency-first even though the cell reflects whether the
// day ultimately obtained a usable backup.
const CAT_ORDER: StatusCat[] = ["inprogress", "err", "warn", "ok"];

const DayTooltip = ({ cell }: { cell: DayCell }) => {
  const counts = new Map<StatusCat, number>();
  for (const sc of cell.bucket?.statusCounts ?? []) {
    const cat = STATUS_CAT[sc.status];
    if (cat) counts.set(cat, (counts.get(cat) ?? 0) + Number(sc.count));
  }
  const bytesAdded = Number(cell.bucket?.bytesAdded ?? 0);
  const bytesScanned = Number(cell.bucket?.bytesScanned ?? 0);
  const hasBackups = counts.size > 0;

  return (
    <Box minW="150px">
      <Text fontWeight="600" fontSize="12px" mb={hasBackups ? 1.5 : 0}>
        {cell.label}
      </Text>
      {cell.kind === "beforeStart" ? (
        <Text fontSize="11px" color="fg.muted">
          {m.dashboard_history_tooltip_before_start()}
        </Text>
      ) : !hasBackups ? (
        <Text
          fontSize="11px"
          fontWeight={cell.bucket?.overdue ? "600" : "400"}
          color={cell.bucket?.overdue ? "orange.400" : "fg.muted"}
        >
          {cell.bucket?.overdue
            ? m.dashboard_history_tooltip_overdue()
            : m.dashboard_history_tooltip_on_schedule()}
        </Text>
      ) : (
        <Stack gap="3px">
          {CAT_ORDER.filter((cat) => counts.has(cat)).map((cat) => (
            <Flex key={cat} align="center" gap="6px">
              <Box
                w="7px"
                h="7px"
                borderRadius="full"
                bg={CAT_COLOR[cat]}
                flexShrink={0}
              />
              <Text fontSize="11px">
                {CAT_LABEL[cat]({ count: counts.get(cat)! })}
              </Text>
            </Flex>
          ))}
          {(bytesAdded > 0 || bytesScanned > 0) && (
            <Box
              mt="3px"
              pt="3px"
              borderTop="1px solid"
              borderColor="border.subtle"
            >
              {bytesAdded > 0 && (
                <Text fontSize="11px" color="fg.muted">
                  {m.dashboard_history_tooltip_added({
                    bytes: formatBytes(bytesAdded),
                  })}
                </Text>
              )}
              {bytesScanned > 0 && (
                <Text fontSize="11px" color="fg.muted">
                  {m.dashboard_history_tooltip_scanned({
                    bytes: formatBytes(bytesScanned),
                  })}
                </Text>
              )}
            </Box>
          )}
          {cell.bucket?.overdue && (
            <Text fontSize="11px" fontWeight="600" color="orange.400">
              {m.dashboard_history_tooltip_overdue()}
            </Text>
          )}
        </Stack>
      )}
    </Box>
  );
};

export const HistoryStrip = ({
  buckets,
}: {
  buckets: SummaryDashboardResponse_DayStatusBucket[];
}) => {
  const cells = toCells(buckets);

  return (
    <Box mt={4}>
      <Text fontSize="13px" fontWeight="520" mb={2} color="fg.default">
        {summaryText(cells)}
      </Text>
      <Flex gap="3px" w="full">
        {cells.map((c, i) => {
          const style = CELL_STYLE[c.kind];
          return (
            <Tooltip
              key={i}
              content={<DayTooltip cell={c} />}
              portalled
              showArrow
              positionerProps={{ zIndex: 2100 }}
              openDelay={120}
              closeDelay={60}
            >
              <Box
                data-testid="history-day"
                data-is-today={c.isToday || undefined}
                aria-label={c.label}
                flexGrow={1}
                flexShrink={1}
                flexBasis={0}
                minW={0}
                h="22px"
                borderRadius="3px"
                bg={style.bg}
                opacity={style.dim ? 0.35 : 1}
                cursor="default"
                boxShadow={historyCellBoxShadow(c.kind, c.isToday)}
              />
            </Tooltip>
          );
        })}
      </Flex>
      {/* Legend */}
      <Flex gap="14px" mt={2} flexWrap="wrap">
        {[
          { label: m.dashboard_state_label_ok(), color: "green.500" },
          { label: m.dashboard_history_legend_issue(), color: "orange.400" },
          { label: m.dashboard_history_legend_inprogress(), color: "blue.400" },
          {
            label: m.dashboard_history_legend_missed(),
            color: "bg.emphasized",
          },
        ].map(({ label, color }) => (
          <Flex key={label} align="center" gap="5px">
            <Box w="9px" h="9px" borderRadius="2px" bg={color} flexShrink={0} />
            <Text fontSize="11px" color="fg.muted">
              {label}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};
