import { test, describe } from 'node:test';
import { deepStrictEqual } from 'node:assert';
import { validateVariableInput } from '../../../src/variables/prompter.ts';

describe('validateVariableInput', () => {
  test('returns valid for string with content', () => {
    deepStrictEqual(validateVariableInput('value', 'myVar'), {
      valid: true,
    });
  });

  test('returns valid for string with surrounding whitespace', () => {
    deepStrictEqual(validateVariableInput('  value  ', 'myVar'), {
      valid: true,
    });
  });

  test('returns invalid for empty string', () => {
    deepStrictEqual(validateVariableInput('', 'myVar'), {
      valid: false,
      error: 'myVar cannot be empty',
    });
  });

  test('returns invalid for string with only whitespace', () => {
    deepStrictEqual(validateVariableInput('   ', 'myVar'), {
      valid: false,
      error: 'myVar cannot be empty',
    });
  });

  test('includes variable name in error message', () => {
    const result = validateVariableInput('', 'customVarName');
    deepStrictEqual(result, {
      valid: false,
      error: 'customVarName cannot be empty',
    });
  });

  test('accepts values with numbers and special characters', () => {
    deepStrictEqual(validateVariableInput('value-123_abc!', 'myVar'), {
      valid: true,
    });
  });
});
