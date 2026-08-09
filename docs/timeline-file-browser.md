# Historical file browser

Updated: 2026-08-09

The plan page opens directly into historical files. A single icon below the
version card flips the same surface to the complete operation record for
backup, indexing, hooks, restore, forget, check, prune, and command operations.

## Snapshot timeline

`PlanSnapshotExplorer` builds its version list from successful
`operationIndexSnapshot` records in Backrest's local operation database.
Pending schedules, failed backups, forgotten snapshots, and maintenance
operations are not shown as file versions.

The selected folder path is independent from the selected snapshot. Moving to
an older or newer version therefore requests the same folder in that version.
When a folder did not exist yet, the browser preserves the path and offers a
return to that version's root instead of silently navigating somewhere else.

All layouts use a Time Machine-inspired stack of up to five same-size directory
windows. Older versions recede behind the active window, while a compact rail
inside its right edge provides older/newer arrows and sampled timeline ticks.
The active version uses one continuous surface rather than nested panel colors.
The task title stays in its lower-left corner and the history/delete controls
stay in the lower center. Folder rows are keyboard accessible; every file and
folder retains the existing information, restore, and download actions.

The plan route fills the available viewport above the persistent bottom dock.
It does not create a page-level scroll area. Only the file list scrolls, and
only when its entries exceed the active card height. Path controls, file rows,
entry icons, action menus, and compact restore/information dialogs use one
rounded-rectangle scale and the same blue-gray surface palette.

A neutral delete icon below the card arms on its first click and becomes red.
The second click schedules the selected version through the existing Forget
API; the live version list removes it once the snapshot index is marked as
forgotten. Operation history remains available from the adjacent flip button.

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
`--ease-in-out` curve. Moving into the past sends the active window toward the
viewer while the next window advances from the stack; moving to a newer version
reverses the movement. Reduced-motion clients keep a short opacity transition
and apply positional changes immediately.

The operation face uses a 240 ms Y-axis flip for spatial consistency. Reduced
motion replaces the rotation with a 160 ms cross-fade. Bottom-dock submenus use
a 180 ms transform-and-opacity transition. The selected navigation pill uses
an interruptible `0.5 s`, `0.2`-bounce spring so rapid changes continue from
their current position; reduced-motion clients receive a 160 ms opacity change
without positional movement.

## Application navigation

The application has no persistent header, breadcrumb row, or navigation
drawer. A compact, lightly blurred capsule stays at the bottom on desktop and
mobile with closed-path Home, Plans, Repositories, and Settings icons. Plans
and Repositories expose their items above the capsule on hover or click. The
plan file browser reserves a bottom safe area so its operation and delete
buttons never compete with the navigation capsule. Task, repository, and
settings editors appear as rounded floating workspaces above the current page;
their backdrop and bottom navigation remain visible. Repository location
labels come from the Restic backend URI, so network backends are shown as
remote storage even when the current Backrest instance manages them.

## Dashboard task cards

Task cards use the same blue activity scale as the yearly backup calendar for
successful backups. Active backups use green. The card shows the last result
time, compact result label, next scheduled time, last repository addition, and
the 30-day status strip. Repository name, protected-byte duplication, and
retention policy are omitted; retention remains in the task editor.

The top-right control starts an idle task or cancels its active Backrest
operation. Backrest and Restic do not expose a resumable pause operation, so
the active control is intentionally a stop icon. Clicking the remaining card
area opens the plan's historical file browser. The summary area uses spacing
instead of horizontal separators, and task cards do not render a status glow.
