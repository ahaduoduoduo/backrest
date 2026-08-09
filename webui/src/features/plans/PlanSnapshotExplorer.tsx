import { create, toJsonString } from "@bufbuild/protobuf";
import {
  Box,
  Button,
  Center,
  Flex,
  IconButton,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiHardDrive } from "react-icons/fi";
import {
  IoChevronBack,
  IoDocument,
  IoFolder,
  IoHome,
} from "react-icons/io5";
import { Operation, OperationStatus } from "../../../gen/ts/v1/operations_pb";
import { ResticSnapshot } from "../../../gen/ts/v1/restic_pb";
import {
  GetOperationsRequestSchema,
  LsEntry,
  ListSnapshotFilesRequestSchema,
  type GetOperationsRequest,
} from "../../../gen/ts/v1/service_pb";
import { backrestService } from "../../api/client";
import { OplogState, syncStateFromRequest } from "../../api/logState";
import { SnapshotEntryActions } from "../repositories/SnapshotBrowser";
import { formatBytes } from "../../lib/formatting";
import { getLocale } from "../../paraglide/runtime";
import * as m from "../../paraglide/messages";
import { SnapshotExplorerHeader } from "./SnapshotExplorerHeader";

export interface SnapshotVersion {
  id: string;
  operationId: bigint;
  timestampMs: number;
  snapshot: ResticSnapshot;
}

export function snapshotVersionsFromOperations(
  operations: Operation[],
): SnapshotVersion[] {
  const bySnapshot = new Map<string, SnapshotVersion>();
  for (const operation of operations) {
    if (
      operation.op.case !== "operationIndexSnapshot" ||
      operation.op.value.forgot ||
      operation.status !== OperationStatus.STATUS_SUCCESS
    ) {
      continue;
    }
    const snapshot = operation.op.value.snapshot;
    if (!snapshot?.id) continue;
    bySnapshot.set(snapshot.id, {
      id: snapshot.id,
      operationId: operation.id,
      timestampMs:
        Number(snapshot.unixTimeMs) || Number(operation.unixTimeStartMs),
      snapshot,
    });
  }
  return Array.from(bySnapshot.values()).sort(
    (left, right) => right.timestampMs - left.timestampMs,
  );
}

function useSnapshotVersions(request: GetOperationsRequest) {
  const [versions, setVersions] = useState<SnapshotVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = new OplogState();
    state.subscribe(() => {
      setVersions(snapshotVersionsFromOperations(state.getAll()));
      setLoading(false);
    });
    return syncStateFromRequest(
      state,
      request,
      () => setLoading(false),
      () => setLoading(false),
    );
  }, [toJsonString(GetOperationsRequestSchema, request)]);

  return { versions, loading };
}

function directoryPath(path: string): string {
  if (!path || path === "/") return "/";
  const normalized = `/${path.split("/").filter(Boolean).join("/")}`;
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function parentPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  segments.pop();
  return segments.length ? `/${segments.join("/")}` : "/";
}

const isDirectoryEntry = (entry: LsEntry): boolean =>
  entry.type === "dir" || entry.type === "directory";

function sortEntries(entries: LsEntry[], parent: string): LsEntry[] {
  return [...entries]
    .filter((entry) => entry.path && entry.path.length > parent.length)
    .sort((left, right) => {
      const leftIsDirectory = isDirectoryEntry(left);
      const rightIsDirectory = isDirectoryEntry(right);
      if (leftIsDirectory !== rightIsDirectory) {
        return leftIsDirectory ? -1 : 1;
      }
      return left.name.localeCompare(right.name, getLocale(), {
        numeric: true,
        sensitivity: "base",
      });
    });
}

const fileDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const stackDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const STACK_CARD_COUNT = 5;

function stackTransform(depth: number): string {
  const translateY = depth * -12;
  const translateZ = depth * -44;
  const scale = 1 - depth * 0.018;
  return `translate3d(0, ${translateY}px, ${translateZ}px) scale(${scale})`;
}

function stackOpacity(depth: number): number {
  return Math.max(0.2, 1 - depth * 0.17);
}

