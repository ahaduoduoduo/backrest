import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAN_EXCLUDES,
  EXCLUDE_PRESETS,
  getPresetMatchCount,
  scopeText,
} from "./backupScopeCatalog";

describe("backupScopeCatalog", () => {
  it("uses all visible filesystem metadata presets for new plans", () => {
    const presets = ["macos-metadata", "synology-metadata", "windows-metadata"]
      .map((id) => EXCLUDE_PRESETS.find((candidate) => candidate.id === id))
      .filter((preset) => preset !== undefined);

    expect(DEFAULT_PLAN_EXCLUDES).toEqual(
      presets.flatMap((preset) => preset.patterns),
    );
    expect(DEFAULT_PLAN_EXCLUDES).toContain("**/._*");
    expect(DEFAULT_PLAN_EXCLUDES).toContain("**/@tmp/**");
    expect(DEFAULT_PLAN_EXCLUDES).toContain("**/Thumbs.db");
  });

  it("reports partial generic presets", () => {
    const preset = EXCLUDE_PRESETS.find(
      (candidate) => candidate.id === "generated-files",
    )!;
    const rules = [preset.patterns[0], "**/private-build/**"];

    expect(getPresetMatchCount(preset, rules)).toBe(1);
  });

  it("recursively excludes Node dependencies and package-manager caches", () => {
    const preset = EXCLUDE_PRESETS.find(
      (candidate) => candidate.id === "generated-files",
    )!;

    expect(preset.patterns).toEqual(
      expect.arrayContaining([
        "**/node_modules/**",
        "**/.npm/**",
        "**/.pnpm-store/**",
        "**/pnpm-store/**",
        "**/.yarn/cache/**",
        "**/.yarn/unplugged/**",
        "**/.bun/install/cache/**",
        "**/bower_components/**",
        "**/*node-modules*/**",
        "**/*pnpm-store*/**",
      ]),
    );
  });

  it("keeps deployment-specific paths out of compiled presets", () => {
    expect(EXCLUDE_PRESETS.flatMap((preset) => preset.patterns)).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^\/source\//),
        expect.stringMatching(/^\/volume\d+\//),
      ]),
    );
  });

  it("provides concise Chinese labels", () => {
    const copy = scopeText("zh");
    expect(copy.overviewTitle).toBe("备份内容");
    expect(copy.backupTitle).toBe("备份目录");
    expect(copy.excludeTitle).toBe("将跳过");
  });
});
