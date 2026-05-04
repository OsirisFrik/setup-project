import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual } from 'node:assert';
import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { detectPackageManager } from '../../src/package-manager/detector.ts';

let testDir: string;

describe('detectPackageManager integration', () => {
  beforeEach(() => {
    testDir = join(tmpdir(), `uppro-pm-${randomBytes(4).toString('hex')}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test('detects npm from package-lock.json', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({}));
    writeFileSync(join(testDir, 'package-lock.json'), '{}');

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'npm');
  });

  test('detects yarn from yarn.lock', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({}));
    writeFileSync(join(testDir, 'yarn.lock'), '');

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'yarn');
  });

  test('detects pnpm from pnpm-lock.yaml', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({}));
    writeFileSync(join(testDir, 'pnpm-lock.yaml'), '');

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'pnpm');
  });

  test('detects bun from bun.lockb', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({}));
    writeFileSync(join(testDir, 'bun.lockb'), '');

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'bun');
  });

  test('defaults to npm when no lockfiles present', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({}));

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'npm');
  });

  test('detects from packageManager field in package.json', () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({ packageManager: 'pnpm@9.0.0' })
    );

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'pnpm');
  });

  test('packageManager field takes precedence over lockfiles', () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({ packageManager: 'yarn@4.0.0' })
    );
    writeFileSync(join(testDir, 'package-lock.json'), '{}');

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'yarn');
  });

  test('ignores invalid packageManager field', () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({ packageManager: 'unknown@1.0.0' })
    );
    writeFileSync(join(testDir, 'package-lock.json'), '{}');

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'npm');
  });

  test('bun.lockb has highest priority among lockfiles', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({}));
    writeFileSync(join(testDir, 'bun.lockb'), '');
    writeFileSync(join(testDir, 'pnpm-lock.yaml'), '');
    writeFileSync(join(testDir, 'yarn.lock'), '');
    writeFileSync(join(testDir, 'package-lock.json'), '{}');

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'bun');
  });

  test('pnpm-lock.yaml has higher priority than yarn.lock', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({}));
    writeFileSync(join(testDir, 'pnpm-lock.yaml'), '');
    writeFileSync(join(testDir, 'yarn.lock'), '');

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'pnpm');
  });

  test('returns PackageManager object with installCommand', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({}));
    writeFileSync(join(testDir, 'package-lock.json'), '{}');

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'npm');
    strictEqual(pm.installCommand, 'npm install');
  });

  test('returns PackageManager object with addCommand', () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({}));
    writeFileSync(join(testDir, 'yarn.lock'), '');

    const pm = detectPackageManager(testDir);
    strictEqual(pm.name, 'yarn');
    strictEqual(pm.addCommand, 'yarn add');
  });
});
