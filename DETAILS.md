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
- `webui/src/features/dashboard/SummaryDashboard.tsx`: composes live Backrest
  summary data and the optional OpenList panel.
- `webui/src/index.sass`, `webui/src/app/App.tsx`, and
  `webui/src/components/layout/MainContentArea.tsx`: fixed dark application
  shell, navigation, spacing, border, and canvas treatment.
- `docs/openlist-115-backup.md`: deployment, plan grouping, excludes,
  consistency, and recovery instructions.
