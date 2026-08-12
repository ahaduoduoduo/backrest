# Custom Backrest development status

Updated: 2026-08-13

## Completed

- [x] 2026-08-13: Retry one Safari/fetch transport failure for dashboard
  start and stop actions so returning to a suspended tab does not require a
  page reload; application errors still fail immediately.
- [x] 2026-08-13: Remove unconditional auto-unlock from the backup path,
  recover stale Restic locks only after exit code 11, make repository-lock
  waits cancellation-aware, and discard duplicate triggers for a plan that is
  already running while preserving cross-plan concurrency.
- [x] 2026-08-12: Check OpenList's local global, repository, and task upload
  counters before backup hooks or Restic repository access; exhausted plans
  enter the normal waiting-to-resume state without generating 115 reads.
- [x] 2026-08-12: Bind command hooks to task cancellation and terminate their
  Unix process group so a stopped backup does not wait for a snapshot helper's
  full timeout.
- [x] 2026-08-11: Allow backup plans to run concurrently, configure a daily
  upload allocation and positive upload weight per plan, and release unused
  allocation to waiting plans after a successful run.
- [x] 2026-08-11: Prefer an in-progress backup in dashboard task cards when a
  cancelled future schedule marker sorts ahead of it, keeping the main status,
  progress, and stop control attached to the live Restic operation.
- [x] 2026-08-10: Present explicit user cancellation as a neutral stopped
  backup in task cards, 30-day history, and yearly activity instead of an
  abnormal or recovered failure; the running control remains a stop action.
- [x] 2026-08-10: Define “remote backup” as current Restic object occupancy on
  115, consume OpenList's persistent inventory, and count a repository shared
  by multiple backup plans only once.
- [x] 2026-08-10: Sum protected and newly added data across backup plans,
  simplify yearly-calendar details to “added today”, and resolve each day's
  fill or outline from every plan's final status while retaining an orange
  recovery marker after a successful retry.
- [x] 2026-08-10: Treat OpenList daily upload exhaustion as a blue
  waiting-to-resume result while preserving uploaded Restic packs for reuse.
- [x] 2026-08-10: Replace the backup-task archive glyph with a calendar,
  convert file information from raw JSON to readable metadata, and allow its
  dialog to close from either the close icon or backdrop.
- [x] 2026-08-10: Replace the repository's blue split action with compact
  refresh and overflow icons, then restyle its maintenance menu with the shared
  historical-file action surface and labeled glyphs.
- [x] 2026-08-10: Restore visible desktop depth in the historical file stack,
  balance the dashboard's top and bottom-dock spacing, remove the redundant
  calendar heading, and distinguish queued backups with a blue outline.
- [x] 2026-08-10: Give the bottom-dock selection pill one geometric reference
  so its top, bottom, and outer horizontal margins are all six pixels.
- [x] 2026-08-10: Increase bottom-dock transparency and restore the historical
  version stack's original 18-pixel depth separation without expanding the
  compact mobile card reserve.
- [x] 2026-08-10: Reduce unused space above the historical card, increase its
  dock clearance, use one continuous card surface, expose the page beneath a
  translucent dock, equalize the dock selection inset, and let dock navigation
  dismiss open editors before changing sections.
- [x] 2026-08-10: Convert the historical browser to a viewport-filling single
  surface, move its title and closed-path controls into the card footer, unify
  path, entry, menu, and modal radii, keep the dock above editors, and replace
  purple exclusion states with the console blue-gray palette.
- [x] 2026-08-09: Compress the persistent bottom dock, replace open-stroke
  navigation glyphs, add an interruptible sliding pill, reserve plan-action
  clearance, and restyle plan, repository, and settings editors as floating
  workspaces that leave the dock visible.
- [x] 2026-08-09: Remove the Playwright end-to-end suite, browser binaries,
  harness, package scripts, and GitHub Actions job; retain WebUI unit tests,
  TypeScript checks, and Linux Go validation.
- [x] 2026-08-09: Remove the global header, breadcrumb duplication, and drawer
  navigation; add a persistent bottom dock, URI-based remote storage labels,
  a full-size glass historical card with in-card time controls, reversible
  operation-history flip, and icon-only two-step version deletion.
- [x] 2026-08-09: Replace the flat historical-version selector with a
  Time Machine-inspired directory-window stack and right-side timeline,
  simplify task-card decoration, and replace the numbered mobile contents
  index with compact grouped navigation.
