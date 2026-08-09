import { create } from "@bufbuild/protobuf";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SummaryDashboardResponse_SummarySchema } from "../../../gen/ts/v1/service_pb";
import { backrestService } from "../../api/client";
import { alerts } from "../../components/common/Alerts";
import * as m from "../../paraglide/messages";
import { makeConfig, makePlan, makeRepo } from "../../test/proto";
import { renderWithProviders } from "../../test/render";
import { PlanCard } from "./SummaryDashboard";

const config = makeConfig({
  repos: [makeRepo({ id: "115-offsite" })],
  plans: [makePlan({ id: "nas-config", repo: "115-offsite" })],
});

const summary = create(SummaryDashboardResponse_SummarySchema, {
  id: "nas-config",
});

describe("SummaryDashboard PlanCard", () => {
  it("runs a plan immediately and refreshes its state after completion", async () => {
    let finishBackup: () => void = () => {};
    vi.mocked(backrestService.backup).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishBackup = () => resolve({} as never);
        }),
    );
    const refresh = vi.fn().mockResolvedValue(undefined);
    const successSpy = vi.spyOn(alerts, "success");

    const { user } = renderWithProviders(
      <PlanCard summary={summary} onRefresh={refresh} />,
      { config },
    );

    const button = screen.getByRole("button", {
      name: m.plan_button_backup(),
    });
    await user.click(button);

    expect(backrestService.backup).toHaveBeenCalledWith(
      expect.objectContaining({ value: "nas-config" }),
    );
    expect(button).toBeDisabled();
    expect(
      screen.getAllByText(m.dashboard_state_label_run()).length,
    ).toBeGreaterThan(0);

    finishBackup();

    await waitFor(() => expect(button).not.toBeDisabled());
    expect(successSpy).toHaveBeenCalledWith(m.plan_backup_scheduled());
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("enables another attempt after a failed manual backup", async () => {
    vi.mocked(backrestService.backup)
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({} as never);
    const errorSpy = vi.spyOn(alerts, "error");
    const { user } = renderWithProviders(<PlanCard summary={summary} />, {
      config,
    });

    const button = screen.getByRole("button", {
      name: m.plan_button_backup(),
    });
    await user.click(button);

    await waitFor(() => expect(button).not.toBeDisabled());
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("temporary failure"),
    );

    await user.click(button);
    await waitFor(() =>
      expect(backrestService.backup).toHaveBeenCalledTimes(2),
    );
  });
});
