// Shared across coree-ai plugin repos via repo-file-sync (see .github/sync.yml).
// Edit here, not in the individual repos.
//
// Single safe implementation of "run `coree inject` and capture its stdout",
// used by every host hook wrapper. Uses `spawn` with an argument ARRAY (no
// shell), so arguments are never concatenated into a shell string and cannot be
// word-split or interpreted. A timeout lets a slow first-run npx download finish
// in the background without blocking the hook.
const { spawn } = require("node:child_process");

// Pinned coree version. Bump here once; repo-file-sync propagates it everywhere.
const COREE_VERSION = "0.14.1";
const DEFAULT_TIMEOUT_MS = 115000;

function logDebug(msg) {
  console.error(`[coree-hook] ${msg}`);
}

/**
 * Spawn `npx @coree-ai/coree@<ver> inject <...args>` and resolve with its trimmed
 * stdout. Never rejects: on non-zero exit, spawn error, or timeout it resolves to
 * an empty string so a memory hiccup never breaks the host turn.
 *
 * @param {string[]} args argument array passed verbatim to `coree inject`
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<string>}
 */
function runInject(args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    logDebug(`spawn npx @coree-ai/coree@${COREE_VERSION} inject ${args.join(" ")}`);
    const child = spawn("npx", ["--yes", `@coree-ai/coree@${COREE_VERSION}`, "inject", ...args], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });

    const timer = setTimeout(() => {
      child.unref();
      child.stdout.removeAllListeners();
      child.stderr.removeAllListeners();
      logDebug(
        `inject ${args[0]} timed out after ${timeoutMs}ms; letting npx finish in background`,
      );
      resolve("");
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (stderr) logDebug(stderr.trim());
      if (code !== 0) {
        logDebug(`inject ${args[0]} exited with code ${code}`);
        resolve("");
      } else {
        resolve(stdout.trim());
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      logDebug(`spawn error for inject ${args[0]}: ${err.message}`);
      resolve("");
    });
  });
}

module.exports = { runInject, logDebug, COREE_VERSION, DEFAULT_TIMEOUT_MS };
