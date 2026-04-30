import { existsSync } from 'fs';
import { join } from 'path';
import type {
  Conflict,
  ConflictDecision,
  ConflictResolution,
  Preset,
} from '../types.ts';
import { multiSelect } from '../ui.ts';

export function detectConflicts(
  preset: Preset,
  projectRoot: string
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const [destination] of Object.entries(preset.files)) {
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

export async function resolveConflicts(
  conflicts: Conflict[]
): Promise<ConflictDecision[]> {
  if (!conflicts.length) {
    return [];
  }

  const decisions: ConflictDecision[] = [];

  for (const conflict of conflicts) {
    console.log(`\nHow to handle existing file: ${conflict.filePath}?`);

    const options = [
      { label: 'Overwrite', value: 'overwrite' as ConflictResolution },
      { label: 'Skip', value: 'skip' as ConflictResolution },
      { label: 'Rename', value: 'rename' as ConflictResolution },
    ];

    const selected = await multiSelect(
      options,
      {
        labelFn: (item) => item.label,
      }
    );

    const resolution = selected[0]?.value || 'skip';

    let renamed: string | undefined;
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

export function buildConflictDecisionMap(
  decisions: ConflictDecision[]
): Record<string, ConflictDecision> {
  const map: Record<string, ConflictDecision> = {};

  for (const decision of decisions) {
    map[decision.filePath] = decision;
  }

  return map;
}
