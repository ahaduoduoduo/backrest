import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiCalendar,
  FiDatabase,
  FiPlus,
  FiCheckCircle,
  FiAlertTriangle,
  FiSettings,
  FiLoader,
  FiRadio,
  FiActivity, // Added as a placeholder/guess for ActivityBar if needed, or stick to component
  FiServer,
  FiEdit2,
  FiMenu,
  FiX,
  FiHome,
  FiChevronRight,
} from "react-icons/fi";

import {
  Box,
  Flex,
  Button,
  Heading,
  Text,
  Spinner,
  Separator,
  IconButton,
  Portal,
} from "@chakra-ui/react";
import { Tooltip } from "../components/ui/tooltip";
import { keyframes } from "@emotion/react";

import {
  AccordionRoot,
  AccordionItem,
  AccordionItemTrigger,
  AccordionItemContent,
} from "../components/ui/accordion";
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from "../components/ui/drawer";
import { Config, Multihost_Peer, Plan, Repo } from "../../gen/ts/v1/config_pb";
import { alerts } from "../components/common/Alerts";
import { useShowModal } from "../components/common/ModalManager";
import { uiBuildVersion } from "../state/buildcfg";
import { ActivityBar } from "../components/layout/ActivityBar";
import { OperationStatus } from "../../gen/ts/v1/operations_pb";
import { useResourceStatus } from "../api/resourceStatus";
import LogoSvg from "../../assets/logo.svg";
import { keyBy } from "../lib/util";
import { Code } from "@connectrpc/connect";
import { LoginModal } from "../features/auth/LoginModal";
import { backrestService, syncStateService, setAuthToken } from "../api/client";
import { useConfig } from "./provider";
import { shouldShowSettings } from "../state/configutil";
import { OpSelector, OpSelectorSchema } from "../../gen/ts/v1/service_pb";
import { colorForStatus } from "../api/flowDisplayAggregator";
import {
  Route,
  Routes,
  useNavigate,
  useParams,
  useLocation,
} from "react-router";
import { MainContentAreaTemplate } from "../components/layout/MainContentArea";
import { MobileNavigation } from "../components/layout/MobileNavigation";
import { create } from "@bufbuild/protobuf";
import {
  PeerState,
  PlanMetadata,
  RepoMetadata,
  SetRemoteClientConfigRequestSchema,
} from "../../gen/ts/v1sync/syncservice_pb";
import { useSyncStates } from "../state/peerStates";
import * as m from "../paraglide/messages";
import { Link } from "../components/ui/link";
import { EmptyState } from "../components/ui/empty-state";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SummaryDashboard = React.lazy(() =>
  import("../features/dashboard/SummaryDashboard").then((m) => ({
    default: m.SummaryDashboard,
  })),
);

const GettingStartedGuide = React.lazy(() =>
  import("../features/dashboard/GettingStartedGuide").then((m) => ({
    default: m.GettingStartedGuide,
  })),
);

const PlanView = React.lazy(() =>
  import("../features/plans/PlanView").then((m) => ({
    default: m.PlanView,
  })),
);

const RepoView = React.lazy(() =>
  import("../features/repositories/RepoView").then((m) => ({
    default: m.RepoView,
  })),
);

const SelectorView = React.lazy(() =>
  import("../features/repositories/SelectorView").then((m) => ({
    default: m.SelectorView,
  })),
);

// Wrappers for consistent views with breadcrumbs and error handling
const RepoViewContainer = () => {
  const { repoId } = useParams();
  const [config, setConfig] = useConfig();

  if (!config) {
    return (
      <Box p={10}>
        <Spinner />
      </Box>
    );
  }

  const repo = config.repos.find((r) => r.id === repoId);

  return (
    <MainContentAreaTemplate
      breadcrumbs={[{ title: m.app_breadcrumb_repo() }, { title: repoId! }]}
      key={repoId}
    >
      {repo ? (
        <>
          {repo.originInstanceId && (
            <Box
              p={3}
              mb={4}
              borderRadius="md"
              bg="blue.50"
              borderWidth="1px"
              borderColor="blue.200"
              fontSize="sm"
              color="blue.800"
              _dark={{
                bg: "blue.950",
                borderColor: "blue.800",
                color: "blue.200",
              }}
            >
              {(() => {
                const origin = repo.originInstanceId;
                const text = m.app_remote_repo_info({ origin }) as string;
                const [before, ...rest] = text.split(origin);
                return (
                  <>
                    {before}
                    <strong>{origin}</strong>
                    {rest.join(origin)}
                  </>
                );
              })()}
            </Box>
          )}
          <RepoView repo={repo} />
        </>
      ) : (
        <EmptyState title={m.app_repo_not_found({ repoId: repoId || "" })} />
      )}
    </MainContentAreaTemplate>
  );
};

