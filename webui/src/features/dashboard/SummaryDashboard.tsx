import {
  Box,
  Card,
  Center,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiServer } from "react-icons/fi";
import { useNavigate } from "react-router";
import { Multihost } from "../../../gen/ts/v1/config_pb";
import { SummaryDashboardResponse } from "../../../gen/ts/v1/service_pb";
import { PeerState } from "../../../gen/ts/v1sync/syncservice_pb";
import { backrestService } from "../../api/client";
import { getOpenListUsage } from "../../api/openlist";
import type { OpenListUsage } from "../../api/openlist";
import { alerts } from "../../components/common/Alerts";
import { PeerStateConnectionStatusIcon } from "../../components/common/SyncStateIcon";
import { DataListItem, DataListRoot } from "../../components/ui/data-list";
import { EmptyState } from "../../components/ui/empty-state";
import { formatDuration, formatTime } from "../../lib/formatting";
import { useConfig } from "../../app/provider";
import { useSyncStates } from "../../state/peerStates";
import * as m from "../../paraglide/messages";
import { BackupActivityOverview } from "./BackupActivityOverview";
import { PlanCard } from "./PlanCard";

export { PlanCard } from "./PlanCard";

// ─── Root component ───────────────────────────────────────────────────────────

export const SummaryDashboard = () => {
  const [config] = useConfig();
  const navigate = useNavigate();
  const [summaryData, setSummaryData] =
    useState<SummaryDashboardResponse | null>(null);
  const [openListUsage, setOpenListUsage] = useState<OpenListUsage | null>(
    null,
  );

  const fetchData = useCallback(async () => {
    if (document.hidden) return;
    try {
      const data = await backrestService.getSummaryDashboard({});
      setSummaryData(data);
    } catch (e: unknown) {
      alerts.error(m.dashboard_error_fetch() + e);
    }
    getOpenListUsage()
      .then((usage) => {
        if (usage) setOpenListUsage(usage);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
    document.addEventListener("visibilitychange", fetchData);
    const interval = setInterval(fetchData, 60000);
    return () => {
      document.removeEventListener("visibilitychange", fetchData);
      clearInterval(interval);
    };
  }, [fetchData]);

  useEffect(() => {
    if (!config) return;
    if (
      config.repos.length === 0 &&
      config.plans.length === 0 &&
      config.multihost?.knownHosts.length === 0 &&
      config.multihost?.authorizedClients.length === 0
    ) {
      navigate("/getting-started");
    }
  }, [config, navigate]);

  if (!summaryData) {
    return (
      <Center h="200px">
        <Spinner size="lg" />
      </Center>
    );
  }

  const plans = summaryData.planSummaries;
  const protectedBytes = summaryData.planSummaries.reduce(
    (total, summary) => total + Number(summary.protectedBytes),
    0,
  );

  return (
    <Stack
      gap={{ base: 4, md: 5 }}
      width="full"
      minH={{ base: "auto", md: "calc(100dvh - 112px)" }}
      justify={{ base: "flex-start", md: "space-between" }}
    >
      <BackupActivityOverview
        protectedBytes={protectedBytes}
        planIds={plans.map((plan) => plan.id)}
        openListUsage={openListUsage}
      />

      <MultihostSummary multihostConfig={config?.multihost ?? null} />

      {/* Plan cards */}
      {plans.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {plans.map((s) => (
            <PlanCard key={s.id} summary={s} onRefresh={fetchData} />
          ))}
        </SimpleGrid>
      )}

      {plans.length === 0 && (
        <EmptyState title={m.dashboard_plans_empty()} icon={<FiServer />} />
      )}
    </Stack>
  );
};

// ─── Multihost ────────────────────────────────────────────────────────────────

const MultihostSummary = ({
  multihostConfig,
}: {
  multihostConfig: Multihost | null;
}) => {
  const [config] = useConfig();
  const allPeerStates = useSyncStates();
  const peerStates = useMemo(() => {
    const map = new Map<string, PeerState>();
    for (const state of allPeerStates) {
      map.set(state.peerKeyid, state);
    }
    return map;
  }, [allPeerStates]);

  const sharedReposByHost = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const repo of config?.repos ?? []) {
      if (repo.originInstanceId) {
        const repos = map.get(repo.originInstanceId) ?? [];
        repos.push(repo.id);
        map.set(repo.originInstanceId, repos);
      }
    }
    return map;
  }, [config?.repos]);

  const knownHostTiles: React.JSX.Element[] = [];
  for (const cfgPeer of multihostConfig?.knownHosts ?? []) {
    const peerState = peerStates.get(cfgPeer.keyid);
    if (!peerState) continue;
    knownHostTiles.push(
      <PeerStateTile
        peerState={peerState}
        sharedRepoIds={sharedReposByHost.get(peerState.peerInstanceId)}
        key={peerState.peerKeyid}
      />,
    );
  }

  const authorizedClientTiles: React.JSX.Element[] = [];
  for (const cfgPeer of multihostConfig?.authorizedClients ?? []) {
    const peerState = peerStates.get(cfgPeer.keyid);
    if (!peerState) continue;
    authorizedClientTiles.push(
      <PeerStateTile peerState={peerState} key={peerState.peerKeyid} />,
    );
  }

  return (
    <Stack gap={8}>
      {knownHostTiles.length > 0 && (
        <Stack gap={4}>
          <Heading size="md">{m.dashboard_remote_hosts_title()}</Heading>
          <Stack gap={4}>{knownHostTiles}</Stack>
        </Stack>
      )}
      {authorizedClientTiles.length > 0 && (
        <Stack gap={4}>
          <Heading size="md">{m.dashboard_remote_clients_title()}</Heading>
          <Stack gap={4}>{authorizedClientTiles}</Stack>
        </Stack>
      )}
    </Stack>
  );
};

