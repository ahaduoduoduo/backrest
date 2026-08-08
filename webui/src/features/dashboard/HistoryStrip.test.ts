import { describe, expect, it } from "vitest";
import type { SummaryDashboardResponse_DayStatusBucket } from "../../../gen/ts/v1/service_pb";
import { toCells } from "./HistoryStrip";

describe("HistoryStrip timeline order", () => {
  it("places the oldest day on the left and today on the right", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const yesterdayBucket = {
      timestampMs: BigInt(yesterday.getTime()),
    } as SummaryDashboardResponse_DayStatusBucket;
    const todayBucket = {
      timestampMs: BigInt(today.getTime()),
    } as SummaryDashboardResponse_DayStatusBucket;

    const cells = toCells([yesterdayBucket, todayBucket]);

    expect(cells).toHaveLength(30);
    expect(cells[0].isToday).toBe(false);
    expect(cells[28].bucket).toBe(yesterdayBucket);
    expect(cells[29].bucket).toBe(todayBucket);
    expect(cells[29].isToday).toBe(true);
  });
});