const RemoteRepoViewContainer = () => {
  const { peerInstanceId, repoId } = useParams();
  const peerStates = useSyncStates();

  // Peer state is used to find the right repo
  const peerState = peerStates.find(
    (state) => state.peerInstanceId === peerInstanceId,
  );
  const peerRepo = (peerState?.knownRepos || []).find((r) => r.id === repoId);

  return (
    <MainContentAreaTemplate
      breadcrumbs={[
        { title: m.peer_default_name() },
        { title: peerInstanceId || m.app_unknown_peer() },
        { title: m.app_breadcrumb_repo() },
        { title: repoId || m.app_unknown_repo() },
      ]}
      key={`${peerInstanceId}-${repoId}`}
    >
      {peerRepo ? (
        <SelectorView
          title={m.app_remote_repo_title({ id: peerRepo.id })}
          sel={create(OpSelectorSchema, {
            originalInstanceKeyid: peerState?.peerKeyid,
            repoGuid: peerRepo.guid,
          })}
        />
      ) : (
        <EmptyState title={m.app_repo_not_found({ repoId: repoId || "" })} />
      )}
    </MainContentAreaTemplate>
  );
};

const RemotePlanViewContainer = () => {
  const { peerInstanceId, planId } = useParams();
  const peerStates = useSyncStates();

  const peerState = peerStates.find(
    (state) => state.peerInstanceId === peerInstanceId,
  );
  const peerPlan = (peerState?.knownPlans || []).find((p) => p.id === planId);

  return (
    <MainContentAreaTemplate
      breadcrumbs={[
        { title: m.peer_default_name() },
        { title: peerInstanceId || m.app_unknown_peer() },
        { title: m.app_breadcrumb_plan() },
        { title: planId || "" },
      ]}
      key={`${peerInstanceId}-${planId}`}
    >
      {peerPlan ? (
        <SelectorView
          title={peerPlan.id}
          sel={create(OpSelectorSchema, {
            originalInstanceKeyid: peerState?.peerKeyid,
            planId: peerPlan.id,
          })}
        />
      ) : (
        <EmptyState title={m.app_plan_not_found({ planId: planId || "" })} />
      )}
    </MainContentAreaTemplate>
  );
};

const PlanViewContainer = () => {
  const { planId } = useParams();
  const [config, setConfig] = useConfig();

  if (!config) {
    return (
      <Box p={10}>
        <Spinner />
      </Box>
    );
  }

  const plan = config.plans.find((p) => p.id === planId);
  return (
    <MainContentAreaTemplate
      breadcrumbs={[{ title: m.app_breadcrumb_plan() }, { title: planId! }]}
      key={planId}
    >
      {plan ? (
        <PlanView plan={plan} />
      ) : (
        <EmptyState title={m.app_plan_not_found({ planId: planId || "" })} />
      )}
    </MainContentAreaTemplate>
  );
};

const PeerNavItem = ({
  icon,
  typeLabel,
  name,
  active,
  onClick,
  onEdit,
}: {
  icon: React.ReactNode;
  typeLabel: string;
  name: string;
  active: boolean;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
}) => (
  <Flex
    align="center"
    pl={14}
    pr={2}
    py={1}
    bg={active ? "bg.emphasized" : undefined}
    _hover={{ bg: "bg.muted" }}
    cursor="pointer"
    className="group"
    onClick={onClick}
  >
    <Box flexShrink={0} mr={2}>
      {icon}
    </Box>
    <Text color="fg.muted" fontSize="xs" flexShrink={0} mr={1}>
      {typeLabel}
    </Text>
    <Text fontSize="sm" flex="1" wordBreak="break-word">
      {name}
    </Text>
    {onEdit && (
      <Box opacity={0} _groupHover={{ opacity: 1 }} transition="opacity 0.2s">
        <IconButton
          size="xs"
          variant="ghost"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onEdit(e);
          }}
        >
          <FiEdit2 />
        </IconButton>
      </Box>
    )}
  </Flex>
);

