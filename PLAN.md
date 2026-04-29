# Work Plan: Setup Project CLI

> CLI for managing and applying reusable project configurations for Node.js

**Last updated:** 2026-04-28  
**Status:** Planning completed

---

## 📋 Vision Overview

### Objective
Create a minimalist CLI (without unnecessary external dependencies) that enables:
1. Create custom configuration profiles
2. Save profiles in `~/.setuppro/profiles/`
3. Apply profiles to existing projects
4. Support inheritance between profiles
5. Execute sequential steps with dependencies

### Philosophy
- **Minimalist:** Maximum 0-2 optional external dependencies
- **Strict TypeScript:** Full type coverage
- **Zero external dependencies:** Use Node.js built-in (fs, path, readline)
- **Leverage existing utilities:** Use colors.ts and ui.ts

---

## 🏗️ Folder Structure

```
~/.setuppro/
├── profiles/
│   ├── base-node/
│   │   ├── profile.json
│   │   └── templates/
│   │       ├── eslint.config.js
│   │       ├── tsconfig.json
│   │       └── .prettierrc.json
│   ├── react-base/
│   │   ├── profile.json (inherits: base-node)
│   │   └── templates/
│   └── react-shadcn/
│       ├── profile.json (inherits: react-base)
│       └── templates/
├── .cache/
│   └── pm-{hash}  (cache for detected package manager)
└── .history/
    └── {timestamp}.json  (application history)

src/
├── colors.ts           (✅ already exists)
├── ui.ts              (✅ already exists)
├── main.ts            (⚠️ to improve)
├── types.ts           (📝 new)
├── profiles/
│   └── loader.ts      (📝 new)
├── variables/
│   └── prompter.ts    (📝 new)
├── apply/
│   ├── conflict-handler.ts
│   ├── template-processor.ts
│   ├── step-executor.ts
│   └── file-writer.ts
├── package-manager/
│   └── detector.ts
├── utils/
│   └── paths.ts
├── profile-creator.ts
├── history/
│   └── tracker.ts
└── __tests__/
    ├── profiles.test.ts
    ├── template-processor.test.ts
    ├── step-executor.test.ts
    └── conflict-handler.test.ts
```

---

## 🎯 Profile Structure

### profile.json
```json
{
  "id": "react-shadcn",
  "name": "React + shadcn/ui",
  "description": "React setup with shadcn/ui components",
  "version": "1.0.0",
  "inherits": "react-base",
  
  "dependencies": {
    "prod": ["@shadcn-ui/utils"],
    "dev": ["shadcn-ui@latest"]
  },
  
  "files": {
    "tailwind.config.js": "templates/tailwind.config.js",
    "postcss.config.js": "templates/postcss.config.js"
  },
  
  "steps": [
    {
      "id": "install-deps",
      "type": "install-deps",
      "description": "Install dependencies"
    },
    {
      "id": "init-shadcn",
      "type": "run-command",
      "command": "npx shadcn-ui@latest init -d",
      "dependsOn": ["install-deps"]
    },
    {
      "id": "generate-components",
      "type": "generate-from-template",
      "dependsOn": ["init-shadcn"],
      "files": [
        {
          "destination": "src/components/Button.tsx",
          "template": "templates/Button.tsx",
          "variables": { "componentName": "Button" }
        },
        {
          "destination": "src/components/Card.tsx",
          "template": "templates/Card.tsx",
          "variables": { "componentName": "Card" }
        }
      ]
    }
  ]
}
```

---

## 📝 Main TypeScript Types

```typescript
interface Profile {
  id: string;
  name: string;
  description: string;
  version: string;
  inherits?: string;
  dependencies: {
    prod: string[];
    dev: string[];
  };
  files: Record<string, string>;
  steps: Step[];
}

interface Step {
  id: string;
  type: 'install-deps' | 'run-command' | 'generate-from-template' | 'copy-file';
  description?: string;
  order?: number;
  dependsOn?: string[];
  config: StepConfig;
}

interface PackageManager {
  name: 'npm' | 'yarn' | 'pnpm' | 'bun';
  installCommand: string;
  addCommand: string;
  version: string;
}

type ConflictResolution = 'overwrite' | 'merge' | 'skip' | 'rename';
```

---

## 🔄 Execution Flow

### Main Command: `apply`
```bash
setuppro apply --profile react-shadcn [--pm npm] [--dry-run] [--yes]
```

### Sequential Steps

