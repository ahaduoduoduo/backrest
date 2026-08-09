# Custom Backrest module map

Updated: 2026-08-10

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
  activity data and the backup-task grid.
- `webui/src/features/dashboard/PlanCard.tsx`: renders the calendar-aligned task
  summary, start/stop control, next-run treatment, repository addition, and
  direct navigation to historical files.
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
- `webui/src/features/plans/PlanSnapshotExplorer.tsx` and
  `SnapshotExplorerHeader.tsx`: present successful Restic snapshots as a
  Time Machine-inspired directory-window stack with persistent paths, a
  sampled in-card timeline and older/newer navigation. The active surface owns
  the only meaningful overflow region: its file list when entries exceed the
  available viewport height.
- `webui/src/features/plans/PlanView.tsx`: owns the single task title, file and
  operation card faces, 3D flip state, and icon-only two-step version deletion;
  the title and closed-path controls remain inside the card footer.
- `webui/src/components/layout/BottomDock.tsx`: fixed desktop/mobile capsule
  navigation with closed-path Home, Plans, Repositories, and Settings glyphs;
  its shared selection pill moves between items, while task and repository
  submenus support pointer hover and touch click without a page header.
- `webui/src/lib/repositoryLocation.ts`: classifies the actual Restic backend
  URI as local storage, remote storage, or a remote Backrest instance.
- `docs/timeline-file-browser.md`: documents snapshot selection, bounded
  repository reads, responsive behavior, motion, and task-card controls.
- `webui/messages/zh.json`: plain-language Chinese product copy for navigation,
  backup-task editing, storage repositories, version browsing, restore, and
  maintenance operations. Destructive maintenance text preserves the
  behavioral difference between deleting old version records and reclaiming
  unreferenced storage space.
- `webui/src/index.sass`, `webui/src/app/App.tsx`, and
  `webui/src/components/layout/MainContentArea.tsx`: headerless dark application
  shell, full-width page sizing, bottom-dock clearance, glass surfaces, and
  responsive canvas treatment.
- `webui/src/components/common/TwoPaneModal.tsx` and `SectionCard.tsx`: shared
  floating workspace for task, repository, and settings editing; it retains a
  visible application backdrop and bottom dock on desktop and mobile, with
  consistent navigation, cards, footer, borders, and corner treatment.
- `webui/src/components/common/FormModal.tsx`: shared compact information and
  restore dialog with the same dark surface, corner scale, footer, and button
  treatment as the editor workspace.
- `webui/src/components/ui/toaster.tsx`: viewport-bounded global notifications
  with wrapped, scrollable long-error content on phone screens.
- `docs/openlist-115-backup.md`: deployment, plan grouping, excludes,
  consistency, and recovery instructions.
