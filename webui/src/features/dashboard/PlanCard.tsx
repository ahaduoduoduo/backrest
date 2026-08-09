import { create } from "@bufbuild/protobuf";
import { Box, Card, Flex, IconButton, Text } from "@chakra-ui/react";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiClock, FiPlay, FiSquare } from "react-icons/fi";
import { useNavigate } from "react-router";
import { Operation, OperationStatus } from "../../../gen/ts/v1/operations_pb";
import {
  BackupRequestSchema,
  CancelOperationRequestSchema,
  GetOperationsRequestSchema,
  OpSelectorSchema,
  SummaryDashboardResponse_Summary,
} from "../../../gen/ts/v1/service_pb";
import { backrestService } from "../../api/client";
import { getOperations, operationsStream } from "../../api/oplog";
import { matchSelector } from "../../api/logState";
import { alerts } from "../../components/common/Alerts";
import { Tooltip } from "../../components/ui/tooltip";
import { formatBytes, formatTime } from "../../lib/formatting";
import { useConfig } from "../../app/provider";
import * as m from "../../paraglide/messages";
import { HistoryStrip } from "./HistoryStrip";

function prettyPlanId(id: string): string {
  return id
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function agoText(ms: number): string {
  if (!ms) return m.dashboard_time_never();
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 45) return m.dashboard_time_just_now();
  if (seconds < 90) return m.dashboard_time_a_minute_ago();
  if (seconds < 3600)
    return m.dashboard_time_minutes_ago({ count: Math.floor(seconds / 60) });
  if (seconds < 5400) return m.dashboard_time_an_hour_ago();
  if (seconds < 86400)
    return m.dashboard_time_hours_ago({ count: Math.floor(seconds / 3600) });
  if (seconds < 172800) return m.dashboard_time_yesterday();
  return m.dashboard_time_days_ago({ count: Math.floor(seconds / 86400) });
}

function untilText(ms: number): string {
  if (!ms) return m.dashboard_card_none_scheduled();
  const seconds = Math.floor((ms - Date.now()) / 1000);
  if (seconds <= 0) return m.dashboard_time_due_now();
  if (seconds < 5400)
    return m.dashboard_time_in_minutes({
      count: Math.max(1, Math.round(seconds / 60)),
    });
  if (seconds < 172800)
    return m.dashboard_time_in_hours({ count: Math.round(seconds / 3600) });
  return m.dashboard_time_in_days({ count: Math.round(seconds / 86400) });
}

function scheduleText(maxFrequencyHours?: number): string | null {
  if (!maxFrequencyHours) return null;
  if (maxFrequencyHours < 1)
    return m.dashboard_schedule_every_minutes({
      count: Math.round(maxFrequencyHours * 60),
    });
  if (maxFrequencyHours === 1) return m.dashboard_schedule_hourly();
  if (maxFrequencyHours === 24) return m.dashboard_schedule_daily();
  return m.dashboard_schedule_every_hours({ count: maxFrequencyHours });
}

type PlanState = "ok" | "warn" | "err" | "run" | "idle";

const STATE_COLORS: Record<PlanState, string> = {
  ok: "#63b9e8",
  warn: "#f3a35c",
  err: "#f26060",
  run: "#37d785",
  idle: "rgba(241,243,247,0.4)",
};

const STATE_LABEL: Record<PlanState, () => string> = {
  ok: m.dashboard_state_label_ok,
  warn: m.dashboard_hero_warn,
  err: m.dashboard_state_label_err,
  run: m.dashboard_state_label_run,
  idle: m.dashboard_state_label_idle,
};

function planState(status: OperationStatus | undefined): PlanState {
  if (
    status === OperationStatus.STATUS_INPROGRESS ||
    status === OperationStatus.STATUS_PENDING
  )
    return "run";
  if (status === OperationStatus.STATUS_SUCCESS) return "ok";
  if (status === OperationStatus.STATUS_WARNING) return "warn";
  if (
    status === OperationStatus.STATUS_ERROR ||
    status === OperationStatus.STATUS_SYSTEM_CANCELLED
  )
    return "err";
  return "idle";
}

interface LiveProgress {
  pct: number;
  done: number;
  total: number;
}

interface LiveBackup {
  operationId: bigint | null;
  progress: LiveProgress | null;
}

function progressFromOperation(operation: Operation): LiveProgress | null {
  if (operation.op.case !== "operationBackup") return null;
  const entry = operation.op.value.lastStatus?.entry;
  if (entry?.case !== "status") return null;
  return {
    pct: Math.round(entry.value.percentDone * 100),
    done: Number(entry.value.bytesDone),
    total: Number(entry.value.totalBytes),
  };
}

