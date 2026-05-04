import { test, describe } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { validatePreset, detectVariablesInPreset } from '../../../src/presets/loader.ts';
import type { Preset } from '../../../src/types.ts';

const validPresetMinimal: Preset = {
  id: 'test-preset',
  name: 'Test Preset',
  description: 'A test preset',
  files: {},
  steps: [],
};

describe('validatePreset', () => {
  test('returns empty array for valid preset', () => {
    deepStrictEqual(validatePreset(validPresetMinimal), []);
  });

  test('returns error for null preset', () => {
    const errors = validatePreset(null);
    strictEqual(errors.length, 1);
    strictEqual(errors[0].field, 'root');
  });

  test('returns errors for empty object', () => {
    const errors = validatePreset({});
    strictEqual(errors.length > 0, true);
  });

  test('returns error for missing id', () => {
    const preset = { ...validPresetMinimal, id: undefined };
    const errors = validatePreset(preset);
    const idError = errors.find((e) => e.field === 'id');
    strictEqual(!!idError, true);
  });

  test('returns error for empty id string', () => {
    const preset = { ...validPresetMinimal, id: '' };
    const errors = validatePreset(preset);
    const idError = errors.find((e) => e.field === 'id');
    strictEqual(!!idError, true);
  });

  test('returns error for non-string id', () => {
    const preset = { ...validPresetMinimal, id: 123 };
    const errors = validatePreset(preset);
    const idError = errors.find((e) => e.field === 'id');
    strictEqual(!!idError, true);
  });

  test('returns error for missing name', () => {
    const preset = { ...validPresetMinimal, name: undefined };
    const errors = validatePreset(preset);
    const nameError = errors.find((e) => e.field === 'name');
    strictEqual(!!nameError, true);
  });

  test('returns error for non-string description', () => {
    const preset = { ...validPresetMinimal, description: 123 };
    const errors = validatePreset(preset);
    const descError = errors.find((e) => e.field === 'description');
    strictEqual(!!descError, true);
  });

  test('returns error for non-string inherits', () => {
    const preset = { ...validPresetMinimal, inherits: 123 };
    const errors = validatePreset(preset);
    const inheritsError = errors.find((e) => e.field === 'inherits');
    strictEqual(!!inheritsError, true);
  });

  test('does not return error for missing inherits', () => {
    const preset = { ...validPresetMinimal };
    const errors = validatePreset(preset);
    const inheritsError = errors.find((e) => e.field === 'inherits');
    strictEqual(!!inheritsError, false);
  });

  test('returns error for invalid files (not object)', () => {
    const preset = { ...validPresetMinimal, files: 'not an object' };
    const errors = validatePreset(preset);
    const filesError = errors.find((e) => e.field === 'files');
    strictEqual(!!filesError, true);
  });

  test('returns error for invalid files (non-string values)', () => {
    const preset = {
      ...validPresetMinimal,
      files: { 'dest.ts': 123 },
    };
    const errors = validatePreset(preset);
    const filesError = errors.find((e) => e.field === 'files');
    strictEqual(!!filesError, true);
  });

  test('returns error for non-array steps', () => {
    const preset = { ...validPresetMinimal, steps: 'not array' };
    const errors = validatePreset(preset);
    const stepsError = errors.find((e) => e.field === 'steps');
    strictEqual(!!stepsError, true);
  });

  test('returns error for invalid step type', () => {
    const preset = {
      ...validPresetMinimal,
      steps: [
        {
          id: 'step1',
          type: 'invalid-type',
          config: {},
        },
      ],
    };
    const errors = validatePreset(preset);
    const stepsError = errors.find((e) => e.field === 'steps');
    strictEqual(!!stepsError, true);
  });

  test('accepts valid run-command step', () => {
    const preset: Preset = {
      ...validPresetMinimal,
      steps: [
        {
          id: 'step1',
          type: 'run-command',
          config: { type: 'run-command', command: 'npm run build' },
        },
      ],
    };
    const errors = validatePreset(preset);
    strictEqual(errors.length, 0);
  });

  test('accepts step with order and description', () => {
    const preset: Preset = {
      ...validPresetMinimal,
      steps: [
        {
          id: 'step1',
          type: 'run-command',
          description: 'Build the project',
          order: 1,
          config: { type: 'run-command', command: 'npm run build' },
        },
      ],
    };
    const errors = validatePreset(preset);
    strictEqual(errors.length, 0);
  });

  test('returns error for non-string step id', () => {
    const preset = {
      ...validPresetMinimal,
      steps: [
        {
          id: 123,
          type: 'run-command',
          config: {},
        },
      ],
    };
    const errors = validatePreset(preset);
    const stepsError = errors.find((e) => e.field === 'steps');
    strictEqual(!!stepsError, true);
  });
});

describe('detectVariablesInPreset', () => {
  test('returns empty array for preset without variables', () => {
    const preset: Preset = {
      id: 'test',
      name: 'test',
      description: 'test',
      files: {
        'src/app.ts': 'content without variables',
      },
      steps: [],
    };
    deepStrictEqual(detectVariablesInPreset(preset), []);
  });

  test('detects variable in template path (file value)', () => {
    const preset: Preset = {
      id: 'test',
      name: 'test',
      description: 'test',
      files: {
        'src/app.ts': 'src/templates/{{appName}}.ts',
      },
      steps: [],
    };
    deepStrictEqual(detectVariablesInPreset(preset), ['appName']);
  });

  test('detects variables in run-command step', () => {
    const preset: Preset = {
      id: 'test',
      name: 'test',
      description: 'test',
      files: {},
      steps: [
        {
          id: 'step1',
          type: 'run-command',
          config: {
            type: 'run-command',
            command: 'npm install {{packages}}',
          },
        },
      ],
    };
    deepStrictEqual(detectVariablesInPreset(preset), ['packages']);
  });

  test('deduplicates repeated variables', () => {
    const preset: Preset = {
      id: 'test',
      name: 'test',
      description: 'test',
      files: {
        'src/app.ts': 'templates/{{name}}/app-{{name}}.ts',
      },
      steps: [],
    };
    deepStrictEqual(detectVariablesInPreset(preset), ['name']);
  });

  test('returns variables sorted alphabetically', () => {
    const preset: Preset = {
      id: 'test',
      name: 'test',
      description: 'test',
      files: {
        'src/app.ts': 'templates/{{z}}/{{a}}/{{m}}.ts',
      },
      steps: [],
    };
    deepStrictEqual(detectVariablesInPreset(preset), ['a', 'm', 'z']);
  });

  test('ignores variables in non-run-command steps', () => {
    const preset: Preset = {
      id: 'test',
      name: 'test',
      description: 'test',
      files: {
        'src/app.ts': 'templates/{{fileVar}}.ts',
      },
      steps: [
        {
          id: 'step1',
          type: 'install-deps',
          config: {
            type: 'install-deps',
            packages: ['react'],
            isDev: false,
          },
        },
      ],
    };
    deepStrictEqual(detectVariablesInPreset(preset), ['fileVar']);
  });

  test('combines variables from files and run-command steps', () => {
    const preset: Preset = {
      id: 'test',
      name: 'test',
      description: 'test',
      files: {
        'src/app.ts': 'templates/{{appName}}.ts',
      },
      steps: [
        {
          id: 'step1',
          type: 'run-command',
          config: {
            type: 'run-command',
            command: 'echo {{version}}',
          },
        },
      ],
    };
    deepStrictEqual(detectVariablesInPreset(preset), ['appName', 'version']);
  });
});
