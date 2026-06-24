# hermes-b2-backup

**Encrypted, incremental, off-site backups for your AI coding agent — powered by [Backblaze B2 cloud storage](https://blze.ai/storage).**

Incremental, **encrypted, offsite** backup of your [Hermes Agent](https://github.com/NousResearch/hermes-agent) state — sessions, memory, skills, config, and secrets — to [Backblaze B2](https://www.backblaze.com/cloud-storage).

Built on [`@backblaze-labs/agent-backup-core`](https://github.com/backblaze-labs/agent-backup-core).

## How this differs from `hermes backup`

Hermes ships a built-in `hermes backup` / `hermes import` that writes a **local** full zip. This tool is complementary: it adds what the built-in doesn't —

- **Incremental** — only changed files upload (SHA-256 diffing), not a fresh full zip every run.
- **Offsite** — your backups land in B2, not next to the data they protect.
- **Encrypted at rest** — AES-256-GCM. Hermes' `.env`, `auth.json`, and `state.db` are plaintext on disk; this keeps them encrypted in the cloud.

It mirrors the live `~/.hermes` directly (WAL-safe SQLite snapshots) — it does not wrap `hermes backup`, so there's no dependency on the Hermes CLI and no full-zip overhead.

## Install & configure

```bash
npm install -g @backblaze-labs/hermes-b2-backup
export B2_KEY_ID=004... B2_APPLICATION_KEY=K004... B2_BUCKET=my-hermes-backups
export B2_ENCRYPTION_KEY="a long random passphrase"   # see Security
```

Or put these in `~/.config/hermes-b2-backup/config.json`. Optional: `B2_REGION`, `B2_PREFIX`, `B2_SCHEDULE`, `B2_KEEP_SNAPSHOTS`, `B2_ENCRYPT=false`, `HERMES_HOME`.

## Run

```bash
hermes-b2-backup            # daemon: auto-restore on first run, then scheduled backups
hermes-b2-backup --once     # single backup then exit
hermes-b2-backup --install  # install an OS service (launchd / systemd / Task Scheduler)
```

## What gets backed up

Mirrors `~/.hermes` (or `HERMES_HOME`; `%LOCALAPPDATA%\hermes` on Windows), plus external memory-provider stores (`~/.honcho`, `~/.hindsight`) when present:

- **Included:** `state.db` (WAL-safe snapshot — sessions + message history), `config.yaml`, `.env`, `auth.json`, `SOUL.md`, `memories/`, `skills/` (incl. `.archive/`), `plugins/`, `skins/`, `cron/jobs.json`, profiles, pairing data.
- **Excluded:** the cloned `hermes-agent/` repo, `node/`/`node_modules`, virtualenvs, all caches, `logs/`, `backups/`/`state-snapshots/`/`checkpoints/`, SQLite `-wal`/`-shm` sidecars, and machine-local runtime files (`*.pid`, `gateway.lock`, `processes.json`, `gateway_state.json`) that would be harmful to restore onto another machine.

## Security

- **Set `B2_ENCRYPTION_KEY`** — separate from your B2 credentials. Hermes stores secrets (`.env`, `auth.json`) and full conversation history (`state.db`) in plaintext on disk; this tool **includes** them (you need them for a working restore) but encrypts the whole mirror at rest. Without `B2_ENCRYPTION_KEY` it falls back to the B2 key and warns.

## Learn more

- [Backblaze B2 Cloud Storage](https://blze.ai/storage) — affordable, S3-compatible object storage
- [agent-backup-core](https://github.com/backblaze-labs/agent-backup-core) — the shared backup engine powering this tool

## License

MIT
