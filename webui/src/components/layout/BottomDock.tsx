import { Box, Flex, IconButton, Portal, Text } from "@chakra-ui/react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  FiEdit2,
  FiPlus,
} from "react-icons/fi";
import { IoArchive, IoHome, IoServer, IoSettingsSharp } from "react-icons/io5";
import { useLocation, useNavigate } from "react-router";
import type { Plan, Repo } from "../../../gen/ts/v1/config_pb";
import { useConfig } from "../../app/provider";
import { repositoryLocation } from "../../lib/repositoryLocation";
import * as m from "../../paraglide/messages";
import {
  useModalPresence,
  useShowModal,
} from "../common/ModalManager";

type DockMenu = "plans" | "repos" | null;
type DockSection = "home" | "plans" | "repos" | "settings";

const locationLabel = (repo: Repo) => {
  switch (repositoryLocation(repo.uri, repo.originInstanceId)) {
    case "remote":
      return m.repository_location_remote();
    case "remote-instance":
      return m.repository_location_remote_instance({
        instance: repo.originInstanceId || "",
      });
    default:
      return m.repository_location_local();
  }
};

const DockSelection = ({
  active,
  reduceMotion,
}: {
  active: boolean;
  reduceMotion: boolean | null;
}) => {
  if (!active) return null;
  if (reduceMotion) {
    return (
      <motion.span
        className="console-dock-selection"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      />
    );
  }
  return (
    <motion.span
      className="console-dock-selection"
      layoutId="console-dock-selection"
      transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
    />
  );
};

