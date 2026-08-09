import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { normalizeSnapshotId } from "../../lib/formatting";
import * as m from "../../paraglide/messages";

interface VersionRailItem {
  id: string;
  timestampMs: number;
}

const formatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const SnapshotVersionRail = ({
  versions,
  selectedIndex,
  onSelect,
}: {
  versions: VersionRailItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) => (
  <Stack
    className="snapshot-version-rail"
    gap={0}
    maxH="560px"
    overflowY="auto"
    pr="2px"
  >
    {versions.map((version, index) => {
      const selected = index === selectedIndex;
      return (
        <Button
          key={version.id}
          className="snapshot-version-button"
          data-selected={selected || undefined}
          variant="ghost"
          height="52px"
          minH="52px"
          px={2}
          justifyContent="flex-start"
          onClick={() => onSelect(index)}
          aria-current={selected ? "true" : undefined}
        >
          <Box
            className="snapshot-version-dot"
            width="7px"
            height="7px"
            borderRadius="full"
            flexShrink={0}
          />
          <Box minW={0} textAlign="left">
            <Text
              color={selected ? "#dff3ff" : "whiteAlpha.520"}
              fontSize="10px"
              fontWeight={selected ? "650" : "450"}
              lineHeight="1.25"
              whiteSpace="nowrap"
            >
              {index === 0
                ? m.snapshot_explorer_latest()
                : formatter.format(version.timestampMs)}
            </Text>
            <Text mt="3px" color="whiteAlpha.280" fontSize="9px">
              {normalizeSnapshotId(version.id)}
            </Text>
          </Box>
        </Button>
      );
    })}
  </Stack>
);
