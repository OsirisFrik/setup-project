import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
export function detectPackageManager(projectRoot) {
    const lockFileOrder = [
        ['bun.lockb', 'bun'],
        ['pnpm-lock.yaml', 'pnpm'],
        ['yarn.lock', 'yarn'],
        ['package-lock.json', 'npm'],
    ];
    let detectedName = null;
    for (const [lockFile, name] of lockFileOrder) {
        if (existsSync(join(projectRoot, lockFile))) {
            detectedName = name;
            break;
        }
    }
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
function getPackageManagerVersion(name) {
    try {
        const output = execSync(`${name} --version`, { encoding: 'utf-8' }).trim();
        return output;
    }
    catch {
        return 'unknown';
    }
}
export function getInstallCommand(pm) {
    const commands = {
        npm: 'npm install',
        yarn: 'yarn',
        pnpm: 'pnpm install',
        bun: 'bun install',
    };
    return commands[pm];
}
export function getAddCommand(pm) {
    const commands = {
        npm: 'npm install',
        yarn: 'yarn add',
        pnpm: 'pnpm add',
        bun: 'bun add',
    };
    return commands[pm];
}
export function getDevDependencyFlag(pm) {
    const flags = {
        npm: '-D',
        yarn: '-D',
        pnpm: '-D',
        bun: '-d',
    };
    return flags[pm];
}
export function buildInstallCommand(pm, packages, isDev = false) {
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
