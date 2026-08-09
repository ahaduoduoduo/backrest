# Custom Backrest module map

Updated: 2026-08-09

The fork retains upstream Backrest's Go orchestrator, Restic process runner,
configuration model, operation log, snapshot browser, and restore operations.

- `.github/workflows/custom-image.yml`: builds the production linux/amd64 image
  after non-documentation changes reach `main`, retains a manual rebuild entry,
  and publishes both a stable console tag and an immutable commit tag.
- `.github/workflows/test.yml`: runs Linux Go race tests, WebUI unit and type
  checks, and Docker-relevant browser journeys; upstream Windows, rclone, and
  SFTP coverage is excluded from the fork's default matrix.
- `.github/workflows/release-preview.yml`: keeps upstream multi-platform
  snapshot artifacts available through manual dispatch without rebuilding
  macOS and Windows packages on every `main` update.
- `compose.dev.yaml`: Dockerized Vite HMR service attached to the deployed
  Backrest network; source and dependency caches are separate volumes.
- `webui/vite.config.ts`: separates the browser-visible same-origin backend URL
  from the development proxy target and enables polling for NAS bind mounts.
- `docs/webui-development.md`: start, stop, routing, caching, and release notes
  for rapid interface iteration.
- `internal/api/openlistusagehandler.go`: authenticated server-side proxy for
  the OpenList `/restic/_usage` response. It uses a bounded response body and a
  ten-second client timeout.
- `internal/env/environment.go`: OpenList base URL and Restic HTTP credential
  environment variables.
- `cmd/backrest/backrest.go`: registers the proxy inside Backrest's existing
  authenticated route set.
- `webui/src/api/openlist.ts`: typed client for the compact usage response.
- `webui/src/features/dashboard/BackupActivityOverview.tsx`: responsive yearly
  backup activity wall combining Backrest operation metrics with current 115
  day and month upload traffic. Each day exposes Restic's processed bytes and
  repository-added bytes through a hover/tap detail panel; a successful retry
  resolves the calendar day's state without deleting earlier error details,
  and operation queries do not read repository data.
- `webui/src/features/dashboard/SummaryDashboard.tsx`: composes live Backrest
  activity data and backup-task cards, including a plan-level manual backup
  action that reports active progress and refreshes the card after completion.
- `webui/src/features/dashboard/HistoryStrip.tsx`: renders reusable 30-day
  status strips in chronological order, from the oldest date on the left to
  today on the right, with per-day backup-size and mixed-outcome details; a
  recovered failure uses a green cell with an orange outline.
- `webui/src/features/dashboard/backupDayOutcome.ts`: defines the shared
  success-first protection rule used by yearly and 30-day backup calendars.
- `webui/src/features/repositories/RepoView.tsx`: repository file browser,
  operations, storage statistics, maintenance actions, and a top-level 30-day
  capacity and backup-health summary.
- `webui/src/features/settings/SettingsModal.tsx`: instance, authentication,
  multihost, and read-only system information including runtime paths and the
  saved configuration JSON.
- `webui/src/features/repositories/OpenListRepositoryRate.tsx`: resolves an
  OpenList REST repository name from its URI and displays its effective upload
  rate inside repository settings.
- `webui/src/features/plans/backupScopeCatalog.ts`: reusable filesystem and
  Restic exclusion presets; backup roots remain arbitrary user-configured
  directories rather than compiled service mappings.
- `webui/src/features/plans/BackupScopeEditor.tsx`: direct root-directory list
  and readable exclusion controls backed by the unchanged `Plan.paths`,
  `Plan.excludes`, and `Plan.iexcludes` fields.
- `webui/messages/zh.json`: plain-language Chinese product copy for navigation,
  backup-task editing, storage repositories, version browsing, restore, and
  maintenance operations. Destructive maintenance text preserves the
  behavioral difference between deleting old version records and reclaiming
  unreferenced storage space.
- `webui/src/index.sass`, `webui/src/app/App.tsx`, and
  `webui/src/components/layout/MainContentArea.tsx`: fixed dark application
  shell, page-root neutral glass desktop navigation, responsive navigation,
  spacing, border, and canvas treatment.
- `webui/src/components/layout/MobileNavigation.tsx`: full-screen mobile
  contents index for dashboard, plans, repositories, and settings.
- `webui/src/components/common/TwoPaneModal.tsx`: desktop two-pane editor and a
  fixed, opaque phone editor covering the complete viewport.
- `webui/src/components/ui/toaster.tsx`: viewport-bounded global notifications
  with wrapped, scrollable long-error content on phone screens.
- `docs/openlist-115-backup.md`: deployment, plan grouping, excludes,
  consistency, and recovery instructions.
