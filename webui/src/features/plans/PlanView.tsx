import React, { useEffect, useState } from "react";
import { Plan } from "../../../gen/ts/v1/config_pb";
import { Button } from "../../components/ui/button";
import { Flex, Heading, Text, Box, Group, IconButton } from "@chakra-ui/react";
import { FiChevronDown } from "react-icons/fi";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsRoot,
} from "../../components/ui/tabs";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from "../../components/ui/menu";
import { Tooltip } from "../../components/ui/tooltip";
import { alerts } from "../../components/common/Alerts";
import { MAX_OPERATION_HISTORY } from "../../constants";
import { backrestService } from "../../api/client";
import {
  ClearHistoryRequestSchema,
  DoRepoTaskRequest_Task,
  DoRepoTaskRequestSchema,
  GetOperationsRequestSchema,
  BackupRequestSchema,
} from "../../../gen/ts/v1/service_pb";
import { SpinButton } from "../../components/common/SpinButton";
import { useShowModal } from "../../components/common/ModalManager";
import { create } from "@bufbuild/protobuf";
import { useConfig } from "../../app/provider";
import { OperationListView } from "../operations/OperationListView";
import { PlanSnapshotExplorer } from "./PlanSnapshotExplorer";
import * as m from "../../paraglide/messages";

export const PlanView = ({ plan }: React.PropsWithChildren<{ plan: Plan }>) => {
  const [config, _] = useConfig();
  const showModal = useShowModal();
  const repo = config?.repos.find((r) => r.id === plan.repo);

  const handleBackupNow = async () => {
    try {
      await backrestService.backup(
        create(BackupRequestSchema, { value: plan.id }),
      );
      alerts.success(m.plan_backup_scheduled());
    } catch (e: any) {
      alerts.error(m.plan_error_backup() + e.message);
    }
  };

  const handleDryRunBackup = async () => {
    try {
      await backrestService.backup(
        create(BackupRequestSchema, { value: plan.id, dryRun: true }),
      );
      alerts.success(m.plan_dry_run_scheduled());
    } catch (e: any) {
      alerts.error(m.plan_dry_run_error() + e.message);
    }
  };

  const handleUnlockNow = async () => {
    try {
      alerts.info(m.repo_info_unlocking());
      await backrestService.doRepoTask(
        create(DoRepoTaskRequestSchema, {
          repoId: plan.repo!,
          task: DoRepoTaskRequest_Task.UNLOCK,
        }),
      );
      alerts.success(m.repo_success_unlocked());
    } catch (e: any) {
      alerts.error(m.repo_error_unlock() + e.message);
    }
  };

  const handleClearErrorHistory = async () => {
    try {
      alerts.info(m.plan_clearing_history());
      await backrestService.clearHistory(
        create(ClearHistoryRequestSchema, {
          selector: {
            planId: plan.id,
            repoGuid: repo!.guid,
            originalInstanceKeyid: "",
          },
          onlyFailed: true,
        }),
      );
      alerts.success(m.plan_history_cleared());
    } catch (e: any) {
      alerts.error(m.plan_error_clear_history() + e.message);
    }
  };

  if (!repo) {
    return (
      <Heading size="lg" color="red.500">
        {m.plan_repo_not_found({ repo: plan.repo!, planId: plan.id! })}
      </Heading>
    );
  }

  return (
    <Box>
      <Flex gap={4} align="center" wrap="wrap" mb={4}>
        <Heading size="xl">{plan.id}</Heading>
        <Box flex="1" />

        <Group attached>
          <SpinButton
            type="primary"
            onClickAsync={handleBackupNow}
            data-testid="plan-backup-now"
          >
            {m.plan_button_backup()}
          </SpinButton>
          <MenuRoot>
            <MenuTrigger asChild>
              <IconButton
                variant="subtle"
                colorPalette="blue"
                aria-label={m.plan_view_more_actions()}
              >
                <FiChevronDown />
              </IconButton>
            </MenuTrigger>
            <MenuContent>
              <MenuItem value="dry-run-backup" onClick={handleDryRunBackup}>
                {m.op_type_dry_run_backup()}
              </MenuItem>
              <MenuItem
                value="run-command"
                onClick={async () => {
                  const { RunCommandModal } =
                    await import("../operations/RunCommandModal");
                  showModal(<RunCommandModal repo={repo} />);
                }}
              >
                {m.op_type_run_command()}
              </MenuItem>
              <MenuItem value="unlock" onClick={handleUnlockNow}>
                {m.repo_button_unlock()}
              </MenuItem>
              <MenuItem value="clear-history" onClick={handleClearErrorHistory}>
                {m.plan_button_clear_history()}
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        </Group>
      </Flex>

      <TabsRoot defaultValue="files" lazyMount>
        <TabsList>
          <TabsTrigger value="files" data-testid="view-tab-tree">
            {m.repo_tab_tree()}
          </TabsTrigger>
          <TabsTrigger value="operations" data-testid="view-tab-list">
            {m.repo_tab_list()}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" pt={{ base: 4, md: 6 }}>
          <PlanSnapshotExplorer
            repoId={repo.id}
            repoGuid={repo.guid}
            planId={plan.id!}
            instanceId={config?.instance}
            maxHistory={BigInt(MAX_OPERATION_HISTORY)}
          />
        </TabsContent>

        <TabsContent value="operations" pt={{ base: 4, md: 6 }}>
          <Box
            border="1px solid"
            borderColor="whiteAlpha.100"
            borderRadius={{ base: "22px", md: "28px" }}
            bg="#0c0e12"
            overflow="hidden"
          >
            <Box
              px={{ base: 4, md: 7 }}
              py={{ base: 5, md: 6 }}
              borderBottom="1px solid"
              borderColor="whiteAlpha.100"
            >
              <Text
                color="orange.300"
                fontFamily="mono"
                fontSize="9px"
                letterSpacing="0.17em"
              >
                {m.plan_operations_eyebrow().toUpperCase()}
              </Text>
              <Heading mt={2} size="lg" letterSpacing="-0.035em">
                {m.repo_history_title()}
              </Heading>
              <Text mt={2} color="whiteAlpha.450" fontSize="12px">
                {m.plan_operations_description()}
              </Text>
            </Box>
            <Box px={{ base: 3, md: 5 }} py={{ base: 4, md: 5 }}>
              <OperationListView
                req={create(GetOperationsRequestSchema, {
                  selector: {
                    instanceId: config?.instance,
                    repoGuid: repo.guid,
                    planId: plan.id!,
                  },
                  lastN: BigInt(MAX_OPERATION_HISTORY),
                })}
                showDelete={true}
                displayHooksInline={true}
              />
            </Box>
          </Box>
        </TabsContent>
      </TabsRoot>
    </Box>
  );
};
