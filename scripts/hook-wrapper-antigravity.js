#!/usr/bin/env node
// Shared across coree-ai plugin repos via repo-file-sync (see .github/sync.yml).
// Synced to coree-ai/antigravity as scripts/hook-wrapper.js. Edit here.
//
// Antigravity PreInvocation hook. Reads the hook payload from stdin (transcript
// path + sequence number), injects coree session context on the first invocation
// and per-prompt context when a user prompt is present, and emits Antigravity's
// `injectSteps` / `ephemeralMessage` output schema.
const fs = require("node:fs");
const { runInject, logDebug } = require("./coree-hook-inject.js");

/**
 * Parse the JSON hook payload Antigravity writes to stdin.
 * @param {string} inputStr
 * @returns {{ transcriptPath: string | undefined, seqNumber: number | null | undefined }}
 */
function parseHookInput(inputStr) {
  let inputJson = {};
  if (inputStr.trim()) {
    try {
      inputJson = JSON.parse(inputStr);
    } catch (e) {
      logDebug(`Failed to parse stdin as JSON: ${e.message}`);
    }
  }
  return {
    transcriptPath: inputJson.transcriptPath,
    seqNumber: inputJson.sequenceNumber ?? inputJson.invocationSequenceNumber,
  };
}

/**
 * Extract the most recent user prompt from an Antigravity transcript (JSONL).
 * Scans from the end for the last `USER_INPUT` step with content. Pure: no I/O.
 * @param {string} transcriptText
 * @returns {string} the prompt, or "" if none found
 */
function extractUserPrompt(transcriptText) {
  if (!transcriptText || !transcriptText.trim()) return "";
  const lines = transcriptText.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const step = JSON.parse(lines[i]);
      if (step.type === "USER_INPUT" && step.content) {
        return step.content;
      }
    } catch (_e) {
      // ignore malformed lines
    }
  }
  return "";
}

/**
 * Decide which inject calls to make from the sequence number and prompt.
 * `seqNumber === 0` is the first invocation of a session (inject session context);
 * `seqNumber == null` means the field was missing (schema change / parse failure),
 * so the session inject is skipped rather than fired every turn. A non-empty
 * prompt always triggers a prompt inject. Pure: returns arg arrays, runs nothing.
 * @param {number | null | undefined} seqNumber
 * @param {string} userPrompt
 * @returns {string[][]} ordered list of `coree inject` argument arrays
 */
function planInject(seqNumber, userPrompt) {
  const plan = [];
  if (seqNumber === 0) {
    plan.push(["--type", "session"]);
  } else if (seqNumber == null) {
    logDebug("Skipping session inject: sequenceNumber missing (schema change or parse failure)");
  }
  if (userPrompt) {
    plan.push(["--type", "prompt", "--query", userPrompt]);
  }
  return plan;
}

async function main() {
  try {
    let inputStr = "";
    try {
      inputStr = fs.readFileSync(0, "utf8");
    } catch (_e) {
      // no stdin
    }
    logDebug(`Received stdin input length: ${inputStr.length}`);

    const { transcriptPath, seqNumber } = parseHookInput(inputStr);
    logDebug(`transcriptPath: ${transcriptPath}, sequenceNumber: ${seqNumber}`);

    let userPrompt = "";
    if (transcriptPath && fs.existsSync(transcriptPath)) {
      userPrompt = extractUserPrompt(fs.readFileSync(transcriptPath, "utf8"));
    }
    logDebug(`Extracted userPrompt: "${userPrompt}"`);

    const injectSteps = [];
    for (const args of planInject(seqNumber, userPrompt)) {
      logDebug(`Running inject ${args.join(" ")}`);
      const out = await runInject(args);
      if (out) injectSteps.push({ ephemeralMessage: out });
    }

    const outputJson = injectSteps.length > 0 ? { injectSteps } : {};
    const outputStr = JSON.stringify(outputJson);
    logDebug(`Outputting: ${outputStr}`);
    console.log(outputStr);
  } catch (err) {
    logDebug(`Unhandled error in wrapper: ${err.stack}`);
    console.log(JSON.stringify({}));
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    console.log("{}");
  });
}

module.exports = { parseHookInput, extractUserPrompt, planInject };