const ExplorerBreadcrumbs = ({
  path,
  onNavigate,
}: {
  path: string;
  onNavigate: (path: string) => void;
}) => {
  const segments = path.split("/").filter(Boolean);
  return (
    <Flex
      className="snapshot-explorer-path"
      align="center"
      gap="3px"
      minW={0}
      overflowX="auto"
    >
      <Button
        className="snapshot-path-control"
        size="xs"
        variant="ghost"
        flexShrink={0}
        aria-label={m.snapshot_explorer_root()}
        onClick={() => onNavigate("/")}
      >
        <IoHome />
      </Button>
      {segments.map((segment, index) => {
        const segmentPath = `/${segments.slice(0, index + 1).join("/")}`;
        return (
          <Flex key={segmentPath} align="center" flexShrink={0}>
            <Text color="whiteAlpha.300" fontSize="11px">
              /
            </Text>
            <Button
              className="snapshot-path-control"
              size="xs"
              variant="ghost"
              px="7px"
              onClick={() => onNavigate(segmentPath)}
            >
              {segment}
            </Button>
          </Flex>
        );
      })}
    </Flex>
  );
};

const FileRow = ({
  entry,
  version,
  repoId,
  planId,
  onOpen,
}: {
  entry: LsEntry;
  version: SnapshotVersion;
  repoId: string;
  planId: string;
  onOpen: (entry: LsEntry) => void;
}) => {
  const isDirectory = isDirectoryEntry(entry);
  const mtime = entry.mtime ? new Date(entry.mtime) : null;
  const hasMtime = mtime && !Number.isNaN(mtime.getTime());

  return (
    <Flex
      className="snapshot-explorer-row"
      data-testid="snapshot-explorer-entry"
      align="center"
      minH={{ base: "58px", md: "52px" }}
      px={{ base: 3, md: 4 }}
      gap={3}
    >
      <Flex
        role={isDirectory ? "button" : undefined}
        tabIndex={isDirectory ? 0 : undefined}
        align="center"
        gap={3}
        minW={0}
        flex="1"
        textAlign="left"
        cursor={isDirectory ? "pointer" : "default"}
        onClick={() => {
          if (isDirectory) onOpen(entry);
        }}
        onKeyDown={(event) => {
          if (isDirectory && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onOpen(entry);
          }
        }}
      >
      <Flex
        className="snapshot-entry-icon"
        width="32px"
          height="32px"
          align="center"
          justify="center"
          flexShrink={0}
        bg={isDirectory ? "rgba(97, 184, 255, 0.1)" : "whiteAlpha.050"}
          color={isDirectory ? "#63b9e8" : "whiteAlpha.650"}
        >
          {isDirectory ? <IoFolder /> : <IoDocument />}
        </Flex>
        <Box minW={0}>
          <Text
            fontSize="13px"
            fontWeight="540"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {entry.name}
          </Text>
          <Text
            display={{ base: "block", md: "none" }}
            mt="2px"
            color="whiteAlpha.400"
            fontSize="10px"
          >
            {isDirectory
              ? m.snapshot_explorer_folder()
              : formatBytes(Number(entry.size))}
          </Text>
        </Box>
      </Flex>
      <Text
        display={{ base: "none", md: "block" }}
        width="166px"
        flexShrink={0}
        color="whiteAlpha.420"
        fontSize="11px"
        fontVariantNumeric="tabular-nums"
      >
        {hasMtime ? fileDateFormatter.format(mtime) : "—"}
      </Text>
      <Text
        display={{ base: "none", md: "block" }}
        width="82px"
        flexShrink={0}
        textAlign="right"
        color="whiteAlpha.500"
        fontSize="11px"
        fontVariantNumeric="tabular-nums"
      >
        {isDirectory ? "—" : formatBytes(Number(entry.size))}
      </Text>
      <SnapshotEntryActions
        entry={entry}
        snapshotId={version.id}
        snapshotOpId={version.operationId}
        repoId={repoId}
        planId={planId}
      />
    </Flex>
  );
};