const PeerInstanceSection = ({
  peerState,
  sel,
  remoteConfig,
  isActive,
  handleNav,
  handleRemoteRepoEdit,
  handleRemotePlanEdit,
}: {
  peerState: PeerState;
  sel: OpSelector;
  remoteConfig: PeerState["remoteConfig"];
  isActive: (path: string) => boolean;
  handleNav: (path: string) => void;
  handleRemoteRepoEdit: (repo: Repo) => void;
  handleRemotePlanEdit: (plan: Plan) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box mb={2}>
      <Flex
        align="center"
        pl={9}
        pr={2}
        py={1}
        cursor="pointer"
        _hover={{ bg: "bg.muted" }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Box
          transform={expanded ? "rotate(90deg)" : undefined}
          transition="transform 0.2s"
          display="inline-flex"
          alignItems="center"
          mr={2}
          flexShrink={0}
        >
          <FiChevronRight size={14} />
        </Box>
        <Box flexShrink={0} mr={2}>
          <IconForResource selector={sel} />
        </Box>
        <Text fontWeight="bold" fontSize="sm">
          {peerState.peerInstanceId}
        </Text>
      </Flex>

      {expanded && (
        <>
          {peerState.knownRepos.map((repo: RepoMetadata) => {
            const repoPath = `/peer/${peerState.peerInstanceId}/repo/${repo.id}`;
            const editableRepo = remoteConfig?.repos?.find(
              (r: Repo) => r.guid === repo.guid,
            );
            return (
              <PeerNavItem
                key={repo.guid}
                icon={
                  <IconForResource
                    selector={create(OpSelectorSchema, {
                      originalInstanceKeyid: peerState.peerKeyid,
                      repoGuid: repo.guid,
                    })}
                  />
                }
                typeLabel="repo"
                name={repo.id}
                active={isActive(repoPath)}
                onClick={() => handleNav(repoPath)}
                onEdit={
                  editableRepo
                    ? () => handleRemoteRepoEdit(editableRepo)
                    : undefined
                }
              />
            );
          })}

          {peerState.knownPlans.map((planMeta: PlanMetadata) => {
            const planPath = `/peer/${peerState.peerInstanceId}/plan/${planMeta.id}`;
            const editablePlan = remoteConfig?.plans?.find(
              (p: Plan) => p.id === planMeta.id,
            );
            return (
              <PeerNavItem
                key={planMeta.id}
                icon={
                  <IconForResource
                    selector={create(OpSelectorSchema, {
                      originalInstanceKeyid: peerState.peerKeyid,
                      planId: planMeta.id,
                    })}
                  />
                }
                typeLabel="plan"
                name={planMeta.id}
                active={isActive(planPath)}
                onClick={() => handleNav(planPath)}
                onEdit={
                  editablePlan
                    ? () => handleRemotePlanEdit(editablePlan)
                    : undefined
                }
              />
            );
          })}
        </>
      )}
    </Box>
  );
};

const SidebarPlanItem = React.memo(
  ({
    plan,
    repoGuid,
    active,
    onNav,
    onEdit,
  }: {
    plan: Plan;
    repoGuid: string | undefined;
    active: boolean;
    onNav: (path: string) => void;
    onEdit: (plan: Plan) => void;
  }) => {
    const sel = useMemo(
      () =>
        create(OpSelectorSchema, {
          originalInstanceKeyid: "",
          planId: plan.id,
          repoGuid: repoGuid,
        }),
      [plan.id, repoGuid],
    );
    const planPath = `/plan/${plan.id}`;
    return (
      <Flex
        className="console-sidebar-item group"
        data-active={active || undefined}
        align="center"
        mx={1}
        px={2.5}
        py={2.5}
        borderRadius="12px"
        data-testid={`sidebar-item-plan-${plan.id}`}
        cursor="pointer"
        userSelect="none"
        aria-current={active ? "page" : undefined}
        onClick={() => onNav(planPath)}
      >
        <Box flexShrink={0} mr={2.5} display="flex">
          <IconForResource selector={sel} />
        </Box>
        <Tooltip content={plan.id}>
          <Box flex="1" minW="0">
            <Text
              fontSize="13px"
              fontWeight={active ? "600" : "450"}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {plan.id}
            </Text>
          </Box>
        </Tooltip>
        <Box opacity={0} _groupHover={{ opacity: 1 }} transition="opacity 0.2s">
          <IconButton
            size="xs"
            variant="ghost"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEdit(plan);
            }}
          >
            <FiEdit2 />
          </IconButton>
        </Box>
      </Flex>
    );
  },
);

