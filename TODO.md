# Custom Backrest development status

Updated: 2026-08-08

## Completed

- [x] 2026-08-08: Remove the persistent desktop navigation rail in favor of a
  header-triggered neutral glass navigation panel rendered at the page root,
  and clarify the difference between OpenList upload traffic and Restic
  repository additions throughout the dashboard.
- [x] 2026-08-08: Replace the dashboard backup-scope index and decorative hero
  with a responsive contribution-style activity wall showing protected bytes,
  yearly additions, active days, and backup streaks from the local operation
  log; keep source and exclusion controls in plan configuration.
- [x] 2026-08-08: Add a Dockerized Vite development service with HMR, persistent
  dependency caches, and same-origin proxying to the deployed Backrest API.
- [x] 2026-08-06: Add the missing mobile viewport declaration and replace the
  scaled desktop drawer with a full-screen numbered navigation index; rebuild
  dashboard hierarchy around editorial content, large metrics, and divided
  statistic strips derived from the supplied visual references.
- [x] 2026-08-06: Put backup content first on phone dashboards, add direct plan
  editing, reduce decorative card height, and make the plan editor cover the
  complete mobile viewport with localized navigation.
- [x] 2026-08-06: Add a mobile application shell and full-screen single-column
  configuration dialogs for narrow phone viewports.
- [x] 2026-08-06: Replace raw Synology source paths and common Restic glob
  patterns with named backup and exclusion controls, plus a dashboard summary.
- [x] 2026-08-06: Run feature-branch tests only for pull requests, avoiding a
  duplicate full test matrix for every pushed commit.
- [x] 2026-08-06: Add a manual GitHub Actions build that publishes one
  linux/amd64 Backrest image with bundled Restic and immutable commit tags.
- [x] 2026-08-06: Fork Backrest under `ahaduoduoduo` and isolate the work on
  `agent/restic-backup-console`.
- [x] 2026-08-06: Add an authenticated backend proxy for OpenList Restic upload
  usage without exposing OpenList credentials to the browser.
- [x] 2026-08-06: Replace the default light dashboard composition with a fixed
  dark backup console using live Backrest summary and OpenList usage data.
- [x] 2026-08-06: Document Restic REST repository setup, source groups,
  excludes, live-data snapshots, and portable recovery.
- [x] 2026-08-06: Keep upstream release and Pages deployment automation
  disabled in the fork, while granting the snapshot workflow only the
  permissions required to build release artifacts on GitHub Actions.
- [x] 2026-08-06: Remove the post-pairing authorization race and authenticate
  Windows Restic release lookups so shared GitHub Runner API limits do not
  break builds.

## Planned

- [ ] Validate backup, historical browsing, single-file restore, and quota
  rollover against the GitHub-built OpenList and Backrest images.
- [ ] Add a DSM snapshot provider that can create and remove read-only source
  snapshots without a user-maintained hook script.
- [ ] Add a guided portable-Docker recovery export containing Compose files,
  image digests, mount mappings, and a generated recovery manifest.
