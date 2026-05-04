import { test, describe } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import {
  getInstallCommand,
  getAddCommand,
  getDevDependencyFlag,
  buildInstallCommand,
} from '../../../src/package-manager/detector.ts';
import type { PackageManager, PackageManagerName } from '../../../src/types.ts';

function makePackageManager(name: PackageManagerName): PackageManager {
  return {
    name,
    installCommand: getInstallCommand(name),
    addCommand: getAddCommand(name),
    version: '1.0.0',
  };
}

describe('getInstallCommand', () => {
  test('returns npm install for npm', () => {
    strictEqual(getInstallCommand('npm'), 'npm install');
  });

  test('returns yarn for yarn', () => {
    strictEqual(getInstallCommand('yarn'), 'yarn');
  });

  test('returns pnpm install for pnpm', () => {
    strictEqual(getInstallCommand('pnpm'), 'pnpm install');
  });

  test('returns bun install for bun', () => {
    strictEqual(getInstallCommand('bun'), 'bun install');
  });
});

describe('getAddCommand', () => {
  test('returns npm install for npm', () => {
    strictEqual(getAddCommand('npm'), 'npm install');
  });

  test('returns yarn add for yarn', () => {
    strictEqual(getAddCommand('yarn'), 'yarn add');
  });

  test('returns pnpm add for pnpm', () => {
    strictEqual(getAddCommand('pnpm'), 'pnpm add');
  });

  test('returns bun add for bun', () => {
    strictEqual(getAddCommand('bun'), 'bun add');
  });
});

describe('getDevDependencyFlag', () => {
  test('returns -D for npm', () => {
    strictEqual(getDevDependencyFlag('npm'), '-D');
  });

  test('returns -D for yarn', () => {
    strictEqual(getDevDependencyFlag('yarn'), '-D');
  });

  test('returns -D for pnpm', () => {
    strictEqual(getDevDependencyFlag('pnpm'), '-D');
  });

  test('returns -d (lowercase) for bun', () => {
    strictEqual(getDevDependencyFlag('bun'), '-d');
  });
});

describe('buildInstallCommand', () => {
  test('returns install command for empty package list', () => {
    const pm = makePackageManager('npm');
    strictEqual(buildInstallCommand(pm, []), 'npm install');
  });

  test('builds npm install command for production packages', () => {
    const pm = makePackageManager('npm');
    const result = buildInstallCommand(pm, ['react', 'vue'], false);
    // Command has extra space when no -D flag
    strictEqual(result, 'npm install  react vue');
  });

  test('builds npm install command for dev packages', () => {
    const pm = makePackageManager('npm');
    const result = buildInstallCommand(pm, ['typescript', 'eslint'], true);
    strictEqual(result, 'npm install -D typescript eslint');
  });

  test('builds yarn add command for production packages', () => {
    const pm = makePackageManager('yarn');
    const result = buildInstallCommand(pm, ['react'], false);
    strictEqual(result, 'yarn add  react');
  });

  test('builds yarn add command for dev packages', () => {
    const pm = makePackageManager('yarn');
    const result = buildInstallCommand(pm, ['typescript'], true);
    strictEqual(result, 'yarn add -D typescript');
  });

  test('builds pnpm add command for dev packages', () => {
    const pm = makePackageManager('pnpm');
    const result = buildInstallCommand(pm, ['typescript', 'vitest'], true);
    strictEqual(result, 'pnpm add -D typescript vitest');
  });

  test('builds bun add command with lowercase -d flag for dev packages', () => {
    const pm = makePackageManager('bun');
    const result = buildInstallCommand(pm, ['typescript'], true);
    strictEqual(result, 'bun add -d typescript');
  });

  test('builds bun add command for single production package', () => {
    const pm = makePackageManager('bun');
    const result = buildInstallCommand(pm, ['react'], false);
    strictEqual(result, 'bun add  react');
  });

  test('handles multiple packages correctly', () => {
    const pm = makePackageManager('pnpm');
    const result = buildInstallCommand(pm, ['react', 'react-dom', '@types/react'], false);
    strictEqual(result, 'pnpm add  react react-dom @types/react');
  });

  test('isDev parameter defaults to false when omitted', () => {
    const pm = makePackageManager('npm');
    const result = buildInstallCommand(pm, ['react']);
    // Without isDev param, should not include -D flag
    strictEqual(result, 'npm install  react');
  });
});
