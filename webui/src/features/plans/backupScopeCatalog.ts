import { getLocale } from "../../paraglide/runtime";

type LocalizedText = {
  zh: string;
  en: string;
};

export interface ExcludePreset {
  id: string;
  patterns: string[];
  title: LocalizedText;
  description: LocalizedText;
}

const MACOS_METADATA_EXCLUDES = [
  "**/.DS_Store",
  "**/._*",
  "**/.AppleDouble/**",
  "**/.Spotlight-V100/**",
  "**/.Trashes/**",
  "**/.Trash/**",
  "**/.Trash-*/**",
  "**/.TemporaryItems/**",
  "**/.DocumentRevisions-V100/**",
  "**/.fseventsd/**",
];

const SYNOLOGY_METADATA_EXCLUDES = [
  "**/@eaDir/**",
  "**/@tmp/**",
  "**/#recycle/**",
  "**/@Recycle/**",
  "**/@SynoResource/**",
  "**/.SynologyWorkingDirectory/**",
  "**/@Recently-Snapshot/**",
  "**/@sharesnap/**",
];

const WINDOWS_METADATA_EXCLUDES = [
  "**/Thumbs.db",
  "**/thumbs.db",
  "**/ehthumbs.db",
  "**/desktop.ini",
  "**/Desktop.ini",
];

export const DEFAULT_PLAN_EXCLUDES = [
  ...MACOS_METADATA_EXCLUDES,
  ...SYNOLOGY_METADATA_EXCLUDES,
  ...WINDOWS_METADATA_EXCLUDES,
];

export const EXCLUDE_PRESETS: ExcludePreset[] = [
  {
    id: "macos-metadata",
    patterns: MACOS_METADATA_EXCLUDES,
    title: { zh: "macOS 元数据", en: "macOS metadata" },
    description: {
      zh: "跳过 Finder 资源分叉、Spotlight、回收站和文件系统索引。",
      en: "Omits Finder resource forks, Spotlight, Trash, and filesystem indexes.",
    },
  },
  {
    id: "synology-metadata",
    patterns: SYNOLOGY_METADATA_EXCLUDES,
    title: { zh: "DSM 临时与索引", en: "DSM temporary data and indexes" },
    description: {
      zh: "跳过缩略图、临时目录、回收站和快照入口。",
      en: "Omits thumbnails, temporary data, recycle bins, and snapshot entries.",
    },
  },
  {
    id: "windows-metadata",
    patterns: WINDOWS_METADATA_EXCLUDES,
    title: { zh: "Windows 元数据", en: "Windows metadata" },
    description: {
      zh: "跳过资源管理器生成的缩略图和目录设置。",
      en: "Omits Explorer thumbnail caches and folder settings.",
    },
  },
  {
    id: "generated-files",
    patterns: [
      "**/.cache/**",
      "**/.next/**",
      "**/.pytest_cache/**",
      "**/.ruff_cache/**",
      "**/__pycache__/**",
      "**/cache/**",
      "**/logs/**",
      "**/node_modules/**",
      "**/temp/**",
      "**/tmp/**",
      "**/*.log",
      "**/*.log.*",
    ],
    title: {
      zh: "日志、缓存和临时文件",
      en: "Logs, caches, and temporary files",
    },
    description: {
      zh: "运行时会重新生成，不占用 115 上传流量。",
      en: "Regenerated at runtime and omitted from 115 uploads.",
    },
  },
  {
    id: "git-history",
    patterns: ["**/.git/**"],
    title: { zh: "Git 提交历史", en: "Git history" },
    description: {
      zh: "不备份 .git；项目当前文件仍保留，避免遗漏 Docker 配置和服务数据。",
      en: "Omits .git while retaining working files that may contain Docker configuration or service data.",
    },
  },
];

export const scopeText = (locale = getLocale()) => {
  const zh = locale.toLowerCase().startsWith("zh");
  return {
    backupTitle: zh ? "备份目录" : "Backup directories",
    backupDescription: zh
      ? "添加需要保存的根目录；其中新增的项目会自动进入备份。"
      : "Add root directories to preserve; new projects below them are included automatically.",
    excludeTitle: zh ? "将跳过" : "Skipped",
    excludeDescription: zh
      ? "打开无需上传的内容，例如日志、缓存和临时文件。"
      : "Enable content that does not need to be uploaded, such as logs and caches.",
    enabled: zh ? "已备份" : "Included",
    disabled: zh ? "未备份" : "Not included",
    excluded: zh ? "已排除" : "Excluded",
    included: zh ? "会上传" : "Uploaded",
    partial: zh ? "部分规则生效" : "Partially enabled",
    advancedTitle: zh ? "高级排除规则" : "Advanced exclusion rules",
    advancedDescription: zh
      ? "查看或修改精确的 Restic 排除规则。"
      : "Inspect or edit exact Restic exclusion patterns.",
    overviewTitle: zh ? "备份内容" : "Backup content",
    overviewDescription: zh
      ? "每个备份任务会上传哪些内容、跳过哪些内容。"
      : "What each plan uploads and skips.",
    editorDescription: zh
      ? "选择需要上传的内容和可以跳过的内容。"
      : "Choose what to upload and what can be skipped.",
    editPlan: zh ? "编辑内容" : "Edit content",
    planCount: (count: number) =>
      zh ? `${count} 个备份任务` : `${count} backup plans`,
    detailsNav: zh ? "基本信息" : "Details",
    scopeNav: zh ? "备份内容" : "Content",
    scheduleNav: zh ? "自动备份" : "Schedule",
    retentionNav: zh ? "历史版本" : "Retention",
    advancedNav: zh ? "高级设置" : "Advanced",
    noExcludes: zh ? "没有设置排除项" : "No exclusions configured",
    noSources: zh ? "没有设置备份目录" : "No backup paths configured",
    rules: (enabled: number, total: number) =>
      zh ? `${enabled}/${total} 条规则` : `${enabled}/${total} rules`,
  };
};

export const localizeScopeText = (
  value: LocalizedText,
  locale = getLocale(),
) => (locale.toLowerCase().startsWith("zh") ? value.zh : value.en);

export const getPresetMatchCount = (preset: ExcludePreset, rules: string[]) => {
  const ruleSet = new Set(rules);
  return preset.patterns.filter((pattern) => ruleSet.has(pattern)).length;
};
