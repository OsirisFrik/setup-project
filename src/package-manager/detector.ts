import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import type { PackageManager, PackageManagerName } from '../types.ts';

export function detectPackageManager(projectRoot: string): PackageManager {
  let detectedName: PackageManagerName | null = null;

  // First, check packageManager field in package.json
  const pmFromPackageJson = detectFromPackageJson(projectRoot);
  if (pmFromPackageJson) {
    detectedName = pmFromPackageJson;
  }

  // Then, check lock files
  if (!detectedName) {
    const lockFileOrder: Array<[string, PackageManagerName]> = [
      ['bun.lockb', 'bun'],
      ['pnpm-lock.yaml', 'pnpm'],
      ['yarn.lock', 'yarn'],
      ['package-lock.json', 'npm'],
    ];

    for (const [lockFile, name] of lockFileOrder) {
      if (existsSync(join(projectRoot, lockFile))) {
        detectedName = name;
        break;
      }
    }
  }

  // Default to npm
  if (!detectedName) {
    detectedName = 'npm';
  }

  const version = getPackageManagerVersion(detectedName);

  return {
    name: detectedName,
    installCommand: getInstallCommand(detectedName),
    addCommand: getAddCommand(detectedName),
    version,
  };
}

function detectFromPackageJson(projectRoot: string): PackageManagerName | null {
  try {
    const packageJsonPath = join(projectRoot, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return null;
    }

    const content = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content) as Record<string, unknown>;

    if (typeof packageJson.packageManager !== 'string') {
      return null;
    }

    // Extract package manager name from "pnpm@9.0.0" format
    const pmSpec = packageJson.packageManager as string;
    const pmName = pmSpec.split('@')[0];

    if (['npm', 'yarn', 'pnpm', 'bun'].includes(pmName)) {
      return pmName as PackageManagerName;
    }

    return null;
  } catch {
    return null;
  }
}

function getPackageManagerVersion(name: PackageManagerName): string {
  try {
    const output = execSync(`${name} --version`, { encoding: 'utf-8' }).trim();
    return output;
  } catch {
    return 'unknown';
  }
}

export function getInstallCommand(pm: PackageManagerName): string {
  const commands: Record<PackageManagerName, string> = {
    npm: 'npm install',
    yarn: 'yarn',
    pnpm: 'pnpm install',
    bun: 'bun install',
  };
  return commands[pm];
}

export function getAddCommand(pm: PackageManagerName): string {
  const commands: Record<PackageManagerName, string> = {
    npm: 'npm install',
    yarn: 'yarn add',
    pnpm: 'pnpm add',
    bun: 'bun add',
  };
  return commands[pm];
}

export function getDevDependencyFlag(pm: PackageManagerName): string {
  const flags: Record<PackageManagerName, string> = {
    npm: '-D',
    yarn: '-D',
    pnpm: '-D',
    bun: '-d',
  };
  return flags[pm];
}

export function buildInstallCommand(
  pm: PackageManager,
  packages: string[],
  isDev: boolean = false
): string {
  if (!packages.length) {
    return pm.installCommand;
  }

  const devFlag = isDev ? getDevDependencyFlag(pm.name) : '';
  const packageList = packages.join(' ');

  switch (pm.name) {
    case 'npm':
      return `npm install ${devFlag} ${packageList}`.trim();
    case 'yarn':
      return `yarn add ${devFlag} ${packageList}`.trim();
    case 'pnpm':
      return `pnpm add ${devFlag} ${packageList}`.trim();
    case 'bun':
      return `bun add ${devFlag} ${packageList}`.trim();
    default:
      return `npm install ${devFlag} ${packageList}`.trim();
  }
}
