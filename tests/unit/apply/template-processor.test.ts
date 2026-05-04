import { test, describe } from 'node:test';
import { strictEqual, deepStrictEqual, throws } from 'node:assert';
import {
  interpolateString,
  detectVariablesInString,
  validateTemplateVariables,
  processTemplate,
} from '../../../src/apply/template-processor.ts';
import type { VariableMap } from '../../../src/types.ts';

describe('interpolateString', () => {
  test('substitutes a single variable', () => {
    const result = interpolateString('Hello {{name}}', { name: 'World' });
    strictEqual(result, 'Hello World');
  });

  test('substitutes multiple occurrences of the same variable', () => {
    const result = interpolateString('{{x}} and {{x}}', { x: 'value' });
    strictEqual(result, 'value and value');
  });

  test('substitutes multiple distinct variables', () => {
    const result = interpolateString('{{a}} {{b}} {{c}}', {
      a: 'one',
      b: 'two',
      c: 'three',
    });
    strictEqual(result, 'one two three');
  });

  test('does not modify strings without placeholders', () => {
    const input = 'No variables here';
    const result = interpolateString(input, {});
    strictEqual(result, input);
  });

  test('leaves variables not present in the map as literals', () => {
    const result = interpolateString('{{present}} {{absent}}', {
      present: 'yes',
    });
    strictEqual(result, 'yes {{absent}}');
  });

  test('replaces with empty string if variable value is empty', () => {
    const result = interpolateString('value: {{var}}', { var: '' });
    strictEqual(result, 'value: ');
  });
});

describe('detectVariablesInString', () => {
  test('returns empty array for empty string', () => {
    deepStrictEqual(detectVariablesInString(''), []);
  });

  test('returns empty array if no placeholders present', () => {
    deepStrictEqual(detectVariablesInString('plain text'), []);
  });

  test('detects a single placeholder', () => {
    deepStrictEqual(detectVariablesInString('{{name}}'), ['name']);
  });

  test('detects multiple distinct placeholders in alphabetical order', () => {
    deepStrictEqual(
      detectVariablesInString('{{user}} {{email}} {{age}}'),
      ['age', 'email', 'user']
    );
  });

  test('deduplicates repeated placeholders', () => {
    deepStrictEqual(detectVariablesInString('{{x}} {{x}} {{y}}'), ['x', 'y']);
  });

  test('detects variables with underscores', () => {
    deepStrictEqual(detectVariablesInString('{{my_var}}'), ['my_var']);
  });

  test('detects variables with numbers', () => {
    deepStrictEqual(detectVariablesInString('{{var123}}'), ['var123']);
  });
});

describe('validateTemplateVariables', () => {
  test('returns valid when no variables are required', () => {
    deepStrictEqual(
      validateTemplateVariables('plain text', {}),
      { valid: true, missing: [] }
    );
  });

  test('returns valid when all variables are provided', () => {
    const result = validateTemplateVariables('{{a}} {{b}}', {
      a: 'one',
      b: 'two',
    });
    deepStrictEqual(result, { valid: true, missing: [] });
  });

  test('returns invalid when a variable is missing', () => {
    const result = validateTemplateVariables('{{x}} {{y}}', { x: 'one' });
    deepStrictEqual(result, { valid: false, missing: ['y'] });
  });

  test('returns invalid when multiple variables are missing', () => {
    const result = validateTemplateVariables(
      '{{a}} {{b}} {{c}}',
      { a: 'one' }
    );
    deepStrictEqual(result, { valid: false, missing: ['b', 'c'] });
  });

  test('ignores provided variables that are not used', () => {
    const result = validateTemplateVariables('{{x}}', {
      x: 'one',
      y: 'two',
      z: 'three',
    });
    deepStrictEqual(result, { valid: true, missing: [] });
  });
});

describe('processTemplate', () => {
  test('processes template without variables', () => {
    const result = processTemplate('plain content', {});
    strictEqual(result, 'plain content');
  });

  test('processes template with all variables provided', () => {
    const result = processTemplate('Hello {{name}}, you are {{age}} years old', {
      name: 'John',
      age: '30',
    });
    strictEqual(result, 'Hello John, you are 30 years old');
  });

  test('throws error if a variable is missing', () => {
    throws(
      () => processTemplate('{{x}} {{y}}', { x: 'one' }),
      /Missing variables in template: y/
    );
  });

  test('throws error listing all missing variables', () => {
    throws(
      () => processTemplate('{{a}} {{b}} {{c}}', { a: 'one' }),
      /Missing variables in template/
    );
  });

  test('replaces multiple occurrences of the same variable', () => {
    const result = processTemplate('{{var}} and {{var}}', { var: 'value' });
    strictEqual(result, 'value and value');
  });
});