const SidebarRepoItem = React.memo(
  ({
    repo,
    instanceId,
    active,
    onNav,
    onEdit,
  }: {
    repo: Repo;
    instanceId: string;
    active: boolean;
    onNav: (path: string) => void;
    onEdit: (repo: Repo) => void;
  }) => {
    const sel = useMemo(
      () =>
        create(OpSelectorSchema, {
          instanceId: instanceId,
          repoGuid: repo.guid,
        }),
      [instanceId, repo.guid],
    );
    const repoPath = `/repo/${repo.id}`;
    return (
      <Flex
        className="console-sidebar-item group"
        data-active={active || undefined}
        align="center"
        mx={1}
        px={2.5}
        py={2.5}
        borderRadius="12px"
        data-testid={`sidebar-item-repo-${repo.id}`}
        cursor="pointer"
        userSelect="none"
        aria-current={active ? "page" : undefined}
        onClick={() => onNav(repoPath)}
      >
        <Box flexShrink={0} mr={2.5} display="flex">
          <IconForResource selector={sel} />
        </Box>
        <Tooltip content={repo.uri}>
          <Box flex="1" minW="0">
            <Text
              fontSize="13px"
              fontWeight={active ? "600" : "450"}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {repo.id}
            </Text>
            {repo.originInstanceId && (
              <Text
                fontSize="xs"
                color="fg.muted"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {repo.originInstanceId}
              </Text>
            )}
          </Box>
        </Tooltip>
        <Box opacity={0} _groupHover={{ opacity: 1 }} transition="opacity 0.2s">
          <IconButton
            size="xs"
            variant="ghost"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEdit(repo);
            }}
          >
            <FiEdit2 />
          </IconButton>
        </Box>
      </Flex>
    );
  },
);