- [x] 2026-08-09: Replace the plan operation tree with a direct historical
  file browser that keeps the current folder while moving between Restic
  versions, isolate detailed diagnostics in operation history, and redesign
  dashboard task cards around calendar colors, next run, repository addition,
  card navigation, and start/stop controls.
- [x] 2026-08-09: Extend the generic generated-files exclusion switch to
  recursively omit Node dependency trees, npm/pnpm/yarn/Bun caches, and
  dependency-cache Docker named volumes without project-specific mappings.
- [x] 2026-08-09: Replace compiled per-service backup source switches with a
  generic root-directory list so new Docker and Web projects are included
  without frontend changes.
- [x] 2026-08-09: Back up Home Assistant Recorder history and Backrest operation
  databases through consistent staging copies, preserve historical Jellyfin
  database files, and omit common macOS, DSM, and Windows filesystem metadata.
- [x] 2026-08-09: Exclude the legacy Live Proxy data copy after moving active
  channel data to `/volume1/docker/live-proxy`.
- [x] 2026-08-09: Describe flat Synology persistence roots for Backrest and
  AutoFilm; Home Assistant and Telegram now enter through the shared Docker
  root without duplicate source mounts.
- [x] 2026-08-09: Exclude Finder-generated `.DS_Store` files by default in new
  backup plans and expose the rule as a named plan setting.
- [x] 2026-08-09: Keep long error notifications inside the mobile viewport and
  treat a successful retry as the day's final yearly-calendar state, mark the
  task strip as recovered, and retain every failed operation in detailed
  history.
- [x] 2026-08-09: Scope the default CI matrix to the deployed Linux amd64
  Docker path; retain Go, WebUI, backup, restore, history, authentication, and
  mobile checks while excluding Windows, rclone, and SFTP jobs, and make the
  multi-platform release preview manual-only.
- [x] 2026-08-09: Migrate browser journeys from the removed persistent
  sidebar to the current header navigation drawer, replace hidden-navigation
  absence checks with persisted-config assertions, and cover the dashboard
  manual backup action on an iPhone viewport.
- [x] 2026-08-09: Add a mobile-sized manual backup action to every dashboard
  task card, keep it disabled while the task is active, and allow a failed
  task to be started again after the underlying issue is resolved.
- [x] 2026-08-09: Build and publish the custom linux/amd64 Backrest image
  automatically after non-documentation changes reach `main`, while retaining
  manual rebuild support and immutable commit tags.
- [x] 2026-08-09: Present Docker named-volume data, Web-hosted container data,
  AI-readable DSM recovery facts, full Docker inventories, and consistent
  application database copies as named backup content and exclusions.
- [x] 2026-08-09: Correct every 30-day backup strip to chronological order,
  with the oldest date on the left and today on the right, and add a regression
  test for the date mapping.
- [x] 2026-08-09: Limit the dashboard to backup activity and task status; move
  repository capacity and 30-day health to repository pages, and move runtime
  paths plus configuration JSON to Settings.
- [x] 2026-08-09: Remove the backup-calendar intensity legend and add a
  desktop-hover and mobile-tap detail panel for each day's processed backup
  size and repository upload amount.
- [x] 2026-08-08: Replace scheduler, repository, snapshot, retention, and
  maintenance terminology across the Chinese interface with direct backup
  task language; distinguish deleting old version records from reclaiming
  unreferenced storage space.
- [x] 2026-08-08: Consolidate backup size and 115 upload usage into the activity
  wall, move effective upload rate to repository settings, use compact storage
  unit labels, and stabilize the Vite dashboard by removing React development
  StrictMode around protobuf `bigint` state.
- [x] 2026-08-08: Remove the persistent desktop navigation rail in favor of a
  header-triggered neutral glass navigation panel rendered at the page root,
  and clarify the difference between OpenList upload traffic and Restic
  repository additions throughout the dashboard.
- [x] 2026-08-08: Replace the dashboard backup-scope index and decorative hero
  with a responsive contribution-style activity wall showing backed-up bytes,
  yearly backup size, upload traffic, and active days from the local operation
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
- [x] 2026-08-06: Add a GitHub Actions build that publishes one linux/amd64
  Backrest image with bundled Restic and immutable commit tags.
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
- [x] 2026-08-09: Add a guided portable-Docker recovery export containing
  rendered and generated Compose files, image digests, mount mappings, and a
  generated recovery manifest.
