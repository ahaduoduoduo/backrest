import { fromJson, type JsonValue } from "@bufbuild/protobuf";
import {
  Box,
  Flex,
  Grid,
  SimpleGrid,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import {
  Operation,
  OperationSchema,
  OperationStatus,
} from "../../../gen/ts/v1/operations_pb";
import { authenticatedFetch } from "../../api/client";
import { operationsStream } from "../../api/oplog";
import { formatBytes } from "../../lib/formatting";
import { getLocale } from "../../paraglide/runtime";
import { backendUrl } from "../../state/buildcfg";

const ACTIVITY_OPERATION_LIMIT = 5000;
const ACTIVITY_REQUEST_TIMEOUT_MS = 4000;
const YEAR_DAYS = 365;
const MOBILE_WALL_DAYS = 112;

interface ActivityDay {
  bytesAdded: number;
  success: number;
  warning: number;
  failed: number;
  running: number;
}

interface ActivitySummary {
  days: Map<string, ActivityDay>;
  bytesAdded: number;
  backupDays: number;
  currentStreak: number;
  longestStreak: number;
}

const activityCopy = () => {
  const zh = getLocale().toLowerCase().startsWith("zh");
  return {
    eyebrow: zh ? "异地备份" : "Offsite backup",
    title: zh ? "备份活动" : "Backup activity",
    year: zh ? "最近一年" : "Past year",
    weeks: zh ? "最近 16 周" : "Past 16 weeks",
    protected: zh ? "已保护" : "Protected",
    added: zh ? "一年新增" : "Added this year",
    days: zh ? "备份天数" : "Backup days",
    currentStreak: zh ? "当前连续" : "Current streak",
    longestStreak: zh ? "最长连续" : "Longest streak",
    dayUnit: zh ? "天" : " days",
    daily: zh ? "每日备份" : "Daily backups",
    less: zh ? "少" : "Less",
    more: zh ? "多" : "More",
    noBackup: zh ? "无备份" : "No backup",
    success: zh ? "成功" : "successful",
    warning: zh ? "警告" : "warnings",
    failed: zh ? "异常" : "failed",
    running: zh ? "进行中" : "running",
    addedOnDay: zh ? "新增" : "added",
    weekdays: zh
      ? ["", "一", "", "三", "", "五", ""]
      : ["", "Mon", "", "Wed", "", "Fri", ""],
  };
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dataAdded(operation: Operation): number {
  if (operation.op.case !== "operationBackup") return 0;
  const entry = operation.op.value.lastStatus?.entry;
  return entry?.case === "summary" ? Number(entry.value.dataAdded) : 0;
}

function summarizeActivity(operations: Operation[]): ActivitySummary {
  const today = startOfDay(new Date());
  const firstDay = addDays(today, -(YEAR_DAYS - 1));
  const days = new Map<string, ActivityDay>();

  for (const operation of operations) {
    if (operation.op.case !== "operationBackup" || operation.op.value.dryRun) {
      continue;
    }

    const date = startOfDay(new Date(Number(operation.unixTimeStartMs)));
    if (date < firstDay || date > today) continue;

    const key = dateKey(date);
    const day = days.get(key) ?? {
      bytesAdded: 0,
      success: 0,
      warning: 0,
      failed: 0,
      running: 0,
    };
    day.bytesAdded += dataAdded(operation);

    switch (operation.status) {
      case OperationStatus.STATUS_SUCCESS:
        day.success += 1;
        break;
      case OperationStatus.STATUS_WARNING:
        day.warning += 1;
        break;
      case OperationStatus.STATUS_INPROGRESS:
      case OperationStatus.STATUS_PENDING:
        day.running += 1;
        break;
      case OperationStatus.STATUS_ERROR:
      case OperationStatus.STATUS_SYSTEM_CANCELLED:
      case OperationStatus.STATUS_USER_CANCELLED:
        day.failed += 1;
        break;
    }
    days.set(key, day);
  }

  const isBackedUp = (date: Date) => {
    const day = days.get(dateKey(date));
    return Boolean(day && day.success + day.warning > 0);
  };

  let currentStreak = 0;
  let cursor = today;
  if (!isBackedUp(cursor) && isBackedUp(addDays(cursor, -1))) {
    cursor = addDays(cursor, -1);
  }
  while (cursor >= firstDay && isBackedUp(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  let longestStreak = 0;
  let runningStreak = 0;
  for (let date = firstDay; date <= today; date = addDays(date, 1)) {
    if (isBackedUp(date)) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
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
    currentStreak,
    longestStreak,
  };
}

function mergeOperations(
  current: Operation[],
  incoming: Operation[],
): Operation[] {
  const byId = new Map(current.map((operation) => [operation.id, operation]));
  for (const operation of incoming) {
    if (operation.op.case === "operationBackup") {
      byId.set(operation.id, operation);
    }
  }
  return Array.from(byId.values())
    .sort((left, right) =>
      left.id === right.id ? 0 : left.id > right.id ? -1 : 1,
    )
    .slice(0, ACTIVITY_OPERATION_LIMIT);
}

interface OperationListJson {
  operations?: JsonValue[];
}

async function getPlanOperations(planId: string): Promise<Operation[]> {
  const base = backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`;
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    ACTIVITY_REQUEST_TIMEOUT_MS,
  );
  try {
    const response = await authenticatedFetch(
      `${base}v1.Backrest/GetOperations`,
      {
        method: "POST",
        headers: {
          "Connect-Protocol-Version": "1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selector: { planId },
          lastN: String(ACTIVITY_OPERATION_LIMIT),
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as OperationListJson;
    return (payload.operations ?? []).map((operation) =>
      fromJson(OperationSchema, operation),
    );
  } catch (_) {
    return [];
  } finally {
    window.clearTimeout(timer);
  }
}

function useBackupOperations(planIds: string[]): {
  operations: Operation[];
  loaded: boolean;
} {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const planKey = planIds.join("\u0000");

  useEffect(() => {
    let disposed = false;
    let lastLoadStarted = 0;
    let loadPromise: Promise<void> | null = null;
    const activePlans = planKey ? planKey.split("\u0000") : [];
    const activePlanSet = new Set(activePlans);

    setLoaded(false);
    const load = () => {
      const now = Date.now();
      if (loadPromise || now - lastLoadStarted < 30_000) return;
      lastLoadStarted = now;
      loadPromise = (async () => {
        try {
          const result = (
            await Promise.all(activePlans.map(getPlanOperations))
          ).flat();
          if (!disposed) {
            setOperations(
              mergeOperations(
                [],
                result.filter(
                  (operation) => operation.op.case === "operationBackup",
                ),
              ),
            );
            setLoaded(true);
          }
        } catch (_) {
          if (!disposed) setLoaded(true);
        } finally {
          loadPromise = null;
        }
      })();
    };

    const unsubscribe = operationsStream.subscribe({
      onMessage: (event) => {
        if (disposed) return;
        switch (event.event.case) {
          case "createdOperations": {
            const incoming = event.event.value.operations.filter((operation) =>
              activePlanSet.has(operation.planId),
            );
            setOperations((current) => mergeOperations(current, incoming));
            break;
          }
          case "updatedOperations": {
            const incoming = event.event.value.operations.filter((operation) =>
              activePlanSet.has(operation.planId),
            );
            setOperations((current) => mergeOperations(current, incoming));
            break;
          }
          case "deletedOperations": {
            const deleted = new Set(event.event.value.values);
            setOperations((current) =>
              current.filter((operation) => !deleted.has(operation.id)),
            );
            break;
          }
        }
      },
      onConnectOrResync: load,
    });
    load();

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [planKey]);

  return { operations, loaded };
}

function buildWall(visibleDays: number): {
  dates: Date[];
  weekStarts: Date[];
} {
  const today = startOfDay(new Date());
  const firstVisible = addDays(today, -(visibleDays - 1));
  const gridStart = addDays(firstVisible, -firstVisible.getDay());
  const gridEnd = addDays(today, 6 - today.getDay());
  const dates: Date[] = [];
  const weekStarts: Date[] = [];

  for (let date = gridStart; date <= gridEnd; date = addDays(date, 1)) {
    if (date.getDay() === 0) weekStarts.push(date);
    dates.push(date);
  }
  return { dates, weekStarts };
}

function activityLevel(day: ActivityDay | undefined, thresholds: number[]) {
  if (!day || day.success + day.warning === 0) return 0;
  if (day.bytesAdded <= 0) return 1;
  if (day.bytesAdded <= thresholds[0]) return 1;
  if (day.bytesAdded <= thresholds[1]) return 2;
  if (day.bytesAdded <= thresholds[2]) return 3;
  return 4;
}

const LEVEL_COLORS = ["#171a20", "#203246", "#294d69", "#397da4", "#63b9e8"];

const Metric = ({ label, value }: { label: string; value: string }) => (
  <Box minW={0} px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
    <Text
      fontSize={{ base: "22px", md: "25px" }}
      fontWeight="430"
      lineHeight="1"
      letterSpacing="-0.045em"
      fontVariantNumeric="tabular-nums"
      truncate
    >
      {value}
    </Text>
    <Text mt={2} color="whiteAlpha.500" fontSize="11px">
      {label}
    </Text>
  </Box>
);

export const BackupActivityOverview = ({
  protectedBytes,
  planIds,
}: {
  protectedBytes: number;
  planIds: string[];
}) => {
  const copy = activityCopy();
  const { operations, loaded } = useBackupOperations(planIds);
  const summary = useMemo(() => summarizeActivity(operations), [operations]);
  const visibleDays = useBreakpointValue({
    base: MOBILE_WALL_DAYS,
    md: YEAR_DAYS,
  });
  const wall = useMemo(
    () => buildWall(visibleDays ?? MOBILE_WALL_DAYS),
    [visibleDays],
  );
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(getLocale(), { month: "short" }),
    [],
  );
  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(getLocale(), {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [],
  );
  const thresholds = useMemo(() => {
    const values = Array.from(summary.days.values())
      .map((day) => day.bytesAdded)
      .filter((value) => value > 0)
      .sort((a, b) => a - b);
    const at = (ratio: number) =>
      values[Math.min(values.length - 1, Math.floor(values.length * ratio))] ??
      0;
    return [at(0.25), at(0.5), at(0.75)];
  }, [summary.days]);

  const metrics = [
    {
      label: copy.protected,
      value: protectedBytes > 0 ? formatBytes(protectedBytes) : "0 B",
    },
    {
      label: copy.added,
      value: !loaded
        ? "—"
        : summary.bytesAdded > 0
          ? formatBytes(summary.bytesAdded)
          : "0 B",
    },
    { label: copy.days, value: loaded ? String(summary.backupDays) : "—" },
    {
      label: copy.currentStreak,
      value: loaded ? `${summary.currentStreak}${copy.dayUnit}` : "—",
    },
    {
      label: copy.longestStreak,
      value: loaded ? `${summary.longestStreak}${copy.dayUnit}` : "—",
    },
  ];

  const describeDay = (date: Date, day: ActivityDay | undefined) => {
    if (!day) return `${dayFormatter.format(date)} · ${copy.noBackup}`;
    const details = [
      day.success > 0 ? `${day.success} ${copy.success}` : "",
      day.warning > 0 ? `${day.warning} ${copy.warning}` : "",
      day.failed > 0 ? `${day.failed} ${copy.failed}` : "",
      day.running > 0 ? `${day.running} ${copy.running}` : "",
      day.bytesAdded > 0
        ? `${copy.addedOnDay} ${formatBytes(day.bytesAdded)}`
        : "",
    ].filter(Boolean);
    return `${dayFormatter.format(date)} · ${details.join(" · ")}`;
  };

  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius={{ base: "22px", md: "28px" }}
      bg="#0c0e12"
      overflow="hidden"
      data-testid="backup-activity-card"
      data-operation-count={operations.length}
      data-day-count={summary.days.size}
    >
      <Box px={{ base: 5, md: 8 }} pt={{ base: 5, md: 7 }}>
        <Flex align="flex-end" justify="space-between" gap={4}>
          <Box>
            <Text
              color="blue.300"
              fontSize="10px"
              fontFamily="mono"
              letterSpacing="0.16em"
            >
              {copy.eyebrow.toUpperCase()}
            </Text>
            <Text
              mt={2}
              fontSize={{ base: "30px", md: "40px" }}
              fontWeight="430"
              lineHeight="1"
              letterSpacing="-0.055em"
            >
              {copy.title}
            </Text>
          </Box>
          <Text color="whiteAlpha.500" fontSize="12px" flexShrink={0}>
            {visibleDays === MOBILE_WALL_DAYS ? copy.weeks : copy.year}
          </Text>
        </Flex>

        <SimpleGrid
          columns={{ base: 2, sm: 3, lg: 5 }}
          mt={{ base: 5, md: 7 }}
          border="1px solid"
          borderColor="whiteAlpha.100"
          borderRadius="18px"
          overflow="hidden"
          css={{
            "& > div": {
              borderRight: "1px solid rgba(255,255,255,0.07)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            },
          }}
        >
          {metrics.map((metric) => (
            <Metric key={metric.label} {...metric} />
          ))}
        </SimpleGrid>

        <Box pt={{ base: 6, md: 8 }} pb={{ base: 6, md: 8 }}>
          <Flex align="center" justify="space-between" mb={4}>
            <Text fontSize="14px" fontWeight="600">
              {copy.daily}
            </Text>
            <Flex align="center" gap="5px">
              <Text color="whiteAlpha.400" fontSize="10px">
                {copy.less}
              </Text>
              {LEVEL_COLORS.slice(1).map((color) => (
                <Box
                  key={color}
                  w="10px"
                  h="10px"
                  borderRadius="3px"
                  bg={color}
                />
              ))}
              <Text color="whiteAlpha.400" fontSize="10px">
                {copy.more}
              </Text>
            </Flex>
          </Flex>

          <Grid
            templateColumns="20px minmax(0, 1fr)"
            columnGap={{ base: 2, md: 3 }}
            rowGap={2}
          >
            <Box />
            <Grid
              templateColumns={`repeat(${wall.weekStarts.length}, minmax(0, 1fr))`}
              columnGap={{ base: "4px", md: "5px" }}
              minW={0}
            >
              {wall.weekStarts.map((week, index) => {
                const previous = wall.weekStarts[index - 1];
                const showMonth =
                  index === 0 || week.getMonth() !== previous.getMonth();
                return (
                  <Text
                    key={dateKey(week)}
                    h="14px"
                    color="whiteAlpha.400"
                    fontSize="9px"
                    lineHeight="14px"
                    whiteSpace="nowrap"
                  >
                    {showMonth ? monthFormatter.format(week) : ""}
                  </Text>
                );
              })}
            </Grid>

            <Grid templateRows="repeat(7, minmax(0, 1fr))" rowGap="4px">
              {copy.weekdays.map((label, index) => (
                <Text
                  key={`${label}-${index}`}
                  color="whiteAlpha.350"
                  fontSize="9px"
                  lineHeight="1"
                  display="flex"
                  alignItems="center"
                >
                  {label}
                </Text>
              ))}
            </Grid>
            <Grid
              gridAutoFlow="column"
              gridTemplateRows="repeat(7, minmax(0, 1fr))"
              gridAutoColumns="minmax(0, 1fr)"
              gap={{ base: "4px", md: "5px" }}
              minW={0}
            >
              {wall.dates.map((date) => {
                const day = summary.days.get(dateKey(date));
                const level = activityLevel(day, thresholds);
                return (
                  <Box
                    key={dateKey(date)}
                    aspectRatio="1"
                    minW={0}
                    borderRadius={{ base: "3px", md: "4px" }}
                    bg={LEVEL_COLORS[level]}
                    opacity={date > startOfDay(new Date()) ? 0.25 : 1}
                    boxShadow={
                      day?.failed
                        ? "inset 0 0 0 1px rgba(255, 164, 92, 0.9)"
                        : day?.running
                          ? "inset 0 0 0 1px rgba(97, 184, 255, 0.95)"
                          : undefined
                    }
                    title={describeDay(date, day)}
                  />
                );
              })}
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};