function useLiveBackup(
  planId: string,
  running: boolean,
  onFinished?: () => void,
): LiveBackup {
  const [live, setLive] = useState<LiveBackup>({
    operationId: null,
    progress: null,
  });

  useEffect(() => {
    if (!running) {
      setLive({ operationId: null, progress: null });
      return;
    }
    let disposed = false;
    let finished = false;
    const selector = create(OpSelectorSchema, { planId });

    const apply = (operation: Operation) => {
      if (operation.op.case !== "operationBackup") return;
      const active =
        operation.status === OperationStatus.STATUS_INPROGRESS ||
        operation.status === OperationStatus.STATUS_PENDING;
      if (active) {
        setLive({
          operationId: operation.id,
          progress: progressFromOperation(operation),
        });
        return;
      }
      if (!finished) {
        finished = true;
        setLive({ operationId: null, progress: null });
        onFinished?.();
      }
    };

    const seed = () => {
      getOperations(
        create(GetOperationsRequestSchema, { lastN: 20n, selector }),
      )
        .then((operations) => {
          if (disposed) return;
          const active = operations.find(
            (operation) =>
              operation.op.case === "operationBackup" &&
              (operation.status === OperationStatus.STATUS_INPROGRESS ||
                operation.status === OperationStatus.STATUS_PENDING),
          );
          if (active) apply(active);
        })
        .catch(() => {});
    };

    const unsubscribe = operationsStream.subscribe({
      onMessage: (event) => {
        if (
          event.event.case !== "createdOperations" &&
          event.event.case !== "updatedOperations"
        )
          return;
        for (const operation of event.event.value.operations) {
          if (matchSelector(selector, operation)) apply(operation);
        }
      },
      onConnectOrResync: seed,
    });
    seed();
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [planId, running, onFinished]);

  return live;
}

const BackupProgress = ({ progress }: { progress: LiveProgress | null }) => {
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0.02, (progress?.pct ?? 0) / 100);
  return (
    <Box mt={4}>
      <Box h="5px" borderRadius="full" bg="whiteAlpha.070" overflow="hidden">
        <motion.div
          initial={false}
          animate={{ transform: `scaleX(${pct})` }}
          transition={{
            duration: reduceMotion ? 0.12 : 0.2,
            ease: [0.23, 1, 0.32, 1],
          }}
          style={{
            width: "100%",
            height: "100%",
            transformOrigin: "left center",
            borderRadius: "999px",
            background: "linear-gradient(90deg, #2ecb76, #72e9ad)",
          }}
        />
      </Box>
      <Text mt={2} color="whiteAlpha.420" fontSize="10px">
        {progress
          ? progress.total > 0
            ? m.dashboard_card_progress_detail({
                pct: progress.pct,
                done: formatBytes(progress.done),
                total: formatBytes(progress.total),
              })
            : m.dashboard_card_progress_pct({ pct: progress.pct })
          : m.dashboard_card_progress_scanning()}
      </Text>
    </Box>
  );
};

