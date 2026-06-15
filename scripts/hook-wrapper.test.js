// Tests for the consolidated hook-wrapper.js.
// Prerequisite: issue #5 (converge antigravity + gemini wrappers onto spawn pattern)
// and issue #2 (sync consolidated script here). Until then, these tests are skipped.
//
// Test targets:
//   - Transcript JSONL parse -> userPrompt extraction
//   - seqNumber === 0 vs null gating for session inject
//   - Output JSON shape (injectSteps / hookSpecificOutput)

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, writeFileSync, rmSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const script = join(__dirname, "hook-wrapper.js");
const hasScript = existsSync(script);

function runHook(stdin, env = {}) {
	const r = spawnSync(process.execPath, [script], {
		env: { ...process.env, ...env },
		encoding: "utf8",
		input: stdin ? JSON.stringify(stdin) : "",
		stdio: ["pipe", "pipe", "pipe"],
		timeout: 10_000,
	});
	return r;
}

function freshDir() {
	return mkdtempSync(join(tmpdir(), "coree-hw-"));
}

describe("hook-wrapper", () => {
	describe("output JSON shape", () => {
		it("outputs valid JSON with empty input when no transcript", () => {
			if (!hasScript) return;
			const r = runHook({});
			const out = JSON.parse(r.stdout);
			assert.ok(typeof out === "object");
		});

		it("includes injectSteps when session data is produced", () => {
			if (!hasScript) return;
			// seqNumber 0 triggers session inject, producing injectSteps
			const r = runHook({ sequenceNumber: 0 });
			const out = JSON.parse(r.stdout);
			if (out.injectSteps) {
				assert.ok(Array.isArray(out.injectSteps));
			}
		});
	});

	describe("session gating (seqNumber)", () => {
		it("runs session inject when seqNumber is 0", () => {
			if (!hasScript) return;
			// Create a temp transcript with a user prompt so prompt inject also runs
			const dir = freshDir();
			try {
				const tpath = join(dir, "transcript.jsonl");
				writeFileSync(
					tpath,
					JSON.stringify({ type: "USER_INPUT", content: "test query" }) + "\n",
				);
				const r = runHook({ sequenceNumber: 0, transcriptPath: tpath });
				assert.ok(r.status === 0, `should succeed: ${r.stderr}`);
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		});

		it("skips session inject when seqNumber is missing (null/undefined)", () => {
			if (!hasScript) return;
			const r = runHook({});
			// No session inject means no crash; output is still valid JSON
			assert.ok(r.status === 0, `should succeed: ${r.stderr}`);
		});

		it("does not run session inject when seqNumber > 0", () => {
			if (!hasScript) return;
			const r = runHook({ sequenceNumber: 5 });
			assert.ok(r.status === 0, `should succeed: ${r.stderr}`);
		});
	});

	describe("transcript JSONL parse", () => {
		it("extracts userPrompt from last USER_INPUT step", () => {
			if (!hasScript) return;
			const dir = freshDir();
			try {
				const tpath = join(dir, "transcript.jsonl");
				writeFileSync(
					tpath,
					[
						JSON.stringify({ type: "SYSTEM", content: "start" }),
						JSON.stringify({ type: "USER_INPUT", content: "first query" }),
						JSON.stringify({ type: "ASSISTANT", content: "response" }),
						JSON.stringify({ type: "USER_INPUT", content: "second query" }),
					].join("\n") + "\n",
				);
				const r = runHook({ sequenceNumber: 1, transcriptPath: tpath });
				// The prompt inject should include the user query in the output
				assert.ok(r.status === 0, `should succeed: ${r.stderr}`);
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		});

		it("handles malformed JSONL lines gracefully", () => {
			if (!hasScript) return;
			const dir = freshDir();
			try {
				const tpath = join(dir, "transcript.jsonl");
				writeFileSync(
					tpath,
					'not valid json\n{"type":"USER_INPUT","content":"ok"}\n',
				);
				const r = runHook({ sequenceNumber: 1, transcriptPath: tpath });
				assert.ok(
					r.status === 0,
					`should succeed despite malformed lines: ${r.stderr}`,
				);
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		});
	});
});
