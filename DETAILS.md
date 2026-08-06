# Custom Backrest module map

Updated: 2026-08-06

The fork retains upstream Backrest's Go orchestrator, Restic process runner,
configuration model, operation log, snapshot browser, and restore operations.

- `internal/api/openlistusagehandler.go`: authenticated server-side proxy for
  the OpenList `/restic/_usage` response. It uses a bounded response body and a
  ten-second client timeout.
- `internal/env/environment.go`: OpenList base URL and Restic HTTP credential
  environment variables.
- `cmd/backrest/backrest.go`: registers the proxy inside Backrest's existing
  authenticated route set.
- `webui/src/api/openlist.ts`: typed client for the compact usage response.
- `webui/src/features/dashboard/BackupHero.tsx`: live protected-size hero with
  the purple/blue activity surface used by the custom dark design.
- `webui/src/features/dashboard/GatewayUsageCard.tsx`: current 115 day, month,
  and rate values from OpenList.
- `webui/src/features/dashboard/BackupScopeOverview.tsx`: readable per-plan
  summary of included sources and active exclusion groups.
- `webui/src/features/dashboard/SummaryDashboard.tsx`: composes live Backrest
  summary data and the optional OpenList panel.
- `webui/src/features/plans/backupScopeCatalog.ts`: reusable mapping from the
  deployed Synology mount paths and Restic patterns to concise labels.
- `webui/src/features/plans/BackupScopeEditor.tsx`: guided source and exclusion
  controls backed by the unchanged `Plan.paths`, `Plan.excludes`, and
  `Plan.iexcludes` fields.
- `webui/src/index.sass`, `webui/src/app/App.tsx`, and
  `webui/src/components/layout/MainContentArea.tsx`: fixed dark application
  shell, responsive navigation, spacing, border, and canvas treatment.
- `webui/src/components/common/TwoPaneModal.tsx`: desktop two-pane editor and
  phone full-screen editor with horizontally scrollable section tabs.
- `docs/openlist-115-backup.md`: deployment, plan grouping, excludes,
  consistency, and recovery instructions.