const SidebarContent = ({ onClose }: { onClose?: () => void }) => {
  const [config] = useConfig();
  const peerStates = useSyncStates();
  const showModal = useShowModal();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const isActive = (path: string) => location.pathname === path;

  const reposById = useMemo(
    () => (config ? keyBy(config.repos, (r) => r.id) : {}),
    [config?.repos],
  );

  // Replicate getSidenavItems functionality with Chakra components
  if (!config) return null;

  const configPlans = config.plans || [];
  const localRepos = (config.repos || []).filter((r) => !r.originInstanceId);
  const remoteRepos = (config.repos || []).filter((r) => !!r.originInstanceId);

  return (
    <Box
      className="console-navigation-panel"
      width="full"
      h="full"
      overflowY="auto"
    >
      <AccordionRoot
        className="console-sidebar-nav"
        multiple
        defaultValue={["plans", "repos", "authorized-clients"]}
        variant="plain"
        lazyMount
        minH="full"
        display="flex"
        flexDirection="column"
        p={3}
      >
        <Flex align="center" px={2} pt={1} pb={3} pr={10}>
          <Box>
            <Text
              color="whiteAlpha.550"
              fontFamily="mono"
              fontSize="9px"
              letterSpacing="0.16em"
            >
              115 OFFSITE
            </Text>
            <Text mt={1} color="whiteAlpha.450" fontSize="10px">
              BACKUP CONSOLE
            </Text>
          </Box>
        </Flex>

        {/* DASHBOARD */}
        <Box
          className="console-sidebar-primary"
          data-active={isActive("/") || undefined}
          cursor="pointer"
          onClick={() => handleNav("/")}
          px={3}
          py={3}
          borderRadius="14px"
          userSelect="none"
          aria-current={isActive("/") ? "page" : undefined}
        >
          <Flex align="center" gap={3}>
            <Flex
              className="console-sidebar-icon"
              align="center"
              justify="center"
              width="34px"
              height="34px"
              borderRadius="11px"
              flexShrink={0}
            >
              <FiHome />
            </Flex>
            <Box>
              <Text
                color="whiteAlpha.350"
                fontFamily="mono"
                fontSize="9px"
                lineHeight="1"
              >
                01
              </Text>
              <Text mt={1} fontSize="14px" fontWeight="600">
                {m.app_menu_dashboard()}
              </Text>
            </Box>
            <Box
              className="console-sidebar-active-dot"
              ml="auto"
              width="6px"
              height="6px"
              borderRadius="full"
              flexShrink={0}
            />
          </Flex>
        </Box>

        {/* PLANS SECTION */}
        <AccordionItem value="plans" mt={3}>
          <AccordionItemTrigger
            className="console-sidebar-section"
            px={3}
            py={2.5}
            borderRadius="12px"
          >
            <Flex align="center" gap={2.5} width="full">
              <Text color="whiteAlpha.450" fontFamily="mono" fontSize="9px">
                02
              </Text>
              <FiCalendar />
              <Text fontSize="12px" fontWeight="600">
                {m.app_menu_plans()}
              </Text>
              <Text ml="auto" color="whiteAlpha.350" fontSize="10px">
                {String(configPlans.length).padStart(2, "0")}
              </Text>
            </Flex>
          </AccordionItemTrigger>
          <AccordionItemContent px={0} pt={1.5} pb={1}>
            <Button
              className="console-sidebar-add"
              variant="ghost"
              size="sm"
              width="calc(100% - 8px)"
              justifyContent="flex-start"
              onClick={async () => {
                const { AddPlanModal } =
                  await import("../features/plans/AddPlanModal");
                showModal(<AddPlanModal template={null} />);
                onClose?.();
              }}
              mx={1}
              px={2.5}
              mb={1.5}
              borderRadius="10px"
              fontSize="11px"
              data-testid="sidebar-add-plan"
            >
              <FiPlus /> {m.app_menu_add_plan()}
            </Button>
            {configPlans.map((plan) => (
              <SidebarPlanItem
                key={plan.id}
                plan={plan}
                repoGuid={reposById[plan.repo]?.guid}
                active={isActive(`/plan/${plan.id}`)}
                onNav={handleNav}
                onEdit={async (plan) => {
                  const { AddPlanModal } =
                    await import("../features/plans/AddPlanModal");
                  showModal(<AddPlanModal template={plan} />);
                  onClose?.();
                }}
              />
            ))}
          </AccordionItemContent>
        </AccordionItem>

        {/* REPOS SECTION */}
        <AccordionItem value="repos" mt={2}>
          <AccordionItemTrigger
            className="console-sidebar-section"
            px={3}
            py={2.5}
            borderRadius="12px"
          >
            <Flex align="center" gap={2.5} width="full">
              <Text color="whiteAlpha.450" fontFamily="mono" fontSize="9px">
                03
              </Text>
              <FiDatabase />
              <Text fontSize="12px" fontWeight="600">
                {m.app_menu_repos()}
              </Text>
              <Text ml="auto" color="whiteAlpha.350" fontSize="10px">
                {String(localRepos.length + remoteRepos.length).padStart(
                  2,
                  "0",
                )}
              </Text>
            </Flex>
          </AccordionItemTrigger>
          <AccordionItemContent px={0} pt={1.5} pb={1}>
            <Button
              className="console-sidebar-add"
              variant="ghost"
              size="sm"
              width="calc(100% - 8px)"
              justifyContent="flex-start"
              onClick={async () => {
                const { AddRepoModal } =
                  await import("../features/repositories/AddRepoModal");
                showModal(<AddRepoModal template={null} />);
                onClose?.();
              }}
              mx={1}
              px={2.5}
              mb={1.5}
              borderRadius="10px"
              fontSize="11px"
              data-testid="sidebar-add-repo"
            >
              <FiPlus /> {m.app_menu_add_repo()}
            </Button>
            {localRepos.map((repo) => (
              <SidebarRepoItem
                key={repo.id}
                repo={repo}
                instanceId={config.instance}
                active={isActive(`/repo/${repo.id}`)}
                onNav={handleNav}
                onEdit={async (repo) => {
                  const { AddRepoModal } =
                    await import("../features/repositories/AddRepoModal");
                  showModal(<AddRepoModal template={repo} />);
                  onClose?.();
                }}
              />
            ))}
            {remoteRepos.length > 0 && (
              <>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="fg.muted"
                  pl={9}
                  pt={2}
                  pb={1}
                >
                  {m.app_remote()}
                </Text>
                {remoteRepos.map((repo) => (
                  <SidebarRepoItem
                    key={repo.id}
                    repo={repo}
                    instanceId={config.instance}
                    active={isActive(`/repo/${repo.id}`)}
                    onNav={handleNav}
                    onEdit={async (repo) => {
                      const { AddRepoModal } =
                        await import("../features/repositories/AddRepoModal");
                      showModal(<AddRepoModal template={repo} />);
                      onClose?.();
                    }}
                  />
                ))}
              </>
            )}
          </AccordionItemContent>
        </AccordionItem>

        {/* REMOTE INSTANCES / AUTHORIZED CLIENTS */}
        {config.multihost?.authorizedClients?.length ? (
          <AccordionItem value="authorized-clients">
            <AccordionItemTrigger px={4} py={2} _hover={{ bg: "bg.muted" }}>
              <Flex align="center" gap={2}>
                <FiServer />
                <Text fontWeight="medium">{m.app_menu_remote_instances()}</Text>
              </Flex>
            </AccordionItemTrigger>
            <AccordionItemContent pb={2}>
              {peerStates.map((peerState) => {
                const sel = create(OpSelectorSchema, {
                  originalInstanceKeyid: peerState.peerKeyid,
                });

                const remoteConfig = peerState.remoteConfig;

                const handleRemoteRepoEdit = async (repo: Repo) => {
                  const { AddRepoModal } =
                    await import("../features/repositories/AddRepoModal");
                  showModal(
                    <AddRepoModal
                      template={repo}
                      onSaveOverride={async (updatedRepo) => {
                        await syncStateService.setRemoteClientConfig(
                          create(SetRemoteClientConfigRequestSchema, {
                            peerKeyid: peerState.peerKeyid,
                            repos: [updatedRepo],
                          }),
                        );
                        alerts.success(m.app_remote_repo_updated());
                      }}
                    />,
                  );
                  onClose?.();
                };

                const handleRemotePlanEdit = async (plan: Plan) => {
                  const { AddPlanModal } =
                    await import("../features/plans/AddPlanModal");
                  showModal(
                    <AddPlanModal
                      template={plan}
                      onSaveOverride={async (updatedPlan) => {
                        await syncStateService.setRemoteClientConfig(
                          create(SetRemoteClientConfigRequestSchema, {
                            peerKeyid: peerState.peerKeyid,
                            plans: [updatedPlan],
                          }),
                        );
                        alerts.success(m.app_remote_plan_updated());
                      }}
                    />,
                  );
                  onClose?.();
                };

                return (
                  <PeerInstanceSection
                    key={peerState.peerKeyid}
                    peerState={peerState}
                    sel={sel}
                    remoteConfig={remoteConfig}
                    isActive={isActive}
                    handleNav={handleNav}
                    handleRemoteRepoEdit={handleRemoteRepoEdit}
                    handleRemotePlanEdit={handleRemotePlanEdit}
                  />
                );
              })}
            </AccordionItemContent>
          </AccordionItem>
        ) : null}

        {/* SETTINGS */}
        <Box mt="auto" pt={4} px={1}>
          <Separator mb={3} borderColor="whiteAlpha.100" />
          <Button
            className="console-sidebar-settings"
            variant="ghost"
            size="sm"
            width="full"
            justifyContent="flex-start"
            height="44px"
            px={3}
            borderRadius="12px"
            onClick={async () => {
              const { SettingsModal } =
                await import("../features/settings/SettingsModal");
              showModal(<SettingsModal />);
              onClose?.();
            }}
          >
            <FiSettings /> {m.app_menu_settings()}
          </Button>
        </Box>
      </AccordionRoot>
    </Box>
  );
};

