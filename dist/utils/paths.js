import { homedir } from 'os';
import { join, resolve } from 'path';
import { mkdirSync } from 'fs';
const SETUP_PRO_DIR_NAME = '.setuppro';
let customProfileSource = null;
export function setCustomProfileSource(source) {
    customProfileSource = source;
}
export function getCustomProfileSource() {
    return customProfileSource;
}
export function getSetupProDir() {
    return join(homedir(), SETUP_PRO_DIR_NAME);
}
export function getProfilesDir() {
    if (customProfileSource) {
        return customProfileSource;
    }
    return join(getSetupProDir(), 'profiles');
}
export function getProfilePath(profileId) {
    return join(getProfilesDir(), profileId);
}
export function getCacheDir() {
    return join(getSetupProDir(), '.cache');
}
export function getHistoryDir() {
    return join(getSetupProDir(), '.history');
}
export function getProjectRoot() {
    let current = process.cwd();
    while (current !== '/') {
        try {
            require.resolve(join(current, 'package.json'));
            return current;
        }
        catch {
            const parent = resolve(current, '..');
            if (parent === current)
                break;
            current = parent;
        }
    }
    return process.cwd();
}
export function ensureSetupProDir() {
    const dir = getSetupProDir();
    mkdirSync(dir, { recursive: true });
}
export function ensureProfilesDir() {
    const dir = getProfilesDir();
    mkdirSync(dir, { recursive: true });
}
export function ensureCacheDir() {
    const dir = getCacheDir();
    mkdirSync(dir, { recursive: true });
}
export function ensureHistoryDir() {
    const dir = getHistoryDir();
    mkdirSync(dir, { recursive: true });
}
