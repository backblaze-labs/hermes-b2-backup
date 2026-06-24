import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { BackupAdapter, BackupRoot } from "@backblaze-labs/agent-backup-core";

/**
 * Hermes Agent (NousResearch/hermes-agent) keeps everything under a single home
 * dir, `~/.hermes` on Unix/macOS/WSL (or `%LOCALAPPDATA%\hermes` on Windows),
 * overridable via `HERMES_HOME`. Named profiles live in `~/.hermes/profiles/<name>`,
 * so mirroring the whole home captures them.
 *
 * Note: Hermes ships its own `hermes backup`/`import` (a local, full zip). This
 * tool is complementary, not a replacement — it adds *incremental, offsite,
 * encrypted* mirroring, which the built-in archive does not do. We deliberately
 * mirror the live home dir (with WAL-safe SQLite snapshots) rather than wrapping
 * `hermes backup`, to keep uploads incremental and avoid a hard dependency on the
 * Hermes CLI.
 *
 * Pluggable memory providers (Honcho, Hindsight, …) store data OUTSIDE the home
 * dir; we add those as extra roots when present.
 *
 * Verified against github.com/NousResearch/hermes-agent (hermes_constants.py,
 * hermes_state.py, hermes_cli/backup.py, AGENTS.md).
 */
export function hermesCandidateRoots(env: NodeJS.ProcessEnv): BackupRoot[] {
  const home = os.homedir();
  let hermesHome: string;
  if (env.HERMES_HOME) {
    hermesHome = env.HERMES_HOME;
  } else if (process.platform === "win32") {
    const localAppData = env.LOCALAPPDATA ?? path.join(home, "AppData", "Local");
    hermesHome = path.join(localAppData, "hermes");
  } else {
    hermesHome = path.join(home, ".hermes");
  }

  return [
    { label: "home", dir: hermesHome },
    // External memory-provider stores Hermes' own backup also captures.
    { label: "honcho", dir: path.join(home, ".honcho") },
    { label: "hindsight", dir: path.join(home, ".hindsight") },
  ];
}

export const hermesAdapter: BackupAdapter = {
  id: "hermes",

  resolveRoots(env) {
    return hermesCandidateRoots(env).filter((r) => {
      try {
        return fs.statSync(r.dir).isDirectory();
      } catch {
        return false;
      }
    });
  },

  // Mirror the whole home (and provider stores), then subtract regeneratable and
  // machine-local files — the same philosophy as Hermes' own `hermes backup`.
  // This is robust to Hermes adding new state files over time.
  include: [/^home\//, /^honcho\//, /^hindsight\//],

  exclude: [
    // Regeneratable Hermes-owned dirs. Anchored to the home root AND to each
    // profile (`profiles/<name>/…`), so per-profile copies are excluded too —
    // a top-level-only anchor would leak per-profile logs/node/checkpoints.
    /^home\/(?:profiles\/[^/]+\/)?(?:hermes-agent|node|cache|image_cache|logs|backups|state-snapshots|checkpoints)\//,
    // Caches/deps that can appear at any depth.
    /(^|\/)node_modules\//,
    /(^|\/)\.venv\//,
    /(^|\/)venv\//,
    /(^|\/)site-packages\//,
    /(^|\/)\.cache\//,
    /(^|\/)__pycache__\//,
    /(^|\/)\.pytest_cache\//,
    /(^|\/)\.mypy_cache\//,
    /(^|\/)\.ruff_cache\//,
    // SQLite sidecars — including them yields a torn restore (the .db is snapshotted).
    /-wal$/,
    /-shm$/,
    /-journal$/,
    // Machine-local runtime state — harmful on restore to another machine.
    /\.pid$/,
    /(^|\/)gateway\.lock$/,
    /(^|\/)processes\.json$/,
    /(^|\/)gateway_state\.json$/,
    /(^|\/)\.DS_Store$/,
  ],

  // state.db (and any per-profile state.db) is WAL+FTS5 — must be snapshotted.
  sqlite: [/(^|\/)state\.db$/],

  // Policy: encrypted full mirror that INCLUDES secrets (.env, auth.json), since
  // they're required for a working restore. They are encrypted at rest by the
  // engine; nothing is excluded here.
  secretExclude: [],
};
