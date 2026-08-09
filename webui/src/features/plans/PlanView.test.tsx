import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { backrestService } from "../../api/client";
import * as m from "../../paraglide/messages";
import { makeConfig, makePlan, makeRepo } from "../../test/proto";
import { renderWithProviders } from "../../test/render";
import { PlanView } from "./PlanView";

vi.mock("../operations/OperationListView", () => ({
  OperationListView: () => <div data-testid="operation-list-view-stub" />,
}));
vi.mock("./PlanSnapshotExplorer", () => ({
  PlanSnapshotExplorer: ({
    onVersionChange,
  }: {
    onVersionChange?: (id: string) => void;
  }) => {
    React.useEffect(() => onVersionChange?.("snapshot-id"), [onVersionChange]);
    return <div data-testid="snapshot-explorer-stub" />;
  },
}));

const config = makeConfig({
  repos: [makeRepo({ id: "test-repo", guid: "test-repo-guid" })],
  plans: [makePlan({ id: "test-plan", repo: "test-repo" })],
});
const plan = config.plans[0];

describe("PlanView", () => {
  it("renders one plan title without a backup-now control", async () => {
    renderWithProviders(<PlanView plan={plan} />, { config });

    expect(await screen.findByText("test-plan")).toBeInTheDocument();
    expect(screen.getByTestId("snapshot-explorer-stub")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: m.plan_button_backup() }),
    ).not.toBeInTheDocument();
  });

  it("flips between historical files and operation history", async () => {
    const { user, container } = renderWithProviders(<PlanView plan={plan} />, {
      config,
    });
    const flipper = container.querySelector(".plan-history-flipper");

    expect(flipper).not.toHaveAttribute("data-flipped");
    await user.click(screen.getByRole("button", { name: m.repo_tab_list() }));
    expect(flipper).toHaveAttribute("data-flipped", "true");
    await user.click(screen.getByRole("button", { name: m.repo_tab_tree() }));
    expect(flipper).not.toHaveAttribute("data-flipped");
  });

  it("requires two clicks before deleting the selected version", async () => {
    vi.mocked(backrestService.forget).mockResolvedValue({} as never);
    const { user } = renderWithProviders(<PlanView plan={plan} />, { config });
    const deleteButton = await screen.findByTestId("forget-snapshot");
    await waitFor(() => expect(deleteButton).not.toBeDisabled());

    await user.click(deleteButton);
    expect(deleteButton).toHaveAttribute("data-armed", "true");
    expect(backrestService.forget).not.toHaveBeenCalled();

    await user.click(deleteButton);
    await waitFor(() =>
      expect(backrestService.forget).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: "test-plan",
          repoId: "test-repo",
          snapshotId: "snapshot-id",
        }),
      ),
    );
  });
});
