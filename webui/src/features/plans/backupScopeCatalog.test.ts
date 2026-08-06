import { describe, expect, it } from "vitest";
import {
  EXCLUDE_PRESETS,
  getCustomExcludeRules,
  getCustomPaths,
  getKnownSources,
  getPresetMatchCount,
  scopeText,
} from "./backupScopeCatalog";

describe("backupScopeCatalog", () => {
  it("maps mounted Synology paths to readable source groups", () => {
    const paths = ["/source/docker", "/staging", "/custom/archive"];

    expect(getKnownSources(paths).map((source) => source.id)).toEqual([
      "docker",
      "recovery-staging",
    ]);
    expect(getCustomPaths(paths)).toEqual(["/custom/archive"]);
  });

  it("reports partial presets and leaves unknown rules visible", () => {
    const preset = EXCLUDE_PRESETS.find(
      (candidate) => candidate.id === "generated-files",
    )!;
    const rules = [preset.patterns[0], "**/private-build/**"];

    expect(getPresetMatchCount(preset, rules)).toBe(1);
    expect(getCustomExcludeRules(rules)).toEqual(["**/private-build/**"]);
  });

  it("provides concise Chinese labels", () => {
    const copy = scopeText("zh");
    expect(copy.backupTitle).toBe("备份什么");
    expect(copy.excludeTitle).toBe("不备份什么");
  });
});