```
1. ✅ Load profile (including recursive inheritance)
   └─ Validate structure and merge inherited profiles

2. ✅ Detect package manager
   ├─ Search for lock files
   ├─ If ambiguous → interactive prompt
   └─ Validate installation

3. ✅ Detect variables
   ├─ Scan templates and files
   ├─ Extract {{variableName}}
   └─ Return list of unique variables

4. ✅ Prompt user for variable values (interactive)
   ├─ For each variable → prompt
   ├─ Validate input (if rules exist)
   └─ Return map: { variableName: value }

5. ✅ Detect conflicts
   ├─ List files that already exist
   ├─ For each conflict → show options
   └─ Return user decisions

6. ✅ Show dry-run
   ├─ List all changes
   ├─ Dependencies to install
   ├─ Files to create/modify
   ├─ Commands to execute
   └─ Steps in order

7. ✅ Request confirmation
   └─ Continue? [y/n]

8. ✅ Execute steps sequentially
   ├─ Validate dependencies between steps
   ├─ Execute in order (respecting "order" field)
   ├─ If error → stop, show message
   └─ Register progress

9. ✅ History
   └─ Save to ~/.setuppro/.history/

10. ✅ Show summary
    └─ ✓ Profile applied successfully
```

---

## 📊 Detailed Implementation Plan

### PHASE 1: Core (Foundational)

#### #1️⃣ TypeScript Types and Interfaces
**File:** `src/types.ts`
**Duration:** 1-2 hours
**Tasks:**
- [ ] Define `Profile` interface
- [ ] Define `Step` and variants by type
- [ ] Define `PackageManager` interface
- [ ] Define `ConflictResolution` types
- [ ] Define `VariableMap` type

**Blocks:** All other tasks

---

#### #2️⃣ Package Manager Detector
**File:** `src/package-manager/detector.ts`
**Duration:** 2-3 hours
**Dependencies:** #1 (types)
**Tasks:**
- [ ] Function `detectPackageManager(projectRoot): PackageManager`
  - [ ] Search for lock files in order: bun.lockb → pnpm-lock.yaml → yarn.lock → package-lock.json
  - [ ] Detect installed version (`npm --version`, etc)
  - [ ] Return PackageManager object
- [ ] Function `getPackageManagerCommand(pm, action)`
  - [ ] npm install, npm install -D
  - [ ] yarn, yarn add -D
  - [ ] pnpm install, pnpm add -D
  - [ ] bun install, bun add -d
- [ ] Optional cache in ~/.setuppro/.cache/
- [ ] Tests

**Blocks:** #8 (step-executor)

---

#### #3️⃣ Path Utilities
**File:** `src/utils/paths.ts`
**Duration:** 30 minutes
**Tasks:**
- [ ] `getSetupProDir(): string`
- [ ] `getProfilesDir(): string`
- [ ] `getProfilePath(profileId: string): string`
- [ ] `getProjectRoot(): string` (detect package.json)
- [ ] `ensureSetupProDir(): void`
- [ ] Tests

**Blocks:** #2, #4

---

#### #4️⃣ Profile Loader
**File:** `src/profiles/loader.ts`
**Duration:** 3-4 hours
**Dependencies:** #1 (types), #3 (paths)
**Tasks:**
- [ ] Function `loadProfile(profileId): Profile`
  - [ ] Read profile.json
  - [ ] Validate structure
  - [ ] Return Profile object
- [ ] Function `resolveInheritance(profile): ResolvedProfile`
  - [ ] If `inherits` → load parent profile recursively
  - [ ] Merge: dependencies, files, steps
  - [ ] Precedence: steps from current profile + steps from parent
- [ ] Function `listProfiles(): ProfileMetadata[]`
  - [ ] List directories in ~/.setuppro/profiles/
  - [ ] Extract metadata (id, name, description)
- [ ] Function `validateProfile(profile): ValidationError[]`
- [ ] Detect variables in templates and files
- [ ] Tests for inheritance and validation

**Blocks:** #5, #6, #9

---

#### #5️⃣ Variable Prompter
**File:** `src/variables/prompter.ts`
**Duration:** 2-3 hours
**Dependencies:** #4 (loader, to detect variables)
**Tasks:**
- [ ] Function `detectVariables(profile): string[]`
  - [ ] Regex to find {{variableName}}
  - [ ] Deduplicate, return sorted list
