# Custom Backrest development status

Updated: 2026-08-06

## Completed

- [x] 2026-08-06: Fork Backrest under `ahaduoduoduo` and isolate the work on
  `agent/restic-backup-console`.
- [x] 2026-08-06: Add an authenticated backend proxy for OpenList Restic upload
  usage without exposing OpenList credentials to the browser.
- [x] 2026-08-06: Replace the default light dashboard composition with a fixed
  dark backup console using live Backrest summary and OpenList usage data.
- [x] 2026-08-06: Document Restic REST repository setup, source groups,
  excludes, live-data snapshots, and portable recovery.
- [x] 2026-08-06: Keep upstream release automation disabled in the fork and
  grant the snapshot workflow only the permissions required to build release
  artifacts on GitHub Actions.

## Planned

- [ ] Validate backup, historical browsing, single-file restore, and quota
  rollover against the GitHub-built OpenList and Backrest images.
- [ ] Add a DSM snapshot provider that can create and remove read-only source
  snapshots without a user-maintained hook script.
- [ ] Add a guided portable-Docker recovery export containing Compose files,
  image digests, mount mappings, and a generated recovery manifest.