export const PlanCard = ({
  summary,
  onRefresh,
}: {
  summary: SummaryDashboardResponse_Summary;
  onRefresh?: () => void | Promise<void>;
}) => {
  const navigate = useNavigate();
  const [config] = useConfig();
  const [manualRunning, setManualRunning] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const latestStatus = summary.recentBackups?.status[0];
  const latestTimestamp = Number(summary.recentBackups?.timestampMs[0] ?? 0);
  const waitingForResume = summary.recentBackups?.waitingForResume[0] === true;
  const reportedState = planState(latestStatus);
  const running = reportedState === "run" || manualRunning;
  const state: PlanState = running ? "run" : reportedState;

  useEffect(() => {
    if (reportedState === "run") setManualRunning(false);
  }, [reportedState]);

  const finishLiveBackup = useCallback(() => {
    setManualRunning(false);
    void onRefresh?.();
  }, [onRefresh]);
  const live = useLiveBackup(summary.id, running, finishLiveBackup);

  const plan = useMemo(
    () => config?.plans.find((candidate) => candidate.id === summary.id),
    [config, summary.id],
  );
  const schedule = scheduleText(
    plan?.schedule?.schedule.case === "maxFrequencyHours"
      ? plan.schedule.schedule.value
      : undefined,
  );
  const nextBackup = Number(summary.nextBackupTimeMs ?? 0);
  const lastUpload = Number(summary.recentBackups?.bytesAdded[0] ?? 0);

  const startBackup = async () => {
    setActionPending(true);
    setManualRunning(true);
    try {
      await backrestService.backup(
        create(BackupRequestSchema, { value: summary.id }),
      );
      alerts.success(m.plan_backup_scheduled());
      await onRefresh?.();
    } catch (error: unknown) {
      alerts.error(
        m.plan_error_backup() +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setManualRunning(false);
      setActionPending(false);
    }
  };

  const stopBackup = async () => {
    if (!live.operationId) return;
    setActionPending(true);
    try {
      await backrestService.cancel(
        create(CancelOperationRequestSchema, {
          operationId: live.operationId,
        }),
      );
      alerts.success(m.op_row_cancel_success());
      setManualRunning(false);
      await onRefresh?.();
    } catch (error: unknown) {
      alerts.error(
        m.op_row_cancel_error() +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setActionPending(false);
    }
  };

  const controlLabel = running
    ? m.dashboard_card_stop_backup()
    : m.plan_button_backup();
  const primaryText = running
    ? m.dashboard_state_label_run()
    : waitingForResume
      ? m.dashboard_card_waiting_resume()
      : latestTimestamp
        ? agoText(latestTimestamp)
        : m.dashboard_state_label_idle();

  return (
    <Card.Root
      className="dashboard-plan-card"
      position="relative"
      overflow="hidden"
      borderRadius="24px"
      bg="#0c0e12"
      border="1px solid"
      borderColor="whiteAlpha.100"
      minH="330px"
    >
      <button
        className="dashboard-plan-open"
        type="button"
        aria-label={m.dashboard_card_open_plan({ plan: summary.id })}
        onClick={() => navigate(`/plan/${summary.id}`)}
      />
      <Card.Body
        position="relative"
        zIndex={1}
        px={{ base: 5, md: 6 }}
        py={{ base: 5, md: 6 }}
        pointerEvents="none"
      >
        <Flex justify="space-between" align="flex-start" gap={4}>
          <Box minW={0}>
            <Text
              fontSize="16px"
              fontWeight="650"
              letterSpacing="-0.02em"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {prettyPlanId(summary.id)}
            </Text>
            {schedule && (
              <Text mt="4px" color="whiteAlpha.360" fontSize="10px">
                {schedule}
              </Text>
            )}
          </Box>
          <Tooltip content={controlLabel} portalled>
            <IconButton
              className="dashboard-plan-control"
              pointerEvents="auto"
              zIndex={2}
              size="sm"
              minW={{ base: "44px", md: "36px" }}
              minH={{ base: "44px", md: "36px" }}
              borderRadius="12px"
              variant="outline"
              aria-label={controlLabel}
              color={STATE_COLORS[state]}
              borderColor="whiteAlpha.120"
              bg="rgba(255,255,255,0.025)"
              loading={actionPending}
              disabled={running && !live.operationId}
              onClick={(event) => {
                event.stopPropagation();
                void (running ? stopBackup() : startBackup());
              }}
            >
              {running ? <FiSquare /> : <FiPlay />}
            </IconButton>
          </Tooltip>
        </Flex>

        <Flex align="flex-end" justify="space-between" gap={4} mt={7}>
          <Text
            color={STATE_COLORS[state]}
            fontSize={{ base: "29px", md: "32px" }}
            fontWeight="430"
            lineHeight="0.95"
            letterSpacing="-0.055em"
          >
            {primaryText}
          </Text>
          <Flex align="center" gap="7px" pb="2px" flexShrink={0}>
            <Box
              width="7px"
              height="7px"
              borderRadius="full"
              bg={STATE_COLORS[state]}
            />
            <Text color="whiteAlpha.520" fontSize="11px">
              {STATE_LABEL[state]()}
            </Text>
          </Flex>
        </Flex>

        {running && <BackupProgress progress={live.progress} />}

        {!running && (
          <Flex mt={6} minH="76px" gap={{ base: 5, md: 7 }}>
            <Flex align="center" gap={3} flex="1" minW={0} py={2}>
              <Flex
                width="30px"
                height="30px"
                align="center"
                justify="center"
                borderRadius="10px"
                flexShrink={0}
                color="#63b9e8"
                bg="rgba(97,184,255,0.09)"
              >
                <FiClock />
              </Flex>
              <Box minW={0}>
                <Text color="whiteAlpha.330" fontSize="9px">
                  {m.dashboard_card_next_run()}
                </Text>
                <Text mt="3px" fontSize="13px" fontWeight="600">
                  {untilText(nextBackup)}
                </Text>
                {nextBackup > 0 && (
                  <Text mt="2px" color="whiteAlpha.300" fontSize="9px">
                    {formatTime(nextBackup)}
                  </Text>
                )}
              </Box>
            </Flex>
            <Box width="42%" minW="112px" py={2}>
              <Text color="whiteAlpha.330" fontSize="9px">
                {m.dashboard_card_last_upload()}
              </Text>
              <Text
                mt="6px"
                color="#dff3ff"
                fontSize={{ base: "18px", md: "20px" }}
                fontWeight="470"
                letterSpacing="-0.035em"
                fontVariantNumeric="tabular-nums"
              >
                + {formatBytes(lastUpload)}
              </Text>
            </Box>
          </Flex>
        )}

        <HistoryStrip buckets={summary.historyLast30days} />
      </Card.Body>
    </Card.Root>
  );
};