export const BottomDock = () => {
  const [config] = useConfig();
  const showModal = useShowModal();
  const modalOpen = useModalPresence();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [openMenu, setOpenMenu] = useState<DockMenu>(null);
  const [modalSection, setModalSection] = useState<DockSection | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!modalOpen) setModalSection(null);
  }, [modalOpen]);

  if (!config) return null;

  const keepOpen = (menu: Exclude<DockMenu, null>) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(menu);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
  };
  const dismissModal = () => {
    if (modalOpen) showModal(null);
    setModalSection(null);
  };
  const go = (path: string) => {
    dismissModal();
    setOpenMenu(null);
    navigate(path);
  };

  const toggleMenu = (menu: Exclude<DockMenu, null>) => {
    dismissModal();
    setOpenMenu(openMenu === menu && !modalOpen ? null : menu);
  };

  const editPlan = async (plan: Plan) => {
    const { AddPlanModal } = await import("../../features/plans/AddPlanModal");
    setModalSection("plans");
    showModal(<AddPlanModal template={plan} />);
    setOpenMenu(null);
  };
  const editRepo = async (repo: Repo) => {
    const { AddRepoModal } =
      await import("../../features/repositories/AddRepoModal");
    setModalSection("repos");
    showModal(<AddRepoModal template={repo} />);
    setOpenMenu(null);
  };
  const addPlan = async () => {
    const { AddPlanModal } = await import("../../features/plans/AddPlanModal");
    setModalSection("plans");
    showModal(<AddPlanModal template={null} />);
    setOpenMenu(null);
  };
  const addRepo = async () => {
    const { AddRepoModal } =
      await import("../../features/repositories/AddRepoModal");
    setModalSection("repos");
    showModal(<AddRepoModal template={null} />);
    setOpenMenu(null);
  };
  const openSettings = async () => {
    if (modalOpen && modalSection === "settings") {
      dismissModal();
      setOpenMenu(null);
      return;
    }
    dismissModal();
    const { SettingsModal } =
      await import("../../features/settings/SettingsModal");
    setModalSection("settings");
    showModal(<SettingsModal />);
    setOpenMenu(null);
  };

  const routeSection: DockSection | null = location.pathname.startsWith("/plan/")
    ? "plans"
    : location.pathname.startsWith("/repo/") ||
        location.pathname.startsWith("/peer/")
      ? "repos"
      : location.pathname === "/"
        ? "home"
        : null;

  const activeSection: DockSection =
    modalSection || openMenu || routeSection || "home";

  const menuItems = openMenu === "plans" ? config.plans : config.repos;

  return (
    <>
      <AnimatePresence>
        {openMenu && (
          <Portal>
            <motion.div
              className="console-dock-menu"
              role="menu"
              aria-label={
                openMenu === "plans" ? m.app_menu_plans() : m.app_menu_repos()
              }
              data-testid="dock-submenu"
              initial={{
                opacity: 0,
                transform: reduceMotion
                  ? "translate3d(-50%, 0, 0)"
                  : "translate3d(-50%, 8px, 0) scale(0.96)",
              }}
              animate={{
                opacity: 1,
                transform: "translate3d(-50%, 0, 0) scale(1)",
              }}
              exit={{
                opacity: 0,
                transform: reduceMotion
                  ? "translate3d(-50%, 0, 0)"
                  : "translate3d(-50%, 8px, 0) scale(0.96)",
              }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              onMouseEnter={() => keepOpen(openMenu)}
              onMouseLeave={scheduleClose}
            >
              <Flex className="console-dock-menu-heading" align="center">
                <Text>
                  {openMenu === "plans"
                    ? m.app_menu_plans()
                    : m.app_menu_repos()}
                </Text>
                <IconButton
                  ml="auto"
                  size="sm"
                  variant="ghost"
                  aria-label={
                    openMenu === "plans"
                      ? m.app_menu_add_plan()
                      : m.app_menu_add_repo()
                  }
                  data-testid={
                    openMenu === "plans"
                      ? "sidebar-add-plan"
                      : "sidebar-add-repo"
                  }
                  onClick={() =>
                    void (openMenu === "plans" ? addPlan() : addRepo())
                  }
                >
                  <FiPlus />
                </IconButton>
              </Flex>
              <Box className="console-dock-menu-list">
                {menuItems.map((item) => {
                  const isPlan = openMenu === "plans";
                  const detail = isPlan
                    ? (item as Plan).repo
                    : locationLabel(item as Repo);
                  const path = isPlan ? `/plan/${item.id}` : `/repo/${item.id}`;
                  return (
                    <Flex
                      key={item.id}
                      className="console-dock-menu-row"
                      data-active={location.pathname === path || undefined}
                      data-testid={`sidebar-item-${isPlan ? "plan" : "repo"}-${item.id}`}
                      align="center"
                    >
                      <button type="button" onClick={() => go(path)}>
                        <Text fontWeight="600">{item.id}</Text>
                        <Text>{detail}</Text>
                      </button>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={`${isPlan ? m.app_menu_edit_plan() : m.add_repo_modal_title_edit()} ${item.id}`}
                        onClick={() =>
                          void (isPlan
                            ? editPlan(item as Plan)
                            : editRepo(item as Repo))
                        }
                      >
                        <FiEdit2 />
                      </IconButton>
                    </Flex>
                  );
                })}
              </Box>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      <Portal>
        <LayoutGroup id="console-bottom-dock">
          <Flex
            as="nav"
            className="console-bottom-dock"
            aria-label={m.app_menu()}
          >
          <button
            type="button"
            className="console-dock-item"
            data-active={activeSection === "home" || undefined}
            aria-label={m.app_menu_dashboard()}
            onClick={() => go("/")}
          >
            <DockSelection
              active={activeSection === "home"}
              reduceMotion={reduceMotion}
            />
            <IoHome />
          </button>
          <button
            type="button"
            className="console-dock-item"
            data-active={activeSection === "plans" || undefined}
            aria-label={m.app_menu_plans()}
            aria-expanded={openMenu === "plans"}
            onMouseEnter={() => keepOpen("plans")}
            onMouseLeave={scheduleClose}
            onClick={() => toggleMenu("plans")}
          >
            <DockSelection
              active={activeSection === "plans"}
              reduceMotion={reduceMotion}
            />
            <IoArchive />
          </button>
          <button
            type="button"
            className="console-dock-item"
            data-active={activeSection === "repos" || undefined}
            aria-label={m.app_menu_repos()}
            aria-expanded={openMenu === "repos"}
            onMouseEnter={() => keepOpen("repos")}
            onMouseLeave={scheduleClose}
            onClick={() => toggleMenu("repos")}
          >
            <DockSelection
              active={activeSection === "repos"}
              reduceMotion={reduceMotion}
            />
            <IoServer />
          </button>
          <button
            type="button"
            className="console-dock-item"
            data-active={activeSection === "settings" || undefined}
            aria-label={m.app_menu_settings()}
            onClick={() => void openSettings()}
          >
            <DockSelection
              active={activeSection === "settings"}
              reduceMotion={reduceMotion}
            />
            <IoSettingsSharp />
          </button>
          </Flex>
        </LayoutGroup>
      </Portal>
    </>
  );
};
