import { test, describe } from 'node:test';
import { deepStrictEqual } from 'node:assert';
import { orderSteps } from '../../../src/apply/step-executor.ts';
import type { Step } from '../../../src/types.ts';

function makeStep(id: string, order?: number): Step {
  return {
    id,
    type: 'run-command',
    config: { type: 'run-command', command: 'echo test' },
    ...(order !== undefined ? { order } : {}),
  };
}

describe('orderSteps', () => {
  test('returns empty array for empty input', () => {
    deepStrictEqual(orderSteps([]), []);
  });

  test('maintains original order when no order field is set', () => {
    const steps = [makeStep('a'), makeStep('b'), makeStep('c')];
    const result = orderSteps(steps);
    deepStrictEqual(result.map((s) => s.id), ['a', 'b', 'c']);
  });

  test('sorts by order field when present', () => {
    const steps = [
      makeStep('a', 3),
      makeStep('b', 1),
      makeStep('c', 2),
    ];
    const result = orderSteps(steps);
    deepStrictEqual(result.map((s) => s.id), ['b', 'c', 'a']);
  });

  test('uses original index as tiebreaker for same order', () => {
    const steps = [
      makeStep('a', 1),
      makeStep('b', 1),
      makeStep('c', 1),
    ];
    const result = orderSteps(steps);
    deepStrictEqual(result.map((s) => s.id), ['a', 'b', 'c']);
  });

  test('mixes steps with and without order field', () => {
    const steps = [
      makeStep('a'),       // no order, index 0
      makeStep('b', 2),    // order 2
      makeStep('c'),       // no order, index 2
      makeStep('d', 1),    // order 1
    ];
    const result = orderSteps(steps);
    // Sorting by _order: 0 (a), 2 (b), 2 (c), 1 (d)
    // Expected: a (order 0), d (order 1), b (order 2), c (order 2)
    // Actually: order values are 0, 2, 2, 1
    // So sorted: 0, 1, 2, 2 -> a, d, b, c
    deepStrictEqual(result.map((s) => s.id), ['a', 'd', 'b', 'c']);
  });

  test('handles steps with order 0', () => {
    const steps = [
      makeStep('a', 2),
      makeStep('b', 0),
      makeStep('c', 1),
    ];
    const result = orderSteps(steps);
    deepStrictEqual(result.map((s) => s.id), ['b', 'c', 'a']);
  });

  test('preserves step properties during ordering', () => {
    const steps = [
      {
        id: 'step1',
        type: 'install-deps',
        config: {
          type: 'install-deps',
          packages: ['react'],
          isDev: false,
        },
        order: 2,
      } as Step,
      {
        id: 'step2',
        type: 'run-command',
        config: { type: 'run-command', command: 'npm run build' },
        order: 1,
      } as Step,
    ];
    const result = orderSteps(steps);
    deepStrictEqual(result[0].id, 'step2');
    deepStrictEqual(result[0].type, 'run-command');
    deepStrictEqual(result[1].id, 'step1');
    deepStrictEqual(result[1].type, 'install-deps');
  });
});
