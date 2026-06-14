import assert from "node:assert/strict";
import { test } from "node:test";
import { decideVersionSync } from "../renovate-post-upgrade.mjs";

test("patch bump does not sync", () => {
  assert.deepEqual(decideVersionSync("1.2.3", "1.2.4"), {
    sync: false,
    pluginVersion: null,
  });
});

test("minor bump syncs the plugin to <newMajor>.<newMinor>.0", () => {
  assert.deepEqual(decideVersionSync("1.2.3", "1.3.0"), {
    sync: true,
    pluginVersion: "1.3.0",
  });
});

test("minor bump targets X.Y.0 regardless of the new patch level", () => {
  assert.deepEqual(decideVersionSync("1.2.7", "1.5.9"), {
    sync: true,
    pluginVersion: "1.5.0",
  });
});

test("major bump syncs to <newMajor>.<newMinor>.0", () => {
  assert.deepEqual(decideVersionSync("1.9.9", "2.0.4"), {
    sync: true,
    pluginVersion: "2.0.0",
  });
});