const PeerStateTile = ({
  peerState,
  sharedRepoIds,
}: {
  peerState: PeerState;
  sharedRepoIds?: string[];
}) => {
  const tickState = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      tickState[1]((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [peerState.peerKeyid, peerState.lastHeartbeatMillis, tickState[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card.Root key={peerState.peerKeyid} width="full">
      <Card.Header>
        <Flex justify="space-between" align="center">
          <Card.Title>{peerState.peerInstanceId}</Card.Title>
          <Flex align="center" gap={2}>
            <PeerStateConnectionStatusIcon peerState={peerState} />
          </Flex>
        </Flex>
      </Card.Header>
      <Card.Body>
        <DataListRoot orientation="horizontal">
          <DataListItem
            label={m.settings_peer_instance_id()}
            value={peerState.peerInstanceId}
          />
          <DataListItem
            label={m.dashboard_peer_public_key_id()}
            value={peerState.peerKeyid}
          />
          <DataListItem
            label={m.dashboard_peer_last_state_update()}
            value={
              <TimeSinceLastHeartbeat
                lastHeartbeatMillis={Number(peerState.lastHeartbeatMillis ?? 0)}
              />
            }
          />
          {peerState.knownRepos.length > 0 && (
            <DataListItem
              label={m.dashboard_peer_shared_repos()}
              value={
                <Flex gap={1} flexWrap="wrap">
                  {peerState.knownRepos.map((repo) => (
                    <Box
                      key={repo.id}
                      px={2}
                      py={0.5}
                      bg="bg.muted"
                      borderRadius="sm"
                      fontSize="xs"
                    >
                      {repo.id}
                    </Box>
                  ))}
                </Flex>
              }
            />
          )}
          {sharedRepoIds && sharedRepoIds.length > 0 && (
            <DataListItem
              label={m.dashboard_peer_shared_repos()}
              value={
                <Flex gap={1} flexWrap="wrap">
                  {sharedRepoIds.map((repoId) => (
                    <Box
                      key={repoId}
                      px={2}
                      py={0.5}
                      bg="bg.muted"
                      borderRadius="sm"
                      fontSize="xs"
                    >
                      {repoId}
                    </Box>
                  ))}
                </Flex>
              }
            />
          )}
        </DataListRoot>
      </Card.Body>
    </Card.Root>
  );
};

const TimeSinceLastHeartbeat = ({
  lastHeartbeatMillis,
}: {
  lastHeartbeatMillis: number;
}) => {
  const [timeSince, setTimeSince] = useState(
    lastHeartbeatMillis ? Date.now() - lastHeartbeatMillis : 0,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSince(Date.now() - lastHeartbeatMillis);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastHeartbeatMillis]);

  return (
    <Text>
      {formatTime(lastHeartbeatMillis)} ({formatDuration(timeSince)}{" "}
      {m.dashboard_peer_ago()})
    </Text>
  );
};
