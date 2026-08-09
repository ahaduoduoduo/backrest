import { describe, expect, it } from "vitest";
import { backupDayOutcome } from "./backupDayOutcome";

describe("backupDayOutcome", () => {
  it("treats a successful retry as the final protection state", () => {
    expect(backupDayOutcome({ success: 1, error: 1 })).toBe("success");
  });

  it("keeps an unresolved retry in progress ahead of an earlier failure", () => {
    expect(backupDayOutcome({ inprogress: 1, error: 1 })).toBe("inprogress");
  });

  it("reports a failure when the day has no usable backup", () => {
    expect(backupDayOutcome({ error: 2 })).toBe("error");
  });
});
