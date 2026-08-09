import { create } from "@bufbuild/protobuf";
import { Box, Flex, Heading, IconButton, Spinner } from "@chakra-ui/react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { IoFolder, IoList, IoTrash } from "react-icons/io5";
import { Plan } from "../../../gen/ts/v1/config_pb";
import {
  ForgetRequestSchema,
  GetOperationsRequestSchema,
} from "../../../gen/ts/v1/service_pb";
import { backrestService } from "../../api/client";
import { alerts } from "../../components/common/Alerts";
import { Tooltip } from "../../components/ui/tooltip";
import { MAX_OPERATION_HISTORY } from "../../constants";
import * as m from "../../paraglide/messages";
import { useConfig } from "../../app/provider";
import { OperationListView } from "../operations/OperationListView";
import { PlanSnapshotExplorer } from "./PlanSnapshotExplorer";

export const PlanView = ({ plan }: React.PropsWithChildren<{ plan: Plan }>) => {
  const [config] = useConfig();
  const repo = config?.repos.find((candidate) => candidate.id === plan.repo);
  const reduceMotion = useReducedMotion();
  const [showOperations, setShowOperations] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
    },
    [],
  );

  if (!repo) {
    return (
      <Heading size="lg" color="red.500">
        {m.plan_repo_not_found({ repo: plan.repo!, planId: plan.id! })}
      </Heading>
    );
  }

  const forgetSelectedSnapshot = async () => {
    if (!selectedSnapshotId || deleting) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      deleteTimer.current = setTimeout(() => setDeleteArmed(false), 3000);
      return;
    }
    setDeleteArmed(false);
    setDeleting(true);
    try {
      await backrestService.forget(
        create(ForgetRequestSchema, {
          planId: plan.id,
          repoId: repo.id,
          snapshotId: selectedSnapshotId,
        }),
      );
      alerts.success(m.operation_tree_view_snapshot_forget_scheduled());
    } catch (error: unknown) {
      alerts.error(
        m.operation_tree_view_failed_to_forget_snapshot_e({
          e: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box className="plan-history-view">
      <Box className="plan-history-flip-stage">
        <motion.div
          className="plan-history-flipper"
          animate={{
            opacity: 1,
            transform: reduceMotion
              ? "perspective(1200px) rotateY(0deg)"
              : `perspective(1200px) rotateY(${showOperations ? 180 : 0}deg)`,
          }}
          transition={{
            duration: reduceMotion ? 0.16 : 0.24,
            ease: [0.77, 0, 0.175, 1],
          }}
          data-flipped={showOperations || undefined}
        >
          <Box
            className="plan-history-face plan-history-face-files"
            aria-hidden={showOperations || undefined}
          >
            <PlanSnapshotExplorer
              repoId={repo.id}
              repoGuid={repo.guid}
              planId={plan.id!}
              instanceId={config?.instance}
              maxHistory={BigInt(MAX_OPERATION_HISTORY)}
              onVersionChange={setSelectedSnapshotId}
            />
          </Box>

          <Box
            className="plan-history-face plan-history-face-operations"
            aria-hidden={!showOperations || undefined}
          >
            <Box className="plan-history-operation-scroll">
              <OperationListView
                req={create(GetOperationsRequestSchema, {
                  selector: {
                    instanceId: config?.instance,
                    repoGuid: repo.guid,
                    planId: plan.id!,
                  },
                  lastN: BigInt(MAX_OPERATION_HISTORY),
                })}
                showDelete
                displayHooksInline
              />
            </Box>
          </Box>
        </motion.div>

        <Heading className="plan-history-title" size="xl">
          {plan.id}
        </Heading>

        <Flex className="plan-history-actions" justify="center" gap={2}>
          <Tooltip
            content={showOperations ? m.repo_tab_tree() : m.repo_tab_list()}
          >
            <IconButton
              className="plan-history-action"
              data-active={showOperations || undefined}
              data-testid={
                showOperations ? "view-tab-tree" : "view-tab-list"
              }
              variant="ghost"
              aria-label={
                showOperations ? m.repo_tab_tree() : m.repo_tab_list()
              }
              onClick={() => setShowOperations((value) => !value)}
            >
              {showOperations ? <IoFolder /> : <IoList />}
            </IconButton>
          </Tooltip>
          <Tooltip content={m.operation_tree_view_forget_destructive()}>
            <IconButton
              className="plan-history-action plan-history-delete"
              data-armed={deleteArmed || undefined}
              variant="ghost"
              aria-label={m.operation_tree_view_forget_destructive()}
              data-testid="forget-snapshot"
              disabled={!selectedSnapshotId || deleting || showOperations}
              onClick={() => void forgetSelectedSnapshot()}
            >
              {deleting ? <Spinner size="xs" /> : <IoTrash />}
            </IconButton>
          </Tooltip>
        </Flex>
      </Box>
    </Box>
  );
};
