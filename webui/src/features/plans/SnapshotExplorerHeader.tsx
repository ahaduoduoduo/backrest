import { create } from "@bufbuild/protobuf";
import { Box, Button, Flex, IconButton, Text } from "@chakra-ui/react";
import { FiChevronLeft, FiChevronRight, FiTrash2 } from "react-icons/fi";
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

const compactFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const fullFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

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
    <>
      <Flex
        position="relative"
        zIndex={2}
        align={{ base: "flex-start", md: "flex-end" }}
        justify="space-between"
        direction={{ base: "column", md: "row" }}
        gap={4}
        mb={{ base: 4, md: 6 }}
      >
        <Box>
          <Text
            color="#63b9e8"
            fontFamily="mono"
            fontSize="9px"
            letterSpacing="0.17em"
          >
            {m.snapshot_explorer_eyebrow().toUpperCase()}
          </Text>
          <Text
            mt={2}
            fontSize={{ base: "27px", md: "36px" }}
            fontWeight="430"
            lineHeight="1"
            letterSpacing="-0.05em"
          >
            {fullFormatter.format(selectedVersion.timestampMs)}
          </Text>
          <Text mt={2} color="whiteAlpha.420" fontSize="11px">
            {m.snapshot_explorer_version_position({
              current: selectedIndex + 1,
              total: versions.length,
            })}
          </Text>
        </Box>
        <Flex gap={2} align="center">
          <Tooltip
            content={m.operation_tree_view_forget_destructive()}
            portalled
          >
            <ConfirmButton
              variant="outline"
              size="sm"
              minH={{ base: "44px", md: "36px" }}
              minW={{ base: "44px", md: "36px" }}
              px="10px"
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
          <IconButton
            variant="outline"
            size="sm"
            minH={{ base: "44px", md: "36px" }}
            minW={{ base: "44px", md: "36px" }}
            aria-label={m.snapshot_explorer_newer()}
            disabled={selectedIndex === 0}
            onClick={() => onSelect(selectedIndex - 1)}
          >
            <FiChevronLeft />
          </IconButton>
          <IconButton
            variant="outline"
            size="sm"
            minH={{ base: "44px", md: "36px" }}
            minW={{ base: "44px", md: "36px" }}
            aria-label={m.snapshot_explorer_older()}
            disabled={selectedIndex === versions.length - 1}
            onClick={() => onSelect(selectedIndex + 1)}
          >
            <FiChevronRight />
          </IconButton>
        </Flex>
      </Flex>

      <Flex
        display={{ base: "flex", lg: "none" }}
        position="relative"
        zIndex={2}
        gap={2}
        overflowX="auto"
        pb={3}
        mb={2}
      >
        {versions.map((version, index) => (
          <Button
            key={version.id}
            size="xs"
            variant={index === selectedIndex ? "subtle" : "outline"}
            colorPalette="blue"
            flexShrink={0}
            onClick={() => onSelect(index)}
          >
            {index === 0
              ? m.snapshot_explorer_latest()
              : compactFormatter.format(version.timestampMs)}
          </Button>
        ))}
      </Flex>
    </>
  );
};
