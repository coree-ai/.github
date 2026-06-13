# coree-ai/.github

Reusable GitHub Actions workflows and shared config for [coree-ai](https://github.com/coree-ai) repositories.

## Reusable Workflows

### `pin-guard.yml`

Verifies that the `@coree-ai/coree` version pin matches the plugin's own version.

```yaml
jobs:
  guard:
    uses: coree-ai/.github/.github/workflows/pin-guard.yml@main
```

### `ci.yml`

Runs platform-specific validation for a plugin repo.

```yaml
jobs:
  validate:
    uses: coree-ai/.github/.github/workflows/ci.yml@main
    with:
      validation-script: scripts/ci-validate.sh
```

### `sync-steering.yml`

Syncs the canonical steering doc to all plugin repos under their native filenames (CLAUDE.md, GEMINI.md, AGENTS.md, opencode.md). Runs automatically on push to `steering/` or can be dispatched manually.

## Steering Doc

[steering/coree.md](steering/coree.md) is the canonical source for agent instructions. It is synced to all plugin repos via the file-sync workflow.
