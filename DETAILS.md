# Custom Backrest module map

Updated: 2026-08-13

The fork retains upstream Backrest's Go orchestrator, Restic process runner,
configuration model, operation log, snapshot browser, and restore operations.

- `.github/workflows/custom-image.yml`: builds the production linux/amd64 image
  after non-documentation changes reach `main`, retains a manual rebuild entry,
  and publishes both a stable console tag and an immutable commit tag.
- `.github/workflows/test.yml`: compiles the full Go tree, then runs race tests
  for the API, configuration, backup scheduler, repository, task, and Restic
  runtime packages plus WebUI unit and type checks. Browser E2E, multihost
  sync, Windows, rclone, and SFTP jobs are excluded from this Docker-only fork.
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
- `internal/hook/types/command.go` and `internal/platformutil/cmdopts_*`: run
  command hooks with task cancellation and terminate Unix shell child groups.
- `webui/src/api/openlist.ts`: typed client for the compact usage response,
  OpenList repository-name parsing, and deduplicated repository occupancy.
- `webui/src/api/transientAction.ts`: bounded one-retry wrapper for Safari and
  fetch transport failures on user-triggered dashboard actions.
- `webui/src/features/dashboard/BackupActivityOverview.tsx`: responsive yearly
  backup activity wall combining Backrest operation metrics with current 115
  day and month upload traffic. The metric strip reports current remote Restic
  object occupancy once per repository, while each day exposes its
  uncompressed addition and final per-plan status through a hover/tap detail
  panel.
- `webui/src/features/dashboard/backupActivitySummary.ts`: groups operations by
  local day and plan, sums additions from all plans, resolves each plan from its
  last started operation, and derives solid or outlined calendar states for
  failure, progress, queued work, successful recovery, and neutral user stops.
- `webui/src/features/dashboard/SummaryDashboard.tsx`: composes live Backrest
  activity data and the backup-task grid; protected bytes are the sum of every
  plan's latest usable snapshot, while remote occupancy is deduplicated by the
  OpenList repository referenced by those plans.
- `webui/src/features/dashboard/PlanCard.tsx`: renders the calendar-aligned task
  summary, start/stop control, next-run treatment, repository addition, and
  direct navigation to historical files. A live backup takes display priority
  over cancelled future schedule markers without removing those markers from
  operation history; start and stop retry one browser transport failure after
  a suspended tab resumes.
- `webui/src/features/dashboard/HistoryStrip.tsx`: renders reusable 30-day
  status strips in chronological order, from the oldest date on the left to
  today on the right, with per-day backup-size and mixed-outcome details; a
  recovered failure uses a green cell with an orange outline.
- `webui/src/features/dashboard/backupDayOutcome.ts`: defines the
  success-first protection rule used by each plan's 30-day history strip.
- `webui/src/features/repositories/RepoView.tsx`: repository file browser,
  operations, storage statistics, maintenance actions, and a top-level 30-day
  capacity and backup-health summary. Refresh and advanced maintenance actions
  use compact icon controls and the same rounded dark action menu as historical
  file entries.
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
- `proto/v1/config.proto`, `internal/orchestrator/repo/repo.go`, and
  `internal/orchestrator/orchestrator.go`: persist per-plan upload allocations
  and weights, allow backup readers to run concurrently, and keep repository
  maintenance exclusive. Repository access is context-aware so a cancelled
  operation does not remain blocked behind maintenance; the orchestrator also
  suppresses a second active execution of the same plan.
- `internal/orchestrator/repo/repositorylock.go`: context-aware shared/exclusive
  repository coordination. Backup plans share access, while unlock, restore,
  forget, check, prune, statistics, and tag maintenance remain exclusive.
- `internal/orchestrator/repo/repo.go`: repository checks pass
  `--with-cache`, retaining structural validation while avoiding a complete
  remote index download on every scheduled check.
- `internal/orchestrator/activebackup.go`: per-repository, per-plan execution
  guard that discards duplicate triggers without serializing different plans.
- `pkg/restic/restic.go` and `internal/orchestrator/tasks/taskbackup.go`: map
  Restic exit code 11 to a repository-lock error and invoke configured
  auto-unlock only for that error before one retry.
- `internal/openlistclient/client.go`: encodes a plan identity, allocation, and
  weight into the authenticated Restic request, evaluates global, repository,
  and task capacity from OpenList's local usage response, and releases unused
  allocation after a completed backup.
- `docs/parallel-upload-scheduling.md`: task allocations, weighted provider
  concurrency, waiting state, and unused-allocation sharing.
- `webui/src/features/plans/PlanSnapshotExplorer.tsx` and
  `SnapshotExplorerHeader.tsx`: present successful Restic snapshots as a
  Time Machine-inspired directory-window stack with persistent paths, a
  sampled in-card timeline and older/newer navigation. Desktop uses additional
  vertical separation to compensate for perspective projection on tall cards;
  the active surface owns the only meaningful overflow region: its file list
  when entries exceed the available viewport height.
- `webui/src/features/plans/PlanView.tsx`: owns the single task title, file and
  operation card faces, 3D flip state, and icon-only two-step version deletion;
  the title and closed-path controls remain inside the card footer.
- `webui/src/components/layout/BottomDock.tsx`: fixed desktop/mobile capsule
  navigation with closed-path Home, calendar-based backup Plans,
  Repositories, and Settings glyphs;
  its evenly inset shared selection pill moves between items, task and
  repository submenus support pointer hover and touch click, and navigation
  dismisses an open editor before changing sections.
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
  shell, full-width page sizing, balanced desktop spacing around the dashboard
  and bottom dock, glass surfaces, and responsive canvas treatment.
- `webui/src/components/common/TwoPaneModal.tsx` and `SectionCard.tsx`: shared
  floating workspace for task, repository, and settings editing; it retains a
  visible application backdrop and interactive bottom dock on desktop and
  mobile, with consistent navigation, cards, footer, borders, and corner
  treatment.
- `webui/src/components/common/FormModal.tsx`: shared compact information and
  restore dialog with the same dark surface, corner scale, footer, and button
  treatment as the editor workspace. It exposes per-dialog outside-click
  behavior and a visible close control; file metadata uses readable rows rather
  than raw protocol JSON.
- `webui/src/components/ui/toaster.tsx`: viewport-bounded global notifications
  with wrapped, scrollable long-error content on phone screens.
- `docs/openlist-115-backup.md`: deployment, plan grouping, excludes,
  consistency, and recovery instructions.
