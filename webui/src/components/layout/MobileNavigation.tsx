import type { KeyboardEvent, ReactNode } from "react";
import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import {
  FiArchive,
  FiChevronRight,
  FiDatabase,
  FiEdit2,
  FiHome,
  FiPlus,
  FiSettings,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router";
import type { Plan, Repo } from "../../../gen/ts/v1/config_pb";
import { useConfig } from "../../app/provider";
import * as m from "../../paraglide/messages";
import { useShowModal } from "../common/ModalManager";

const MobileNavRow = ({
  icon,
  title,
  detail,
  active = false,
  onClick,
  action,
}: {
  icon: ReactNode;
  title: string;
  detail?: string;
  active?: boolean;
  onClick: () => void;
  action?: ReactNode;
}) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Flex
      className="mobile-navigation-row"
      data-active={active || undefined}
      role="button"
      tabIndex={0}
      align="center"
      minH="66px"
      px={3}
      gap={3}
      cursor="pointer"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-current={active ? "page" : undefined}
    >
      <Flex
        className="mobile-navigation-icon"
        align="center"
        justify="center"
        width="36px"
        height="36px"
        flexShrink={0}
        borderRadius="12px"
      >
        {icon}
      </Flex>
      <Box flex="1" minW={0} textAlign="left">
        <Text fontSize="15px" fontWeight="580" truncate>
          {title}
        </Text>
        {detail && (
          <Text mt="2px" color="whiteAlpha.420" fontSize="10px" truncate>
            {detail}
          </Text>
        )}
      </Box>
      {action}
      <FiChevronRight className="mobile-navigation-chevron" />
    </Flex>
  );
};

const SectionHeader = ({
  title,
  count,
  actionLabel,
  actionTestId,
  onAction,
}: {
  title: string;
  count: number;
  actionLabel: string;
  actionTestId: string;
  onAction: () => void;
}) => (
  <Flex align="center" justify="space-between" px={1} pt={7} pb={2}>
    <Flex align="baseline" gap={2}>
      <Text fontSize="12px" fontWeight="620">
        {title}
      </Text>
      <Text color="whiteAlpha.300" fontSize="10px">
        {count}
      </Text>
    </Flex>
    <IconButton
      className="mobile-navigation-add"
      variant="ghost"
      minW="40px"
      minH="40px"
      borderRadius="full"
      aria-label={actionLabel}
      onClick={onAction}
      data-testid={actionTestId}
    >
      <FiPlus />
    </IconButton>
  </Flex>
);

export const MobileNavigation = ({ onClose }: { onClose: () => void }) => {
  const [config] = useConfig();
  const showModal = useShowModal();
  const navigate = useNavigate();
  const location = useLocation();

  if (!config) return null;

  const navigateTo = (path: string) => {
    navigate(path);
    onClose();
  };

  const editPlan = async (plan: Plan) => {
    const { AddPlanModal } = await import("../../features/plans/AddPlanModal");
    showModal(<AddPlanModal template={plan} />);
    onClose();
  };

  const editRepo = async (repo: Repo) => {
    const { AddRepoModal } =
      await import("../../features/repositories/AddRepoModal");
    showModal(<AddRepoModal template={repo} />);
    onClose();
  };

  const addPlan = async () => {
    const { AddPlanModal } = await import("../../features/plans/AddPlanModal");
    showModal(<AddPlanModal template={null} />);
    onClose();
  };

  const addRepo = async () => {
    const { AddRepoModal } =
      await import("../../features/repositories/AddRepoModal");
    showModal(<AddRepoModal template={null} />);
    onClose();
  };

  return (
    <Box
      className="mobile-navigation"
      px={4}
      pt={4}
      pb="max(24px, env(safe-area-inset-bottom))"
    >
      <Box className="mobile-navigation-group">
        <MobileNavRow
          icon={<FiHome />}
          title={m.app_menu_dashboard()}
          detail="备份状态、用量和历史记录"
          active={location.pathname === "/"}
          onClick={() => navigateTo("/")}
        />
      </Box>

      <SectionHeader
        title={m.app_menu_plans()}
        count={config.plans.length}
        actionLabel={m.app_menu_add_plan()}
        actionTestId="mobile-add-plan"
        onAction={() => void addPlan()}
      />
      <Box className="mobile-navigation-group">
        {config.plans.map((plan) => (
          <MobileNavRow
            key={plan.id}
            icon={<FiArchive />}
            title={plan.id}
            detail={plan.repo}
            active={location.pathname === `/plan/${plan.id}`}
            onClick={() => navigateTo(`/plan/${plan.id}`)}
            action={
              <IconButton
                className="mobile-navigation-edit"
                aria-label={`${m.app_menu_edit_plan()} ${plan.id}`}
                variant="ghost"
                minW="40px"
                minH="40px"
                borderRadius="full"
                onClick={(event) => {
                  event.stopPropagation();
                  void editPlan(plan);
                }}
              >
                <FiEdit2 />
              </IconButton>
            }
          />
        ))}
      </Box>

      <SectionHeader
        title={m.app_menu_repos()}
        count={config.repos.length}
        actionLabel={m.app_menu_add_repo()}
        actionTestId="mobile-add-repo"
        onAction={() => void addRepo()}
      />
      <Box className="mobile-navigation-group">
        {config.repos.map((repo) => (
          <MobileNavRow
            key={repo.id}
            icon={<FiDatabase />}
            title={repo.id}
            detail={repo.originInstanceId || "本机存储库"}
            active={location.pathname === `/repo/${repo.id}`}
            onClick={() => navigateTo(`/repo/${repo.id}`)}
            action={
              <IconButton
                className="mobile-navigation-edit"
                aria-label={`${m.add_repo_modal_title_edit()} ${repo.id}`}
                variant="ghost"
                minW="40px"
                minH="40px"
                borderRadius="full"
                onClick={(event) => {
                  event.stopPropagation();
                  void editRepo(repo);
                }}
              >
                <FiEdit2 />
              </IconButton>
            }
          />
        ))}
      </Box>

      <Box className="mobile-navigation-group" mt={7}>
        <MobileNavRow
          icon={<FiSettings />}
          title={m.app_menu_settings()}
          detail="认证、通知和实例设置"
          onClick={async () => {
            const { SettingsModal } =
              await import("../../features/settings/SettingsModal");
            showModal(<SettingsModal />);
            onClose();
          }}
        />
      </Box>
    </Box>
  );
};
