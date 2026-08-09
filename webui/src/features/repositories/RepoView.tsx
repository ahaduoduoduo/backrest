import React, { Suspense, useContext, useEffect, useState } from "react";
import { Repo } from "../../../gen/ts/v1/config_pb";
import { Button } from "../../components/ui/button";
import {
  Flex,
  Heading,
  Box,
  IconButton,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import {
  FiArchive,
  FiBarChart2,
  FiClock,
  FiMoreHorizontal,
  FiRefreshCw,
  FiShield,
  FiTerminal,
  FiUnlock,
} from "react-icons/fi";
import {
  Tabs,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import {
  MenuContent,
  MenuItem,
  MenuItemText,
  MenuRoot,
  MenuTrigger,
} from "../../components/ui/menu";
import { Tooltip } from "../../components/ui/tooltip";
import { OperationListView } from "../operations/OperationListView";
import { OperationTreeView } from "../operations/OperationTreeView";
import {
  MAX_OPERATION_HISTORY,
  STATS_OPERATION_HISTORY,
} from "../../constants";
import {
  DoRepoTaskRequest_Task,
  DoRepoTaskRequestSchema,
  GetOperationsRequestSchema,
  OpSelectorSchema,
  SummaryDashboardResponse_Summary,
} from "../../../gen/ts/v1/service_pb";
import { backrestService } from "../../api/client";
import { SpinButton } from "../../components/common/SpinButton";
import { useConfig } from "../../app/provider";
import { formatErrorAlert, alerts } from "../../components/common/Alerts";
import { useShowModal } from "../../components/common/ModalManager";
import { create } from "@bufbuild/protobuf";
import { RepoProps } from "../../state/peerStates";
import * as m from "../../paraglide/messages";
import { formatBytes } from "../../lib/formatting";
import { HistoryStrip } from "../dashboard/HistoryStrip";

const StatsPanel = React.lazy(() => import("../dashboard/StatsPanel"));

const RepositoryMetric = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) => (
  <Box px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }} minW={0}>
    <Text
      color={tone}
      fontSize={{ base: "20px", md: "24px" }}
      fontWeight="520"
      lineHeight="1"
      letterSpacing="-0.035em"
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

const RepositoryOverview = ({
  summary,
}: {
  summary: SummaryDashboardResponse_Summary;
}) => (
  <Box
    mb={{ base: 5, md: 7 }}
    border="1px solid"
    borderColor="whiteAlpha.100"
    borderRadius={{ base: "18px", md: "22px" }}
    bg="#0c0e12"
    overflow="hidden"
    data-testid="repository-overview"
  >
    <SimpleGrid
      columns={{ base: 2, md: 4 }}
      css={{
        "& > div": {
          borderRight: "1px solid rgba(255,255,255,0.07)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        },
      }}
    >
      <RepositoryMetric
        label={m.dashboard_card_protected()}
        value={formatBytes(Number(summary.protectedBytes))}
      />
      <RepositoryMetric
        label={`${m.dashboard_repo_window_30d()} ${m.dashboard_repo_added()}`}
        value={formatBytes(Number(summary.bytesAddedLast30days))}
      />
      <RepositoryMetric
        label={`${m.dashboard_repo_window_30d()} ${m.dashboard_card_backups_ok()}`}
        value={Number(summary.backupsSuccessLast30days).toLocaleString()}
        tone="green.400"
      />
      <RepositoryMetric
        label={`${m.dashboard_repo_window_30d()} ${m.dashboard_card_backups_failed()}`}
        value={Number(summary.backupsFailed30days).toLocaleString()}
        tone={summary.backupsFailed30days ? "orange.400" : undefined}
      />
    </SimpleGrid>
    <Box px={{ base: 4, md: 5 }} pt={1} pb={{ base: 4, md: 5 }}>
      <HistoryStrip buckets={summary.historyLast30days} />
    </Box>
  </Box>
);

const useRepositorySummary = (repoId: string) => {
  const [summary, setSummary] =
    useState<SummaryDashboardResponse_Summary | null>(null);

  useEffect(() => {
    let disposed = false;
    const load = () => {
      if (document.hidden) return;
      backrestService
        .getSummaryDashboard({})
        .then((response) => {
          if (!disposed) {
            setSummary(
              response.repoSummaries.find((item) => item.id === repoId) ?? null,
            );
          }
        })
        .catch(() => {});
    };
    load();
    document.addEventListener("visibilitychange", load);
    const interval = window.setInterval(load, 60_000);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", load);
      window.clearInterval(interval);
    };
  }, [repoId]);

  return summary;
};

