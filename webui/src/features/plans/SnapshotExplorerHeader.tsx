import { Box, Flex, IconButton } from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
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
  onSelect,
}: {
  versions: VersionHeaderItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) => {
  const visibleIndexes = timelineIndexes(versions.length, selectedIndex);

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
        aria-label={m.snapshot_explorer_older()}
        disabled={selectedIndex === versions.length - 1}
        onClick={() => onSelect(selectedIndex + 1)}
      >
        <FiChevronUp />
      </IconButton>

      <Box className="snapshot-timeline" flex="1" minH="220px" my={3}>
        {visibleIndexes.map((index) => {
          const version = versions[index];
          const selected = index === selectedIndex;
          const position =
            versions.length <= 1
              ? 50
              : 100 - (index / (versions.length - 1)) * 100;
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
        aria-label={m.snapshot_explorer_newer()}
        disabled={selectedIndex === 0}
        onClick={() => onSelect(selectedIndex - 1)}
      >
        <FiChevronDown />
      </IconButton>
    </Flex>
  );
};
