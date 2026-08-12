import { describe, expect, it, vi } from "vitest";
import {
  isTransientBrowserRequestError,
  retryTransientBrowserAction,
} from "./transientAction";

describe("transient browser actions", () => {
  it("recognizes Safari and fetch transport failures", () => {
    expect(isTransientBrowserRequestError(new Error("[unknown] Load failed"))).toBe(
      true,
    );
    expect(isTransientBrowserRequestError(new Error("Failed to fetch"))).toBe(true);
    expect(isTransientBrowserRequestError(new Error("permission denied"))).toBe(
      false,
    );
  });

  it("retries one transient failure", async () => {
    const action = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("[unknown] Load failed"))
      .mockResolvedValueOnce("scheduled");

    await expect(retryTransientBrowserAction(action, 0)).resolves.toBe(
      "scheduled",
    );
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("does not retry application errors", async () => {
    const action = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error("permission denied"));

    await expect(retryTransientBrowserAction(action, 0)).rejects.toThrow(
      "permission denied",
    );
    expect(action).toHaveBeenCalledTimes(1);
  });
});
