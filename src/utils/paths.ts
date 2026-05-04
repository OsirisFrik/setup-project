import { mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

const SETUP_PRO_DIR_NAME = '.uppro';

let customPresetSource: string | null = null;

export function setCustomPresetSource(source: string): void {
  customPresetSource = source;
}

export function getCustomPresetSource(): string | null {
  return customPresetSource;
}

export function resetCustomPresetSource(): void {
  customPresetSource = null;
}

export function getSetupProDir(): string {
  return join(homedir(), SETUP_PRO_DIR_NAME);
}

export function getPresetsDir(): string {
  if (customPresetSource) {
    return customPresetSource;
  }
  return join(getSetupProDir(), 'presets');
}

export function getPresetPath(presetId: string): string {
  return join(getPresetsDir(), presetId);
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

export function ensurePresetsDir(): void {
  const dir = getPresetsDir();
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
