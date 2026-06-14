#!/usr/bin/env node
// Shared across all coree-ai plugin repos via repo-file-sync (see .github/sync.yml).
// Edit here, not in the individual repos.
//
// Renovate `postUpgradeTasks` runs this after bumping the `@coree-ai/coree`
// dependency to keep the plugin's own version (package.json + host manifests) in
// step with the pinned coree major.minor.
//
// NOTE: this file is `.mjs`, so Node always loads it as an ES module. It must use
// `import`, never `require` (the previous `require` form threw on its first line
// and never ran). A `node --check` CI step guards against regressions.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Decide whether a coree version change requires syncing the plugin version.
 * Pure function so it can be unit-tested without touching the filesystem.
 *
 * Patch-only bumps (same major.minor) need no sync; any major or minor change
 * syncs the plugin to `<newMajor>.<newMinor>.0`.
 *
 * @param {string} oldVersion semver like "1.2.3"
 * @param {string} newVersion semver like "1.3.0"
 * @returns {{ sync: boolean, pluginVersion: string | null }}
 */
export function decideVersionSync(oldVersion, newVersion) {
  const [oldMajor, oldMinor] = oldVersion.split(".").map(Number);
  const [newMajor, newMinor] = newVersion.split(".").map(Number);
  if (oldMajor === newMajor && oldMinor === newMinor) {
    return { sync: false, pluginVersion: null };
  }
  return { sync: true, pluginVersion: `${newMajor}.${newMinor}.0` };
}

function updateJson(path, version) {
  if (!existsSync(path)) return;
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  if (pkg.version === version) {
    console.log(`  ${path} already ${version}`);
    return;
  }
  pkg.version = version;
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`  updated ${path}: ${version}`);
}

function main(argv) {
  const [oldVersion, newVersion] = argv;
  if (!oldVersion || !newVersion) {
    console.error("Usage: renovate-post-upgrade.mjs <oldVersion> <newVersion>");
    process.exit(1);
  }

  const { sync, pluginVersion } = decideVersionSync(oldVersion, newVersion);
  if (!sync) {
    console.log(`Patch bump ${oldVersion} -> ${newVersion}, no version sync needed`);
  } else {
    console.log(`Major/minor bump: syncing plugin version to ${pluginVersion}`);

    updateJson("package.json", pluginVersion);

    const manifestPaths = [
      "plugin.json",
      ".claude-plugin/plugin.json",
      ".codex-plugin/plugin.json",
      "gemini-extension.json",
    ];
    for (const p of manifestPaths) {
      updateJson(p, pluginVersion);
    }

    if (existsSync("extension.toml")) {
      const content = readFileSync("extension.toml", "utf8");
      const updated = content.replace(/version\s*=\s*".*"/, `version = "${pluginVersion}"`);
      if (updated !== content) {
        writeFileSync("extension.toml", updated);
        console.log("  updated extension.toml");
      }
    }
  }

  console.log("Running npm install...");
  execSync("npm install", { stdio: "inherit" });
}

// Run main only when invoked directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}