export const RepoView = ({
  repo,
}: React.PropsWithChildren<{ repo: RepoProps }>) => {
  const [config, _] = useConfig();
  const showModal = useShowModal();
  const summary = useRepositorySummary(repo.id);

  // Task handlers
  const handleIndexNow = async () => {
    try {
      await backrestService.doRepoTask(
        create(DoRepoTaskRequestSchema, {
          repoId: repo.id!,
          task: DoRepoTaskRequest_Task.INDEX_SNAPSHOTS,
        }),
      );
    } catch (e: any) {
      alerts.error(formatErrorAlert(e, m.repo_error_index()));
    }
  };

  const handleUnlockNow = async () => {
    try {
      alerts.info(m.repo_info_unlocking());
      await backrestService.doRepoTask(
        create(DoRepoTaskRequestSchema, {
          repoId: repo.id!,
          task: DoRepoTaskRequest_Task.UNLOCK,
        }),
      );
      alerts.success(m.repo_success_unlocked());
    } catch (e: any) {
      alerts.error(m.repo_error_unlock() + e.message);
    }
  };

  const handleStatsNow = async () => {
    try {
      await backrestService.doRepoTask(
        create(DoRepoTaskRequestSchema, {
          repoId: repo.id!,
          task: DoRepoTaskRequest_Task.STATS,
        }),
      );
    } catch (e: any) {
      alerts.error(formatErrorAlert(e, m.repo_error_stats()));
    }
  };

  const handlePruneNow = async () => {
    try {
      await backrestService.doRepoTask(
        create(DoRepoTaskRequestSchema, {
          repoId: repo.id!,
          task: DoRepoTaskRequest_Task.PRUNE,
        }),
      );
    } catch (e: any) {
      alerts.error(formatErrorAlert(e, m.repo_error_prune()));
    }
  };

  const handleCheckNow = async () => {
    try {
      await backrestService.doRepoTask(
        create(DoRepoTaskRequestSchema, {
          repoId: repo.id!,
          task: DoRepoTaskRequest_Task.CHECK,
        }),
      );
    } catch (e: any) {
      alerts.error(formatErrorAlert(e, m.repo_error_check()));
    }
  };

  const handleForgetNow = async () => {
    try {
      await backrestService.doRepoTask(
        create(DoRepoTaskRequestSchema, {
          repoId: repo.id!,
          task: DoRepoTaskRequest_Task.FORGET,
        }),
      );
    } catch (e: any) {
      alerts.error(formatErrorAlert(e, m.repo_error_forget()));
    }
  };

  // Gracefully handle deletions by checking if the plan is still in the config.
  const repoInConfig = config?.repos?.find((r) => r.id === repo.id);
  if (!repoInConfig) {
    return (
      <Box>
        {m.repo_deleted_message()}
        <Box as="pre" p={2} bg="gray.100" borderRadius="md" overflowX="auto">
          {JSON.stringify(config, null, 2)}
        </Box>
      </Box>
    );
  }
  repo = repoInConfig;

  return (
    <Box>
      <Flex gap={4} align="center" wrap="wrap" mb={4}>
        <Heading size="xl">{repo.id}</Heading>
        <Box flex="1" />

        <Flex className="repository-actions" align="center" gap="7px">
          <Tooltip content={m.repo_button_index()} portalled>
            <SpinButton
              className="repository-action-button repository-refresh-button"
              aria-label={m.repo_button_index()}
              onClickAsync={handleIndexNow}
            >
              <FiRefreshCw />
            </SpinButton>
          </Tooltip>
          <MenuRoot positioning={{ placement: "bottom-end", gutter: 8 }}>
            <MenuTrigger asChild>
              <IconButton
                className="repository-action-button"
                variant="ghost"
                aria-label={m.plan_view_more_actions()}
              >
                <FiMoreHorizontal />
              </IconButton>
            </MenuTrigger>
            <MenuContent className="console-action-menu repository-action-menu">
              <MenuItem
                value="run-command"
                onClick={async () => {
                  const { RunCommandModal } =
                    await import("../operations/RunCommandModal");
                  showModal(<RunCommandModal repo={repo} />);
                }}
              >
                <FiTerminal />
                <MenuItemText>{m.op_type_run_command()}</MenuItemText>
              </MenuItem>
              <MenuItem value="unlock" onClick={handleUnlockNow}>
                <FiUnlock />
                <MenuItemText>{m.repo_button_unlock()}</MenuItemText>
              </MenuItem>
              <MenuItem value="prune" onClick={handlePruneNow}>
                <FiArchive />
                <MenuItemText>{m.repo_button_prune()}</MenuItemText>
              </MenuItem>
              {repoInConfig.forgetPolicy && (
                <MenuItem value="forget" onClick={handleForgetNow}>
                  <FiClock />
                  <MenuItemText>{m.repo_button_forget()}</MenuItemText>
                </MenuItem>
              )}
              <MenuItem value="check" onClick={handleCheckNow}>
                <FiShield />
                <MenuItemText>{m.repo_button_check()}</MenuItemText>
              </MenuItem>
              <MenuItem value="stats" onClick={handleStatsNow}>
                <FiBarChart2 />
                <MenuItemText>{m.repo_button_stats()}</MenuItemText>
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        </Flex>
      </Flex>

      {summary && <RepositoryOverview summary={summary} />}

      <TabsRoot defaultValue="tree" lazyMount>
        <TabsList>
          <TabsTrigger value="tree" data-testid="view-tab-tree">
            {m.repo_tab_tree()}
          </TabsTrigger>
          <TabsTrigger value="list" data-testid="view-tab-list">
            {m.repo_tab_list()}
          </TabsTrigger>
          <TabsTrigger value="stats" data-testid="view-tab-stats">
            {m.op_type_stats()}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree">
          <OperationTreeView
            req={create(GetOperationsRequestSchema, {
              selector: {
                repoGuid: repo.guid,
              },
              lastN: BigInt(MAX_OPERATION_HISTORY),
            })}
          />
        </TabsContent>

        <TabsContent value="list">
          <Heading size="md" mb={4}>
            {m.repo_history_title()}
          </Heading>
          <OperationListView
            req={create(GetOperationsRequestSchema, {
              selector: {
                repoGuid: repo.guid,
              },
              lastN: BigInt(MAX_OPERATION_HISTORY),
            })}
            showPlan={true}
            showDelete={true}
          />
        </TabsContent>

        <TabsContent value="stats">
          <Suspense fallback={<div>{m.loading()}</div>}>
            <StatsPanel
              selector={create(OpSelectorSchema, {
                repoGuid: repo.guid,
                instanceId: config?.instance,
              })}
            />
          </Suspense>
        </TabsContent>
      </TabsRoot>
    </Box>
  );
};
