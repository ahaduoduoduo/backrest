import { create } from "@bufbuild/protobuf";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp, FiTrash2 } from "react-icons/fi";
import { ForgetRequestSchema } from "../../../gen/ts/v1/service_pb";
import { backrestService } from "../../api/client";
import { alerts } from "../../components/common/Alerts";
import { ConfirmButton } from "../../components/common/SpinButton";
import { Tooltip } from "../../components/ui/tooltip";
import * as m from "../../paraglide/messages";

interface VersionHeaderItem {
  id: string;
  timestampMs: number;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function timelineIndexes(total: number, selected: number): number[] {
  if (total <= 12) return Array.from({ length: total }, (_, index) => index);
  const indexes = new Set<number>([0, total - 1, selected]);
  for (let step = 1; step < 10; step += 1) {
    indexes.add(Math.round((step / 10) * (total - 1)));
  }
  return Array.from(indexes).sort((left, right) => left - right);
}

export const SnapshotExplorerHeader = ({
  versions,
  selectedIndex,
  repoId,
  planId,
  onSelect,
}: {
  versions: VersionHeaderItem[];
  selectedIndex: number;
  repoId: string;
  planId: string;
  onSelect: (index: number) => void;
}) => {
  const selectedVersion = versions[selectedIndex];
  const visibleIndexes = timelineIndexes(versions.length, selectedIndex);

  const forgetSelectedVersion = async () => {
    try {
      await backrestService.forget(
        create(ForgetRequestSchema, {
          planId,
          repoId,
          snapshotId: selectedVersion.id,
        }),
      );
      alerts.success(m.operation_tree_view_snapshot_forget_scheduled());
    } catch (error: unknown) {
      alerts.error(
        m.operation_tree_view_failed_to_forget_snapshot_e({
          e: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };

  return (
    <Flex
      className="snapshot-time-rail"
      direction="column"
      align="center"
      minW={{ base: "46px", md: "64px" }}
      py={2}
    >
      <IconButton
        className="snapshot-time-button"
        variant="ghost"
        minH="44px"
        minW="44px"
        borderRadius="full"
        aria-label={m.snapshot_explorer_newer()}
        disabled={selectedIndex === 0}
        onClick={() => onSelect(selectedIndex - 1)}
      >
        <FiChevronUp />
      </IconButton>

      <Box className="snapshot-timeline" flex="1" minH="220px" my={3}>
        {visibleIndexes.map((index) => {
          const version = versions[index];
          const selected = index === selectedIndex;
          const position =
            versions.length <= 1 ? 0 : (index / (versions.length - 1)) * 100;
          return (
            <button
              key={version.id}
              type="button"
              className="snapshot-timeline-tick"
              data-testid="snapshot-version"
              data-selected={selected || undefined}
              style={{ top: `${position}%` }}
              aria-label={dateFormatter.format(version.timestampMs)}
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(index)}
            />
          );
        })}
      </Box>

      <IconButton
        className="snapshot-time-button"
        variant="ghost"
        minH="44px"
        minW="44px"
        borderRadius="full"
        aria-label={m.snapshot_explorer_older()}
        disabled={selectedIndex === versions.length - 1}
        onClick={() => onSelect(selectedIndex + 1)}
      >
        <FiChevronDown />
      </IconButton>

      <Tooltip content={m.operation_tree_view_forget_destructive()} portalled>
        <ConfirmButton
          className="snapshot-time-delete"
          variant="ghost"
          minH="44px"
          minW="44px"
          mt={2}
          borderRadius="full"
          colorPalette="red"
          aria-label={m.operation_tree_view_forget_destructive()}
          confirmTitle={m.operation_tree_view_confirm_forget()}
          confirmTimeout={3000}
          onClickAsync={forgetSelectedVersion}
          data-testid="forget-snapshot"
        >
          <FiTrash2 />
        </ConfirmButton>
      </Tooltip>
    </Flex>
  );
};