const DesktopNavTrigger = () => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const closeNavigation = useCallback(() => {
    detailsRef.current?.removeAttribute("open");
    setOpen(false);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNavigation();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [closeNavigation]);

  return (
    <details
      ref={detailsRef}
      className="console-navigation-details"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        className="console-navigation-trigger"
        aria-label={m.app_menu()}
        aria-controls="desktop-navigation-panel"
      >
        <FiMenu />
      </summary>
      {open && (
        <Portal>
          <Box
            className="console-navigation-backdrop"
            onClick={closeNavigation}
          >
            <Box
              as="aside"
              id="desktop-navigation-panel"
              role="dialog"
              aria-modal="true"
              aria-label={m.app_menu()}
              className="console-navigation-drawer"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label={m.button_close()}
                onClick={closeNavigation}
                className="console-navigation-close"
              >
                <FiX />
              </button>
              <SidebarContent onClose={closeNavigation} />
            </Box>
          </Box>
        </Portal>
      )}
    </details>
  );
};

export const App: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useConfig();

  return (
    <Flex className="backup-console" direction="column" h="100vh">
      {/* HEADER */}
      <Flex
        as="header"
        className="console-header"
        align="center"
        px={{ base: 3, lg: 6 }}
        h={{ base: "56px", md: "68px" }}
        bg="rgba(7, 8, 11, 0.86)"
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        backdropFilter="blur(18px)"
        color="white"
        flexShrink={0}
      >
        <Box display={{ base: "block", lg: "none" }} mr={2}>
          <MobileNavTrigger />
        </Box>
        <Box display={{ base: "none", lg: "block" }} mr={3}>
          <DesktopNavTrigger />
        </Box>
        <Flex
          as="a"
          cursor="pointer"
          onClick={() => navigate("/")}
          mr={{ base: 2, md: 6 }}
          align="center"
          gap={{ base: 2, md: 3 }}
        >
          <img src={LogoSvg} style={{ height: "25px" }} />
          <Text
            className="console-wordmark"
            display={{ base: "none", md: "block" }}
          >
            BACKREST
          </Text>
        </Flex>

        <Flex
          align="baseline"
          gap={4}
          minW={0}
          display={{ base: "none", md: "flex" }}
        >
          <Link
            href="https://github.com/garethgeorge/backrest"
            target="_blank"
            color="whiteAlpha.700"
            fontSize="xs"
            display={{ base: "none", lg: "block" }}
          >
            {uiBuildVersion}
          </Link>
          <Box fontSize="xs">
            <ActivityBar />
          </Box>
        </Flex>

        <Flex ml="auto" align="center" gap={4}>
          <Text
            fontSize="xs"
            color="whiteAlpha.600"
            display={{ base: "none", lg: "block" }}
          >
            {config && config.instance ? config.instance : undefined}
          </Text>
          {config && !config.auth?.disabled && (
            <Button
              variant="ghost"
              size={{ base: "xs", md: "sm" }}
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
              onClick={() => {
                setAuthToken("");
                window.location.reload();
              }}
            >
              {m.app_logout()}
            </Button>
          )}
        </Flex>
      </Flex>

      {/* MAIN LAYOUT */}
      <Flex flex="1" overflow="hidden">
        {/* CONTENT AREA */}
        <Box
          className="console-main"
          flex="1"
          minW={0}
          overflowY="auto"
          overflowX="hidden"
          bg="#07080b"
        >
          <AuthenticationBoundary>
            <Suspense
              fallback={
                <Box p={10}>
                  <Spinner />
                </Box>
              }
            >
              <Routes>
                <Route
                  path="/"
                  element={
                    <MainContentAreaTemplate
                      breadcrumbs={[{ title: m.app_breadcrumb_summary() }]}
                    >
                      <SummaryDashboard />
                    </MainContentAreaTemplate>
                  }
                />
                <Route
                  path="/getting-started"
                  element={
                    <MainContentAreaTemplate
                      breadcrumbs={[
                        { title: m.app_breadcrumb_getting_started() },
                      ]}
                    >
                      <GettingStartedGuide />
                    </MainContentAreaTemplate>
                  }
                />
                <Route path="/plan/:planId" element={<PlanViewContainer />} />
                <Route path="/repo/:repoId" element={<RepoViewContainer />} />
                <Route
                  path="/peer/:peerInstanceId/repo/:repoId"
                  element={<RemoteRepoViewContainer />}
                />
                <Route
                  path="/peer/:peerInstanceId/plan/:planId"
                  element={<RemotePlanViewContainer />}
                />
                <Route
                  path="/*"
                  element={
                    <MainContentAreaTemplate breadcrumbs={[]}>
                      <EmptyState
                        title="404"
                        description={m.app_page_not_found()}
                      />
                    </MainContentAreaTemplate>
                  }
                />
              </Routes>
            </Suspense>
          </AuthenticationBoundary>
        </Box>
      </Flex>
    </Flex>
  );
};

