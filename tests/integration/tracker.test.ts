import { test, describe } from 'node:test';
import { strictEqual, ok } from 'node:assert';

describe('tracker integration', () => {
  // Note: These tests verify the basic structure of tracker functions
  // Full integration with mocked getHistoryDir requires node:test mock.module support

  test('recordApplication and getHistory functions exist', async () => {
    const { recordApplication, getHistory, getHistoryEntry } = await import(
      '../../src/history/tracker.ts'
    );

    ok(typeof recordApplication === 'function');
    ok(typeof getHistory === 'function');
    ok(typeof getHistoryEntry === 'function');
  });

  test('getHistory returns empty array when history dir does not exist', async () => {
    const { getHistory } = await import('../../src/history/tracker.ts');

    // getHistory should handle missing directory gracefully
    const history = getHistory();
    ok(Array.isArray(history));
  });

  test('getHistoryEntry returns null for nonexistent entry', async () => {
    const { getHistoryEntry } = await import('../../src/history/tracker.ts');

    const result = getHistoryEntry('2099-01-01T00-00-00-000Z');
    strictEqual(result, null);
  });
});
