import type { ReactNode } from "react";
import { Box, Button, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import { FiChevronRight, FiEdit2, FiPlus } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router";
import type { Plan, Repo } from "../../../gen/ts/v1/config_pb";
import { useConfig } from "../../app/provider";
import * as m from "../../paraglide/messages";
import { useShowModal } from "../common/ModalManager";

const MobileNavRow = ({
  index,
  title,
  detail,
  active = false,
  onClick,
  action,
}: {
  index: string;
  title: string;
  detail?: string;
  active?: boolean;
  onClick: () => void;
  action?: ReactNode;
}) => (
  <Flex
    align="center"
    minH="68px"
    borderBottomWidth="1px"
    borderColor="whiteAlpha.100"
    cursor="pointer"
    onClick={onClick}
    bg={active ? "rgba(97, 184, 255, 0.07)" : "transparent"}
  >
    <Text
      width="42px"
      flexShrink={0}
      color={active ? "blue.300" : "whiteAlpha.350"}
      fontSize="10px"
      fontFamily="mono"
    >
      {index}
    </Text>
    <Box flex={1} minW={0}>
      <Text fontSize="17px" fontWeight="520" truncate>
        {title}
      </Text>
      {detail && (
        <Text mt={0.5} color="whiteAlpha.450" fontSize="11px" truncate>
          {detail}
        </Text>
      )}
    </Box>
    {action}
    <FiChevronRight color="rgba(255,255,255,0.3)" />
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

  return (
    <Box px={5} pb="max(24px, env(safe-area-inset-bottom))">
      <Flex align="end" justify="space-between" pt={8} pb={6}>
        <Box>
          <Text
            color="blue.300"
            fontSize="10px"
            fontFamily="mono"
            letterSpacing="0.16em"
          >
            CONTENT / NAVIGATION
          </Text>
          <Heading
            mt={2}
            fontSize="42px"
            fontWeight="400"
            letterSpacing="-0.055em"
          >
            导航
          </Heading>
        </Box>
        <Text color="whiteAlpha.400" fontSize="11px" textAlign="right">
          {config.plans.length} 个备份任务
          <br />
          {config.repos.length} 个存储库
        </Text>
      </Flex>

      <MobileNavRow
        index="01"
        title={m.app_menu_dashboard()}
        detail="状态、流量与备份记录"
        active={location.pathname === "/"}
        onClick={() => navigateTo("/")}
      />

      <Flex align="center" justify="space-between" pt={7} pb={2}>
        <Text fontSize="10px" color="whiteAlpha.400" letterSpacing="0.14em">
          02 / {m.app_menu_plans()}
        </Text>
        <Button
          variant="ghost"
          size="xs"
          onClick={async () => {
            const { AddPlanModal } =
              await import("../../features/plans/AddPlanModal");
            showModal(<AddPlanModal template={null} />);
            onClose();
          }}
          data-testid="mobile-add-plan"
        >
          <FiPlus /> {m.app_menu_add_plan()}
        </Button>
      </Flex>
      {config.plans.map((plan, index) => (
        <MobileNavRow
          key={plan.id}
          index={`02.${index + 1}`}
          title={plan.id}
          detail={plan.repo}
          active={location.pathname === `/plan/${plan.id}`}
          onClick={() => navigateTo(`/plan/${plan.id}`)}
          action={
            <IconButton
              aria-label={`${m.app_menu_edit_plan()} ${plan.id}`}
              variant="ghost"
              size="sm"
              mr={1}
              onClick={(event) => {
                event.stopPropagation();
                editPlan(plan);
              }}
            >
              <FiEdit2 />
            </IconButton>
          }
        />
      ))}

      <Flex align="center" justify="space-between" pt={7} pb={2}>
        <Text fontSize="10px" color="whiteAlpha.400" letterSpacing="0.14em">
          03 / {m.app_menu_repos()}
        </Text>
        <Button
          variant="ghost"
          size="xs"
          onClick={async () => {
            const { AddRepoModal } =
              await import("../../features/repositories/AddRepoModal");
            showModal(<AddRepoModal template={null} />);
            onClose();
          }}
          data-testid="mobile-add-repo"
        >
          <FiPlus /> {m.app_menu_add_repo()}
        </Button>
      </Flex>
      {config.repos.map((repo, index) => (
        <MobileNavRow
          key={repo.id}
          index={`03.${index + 1}`}
          title={repo.id}
          detail={repo.originInstanceId || "本机存储库"}
          active={location.pathname === `/repo/${repo.id}`}
          onClick={() => navigateTo(`/repo/${repo.id}`)}
          action={
            <IconButton
              aria-label={`${m.add_repo_modal_title_edit()} ${repo.id}`}
              variant="ghost"
              size="sm"
              mr={1}
              onClick={(event) => {
                event.stopPropagation();
                editRepo(repo);
              }}
            >
              <FiEdit2 />
            </IconButton>
          }
        />
      ))}

      <Box pt={7}>
        <Text
          fontSize="10px"
          color="whiteAlpha.400"
          letterSpacing="0.14em"
          pb={2}
        >
          04 / SYSTEM
        </Text>
        <MobileNavRow
          index="04.1"
          title={m.app_menu_settings()}
          detail="认证、通知与实例设置"
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
