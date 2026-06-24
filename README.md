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

## FAQ

**How do I get Backblaze B2 credentials?**

Create a free [Backblaze B2](https://blze.ai/storage) account, make a bucket, then create an Application Key. Use the keyID and applicationKey as `B2_KEY_ID` and `B2_APPLICATION_KEY`, and the bucket name as `B2_BUCKET`.

**Is my data encrypted?**

Yes — AES-256-GCM at rest. Set `B2_ENCRYPTION_KEY` to a long random passphrase. If you don't, it falls back to deriving a key from your B2 application key and prints a warning; setting a dedicated key means a leaked bucket credential can't decrypt your backups.

**How often does it back up, and can I change the schedule?**

By default it backs up immediately on start and then daily. Set `B2_SCHEDULE` to `daily`, `weekly`, or any cron expression.

**Does it re-upload everything each time?**

No. Backups are incremental — only files that changed since the last run are uploaded (SHA-256 diffing); unchanged files are carried forward server-side, so each snapshot still restores on its own.

**How do I restore Hermes on a new machine?**

Install and run `hermes-b2-backup` on the new machine. If local state is empty and snapshots exist in your bucket, it auto-restores the latest snapshot on first run. (You can also point it at a fresh bucket prefix to keep machines separate.)

**How many snapshots are kept?**

The 10 most recent by default; older ones are pruned. Change with `B2_KEEP_SNAPSHOTS`.

**How do I run it automatically in the background?**

`hermes-b2-backup --install` writes an OS service (launchd on macOS, systemd user unit on Linux, Task Scheduler on Windows). Because a background service can't see your shell's exported variables, put your credentials in `~/.config/hermes-b2-backup/config.json` (chmod 600) before activating it.

**Can I back up several machines to one bucket?**

Yes — give each machine a distinct `B2_PREFIX` so their snapshots don't mix.

**How do I check it's actually working?**

Run `hermes-b2-backup --once` and watch the output; it logs what it uploaded and the snapshot id. You can also browse the bucket in the B2 web UI.

**How much does this cost?**

Only your Backblaze B2 storage, which is priced per GB-month — see [blze.ai/storage](https://blze.ai/storage). The tool itself is free and open source (MIT).

**Hermes already has `hermes backup` — why use this?**

`hermes backup` writes a local zip. This tool is complementary: it adds incremental, **off-site**, **encrypted** backups to B2 — so a lost or compromised machine doesn't take your backups with it.

**Are my profiles and memory providers included?**

Yes — everything under `~/.hermes` (including `profiles/`) is mirrored, plus external memory-provider stores like `~/.honcho` when present.

**Are my secrets backed up?**

Yes — `.env` and `auth.json` are included because they're needed for a working restore, and the whole mirror is encrypted at rest. Set `B2_ENCRYPTION_KEY`.

## Learn more

- [Backblaze B2 Cloud Storage](https://blze.ai/storage) — affordable, S3-compatible object storage
- [agent-backup-core](https://github.com/backblaze-labs/agent-backup-core) — the shared backup engine powering this tool

## License

MIT