- [ ] Function `promptVariables(variables: string[]): Promise<VariableMap>`
  - [ ] For each variable → interactive prompt
  - [ ] Use readline or existing UI
  - [ ] Validate inputs (minimum length, regex if applicable)
  - [ ] Return { variableName: value }
- [ ] Tests

**Blocks:** #6

---

#### #6️⃣ Conflict Handler
**File:** `src/apply/conflict-handler.ts`
**Duration:** 2-3 hours
**Dependencies:** #4 (loader)
**Tasks:**
- [ ] Function `detectConflicts(profile, projectRoot): Conflict[]`
  - [ ] For each file in profile.files → verify if exists
  - [ ] Return list of conflicts
- [ ] Function `resolveConflicts(conflicts): Promise<ConflictDecisions>`
  - [ ] For each conflict → multiSelect UI
  - [ ] Options: overwrite, skip, rename, merge (if applicable)
  - [ ] Return user decisions
- [ ] Function `applyConflictDecisions(...)`
  - [ ] Update files according to decisions
- [ ] Tests

**Blocks:** #8

---

#### #7️⃣ Template Processor
**File:** `src/apply/template-processor.ts`
**Duration:** 2 hours
**Dependencies:** #1 (types)
**Tasks:**
- [ ] Function `loadTemplate(templatePath): string`
- [ ] Function `processTemplate(content, variables): string`
  - [ ] Replace {{variableName}} → value
  - [ ] Handle whitespace
  - [ ] Validate all variables are present
- [ ] Function `interpolateString(str, variables): string`
- [ ] Tests for edge cases

**Blocks:** #8

---

#### #8️⃣ Step Executor
**File:** `src/apply/step-executor.ts`
**Duration:** 4-5 hours
**Dependencies:** #2, #5, #7 (all previous)
**Tasks:**
- [ ] Function `orderSteps(steps): OrderedStep[]`
  - [ ] Respect `order` field
  - [ ] If no order → use position in array
  - [ ] Validate that dependsOn refers to existing steps
- [ ] Function `executeSteps(steps, context): Promise<ExecutionResult>`
  - [ ] For each step in order:
    - [ ] Wait for dependencies to complete
    - [ ] If error in dependency → stop execution
    - [ ] Execute step by type:
      - `install-deps`: read dependencies, execute `npm install`, etc
      - `run-command`: execute command in current directory
      - `generate-from-template`: process templates, write files
      - `copy-file`: copy file
    - [ ] Show progress (spinner, logs)
    - [ ] Capture output and errors
- [ ] Tests for each step type

**Blocks:** #9

---

#### #9️⃣ Safe File Writer
**File:** `src/apply/file-writer.ts`
**Duration:** 1-2 hours
**Tasks:**
- [ ] Function `writeFile(filePath, content): void`
  - [ ] Create directories if not exist
  - [ ] Write with appropriate permissions
  - [ ] Handle errors (EACCES, ENOENT, etc)
- [ ] Function `backupFile(filePath): string` (optional)
  - [ ] Create backup with timestamp
  - [ ] Return path to backup
- [ ] Tests

**Blocks:** #10

---

### PHASE 2: Interface and Main Flow

#### #🔟 Improve parseArgs and Main Flow
**File:** `src/main.ts`
**Duration:** 3-4 hours
**Dependencies:** All tasks from PHASE 1
**Tasks:**
- [ ] Expand `parseArgs()`:
  - [ ] Subcommands: `apply`, `profile`, `list`, `create`, `show`
  - [ ] Flags: `--pm`, `--dry-run`, `--yes`, `--backup`, `--verbose`
- [ ] Function `main()` with flow:
  1. Parse args
  2. Load profile + resolve inheritance
  3. Detect package manager
  4. Detect variables
  5. Prompt user for variables
  6. Detect conflicts
  7. Show dry-run
  8. Request confirmation (unless --yes)
  9. Execute steps
  10. Register history
  11. Show summary
- [ ] Improve error handling
- [ ] Better logging with colors

**Blocks:** #11

---

#### #1️⃣1️⃣ Profile Creator
**File:** `src/profile-creator.ts`
**Duration:** 3-4 hours
**Dependencies:** #4 (loader)
**Tasks:**
- [ ] Function `createProfileInteractive(): Promise<void>`
  - [ ] Prompt: name, description
  - [ ] Prompt: inherit from another profile?
  - [ ] Prompt: add dependencies (prod/dev)
  - [ ] Prompt: add config files
  - [ ] Prompt: add steps
  - [ ] Generate structure in ~/.setuppro/profiles/
  - [ ] Create profile.json
  - [ ] Create templates/ folder