const MobileNavTrigger = () => {
  const [open, setOpen] = useState(false);
  return (
    <DrawerRoot
      placement="start"
      size="full"
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
    >
      <DrawerTrigger asChild>
        <IconButton
          variant="ghost"
          size="sm"
          color="white"
          aria-label={m.app_menu()}
        >
          <FiMenu />
        </IconButton>
      </DrawerTrigger>
      <DrawerContent
        className="console-mobile-nav"
        maxW="100vw"
        width="100vw"
        height="100dvh"
        bg="#07080b"
      >
        <DrawerHeader
          px={5}
          pt="max(20px, env(safe-area-inset-top))"
          pb={3}
          borderBottomWidth="1px"
          borderColor="whiteAlpha.100"
        >
          <DrawerTitle>
            <Flex align="center" gap={3}>
              <img src={LogoSvg} style={{ height: "24px" }} />
              <Text
                fontSize="10px"
                color="whiteAlpha.500"
                letterSpacing="0.18em"
              >
                115 OFFSITE
              </Text>
            </Flex>
          </DrawerTitle>
          <DrawerCloseTrigger
            top="max(18px, env(safe-area-inset-top))"
            right={4}
          />
        </DrawerHeader>
        <DrawerBody p={0} overflowY="auto">
          <MobileNavigation onClose={() => setOpen(false)} />
        </DrawerBody>
      </DrawerContent>
    </DrawerRoot>
  );
};

