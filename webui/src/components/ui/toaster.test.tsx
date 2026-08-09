import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/render";
import { formatErrorAlert } from "../common/Alerts";
import { toaster } from "./toaster";

describe("Toaster", () => {
  it("contains and wraps a multiline error inside the viewport", async () => {
    renderWithProviders(<div />);

    await act(async () => {
      toaster.create({
        type: "error",
        duration: 0,
        title: formatErrorAlert(
          { message: `first line\n${"unbroken-error-token".repeat(20)}` },
          "Backup failed",
        ),
      });
      await Promise.resolve();
    });

    const pre = await screen.findByText(/first line/);
    const root = screen.getByTestId("app-toast");

    expect(root).toHaveStyle({
      maxWidth: "calc(100vw - 24px)",
      minWidth: "0",
      overflow: "hidden",
    });
    expect(pre).toHaveStyle({
      maxWidth: "100%",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
    });
  });
});
