// Core type definitions for setup-project CLI

export type PackageManagerName = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface PackageManager {
  name: PackageManagerName;
  installCommand: string;
  addCommand: string;
  version: string;
}

export type ConflictResolution = 'overwrite' | 'merge' | 'skip' | 'rename';

export type StepType =
  | 'install-deps'
  | 'run-command'
  | 'generate-from-template'
  | 'copy-file'
  | 'copy-files';

export interface InstallDepsStepConfig {
  type: 'install-deps';
  packages?: {
    prod?: string[];
    dev?: string[];
  };
}

export interface RunCommandStepConfig {
  type: 'run-command';
  command: string;
}

export interface GenerateFromTemplateFile {
  destination: string;
  template: string;
  variables?: Record<string, string>;
}

export interface GenerateFromTemplateStepConfig {
  type: 'generate-from-template';
  files: GenerateFromTemplateFile[];
}

export interface CopyFileStepConfig {
  type: 'copy-file';
  source: string;
  destination: string;
}

export interface CopyFilesStepConfig {
  type: 'copy-files';
  files: string[];
  destination: string;
}

export type StepConfig =
  | InstallDepsStepConfig
  | RunCommandStepConfig
  | GenerateFromTemplateStepConfig
  | CopyFileStepConfig
  | CopyFilesStepConfig;

export interface Step {
  id: string;
  type: StepType;
  description?: string;
  order?: number;
  dependsOn?: string[];
  config: StepConfig;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  inherits?: string;
  files: Record<string, string>;
  steps: Step[];
}

export interface ResolvedPreset extends Preset {
  _resolved: true;
}

export interface PresetMetadata {
  id: string;
  name: string;
  description: string;
  inherits?: string;
}

export interface Conflict {
  filePath: string;
  exists: boolean;
  decision?: ConflictResolution;
  renamed?: string;
}

export interface ConflictDecision {
  filePath: string;
  resolution: ConflictResolution;
  renamed?: string;
}

export type VariableMap = Record<string, string>;

export interface ValidationError {
  field: string;
  message: string;
}

export interface ExecutionContext {
  projectRoot: string;
  presetPath: string;
  packageManager: PackageManager;
  variables: VariableMap;
  dryRun: boolean;
  verbose: boolean;
}

export interface ExecutionResult {
  success: boolean;
  stepsExecuted: string[];
  output: string[];
  errors: string[];
}

export interface HistoryEntry {
  timestamp: string;
  presetId: string;
  projectRoot: string;
  packageManager: PackageManagerName;
  changes: {
    filesCreated: string[];
    filesModified: string[];
    dependenciesInstalled: string[];
    stepsExecuted: string[];
  };
}
