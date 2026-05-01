# Preset Schema

The structure of each preset is defined in `preset.schema.json`. This document describes the JSON structure and provides examples.

## Base Structure

```json
{
  "id": "my-preset",
  "name": "My Preset Name",
  "description": "Description of what this preset does",
  "inherits": "parent-preset",
  "dependencies": {
    "prod": ["package1", "package2"],
    "dev": ["dev-package1"]
  },
  "files": {
    "destination/path.js": "templates/source.js"
  },
  "steps": []
}
```

## Properties

### Required

- **id** `string` — Unique identifier (lowercase, numbers, hyphens)
- **name** `string` — Human-readable preset name
- **description** `string` — Detailed description
- **dependencies** `object` — Dependencies to install
  - **prod** `string[]` — Production dependencies
  - **dev** `string[]` — Development dependencies
- **files** `object` — File mappings (destination → template path)
- **steps** `array` — Steps to execute

### Optional

- **version** `string` — Semantic version (e.g., "1.0.0")
- **inherits** `string` — ID of parent preset for inheritance

## Steps

Each step has this structure:

```json
{
  "id": "step-id",
  "type": "install-deps|run-command|generate-from-template|copy-file",
  "description": "Step description",
  "order": 0,
  "dependsOn": ["other-step-id"],
  "config": {}
}
```

### Step Types

#### install-deps
Installs project dependencies.

```json
{
  "id": "install-deps",
  "type": "install-deps",
  "description": "Install dependencies",
  "config": {
    "type": "install-deps"
  }
}
```

#### run-command
Executes a shell command. Supports variables with `{{variableName}}`.

```json
{
  "id": "init-app",
  "type": "run-command",
  "description": "Initialize application",
  "config": {
    "type": "run-command",
    "command": "npm init -y && npm install {{dependency}}"
  }
}
```

#### generate-from-template
Generates files from templates. Supports variable substitution.

```json
{
  "id": "setup-config",
  "type": "generate-from-template",
  "description": "Generate configuration files",
  "config": {
    "type": "generate-from-template",
    "files": [
      {
        "destination": ".env",
        "template": "templates/.env.template",
        "variables": {
          "API_URL": "https://api.example.com",
          "DEBUG": "false"
        }
      }
    ]
  }
}
```

#### copy-file
Copies files as-is.

```json
{
  "id": "copy-readme",
  "type": "copy-file",
  "description": "Copy README",
  "config": {
    "type": "copy-file",
    "source": "templates/README.md",
    "destination": "README.md"
  }
}
```

## Dependencies

Steps execute respecting order (`order`) and dependencies (`dependsOn`):

```json
{
  "id": "compile",
  "type": "run-command",
  "dependsOn": ["install-deps"],
  "config": {
    "type": "run-command",
    "command": "npm run build"
  }
}
```

If `install-deps` is in `dependsOn`, that step must complete first.

## Inheritance

A preset can inherit from another by specifying `inherits`:

```json
{
  "id": "react-advanced",
  "name": "React Advanced",
  "inherits": "react-base",
  "dependencies": {
    "prod": ["@shadcn-ui/react"],
    "dev": []
  }
}
```

Dependencies, files, and steps are inherited from the parent preset.

## Validation

The schema is available in `preset.schema.json` and can be used for:

- **Validating presets** in editors (VS Code, etc.)
- **Documentation generation**
- **Runtime validation** (coming soon)

### VS Code Setup

To enable auto-completion in VS Code, add to `.vscode/settings.json`:

```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/presets/**/preset.json"],
      "url": "./preset.schema.json"
    }
  ]
}
```

## Examples

### Simple Preset

```json
{
  "id": "base-node",
  "name": "Base Node Setup",
  "description": "Basic Node.js project setup",
  "dependencies": {
    "prod": [],
    "dev": ["eslint", "prettier"]
  },
  "files": {
    ".eslintrc.js": "templates/.eslintrc.js",
    ".prettierrc.json": "templates/.prettierrc.json"
  },
  "steps": [
    {
      "id": "install-deps",
      "type": "install-deps",
      "description": "Install dev dependencies",
      "config": {"type": "install-deps"}
    }
  ]
}
```

### Preset with Inheritance

```json
{
  "id": "react-base",
  "name": "React Setup",
  "description": "React with Vite",
  "inherits": "base-node",
  "dependencies": {
    "prod": ["react", "react-dom"],
    "dev": ["@vitejs/plugin-react", "vite"]
  },
  "files": {
    "vite.config.ts": "templates/vite.config.ts"
  },
  "steps": [
    {
      "id": "install-deps",
      "type": "install-deps",
      "description": "Install dependencies",
      "config": {"type": "install-deps"}
    },
    {
      "id": "init-vite",
      "type": "run-command",
      "dependsOn": ["install-deps"],
      "config": {
        "type": "run-command",
        "command": "npm run setup"
      }
    }
  ]
}
```
