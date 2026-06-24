#!/usr/bin/env node
// Thin entry point: all logic lives in @backblaze-labs/agent-backup-core.
// Usage:
//   hermes-b2-backup            run as a daemon (auto-restore + back up now + scheduled)
//   hermes-b2-backup --once     run a single backup and exit (for cron/CI)
//   hermes-b2-backup --install  install an OS service that runs the daemon at login
//   hermes-b2-backup --help     show usage
// Config (B2 credentials) comes from env vars or ~/.config/hermes-b2-backup/config.json.
import { runCli } from "@backblaze-labs/agent-backup-core";
import { hermesAdapter } from "../dist/index.mjs";

runCli(hermesAdapter).catch((err) => {
  console.error(`hermes-b2-backup: ${err?.message ?? err}`);
  process.exit(1);
});
