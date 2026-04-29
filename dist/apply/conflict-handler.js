import { existsSync } from 'fs';
import { join } from 'path';
import { multiSelect } from "../ui.js";
export function detectConflicts(profile, projectRoot) {
    const conflicts = [];
    for (const [destination] of Object.entries(profile.files)) {
        const filePath = join(projectRoot, destination);
        if (existsSync(filePath)) {
            conflicts.push({
                filePath: destination,
                exists: true,
            });
        }
    }
    return conflicts;
}
export async function resolveConflicts(conflicts) {
    if (!conflicts.length) {
        return [];
    }
    const decisions = [];
    for (const conflict of conflicts) {
        console.log(`\nHow to handle existing file: ${conflict.filePath}?`);
        const options = [
            { label: 'Overwrite', value: 'overwrite' },
            { label: 'Skip', value: 'skip' },
            { label: 'Rename', value: 'rename' },
        ];
        const selected = await multiSelect(options, {
            labelFn: (item) => item.label,
        });
        const resolution = selected[0]?.value || 'skip';
        let renamed;
        if (resolution === 'rename') {
            renamed = `${conflict.filePath}.new`;
        }
        decisions.push({
            filePath: conflict.filePath,
            resolution,
            renamed,
        });
    }
    return decisions;
}
export function buildConflictDecisionMap(decisions) {
    const map = {};
    for (const decision of decisions) {
        map[decision.filePath] = decision;
    }
    return map;
}
