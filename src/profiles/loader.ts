import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getProfilePath, getProfilesDir } from '../utils/paths.ts';
import type {
  Profile,
  ResolvedProfile,
  ProfileMetadata,
  ValidationError,
} from '../types.ts';

export function loadProfile(profileId: string): Profile {
  const profilePath = getProfilePath(profileId);
  const profileJsonPath = join(profilePath, 'profile.json');

  if (!existsSync(profileJsonPath)) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  try {
    const content = readFileSync(profileJsonPath, 'utf-8');
    const profile = JSON.parse(content) as Profile;

    const errors = validateProfile(profile);
    if (errors.length) {
      throw new Error(
        `Invalid profile: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
      );
    }

    return profile;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load profile ${profileId}: ${error.message}`);
    }
    throw error;
  }
}

export function resolveInheritance(profile: Profile): ResolvedProfile {
  const resolved: ResolvedProfile = { ...profile, _resolved: true };

  if (!profile.inherits) {
    return resolved;
  }

  try {
    const parentProfile = loadProfile(profile.inherits);
    const parentResolved = resolveInheritance(parentProfile);

    resolved.dependencies = {
      prod: [
        ...parentResolved.dependencies.prod,
        ...profile.dependencies.prod,
      ],
      dev: [...parentResolved.dependencies.dev, ...profile.dependencies.dev],
    };

    resolved.files = {
      ...parentResolved.files,
      ...profile.files,
    };

    resolved.steps = [
      ...parentResolved.steps,
      ...profile.steps,
    ];
  } catch (error) {
    throw new Error(
      `Failed to resolve inheritance for ${profile.id}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return resolved;
}

export function listProfiles(): ProfileMetadata[] {
  const profilesDir = getProfilesDir();

  if (!existsSync(profilesDir)) {
    return [];
  }

  try {
    const dirs = readdirSync(profilesDir, { withFileTypes: true });

    const metadata: ProfileMetadata[] = [];

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      try {
        const profile = loadProfile(dir.name);
        metadata.push({
          id: profile.id,
          name: profile.name,
          description: profile.description,
          version: profile.version,
          inherits: profile.inherits,
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

export function validateProfile(profile: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof profile !== 'object' || profile === null) {
    return [{ field: 'root', message: 'Profile must be an object' }];
  }

  const p = profile as Record<string, unknown>;

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

  if (typeof p.version !== 'string' || !p.version) {
    errors.push({
      field: 'version',
      message: 'version is required and must be a string',
    });
  }

  if (p.inherits && typeof p.inherits !== 'string') {
    errors.push({
      field: 'inherits',
      message: 'inherits must be a string if provided',
    });
  }

  if (!isValidDependencies(p.dependencies)) {
    errors.push({
      field: 'dependencies',
      message:
        'dependencies must have prod and dev arrays',
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

function isValidDependencies(deps: unknown): boolean {
  if (typeof deps !== 'object' || deps === null) {
    return false;
  }

  const d = deps as Record<string, unknown>;

  return (
    Array.isArray(d.prod) &&
    d.prod.every((item) => typeof item === 'string') &&
    Array.isArray(d.dev) &&
    d.dev.every((item) => typeof item === 'string')
  );
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
    ['install-deps', 'run-command', 'generate-from-template', 'copy-file'].includes(
      s.type as string
    ) &&
    (typeof s.description === 'string' || typeof s.description === 'undefined') &&
    (typeof s.order === 'number' || typeof s.order === 'undefined') &&
    (Array.isArray(s.dependsOn) ||
      typeof s.dependsOn === 'undefined') &&
    typeof s.config === 'object'
  );
}

export function detectVariablesInProfile(profile: Profile): string[] {
  const variables = new Set<string>();

  const variableRegex = /\{\{(\w+)\}\}/g;

  for (const filePath of Object.values(profile.files)) {
    const matches = filePath.matchAll(variableRegex);
    for (const match of matches) {
      variables.add(match[1]);
    }
  }

  for (const step of profile.steps) {
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
