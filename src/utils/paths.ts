import { homedir } from 'os';
import { join, resolve } from 'path';
import { mkdirSync } from 'fs';

const SETUP_PRO_DIR_NAME = '.setuppro';

let customProfileSource: string | null = null;

export function setCustomProfileSource(source: string): void {
  customProfileSource = source;
}

export function getCustomProfileSource(): string | null {
  return customProfileSource;
}

export function getSetupProDir(): string {
  return join(homedir(), SETUP_PRO_DIR_NAME);
}

export function getProfilesDir(): string {
  if (customProfileSource) {
    return customProfileSource;
  }
  return join(getSetupProDir(), 'profiles');
}

export function getProfilePath(profileId: string): string {
  return join(getProfilesDir(), profileId);
}

export function getCacheDir(): string {
  return join(getSetupProDir(), '.cache');
}

export function getHistoryDir(): string {
  return join(getSetupProDir(), '.history');
}

export function getProjectRoot(): string {
  let current = process.cwd();

  while (current !== '/') {
    try {
      require.resolve(join(current, 'package.json'));
      return current;
    } catch {
      const parent = resolve(current, '..');
      if (parent === current) break;
      current = parent;
    }
  }

  return process.cwd();
}

export function ensureSetupProDir(): void {
  const dir = getSetupProDir();
  mkdirSync(dir, { recursive: true });
}

export function ensureProfilesDir(): void {
  const dir = getProfilesDir();
  mkdirSync(dir, { recursive: true });
}

export function ensureCacheDir(): void {
  const dir = getCacheDir();
  mkdirSync(dir, { recursive: true });
}

export function ensureHistoryDir(): void {
  const dir = getHistoryDir();
  mkdirSync(dir, { recursive: true });
}
