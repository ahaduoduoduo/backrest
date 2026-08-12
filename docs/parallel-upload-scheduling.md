# Parallel backup upload scheduling

Each backup plan stores two transport settings:

- `daily_upload_gib`: the plan's daily provider-upload allocation;
- `upload_weight`: a positive relative share while several plans are uploading.

Backrest can run multiple backup plans against one Restic repository at the
same time. Backup operations use a shared repository read lock. Restore,
forget, check, prune, and other repository maintenance retain the exclusive
lock and therefore do not overlap repository mutations with backups.

The repository coordinator accepts an operation context, so stopping a task
also stops a shared or exclusive lock wait. A normal backup does not run
`restic unlock`: it attempts auto-unlock only when Restic exits with code 11,
which denotes a repository lock failure, and retries the backup once. This
keeps an active Time Machine backup from blocking an unrelated NAS backup at
startup merely because auto-unlock is enabled.

Only one execution of a given repository-and-plan pair may run at once. A
duplicate manual or scheduled trigger is removed without starting its hooks or
Restic process, then the regular schedule advances. Different plans continue
to run concurrently and compete for provider upload slots according to their
weights.

## Provider concurrency

Backrest passes the plan ID, daily byte allocation, and weight to OpenList in a
derived REST username. The Restic binary and repository format are unchanged.
OpenList authenticates the derived identity with the original REST password.

The 115 account keeps one configured upload-concurrency ceiling. When several
plans have pending pack uploads, newly available provider slots are assigned by
smooth weighted round-robin. Existing uploads are not interrupted. A single
active plan can use every free slot, so weights do not reduce throughput when
there is no contention.

For example, weight 2 and weight 1 produce an approximate 2:1 share over a
sequence of provider uploads. They do not create two separate concurrency
pools.

## Daily allocations

OpenList records actual bytes read by the 115 OSS uploader for each plan. A
plan stops with a normal “waiting to resume” result when its allocation is
exhausted. Completed Restic packs remain reusable.

After a plan completes, Backrest calls the authenticated release endpoint.
OpenList exposes the unused remainder of that plan's allocation to other
waiting plans in the same repository. Backrest schedules those waiting plans
immediately. The shared global and repository day/month limits remain final
bounds, so releasing allocation never increases the total calendar quota.

Manual “backup now” and scheduled backups use the same allocation and weight.
An explicit user stop remains a stopped operation and does not release the
plan's allocation as though the backup had completed.
