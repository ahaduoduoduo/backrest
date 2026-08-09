import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAN_EXCLUDES,
  EXCLUDE_PRESETS,
  getCustomExcludeRules,
  getCustomPaths,
  getKnownSources,
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

  it("maps mounted Synology paths to readable source groups", () => {
    const paths = [
      "/source/docker",
      "/source/docker-volumes/telegram-data",
      "/source/web-live",
      "/source/dsm-packages",
      "/staging",
      "/custom/archive",
    ];

    expect(getKnownSources(paths).map((source) => source.id)).toEqual([
      "docker",
      "docker-named-volumes",
      "web-live",
      "dsm-package-config",
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

  it("recognizes the flat runtime paths without treating them as custom rules", () => {
    const rules = [
      "/source/docker/backrest/**",
      "/source/docker/autofilm-core/autofilm.sqlite",
      "/source/home-assistant/home-assistant_v2.db-wal",
      "/source/docker/homeassistant/**",
      "/source/docker/telegram-data/**",
      "/source/web-live/data/**",
      "/source/docker/jellyfin/config/data/jellyfin.db.old",
    ];

    expect(getCustomExcludeRules(rules)).toEqual([
      "/source/docker/jellyfin/config/data/jellyfin.db.old",
    ]);
  });

  it("provides concise Chinese labels", () => {
    const copy = scopeText("zh");
    expect(copy.overviewTitle).toBe("备份内容");
    expect(copy.backupTitle).toBe("将备份");
    expect(copy.excludeTitle).toBe("将跳过");
  });
});
