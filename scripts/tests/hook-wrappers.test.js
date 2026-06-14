const { test } = require("node:test");
const assert = require("node:assert/strict");
const ag = require("../hook-wrapper-antigravity.js");
const gm = require("../hook-wrapper-gemini.js");

test("extractUserPrompt returns the most recent USER_INPUT content", () => {
  const transcript = [
    JSON.stringify({ type: "USER_INPUT", content: "first" }),
    JSON.stringify({ type: "AGENT_OUTPUT", content: "reply" }),
    JSON.stringify({ type: "USER_INPUT", content: "latest" }),
  ].join("\n");
  assert.equal(ag.extractUserPrompt(transcript), "latest");
});

test("extractUserPrompt tolerates empty input and malformed lines", () => {
  assert.equal(ag.extractUserPrompt(""), "");
  assert.equal(ag.extractUserPrompt("not json\n{ broken"), "");
  // USER_INPUT without content is ignored.
  assert.equal(ag.extractUserPrompt(JSON.stringify({ type: "USER_INPUT" })), "");
});

test("planInject: sequenceNumber 0 injects session context", () => {
  assert.deepEqual(ag.planInject(0, ""), [["--type", "session"]]);
});

test("planInject: missing sequenceNumber (null) skips the session inject", () => {
  assert.deepEqual(ag.planInject(null, ""), []);
  assert.deepEqual(ag.planInject(undefined, ""), []);
});

test("planInject: later turns inject only the prompt", () => {
  assert.deepEqual(ag.planInject(3, "hello world"), [
    ["--type", "prompt", "--query", "hello world"],
  ]);
});

test("planInject: first turn with a prompt injects both, session first", () => {
  assert.deepEqual(ag.planInject(0, "hi"), [
    ["--type", "session"],
    ["--type", "prompt", "--query", "hi"],
  ]);
});

test("parseHookInput reads sequenceNumber with invocation fallback", () => {
  assert.deepEqual(ag.parseHookInput(JSON.stringify({ transcriptPath: "/t", sequenceNumber: 2 })), {
    transcriptPath: "/t",
    seqNumber: 2,
  });
  assert.deepEqual(ag.parseHookInput(JSON.stringify({ invocationSequenceNumber: 0 })), {
    transcriptPath: undefined,
    seqNumber: 0,
  });
  assert.deepEqual(ag.parseHookInput("garbage"), {
    transcriptPath: undefined,
    seqNumber: undefined,
  });
});

test("gemini buildOutput wraps inject output in hookSpecificOutput", () => {
  assert.deepEqual(gm.buildOutput("SessionStart", "ctx"), {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: "ctx",
    },
  });
});

test("gemini buildOutput returns {} when there is no inject output", () => {
  assert.deepEqual(gm.buildOutput("BeforeAgent", ""), {});
});
