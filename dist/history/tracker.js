import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getHistoryDir, ensureHistoryDir } from "../utils/paths.js";
export function recordApplication(profile, changes) {
    ensureHistoryDir();
    const timestamp = new Date().toISOString();
    const entry = {
        timestamp,
        profileId: profile.id,
        profileVersion: profile.version,
        projectRoot: process.cwd(),
        packageManager: 'npm',
        changes,
    };
    const historyDir = getHistoryDir();
    const filename = timestamp.replace(/[:.]/g, '-');
    const filepath = join(historyDir, `${filename}.json`);
    writeFileSync(filepath, JSON.stringify(entry, null, 2), 'utf-8');
}
export function getHistory() {
    const historyDir = getHistoryDir();
    if (!existsSync(historyDir)) {
        return [];
    }
    try {
        const files = require('fs').readdirSync(historyDir);
        const entries = [];
        for (const file of files) {
            if (!file.endsWith('.json'))
                continue;
            try {
                const content = readFileSync(join(historyDir, file), 'utf-8');
                const entry = JSON.parse(content);
                entries.push(entry);
            }
            catch {
                continue;
            }
        }
        return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    catch {
        return [];
    }
}
export function getHistoryEntry(timestamp) {
    const historyDir = getHistoryDir();
    const filename = `${timestamp.replace(/[:.]/g, '-')}.json`;
    const filepath = join(historyDir, filename);
    if (!existsSync(filepath)) {
        return null;
    }
    try {
        const content = readFileSync(filepath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
