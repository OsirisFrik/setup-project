# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`setup-project` is a Node.js CLI tool (`uppro`) for managing and applying reusable project configuration presets. Presets live in `~/.setuppro/presets/` and support inheritance, template variable substitution (`{{variableName}}`), and sequential step execution with dependency ordering.

**Requires:** Node.js >= 22.6.0

## Commands

```bash
# Run the CLI (development, no compile step needed)
node index.mjs --profile <name>

# Build TypeScript to dist/
pnpm exec tsc

# Format code
pnpm exec oxfmt .

# After building, run compiled version
node dist/main.js --profile <name>
```

No test runner is configured yet — Vitest is planned (see PLAN.md).

## Architecture

**Entry point:** `index.mjs` — checks Node version, then loads `dist/main.js` if it exists, otherwise imports `src/main.ts` directly via Node's `--experimental-strip-types` flag (no compile step required during development).

**Existing source files:**

- `src/main.ts` — CLI entry: `parseArgs()` (parses preset name, `--yes`, `--dry-run`, `--verbose`), command routing to `handlePreset()` / `handleApply()`
- `src/colors.ts` — ANSI color helpers (`bold`, `dim`, `green`, `yellow`, `cyan`, `red`, `magenta`, `gray`, `muted`, `white`, `pink`); respects `NO_COLOR` / `FORCE_COLOR` env vars; also exports `SPINNER`, `HIDE_CURSOR`, `SHOW_CURSOR`
- `src/ui.ts` — `printBanner(version)` (animated wave logo), `multiSelect<T>(items, opts)` (raw-stdin multi-select, no external deps), `formatTime(ms)`

**Planned source layout** (see PLAN.md for full detail):

- `src/types.ts` — shared interfaces: `Preset`, `Step`, `PackageManager`, `ConflictResolution`
- `src/presets/loader.ts` — loads and recursively resolves preset inheritance
- `src/variables/prompter.ts` — detects `{{variable}}` placeholders; prompts user interactively
- `src/apply/` — conflict detection, template processing, step execution, file writing
- `src/package-manager/detector.ts` — auto-detects npm/yarn/pnpm/bun from lock files
- `src/utils/paths.ts` — helpers for `~/.setuppro/` directory paths
- `src/history/tracker.ts` — records applied presets to `~/.setuppro/.history/`

**Preset schema** (stored as `~/.setuppro/presets/<id>/preset.json`): supports `inherits` for parent preset chaining; `files` map destination→template; `steps` array with `type`, `dependsOn`, and `order` fields.

**Execution flow** (planned, see PLAN.md): load preset → detect package manager → detect/prompt variables → detect conflicts → dry-run preview → confirm → execute steps → record history → summary.

## Known Issues

- `tsconfig.json` `include` is `["*.ts"]` (root only). When adding files under `src/`, update it to `["src/**/*.ts"]` or tsc won't compile them.
- `src/main.ts` version detection checks `pkg.name === 'autoskills'` but the package is named `setup-project`, so `VERSION` always resolves to `'0.0.0'`.

## Code Style

Formatter is **oxfmt** (configured in `.oxfmtrc.json`): single quotes, 2-space indent, no trailing commas, semicolons, 80-char print width, sorted imports.

TypeScript config uses `erasableSyntaxOnly: true` and `verbatimModuleSyntax: true` — no `const enum`, no legacy `namespace`, and all imports must use `import type` when importing only types.

Import paths in `src/` must include the `.ts` extension (e.g. `import { ... } from './colors.ts'`) because of `"module": "nodenext"`.
