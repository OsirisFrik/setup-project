# setup-project

A Node.js CLI tool for managing and applying reusable project configuration presets. Automate repetitive project setup tasks with inheritance, template variable substitution, and sequential step execution.

## ✨ Features

- **Preset Management**: Create, edit, and apply reusable configuration presets
- **Inheritance**: Presets can inherit from other presets with cascading configurations
- **Template Variables**: Support for `{{variableName}}` substitution with interactive prompts
- **Flexible Steps**: Execute custom commands, install dependencies, copy files, and generate from templates
- **Conflict Detection**: Automatically detect and handle file conflicts during application
- **History Tracking**: Records applied presets for audit and rollback purposes
- **Package Manager Detection**: Auto-detects npm, yarn, pnpm, or bun from lock files
- **JSON Schema Validation**: IDE autocomplete and validation support for preset files

## 📋 Requirements

- **Node.js** >= 22.6.0

## 📦 Installation

### Global Installation

```bash
npm install -g uppro
```

### Using npx (No Installation Required)

```bash
npx uppro
```

### Local Development

```bash
git clone https://github.com/OsirisFrik/setup-project.git
cd setup-project
pnpm install
pnpm link # Links the package to the local project
```

## 🚀 Usage

### Apply a Preset

```bash
uppro --profile <preset-name>
```

### Options

```bash
--profile <name>    # Preset name to apply (required)
--dry-run          # Preview changes without applying them
--yes              # Skip confirmation prompts
--verbose          # Show detailed output
```

### Examples

```bash
# Apply a preset with confirmation
uppro --profile react-base

# Preview changes without applying
uppro --profile react-base --dry-run

# Apply without prompts
uppro --profile react-base --yes

# Verbose output
uppro --profile react-base --verbose
```

## 📁 Project Structure

```
setup-project/
├── index.mjs                    # Entry point with shebang
├── src/
│   ├── main.ts                  # CLI entry and command routing
│   ├── colors.ts                # ANSI color utilities
│   ├── ui.ts                    # UI components (banner, prompts)
│   ├── types.ts                 # Shared TypeScript interfaces
│   ├── preset-creator.ts        # Preset creation and editing
│   ├── presets/
│   │   └── loader.ts            # Preset loading and inheritance
│   ├── variables/
│   │   └── prompter.ts          # Template variable detection
│   ├── apply/
│   │   └── step-executor.ts     # Step execution orchestration
│   ├── package-manager/
│   │   └── detector.ts          # Package manager detection
│   ├── utils/
│   │   └── paths.ts             # Path utilities for ~/.uppro/
│   └── history/
│       └── tracker.ts           # Application history
├── preset.schema.json           # JSON schema for validation
└── dist/                        # Compiled output (generated)
```

## 📝 Preset Format

Presets are stored in `~/.uppro/presets/<id>/preset.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/OsirisFrik/setup-project/refs/heads/main/preset.schema.json",
  "id": "react-base",
  "name": "React Base Setup",
  "description": "Basic React project setup with dependencies",
  "version": "1.0.0",
  "inherits": "base",
  "files": {
    ".gitignore": "templates/.gitignore",
    "tsconfig.json": "templates/tsconfig.json"
  },
  "steps": [
    {
      "id": "install-deps",
      "type": "install-deps",
      "description": "Install dependencies",
      "config": {
        "type": "install-deps",
        "packages": {
          "prod": ["react", "react-dom"],
          "dev": ["@types/react", "typescript"]
        }
      }
    }
  ]
}
```

## ⚙️ Step Types

### install-deps

Install npm/yarn/pnpm/bun dependencies:

```json
{
  "type": "install-deps",
  "packages": {
    "prod": ["react", "react-dom"],
    "dev": ["typescript", "@types/react"]
  }
}
```

### run-command

Execute arbitrary shell commands (supports `{{variable}}` substitution):

```json
{
  "type": "run-command",
  "command": "npm set-script dev 'vite'"
}
```

### generate-from-template

Generate files from templates with variable substitution:

```json
{
  "type": "generate-from-template",
  "files": [
    {
      "template": "templates/env.example",
      "destination": ".env",
      "variables": {
        "API_URL": "https://api.example.com"
      }
    }
  ]
}
```

### copy-file

Copy a single file from the preset:

```json
{
  "type": "copy-file",
  "source": "templates/.gitignore",
  "destination": ".gitignore"
}
```

### copy-files

Copy multiple files to a destination:

```json
{
  "type": "copy-files",
  "files": ["LICENSE", "CHANGELOG.md"],
  "destination": "./"
}
```

## 🙏 Acknowledgments

This project includes code adapted from:

- **autoskills** by midudev
  https://github.com/midudev/autoskills
  Licensed under CC BY-NC 4.0

  The following components were adapted and modified:
  - `index.mjs` — Node.js version check and dynamic module loader
  - `src/ui.ts` — UI components and CLI utilities
  - `src/colors.ts` — ANSI color utilities

  Changes were made to fit this project's requirements.

---

## ⚖️ License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

© 2026 osirisfrik

You are free to:

- Share — copy and redistribute the material
- Adapt — remix, transform, and build upon the material

Under the following terms:

- **Attribution** — You must give appropriate credit
- **NonCommercial** — You may not use the material for commercial purposes
- **No additional restrictions**

---

### 🔎 Third-party code

This project includes portions of code from **autoskills** by midudev,
which are also licensed under CC BY-NC 4.0.

Original source:
https://github.com/midudev/autoskills

---

Full license text:
https://creativecommons.org/licenses/by-nc/4.0/legalcode

## Author

[OsirisFrik](https://github.com/OsirisFrik)

## 🤝 Support

Found a bug? Have a feature request? [Open an issue](https://github.com/OsirisFrik/setup-project/issues)
