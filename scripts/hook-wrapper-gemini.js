#!/usr/bin/env node
// Shared across coree-ai plugin repos via repo-file-sync (see .github/sync.yml).
// Synced to coree-ai/gemini as scripts/hook-wrapper.js. Edit here.
//
// Gemini SessionStart / BeforeAgent hook. Inject arguments arrive on argv
// (e.g. `--type session`); this forwards them to `coree inject` via the shared
// spawn + arg-array primitive (previously this used execSync with the args
// interpolated into a shell string) and emits Gemini's `hookSpecificOutput` /
// `additionalContext` output schema.
const { runInject } = require("./coree-hook-inject.js");

/**
 * Build Gemini's hook output. Empty inject output yields `{}` (no context).
 * Pure: no I/O. Exported for unit testing.
 * @param {string} hookEvent value for hookEventName (e.g. "SessionStart")
 * @param {string} stdout trimmed `coree inject` output
 * @returns {object}
 */
function buildOutput(hookEvent, stdout) {
  if (!stdout) return {};
  return {
    hookSpecificOutput: {
      hookEventName: hookEvent,
      additionalContext: stdout,
    },
  };
}

async function main() {
  const hookEvent = process.env.GEMINI_HOOK_EVENT || "SessionStart";
  try {
    const args = process.argv.slice(2);
    const stdout = await runInject(args, { timeoutMs: 110000 });
    console.log(JSON.stringify(buildOutput(hookEvent, stdout)));
  } catch (_e) {
    console.log(JSON.stringify({}));
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildOutput };
