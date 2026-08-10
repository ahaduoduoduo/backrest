# Backup plan priority

Each backup plan stores a signed 32-bit `priority` weight. Larger numbers run
first when multiple scheduled backups are ready. New and existing plans default
to `0`; negative values are valid.

Examples:

- `nas-config`: `2`
- `time-machine`: `1`
- a later low-priority archive plan: `0` or `-1`

## Ordering

Plan weights only order scheduled backup plans. Backrest keeps repository
maintenance, restores, and interactive operations in separate task classes, so
even the largest plan weight cannot overtake those internal classes.

When two plans have the same weight, their due time determines the order. An
exact weight-and-time tie remains serial but has no additional precedence.

## Yield and resume

While a scheduled backup is running, Backrest checks for due backup plans with
a higher weight. The lower-priority process is cancelled with an internal
priority-yield reason, its snapshot-end hook runs, and the operation is shown
as waiting for resume rather than failed. Already uploaded Restic packs remain
in the repository and are reused by the next run.

“Backup now” makes the selected plan due immediately, but keeps the plan's
configured weight. It does not overtake a running or due backup with a higher
weight.
