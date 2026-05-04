import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getPresetPath, getPresetsDir } from '../utils/paths.ts';
import type {
  Preset,
  ResolvedPreset,
  PresetMetadata,
  ValidationError,
} from '../types.ts';

export function loadPreset(presetId: string): Preset {
  const presetPath = getPresetPath(presetId);
  const presetJsonPath = join(presetPath, 'preset.json');

  if (!existsSync(presetJsonPath)) {
    throw new Error(`Preset not found: ${presetId}`);
  }

  try {
    const content = readFileSync(presetJsonPath, 'utf-8');
    const preset = JSON.parse(content) as Preset;

    const errors = validatePreset(preset);
    if (errors.length) {
      throw new Error(
        `Invalid preset: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
      );
    }

    return preset;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load preset ${presetId}: ${error.message}`);
    }
    throw error;
  }
}

export function resolveInheritance(preset: Preset): ResolvedPreset {
  const resolved: ResolvedPreset = { ...preset, _resolved: true };

  if (!preset.inherits) {
    return resolved;
  }

  try {
    const parentPreset = loadPreset(preset.inherits);
    const parentResolved = resolveInheritance(parentPreset);

    resolved.files = {
      ...parentResolved.files,
      ...preset.files,
    };

    resolved.steps = [
      ...parentResolved.steps,
      ...preset.steps,
    ];
  } catch (error) {
    throw new Error(
      `Failed to resolve inheritance for ${preset.id}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return resolved;
}

export function listPresets(): PresetMetadata[] {
  const presetsDir = getPresetsDir();

  if (!existsSync(presetsDir)) {
    return [];
  }

  try {
    const dirs = readdirSync(presetsDir, { withFileTypes: true });

    const metadata: PresetMetadata[] = [];

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      try {
        const preset = loadPreset(dir.name);
        metadata.push({
          id: preset.id,
          name: preset.name,
          description: preset.description,
          inherits: preset.inherits,
        });
      } catch {
        continue;
      }
    }

    return metadata;
  } catch {
    return [];
  }
}

export function validatePreset(preset: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof preset !== 'object' || preset === null) {
    return [{ field: 'root', message: 'Preset must be an object' }];
  }

  const p = preset as Record<string, unknown>;

  if (typeof p.id !== 'string' || !p.id) {
    errors.push({ field: 'id', message: 'id is required and must be a string' });
  }

  if (typeof p.name !== 'string' || !p.name) {
    errors.push({
      field: 'name',
      message: 'name is required and must be a string',
    });
  }

  if (typeof p.description !== 'string') {
    errors.push({
      field: 'description',
      message: 'description must be a string',
    });
  }

  if (p.inherits && typeof p.inherits !== 'string') {
    errors.push({
      field: 'inherits',
      message: 'inherits must be a string if provided',
    });
  }

  if (!isValidFiles(p.files)) {
    errors.push({
      field: 'files',
      message: 'files must be an object with string keys and values',
    });
  }

  if (!Array.isArray(p.steps) || !p.steps.every(isValidStep)) {
    errors.push({
      field: 'steps',
      message: 'steps must be an array of valid Step objects',
    });
  }

  return errors;
}

function isValidFiles(files: unknown): boolean {
  if (typeof files !== 'object' || files === null) {
    return false;
  }

  const f = files as Record<string, unknown>;

  return Object.entries(f).every(
    ([key, value]) => typeof key === 'string' && typeof value === 'string'
  );
}

function isValidStep(step: unknown): boolean {
  if (typeof step !== 'object' || step === null) {
    return false;
  }

  const s = step as Record<string, unknown>;

  return (
    typeof s.id === 'string' &&
    typeof s.type === 'string' &&
    ['install-deps', 'run-command', 'generate-from-template', 'copy-file', 'copy-files'].includes(
      s.type as string
    ) &&
    (typeof s.description === 'string' || typeof s.description === 'undefined') &&
    (typeof s.order === 'number' || typeof s.order === 'undefined') &&
    (Array.isArray(s.dependsOn) ||
      typeof s.dependsOn === 'undefined') &&
    typeof s.config === 'object'
  );
}

export function detectVariablesInPreset(preset: Preset): string[] {
  const variables = new Set<string>();

  const variableRegex = /\{\{(\w+)\}\}/g;

  for (const filePath of Object.values(preset.files)) {
    const matches = filePath.matchAll(variableRegex);
    for (const match of matches) {
      variables.add(match[1]);
    }
  }

  for (const step of preset.steps) {
    if (step.type === 'run-command' && 'command' in step.config) {
      const config = step.config as unknown as { command: string };
      const matches = config.command.matchAll(variableRegex);
      for (const match of matches) {
        variables.add(match[1]);
      }
    }
  }

  return Array.from(variables).sort();
}
