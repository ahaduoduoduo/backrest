# Historical file browser

Updated: 2026-08-09

The plan page separates recovery from diagnostics. **Browse Files** opens the
newest usable Restic snapshot directly, while **Operation History** keeps the
complete execution record for backup, indexing, hooks, restore, forget, check,
prune, and command operations.

## Snapshot timeline

`PlanSnapshotExplorer` builds its version list from successful
`operationIndexSnapshot` records in Backrest's local operation database.
Pending schedules, failed backups, forgotten snapshots, and maintenance
operations are not shown as file versions.

The selected folder path is independent from the selected snapshot. Moving to
an older or newer version therefore requests the same folder in that version.
When a folder did not exist yet, the browser preserves the path and offers a
return to that version's root instead of silently navigating somewhere else.

Desktop layouts use a vertical version rail. Narrow layouts use a horizontally
scrollable version selector and the same older/newer controls. Folder rows are
keyboard accessible; every file and folder retains the existing information,
restore, and download actions.

## Repository reads

Opening the page reads the version list from Backrest's local operation log.
It does not enumerate every snapshot tree. The browser requests one directory
from one snapshot when the user opens that version or folder. Visited
`snapshot + path` results are cached in browser memory for the current page
session, and adjacent versions are not prefetched.

This keeps historical browsing compatible with the OpenList REST endpoint's
single-download concurrency policy while avoiding repeated directory reads
during back-and-forth comparison.

## Motion

Version changes use a 240 ms transform-and-opacity transition with the shared
`--ease-in-out` curve. Static layers behind the current file window establish
depth without moving file rows. Reduced-motion clients keep a short opacity
transition and omit positional movement.

## Dashboard task cards

Task cards use the same blue activity scale as the yearly backup calendar for
successful backups. Active backups use green. The card shows the last result
time, compact result label, next scheduled time, last repository addition, and
the 30-day status strip. Repository name, protected-byte duplication, and
retention policy are omitted; retention remains in the task editor.

The top-right control starts an idle task or cancels its active Backrest
operation. Backrest and Restic do not expose a resumable pause operation, so
the active control is intentionally a stop icon. Clicking the remaining card
area opens the plan's historical file browser.