export const PlanSnapshotExplorer = ({
  repoId,
  repoGuid,
  planId,
  instanceId,
  maxHistory,
  onVersionChange,
}: {
  repoId: string;
  repoGuid: string;
  planId: string;
  instanceId?: string;
  maxHistory: bigint;
  onVersionChange?: (snapshotId: string) => void;
}) => {
  const request = useMemo(
    () =>
      create(GetOperationsRequestSchema, {
        selector: { instanceId, repoGuid, planId },
        lastN: maxHistory,
      }),
    [instanceId, repoGuid, planId, maxHistory],
  );
  const { versions, loading: versionsLoading } = useSnapshotVersions(request);
  const [selectedId, setSelectedId] = useState("");
  const [currentPath, setCurrentPath] = useState("/");
  const [entries, setEntries] = useState<LsEntry[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [loadedDirectoryKey, setLoadedDirectoryKey] = useState("");
  const [direction, setDirection] = useState(1);
  const cache = useRef(new Map<string, LsEntry[]>());
  const reduceMotion = useReducedMotion();

  const selectedIndex = Math.max(
    0,
    versions.findIndex((version) => version.id === selectedId),
  );
  const selectedVersion = versions[selectedIndex];

  useEffect(() => {
    if (versions.length === 0) {
      setSelectedId("");
      return;
    }
    if (!versions.some((version) => version.id === selectedId)) {
      setSelectedId(versions[0].id);
    }
  }, [versions, selectedId]);

  useEffect(() => {
    onVersionChange?.(selectedVersion?.id || "");
  }, [onVersionChange, selectedVersion?.id]);

  useEffect(() => {
    if (!selectedVersion) return;
    let active = true;
    const normalizedPath = directoryPath(currentPath);
    const cacheKey = `${selectedVersion.id}\u0000${normalizedPath}`;
    const cached = cache.current.get(cacheKey);
    setDirectoryError("");
    if (cached) {
      setEntries(cached);
      setLoadedDirectoryKey(cacheKey);
      setDirectoryLoading(false);
      return;
    }
    setEntries([]);
    setDirectoryLoading(true);
    backrestService
      .listSnapshotFiles(
        create(ListSnapshotFilesRequestSchema, {
          repoId,
          snapshotId: selectedVersion.id,
          path: normalizedPath,
        }),
      )
      .then((response) => {
        if (!active) return;
        const nextEntries = sortEntries(response.entries, normalizedPath);
        cache.current.set(cacheKey, nextEntries);
        setEntries(nextEntries);
        setLoadedDirectoryKey(cacheKey);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadedDirectoryKey(cacheKey);
        setDirectoryError(
          error instanceof Error ? error.message : String(error),
        );
      })
      .finally(() => active && setDirectoryLoading(false));
    return () => {
      active = false;
    };
  }, [currentPath, repoId, selectedVersion?.id]);

  const selectVersion = (index: number) => {
    if (index < 0 || index >= versions.length || index === selectedIndex)
      return;
    setDirection(index > selectedIndex ? 1 : -1);
    setSelectedId(versions[index].id);
  };

  if (versionsLoading && versions.length === 0) {
    return (
      <Center minH="420px">
        <Spinner />
      </Center>
    );
  }

  if (!selectedVersion) {
    return (
      <Center
        minH="420px"
        border="1px solid"
        borderColor="whiteAlpha.100"
        borderRadius="24px"
        bg="#0c0e12"
      >
        <Stack align="center" gap={3} color="whiteAlpha.500">
          <FiHardDrive size={28} />
          <Text fontSize="14px">{m.snapshot_explorer_empty()}</Text>
        </Stack>
      </Center>
    );
  }

  const visibleVersions = versions
    .slice(selectedIndex, selectedIndex + STACK_CARD_COUNT)
    .map((version, depth) => ({ version, depth }));
  const activeDirectoryKey = `${selectedVersion.id}\u0000${directoryPath(currentPath)}`;
  const directoryPending =
    directoryLoading || loadedDirectoryKey !== activeDirectoryKey;

  return (
    <Box className="snapshot-explorer" position="relative" minW={0}>
      <Box className="snapshot-time-scene">
        <Box className="snapshot-time-stage" position="relative" minW={0}>
          <AnimatePresence initial={false}>
            {visibleVersions.map(({ version, depth }) => {
              const activeVersion = depth === 0;
              const frontTransform = "translate3d(0, 46px, 74px) scale(1.035)";
              return (
                <motion.div
                  key={version.id}
                  className="snapshot-time-card"
                  initial={{
                    opacity: reduceMotion ? 0 : stackOpacity(depth),
                    transform:
                      reduceMotion || direction > 0
                        ? stackTransform(Math.min(depth + 1, STACK_CARD_COUNT))
                        : frontTransform,
                  }}
                  animate={{
                    opacity: stackOpacity(depth),
                    transform: stackTransform(depth),
                  }}
                  exit={{
                    opacity: 0,
                    transform: reduceMotion
                      ? stackTransform(depth)
                      : direction > 0
                        ? frontTransform
                        : stackTransform(depth + 1),
                  }}
                  transition={{
                    opacity: {
                      duration: reduceMotion ? 0.16 : 0.24,
                      ease: [0.23, 1, 0.32, 1],
                    },
                    transform: {
                      duration: reduceMotion ? 0 : 0.24,
                      ease: [0.77, 0, 0.175, 1],
                    },
                  }}
                  style={{
                    zIndex: STACK_CARD_COUNT - depth,
                    pointerEvents: activeVersion ? "auto" : "none",
                  }}
                  aria-hidden={activeVersion ? undefined : true}
                >
                  {activeVersion ? (
                    <Box
                      className="snapshot-time-window snapshot-time-window-active"
                      overflow="hidden"
                    >
                      <Flex
                        className="snapshot-window-toolbar"
                        align="center"
                        minH="52px"
                        px={{ base: 2, md: 3 }}
                      >
                        {currentPath !== "/" && (
                          <IconButton
                            className="snapshot-path-control"
                            size="xs"
                            variant="ghost"
                            flexShrink={0}
                            aria-label={m.snapshot_explorer_parent()}
                            onClick={() =>
                              setCurrentPath(parentPath(currentPath))
                            }
                          >
                            <IoChevronBack />
                          </IconButton>
                        )}
                        <ExplorerBreadcrumbs
                          path={currentPath}
                          onNavigate={setCurrentPath}
                        />
                        <Box ml="auto" pl={3} flexShrink={0} textAlign="right">
                          <Text color="#9ed8f6" fontSize="9px">
                            {stackDateFormatter.format(
                              selectedVersion.timestampMs,
                            )}
                          </Text>
                          <Text mt="2px" color="whiteAlpha.300" fontSize="8px">
                            {m.snapshot_explorer_item_count({
                              count: entries.length,
                            })}
                          </Text>
                        </Box>
                      </Flex>

                      <Flex
                        className="snapshot-window-columns"
                        display={{ base: "none", md: "flex" }}
                        minH="34px"
                        px={4}
                        align="center"
                        color="whiteAlpha.300"
                        fontFamily="mono"
                        fontSize="9px"
                        letterSpacing="0.08em"
                      >
                        <Text flex="1">
                          {m.snapshot_explorer_column_name()}
                        </Text>
                        <Text width="166px">
                          {m.snapshot_explorer_column_modified()}
                        </Text>
                        <Text width="82px" textAlign="right">
                          {m.snapshot_explorer_column_size()}
                        </Text>
                        <Box width="32px" />
                      </Flex>

                      <Box
                        className="snapshot-explorer-files"
                        overflowY="auto"
                      >
                        {directoryPending ? (
                          <Center h="100%">
                            <Spinner size="sm" />
                          </Center>
                        ) : directoryError ? (
                          <Center h="100%" px={6} textAlign="center">
                            <Stack align="center" gap={3}>
                              <Text fontSize="13px" fontWeight="600">
                                {m.snapshot_explorer_path_missing()}
                              </Text>
                              <Text color="whiteAlpha.420" fontSize="11px">
                                {currentPath}
                              </Text>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCurrentPath("/")}
                              >
                                {m.snapshot_explorer_back_to_root()}
                              </Button>
                            </Stack>
                          </Center>
                        ) : entries.length === 0 ? (
                          <Center h="100%">
                            <Text color="whiteAlpha.400" fontSize="12px">
                              {m.snapshot_explorer_empty_folder()}
                            </Text>
                          </Center>
                        ) : (
                          entries.map((entry) => (
                            <FileRow
                              key={entry.path}
                              entry={entry}
                              version={selectedVersion}
                              repoId={repoId}
                              planId={planId}
                              onOpen={(nextEntry) =>
                                setCurrentPath(nextEntry.path)
                              }
                            />
                          ))
                        )}
                      </Box>
                    </Box>
                  ) : (
                    <Box className="snapshot-time-window snapshot-time-window-preview">
                      <Flex
                        align="center"
                        justify="space-between"
                        minH="52px"
                        px={{ base: 3, md: 4 }}
                        gap={3}
                      >
                        <Text color="whiteAlpha.500" fontSize="10px">
                          {stackDateFormatter.format(version.timestampMs)}
                        </Text>
                        <Text
                          color="whiteAlpha.280"
                          fontSize="9px"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                        >
                          {currentPath}
                        </Text>
                      </Flex>
                    </Box>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          <SnapshotExplorerHeader
            versions={versions}
            selectedIndex={selectedIndex}
            onSelect={selectVersion}
          />
        </Box>
      </Box>
    </Box>
  );
};
