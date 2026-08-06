# Backrest with the OpenList 115 gateway

Updated: 2026-08-06

The fork image is published by manually running `.github/workflows/custom-image.yml`.
It builds only `linux/amd64`, bundles Restic inside the container, and publishes
both `restic-backup-console` and an immutable commit SHA tag.
The image also includes SQLite so a plan hook can create consistent logical
copies of live SQLite databases before Restic reads the staging directory.

## Runtime configuration

Backrest runs the official Restic binary. The repository uses Restic's native
REST backend exposed by the customized OpenList branch.

```yaml
services:
  backrest:
    image: ghcr.io/ahaduoduoduo/backrest:restic-backup-console
    environment:
      BACKREST_PORT: 0.0.0.0:9898
      BACKREST_DATA: /data
      BACKREST_CONFIG: /config/config.json
      BACKREST_OPENLIST_URL: https://openlist.example.com
      BACKREST_OPENLIST_USERNAME: backrest
      BACKREST_OPENLIST_PASSWORD: ${OPENLIST_RESTIC_PASSWORD}
      TZ: Asia/Shanghai
    volumes:
      - ./data:/data
      - ./config:/config
      - /volume1/backup-sources:/source:ro
    ports:
      - 9898:9898
    restart: unless-stopped
```

Create a Backrest repository with:

```text
URI: rest:https://openlist.example.com/restic/synology/
Environment:
  RESTIC_REST_USERNAME=backrest
  RESTIC_REST_PASSWORD=<OpenList Restic HTTP password>
```

The repository password configured in Backrest encrypts Restic content. It is
separate from the OpenList HTTP password and belongs in an offline recovery
record.

## Plan groups

Use several plans rather than one root-filesystem plan. Each group can have its
own schedule, snapshot hook, excludes, and restore procedure.

The dashboard shows the effective scope of every plan in two columns:

- **What is backed up** maps the deployed mounts to Docker services, Home
  Assistant, DSM certificates, Synology recovery files, and Time Machine.
- **What is excluded** groups generated files, Git history, old transfer
  caches, Backrest runtime data, and live databases.

The same groups are editable as switches in the plan dialog. Their values are
stored in the normal Backrest plan fields, so the configuration remains usable
by the upstream API and Restic. Custom paths and patterns remain available in
**Advanced paths and rules**.

On phone-sized screens the application uses the menu drawer, one-column cards,
and a full-screen plan dialog. The section rail becomes horizontal tabs so the
form does not require desktop-width scrolling.

### DSM recovery assets

Include a directory populated by the existing DSM configuration export,
package and image inventory, scheduled-task definitions, certificate exports,
and written recovery notes. DSM-specific exports restore DSM. The inventory and
notes also describe how to rebuild another NAS platform.

### Docker services

Include:

- Compose and stack files;
- environment files and secrets required at runtime;
- named-volume or bind-mount persistent data;
- custom service source that is not fully published elsewhere;
- database logical dumps created by a plan hook;
- image names, versions, and digests.

Do not include Docker overlay layers. They are replaceable from images and make
restores host-specific.

Example paths:

```text
/source/docker-snapshot/compose
/source/docker-snapshot/volumes
/source/docker-snapshot/database-dumps
/source/docker-snapshot/recovery-manifest
```

Example excludes:

```text
**/*.log
**/logs/**
**/cache/**
**/.cache/**
**/tmp/**
**/.git/**
**/node_modules/**
**/__pycache__/**
**/home-assistant.db-shm
**/home-assistant.db-wal
```

Home Assistant configuration remains included while its logs, cache, and
temporary database sidecars are excluded. If the main database is required,
back it up using a database-aware export or a stable filesystem snapshot.

### Time Machine off-site copy

Keep the local Time Machine disk as the normal Mac restore source. The Restic
plan reads a stable, read-only snapshot of the Time Machine shared folder and
sends it to 115 only for site-level loss.

## Backing up live data

Backrest does not need to stop Docker or Time Machine. Point each plan at a
read-only Btrfs snapshot prepared at `CONDITION_SNAPSHOT_START`. A command hook
can refresh a fixed snapshot mount before Restic begins. The plan itself reads
only that stable path.

Filesystem snapshots are crash-consistent. Databases that require a clean
transaction boundary should create a logical dump before the filesystem
snapshot. Containers continue running during both operations.

Keep snapshot creation and removal commands in a small version-controlled host
adapter. Synology, fnOS, and another Linux NAS can provide different adapters
while the Backrest plan paths remain the same.

## Initial upload and quota rollover

OpenList counts only bytes actually read by the 115 OSS uploader. A 115
rapid-upload match consumes zero WAN quota; retries consume their retransmitted
bytes. At the calendar limit, the current Restic command exits and the next
scheduled run continues from the repository state already written.

Completed packs do not expire when source files change. Restic creates new
encrypted objects for changed content and reuses indexed objects that already
exist. An interrupted run can leave unreferenced packs; scheduled maintenance
removes them later.

Use a normal recurring plan during the first upload instead of a one-time job.
The same plan naturally becomes incremental after the initial set has reached
115.

## Restore

The snapshot browser can open a snapshot, navigate directories, select one file
or folder, and start a restore to a chosen local target. Older snapshots expose
historical versions of the same path.

For full recovery:

1. Install Backrest and an official Restic binary on the replacement NAS.
2. Add the same REST repository URI, HTTP credentials, and repository password.
3. Restore portable Docker data, Compose files, secrets, database dumps, and
   the recovery manifest to a staging directory.
4. Recreate host-specific users, permissions, mount points, certificates,
   reverse proxy rules, and scheduled tasks.
5. Start databases first, then dependent services, then media applications.
6. Restore the Time Machine repository only when the local Mac backup disk is
   unavailable.

Run structure checks regularly. Full data checks and prune operations read many
repository objects and belong in low-traffic maintenance windows.