- [ ] Function `editProfile(profileId): Promise<void>`
  - [ ] Load profile.json
  - [ ] Allow editing fields
  - [ ] Save changes
- [ ] Function `deleteProfile(profileId): Promise<void>`
  - [ ] Confirm deletion
  - [ ] Delete directory
- [ ] Tests

**Blocks:** #12

---

#### #1️⃣2️⃣ History Tracker
**File:** `src/history/tracker.ts`
**Duration:** 1-2 hours
**Tasks:**
- [ ] Function `recordApplication(profile, changes): void`
  - [ ] Create entry in ~/.setuppro/.history/
  - [ ] Save timestamp, profile id, changes made
- [ ] Function `getHistory(): HistoryEntry[]`
  - [ ] List all applications
  - [ ] Return in reverse chronological order
- [ ] Function `getHistoryEntry(timestamp): HistoryEntry` (for future rollback)
- [ ] Tests

**Blocks:** Nothing (final phase)

---

### PHASE 3: Testing and Documentation

#### #1️⃣3️⃣ Testing with Vitest
**File:** `src/__tests__/`
**Duration:** 4-5 hours
**Tasks:**
- [ ] `profiles.test.ts`: loader, inheritance, validation
- [ ] `template-processor.test.ts`: variables, replacements, edge cases
- [ ] `step-executor.test.ts`: order, dependencies, types
- [ ] `conflict-handler.test.ts`: detection, resolution
- [ ] `package-manager.test.ts`: detection, commands
- [ ] Mocking fs, child_process
- [ ] Minimum coverage: 80%

---

#### #1️⃣4️⃣ Documentation and Examples
**File:** `README.md`, `EXAMPLES.md`
**Duration:** 2-3 hours
**Tasks:**
- [ ] README.md
  - [ ] Project description
  - [ ] Installation
  - [ ] Basic usage
  - [ ] ~/.setuppro/ structure
- [ ] Annotations in types.ts
- [ ] Example profiles:
  - [ ] base-node.json
  - [ ] react-base.json
  - [ ] react-shadcn.json
- [ ] Template guide ({{variables}}, placeholders)
- [ ] Troubleshooting

---

## 🔗 Task Dependencies

```
PHASE 1 (Core):
#1 (Types)
  ├─> #2 (Package Manager)
  ├─> #3 (Paths)
  ├─> #4 (Profile Loader)
  │     ├─> #5 (Variables)
  │     └─> #6 (Conflict Handler)
  └─> #7 (Template Processor)

#2 + #5 + #7
  └─> #8 (Step Executor)

#8
  └─> #9 (File Writer)

PHASE 2 (UI):
#9
  └─> #10 (Main Flow)
  └─> #11 (Profile Creator)
  └─> #12 (History)

PHASE 3 (Testing):
All previous
  └─> #13 (Testing)
  └─> #14 (Docs)
```

---

## 🎯 Milestones

| Phase | Tasks | Time Est. | Status |
|-------|-------|-----------|--------|
| Core | #1-#9 | 20-25 hrs | ⏳ Pending |
| UI | #10-#12 | 10-12 hrs | ⏳ Pending |
| Testing | #13-#14 | 6-8 hrs | ⏳ Pending |
| **TOTAL** | **14 tasks** | **36-45 hrs** | ⏳ Pending |

---

## ✅ Final Validation Checklist

Before considering the project "complete":

- [ ] All TypeScript types are defined
- [ ] All functions have tests
- [ ] CLI works with example profile (react-shadcn)
- [ ] Profile inheritance works correctly
- [ ] Variables are detected and replaced
- [ ] Conflicts are resolved interactively
- [ ] Package manager is auto-detected
- [ ] Steps execute in order and respect dependencies
- [ ] Dry-run shows all changes
- [ ] History is recorded correctly
- [ ] No unnecessary external dependencies
- [ ] TypeScript strict compiles without errors
- [ ] Tests pass (>80% coverage)
- [ ] Complete documentation
- [ ] README with examples

---

## 📌 Next Steps

1. **Review this plan** ← You are here
2. Adjust if necessary
3. Start implementation in order:
   - Phase 1: Core (foundational)
   - Phase 2: UI (main flow)
   - Phase 3: Testing (validation)

---

**Ready to start?** 🚀
