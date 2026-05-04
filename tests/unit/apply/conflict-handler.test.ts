import { test, describe } from 'node:test';
import { deepStrictEqual } from 'node:assert';
import { buildConflictDecisionMap } from '../../../src/apply/conflict-handler.ts';
import type { ConflictDecision } from '../../../src/types.ts';

describe('buildConflictDecisionMap', () => {
  test('returns empty object for empty decisions array', () => {
    deepStrictEqual(buildConflictDecisionMap([]), {});
  });

  test('builds map with single decision', () => {
    const decisions: ConflictDecision[] = [
      {
        filePath: 'src/app.ts',
        resolution: 'overwrite',
      },
    ];

    const result = buildConflictDecisionMap(decisions);
    deepStrictEqual(result, {
      'src/app.ts': {
        filePath: 'src/app.ts',
        resolution: 'overwrite',
      },
    });
  });

  test('builds map with multiple decisions', () => {
    const decisions: ConflictDecision[] = [
      {
        filePath: 'src/app.ts',
        resolution: 'overwrite',
      },
      {
        filePath: 'config.json',
        resolution: 'skip',
      },
      {
        filePath: 'README.md',
        resolution: 'rename',
        renamed: 'README.md.new',
      },
    ];

    const result = buildConflictDecisionMap(decisions);
    deepStrictEqual(result['src/app.ts'].resolution, 'overwrite');
    deepStrictEqual(result['config.json'].resolution, 'skip');
    deepStrictEqual(result['README.md'].renamed, 'README.md.new');
  });

  test('handles decisions with rename field', () => {
    const decisions: ConflictDecision[] = [
      {
        filePath: 'file.txt',
        resolution: 'rename',
        renamed: 'file.txt.new',
      },
    ];

    const result = buildConflictDecisionMap(decisions);
    deepStrictEqual(result['file.txt'].renamed, 'file.txt.new');
  });

  test('last decision wins if same filePath appears twice', () => {
    const decisions: ConflictDecision[] = [
      {
        filePath: 'same.txt',
        resolution: 'skip',
      },
      {
        filePath: 'same.txt',
        resolution: 'overwrite',
      },
    ];

    const result = buildConflictDecisionMap(decisions);
    deepStrictEqual(result['same.txt'].resolution, 'overwrite');
  });
});
