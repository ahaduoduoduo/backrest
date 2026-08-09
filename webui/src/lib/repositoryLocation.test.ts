import { describe, expect, it } from "vitest";
import { repositoryLocation } from "./repositoryLocation";

describe("repositoryLocation", () => {
  it("classifies REST and cloud backends as remote storage", () => {
    expect(repositoryLocation("rest:http://openlist:5244/restic/115", "")).toBe(
      "remote",
    );
    expect(repositoryLocation("s3:s3.amazonaws.com/bucket", "")).toBe("remote");
  });

  it("keeps filesystem paths local and identifies remote Backrest instances", () => {
    expect(repositoryLocation("/volume1/backups", "")).toBe("local");
    expect(repositoryLocation("rest:http://example.test", "peer-a")).toBe(
      "remote-instance",
    );
  });
});
