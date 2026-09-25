import { create } from "@bufbuild/protobuf";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SummaryDashboardResponse_SummarySchema } from "../../../gen/ts/v1/service_pb";
import {
  OperationListSchema,
  OperationSchema,
  OperationStatus,
} from "../../../gen/ts/v1/operations_pb";
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

  it("retries a browser connection failure when scheduling a backup", async () => {
    vi.mocked(backrestService.backup)
      .mockRejectedValueOnce(new Error("[unknown] Load failed"))
      .mockResolvedValueOnce({} as never);
    const successSpy = vi.spyOn(alerts, "success");
    const { user } = renderWithProviders(<PlanCard summary={summary} />, {
      config,
    });

    await user.click(
      screen.getByRole("button", { name: m.plan_button_backup() }),
    );

    await waitFor(() =>
      expect(backrestService.backup).toHaveBeenCalledTimes(2),
    );
    expect(successSpy).toHaveBeenCalledWith(m.plan_backup_scheduled());
  });

  it("uses the running control to cancel the active backup", async () => {
    const activeOperation = create(OperationSchema, {
      id: 42n,
      planId: "nas-config",
      status: OperationStatus.STATUS_INPROGRESS,
      op: { case: "operationBackup", value: {} },
    });
    vi.mocked(backrestService.getOperations).mockResolvedValue(
      create(OperationListSchema, { operations: [activeOperation] }),
    );
    vi.mocked(backrestService.cancel).mockResolvedValue({} as never);
    const runningSummary = create(SummaryDashboardResponse_SummarySchema, {
      id: "nas-config",
      recentBackups: {
        status: [OperationStatus.STATUS_INPROGRESS],
        timestampMs: [BigInt(Date.now())],
      },
    });

    const { user } = renderWithProviders(
      <PlanCard summary={runningSummary} />,
      { config },
    );
    const stopButton = await screen.findByRole("button", {
      name: m.dashboard_card_stop_backup(),
    });
    await waitFor(() => expect(stopButton).not.toBeDisabled());
    await user.click(stopButton);

    await waitFor(() =>
      expect(backrestService.cancel).toHaveBeenCalledWith(
        expect.objectContaining({ operationId: 42n }),
      ),
    );
  });

  it("prefers an active backup over a later cancelled schedule marker", async () => {
    const activeOperation = create(OperationSchema, {
      id: 43n,
      planId: "nas-config",
      status: OperationStatus.STATUS_INPROGRESS,
      op: { case: "operationBackup", value: {} },
    });
    vi.mocked(backrestService.getOperations).mockResolvedValue(
      create(OperationListSchema, { operations: [activeOperation] }),
    );
    const mixedSummary = create(SummaryDashboardResponse_SummarySchema, {
      id: "nas-config",
      recentBackups: {
        status: [
          OperationStatus.STATUS_USER_CANCELLED,
          OperationStatus.STATUS_INPROGRESS,
        ],
        timestampMs: [
          BigInt(Date.now() + 2 * 60 * 60 * 1000),
          BigInt(Date.now() - 30 * 60 * 1000),
        ],
        bytesAdded: [0n, 1024n],
        waitingForResume: [false, false],
      },
    });

    renderWithProviders(<PlanCard summary={mixedSummary} />, { config });

    expect(
      screen.getAllByText(m.dashboard_state_label_run()).length,
    ).toBeGreaterThan(0);
    expect(
      await screen.findByRole("button", {
        name: m.dashboard_card_stop_backup(),
      }),
    ).toBeEnabled();
  });
});
