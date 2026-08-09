import { create } from "@bufbuild/protobuf";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  OperationListSchema,
  OperationSchema,
  OperationStatus,
} from "../../../gen/ts/v1/operations_pb";
import { ListSnapshotFilesResponseSchema } from "../../../gen/ts/v1/service_pb";
import { backrestService } from "../../api/client";
import * as m from "../../paraglide/messages";
import { renderWithProviders } from "../../test/render";
import { PlanSnapshotExplorer } from "./PlanSnapshotExplorer";

const snapshotOperation = (
  id: bigint,
  snapshotId: string,
  timestampMs: bigint,
) =>
  create(OperationSchema, {
    id,
    flowId: id,
    planId: "nas-config",
    repoId: "115-offsite",
    repoGuid: "repo-guid",
    snapshotId,
    instanceId: "test-instance",
    status: OperationStatus.STATUS_SUCCESS,
    unixTimeStartMs: timestampMs,
    op: {
      case: "operationIndexSnapshot",
      value: {
        snapshot: { id: snapshotId, unixTimeMs: timestampMs },
        forgot: false,
      },
    },
  });

describe("PlanSnapshotExplorer", () => {
  it("opens the newest snapshot and keeps the folder path while moving through time", async () => {
    const newest = snapshotOperation(12n, "newest-snapshot", 2_000n);
    const older = snapshotOperation(11n, "older-snapshot", 1_000n);
    vi.mocked(backrestService.getOperations).mockResolvedValue(
      create(OperationListSchema, { operations: [older, newest] }),
    );
    vi.mocked(backrestService.listSnapshotFiles).mockImplementation(
      async (request: any) => {
        if (request.path === "/") {
          return create(ListSnapshotFilesResponseSchema, {
            path: "/",
            entries: [{ name: "docker", path: "/docker", type: "dir" }],
          });
        }
        return create(ListSnapshotFilesResponseSchema, {
          path: request.path,
          entries: [
            {
              name:
                request.snapshotId === "newest-snapshot"
                  ? "current.txt"
                  : "older.txt",
              path:
                request.snapshotId === "newest-snapshot"
                  ? "/docker/current.txt"
                  : "/docker/older.txt",
              type: "file",
              size: 128n,
            },
          ],
        });
      },
    );

    const { user } = renderWithProviders(
      <PlanSnapshotExplorer
        repoId="115-offsite"
        repoGuid="repo-guid"
        planId="nas-config"
        instanceId="test-instance"
        maxHistory={100n}
      />,
    );

    await user.click(await screen.findByText("docker"));
    expect(await screen.findByText("current.txt")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: m.snapshot_explorer_older() }),
    );
    expect(await screen.findByText("older.txt")).toBeInTheDocument();
    await waitFor(() =>
      expect(backrestService.listSnapshotFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          repoId: "115-offsite",
          snapshotId: "older-snapshot",
          path: "/docker/",
        }),
      ),
    );
  });
});