export const AuthenticationBoundary = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [config, setConfig] = useConfig();
  const showModal = useShowModal();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the config, retrying transient failures with backoff before giving up.
  // A single slow response — the backend busy during a backup, a backgrounded
  // tab throttling timers, a momentary connection stall — shouldn't drop the
  // whole UI to an error screen that only a full reload recovers from.
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const maxAttempts = 4;
    let lastErr: any = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(m.app_request_timed_out_backend_may_be_unavailable()),
              ),
            10000,
          ),
        );
        const config = (await Promise.race([
          backrestService.getConfig({}),
          timeoutPromise,
        ])) as Config;
        setConfig(config);
        if (shouldShowSettings(config)) {
          const { SettingsModal } =
            await import("../features/settings/SettingsModal");
          showModal(<SettingsModal />);
        } else {
          showModal(null);
        }
        setIsLoading(false);
        return;
      } catch (err: any) {
        lastErr = err;
        if (err.code === Code.Unauthenticated) {
          setIsLoading(false);
          showModal(<LoginModal />);
          return;
        }
        const transient =
          err.code === undefined ||
          err.code === Code.Unavailable ||
          err.code === Code.DeadlineExceeded;
        if (!transient) break;
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        }
      }
    }

    setIsLoading(false);
    const msg = lastErr?.message || m.app_error_initial_config();
    setError(msg);
    alerts.error(msg, 0);
  }, [setConfig, showModal]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (isLoading) {
    return (
      <Box p={10} display="flex" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error && !config) {
    return (
      <EmptyState
        title={m.app_failed_to_load_configuration()}
        description={error}
        icon={<FiAlertTriangle />}
      >
        <Button onClick={() => loadConfig()}>{m.app_retry()}</Button>
      </EmptyState>
    );
  }

  if (!config) {
    return <></>;
  }

  return <>{children}</>;
};

const IconForResource = React.memo(({ selector }: { selector: OpSelector }) => {
  const status = useResourceStatus(selector);
  return iconForStatus(status);
});

const iconForStatus = (status: OperationStatus) => {
  const color = colorForStatus(status);
  switch (status) {
    case OperationStatus.STATUS_ERROR:
      return <FiAlertTriangle style={{ color }} />;
    case OperationStatus.STATUS_WARNING:
      return <FiAlertTriangle style={{ color }} />; // Using AlertTriangle for warning too
    case OperationStatus.STATUS_INPROGRESS:
      return (
        <Box animation={`${spin} 2s linear infinite`} lineHeight={0}>
          <FiLoader style={{ color }} />
        </Box>
      );
    case OperationStatus.STATUS_UNKNOWN:
      return <FiLoader style={{ color }} />;
    default:
      return <FiCheckCircle style={{ color }} />;
  }
};
