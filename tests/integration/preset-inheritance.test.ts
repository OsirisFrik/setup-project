import { test, describe, beforeEach, afterEach } from 'node:test';
import {
  strictEqual,
  deepStrictEqual,
  throws,
} from 'node:assert';
import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import {
  loadPreset,
  resolveInheritance,
} from '../../src/presets/loader.ts';
import {
  setCustomPresetSource,
  resetCustomPresetSource,
} from '../../src/utils/paths.ts';
import type { Preset } from '../../src/types.ts';

let testPresetsDir: string;

describe('preset inheritance integration', () => {
  beforeEach(() => {
    testPresetsDir = join(tmpdir(), `uppro-presets-${randomBytes(4).toString('hex')}`);
    mkdirSync(testPresetsDir, { recursive: true });
    setCustomPresetSource(testPresetsDir);
  });

  afterEach(() => {
    resetCustomPresetSource();
    rmSync(testPresetsDir, { recursive: true, force: true });
  });

  describe('loadPreset', () => {
    test('loads valid preset from disk', () => {
      const presetDir = join(testPresetsDir, 'test-preset');
      mkdirSync(presetDir, { recursive: true });

      const preset: Preset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'A test preset',
        files: {
          'src/app.ts': 'src/templates/app.ts',
        },
        steps: [],
      };

      writeFileSync(
        join(presetDir, 'preset.json'),
        JSON.stringify(preset)
      );

      const loaded = loadPreset('test-preset');
      strictEqual(loaded.id, 'test-preset');
      strictEqual(loaded.name, 'Test Preset');
    });

    test('throws error for nonexistent preset', () => {
      throws(
        () => loadPreset('nonexistent'),
        /Preset not found/
      );
    });

    test('throws error for invalid JSON', () => {
      const presetDir = join(testPresetsDir, 'invalid-preset');
      mkdirSync(presetDir, { recursive: true });
      writeFileSync(
        join(presetDir, 'preset.json'),
        'invalid json {'
      );

      throws(
        () => loadPreset('invalid-preset'),
        /Failed to load preset/
      );
    });

    test('throws error for invalid preset structure', () => {
      const presetDir = join(testPresetsDir, 'bad-structure');
      mkdirSync(presetDir, { recursive: true });
      writeFileSync(
        join(presetDir, 'preset.json'),
        JSON.stringify({ name: 'Missing id' })
      );

      throws(
        () => loadPreset('bad-structure'),
        /Invalid preset/
      );
    });
  });

  describe('resolveInheritance', () => {
    test('returns preset with _resolved flag when no inheritance', () => {
      const preset: Preset = {
        id: 'base',
        name: 'Base',
        description: 'Base preset',
        files: { 'a.ts': 'template-a.ts' },
        steps: [
          {
            id: 'step1',
            type: 'run-command',
            config: { type: 'run-command', command: 'echo base' },
          },
        ],
      };

      const resolved = resolveInheritance(preset);
      strictEqual(resolved._resolved, true);
      deepStrictEqual(resolved.files, { 'a.ts': 'template-a.ts' });
    });

    test('merges files from parent preset', () => {
      // Create parent preset
      const parentDir = join(testPresetsDir, 'parent');
      mkdirSync(parentDir, { recursive: true });
      const parent: Preset = {
        id: 'parent',
        name: 'Parent',
        description: 'Parent preset',
        files: { 'base.ts': 'template-base.ts' },
        steps: [],
      };
      writeFileSync(join(parentDir, 'preset.json'), JSON.stringify(parent));

      // Create child preset
      const childDir = join(testPresetsDir, 'child');
      mkdirSync(childDir, { recursive: true });
      const child: Preset = {
        id: 'child',
        name: 'Child',
        description: 'Child preset',
        inherits: 'parent',
        files: { 'app.ts': 'template-app.ts' },
        steps: [],
      };
      writeFileSync(join(childDir, 'preset.json'), JSON.stringify(child));

      const resolved = resolveInheritance(child);
      deepStrictEqual(resolved.files, {
        'base.ts': 'template-base.ts',
        'app.ts': 'template-app.ts',
      });
    });

    test('child files override parent files with same path', () => {
      // Create parent
      const parentDir = join(testPresetsDir, 'parent2');
      mkdirSync(parentDir, { recursive: true });
      const parent: Preset = {
        id: 'parent2',
        name: 'Parent',
        description: 'Parent',
        files: { 'config.json': 'template-parent.json' },
        steps: [],
      };
      writeFileSync(join(parentDir, 'preset.json'), JSON.stringify(parent));

      // Create child with same file
      const childDir = join(testPresetsDir, 'child2');
      mkdirSync(childDir, { recursive: true });
      const child: Preset = {
        id: 'child2',
        name: 'Child',
        description: 'Child',
        inherits: 'parent2',
        files: { 'config.json': 'template-child.json' },
        steps: [],
      };
      writeFileSync(join(childDir, 'preset.json'), JSON.stringify(child));

      const resolved = resolveInheritance(child);
      strictEqual(resolved.files['config.json'], 'template-child.json');
    });

    test('concatenates steps from parent and child', () => {
      // Create parent
      const parentDir = join(testPresetsDir, 'parent3');
      mkdirSync(parentDir, { recursive: true });
      const parent: Preset = {
        id: 'parent3',
        name: 'Parent',
        description: 'Parent',
        files: {},
        steps: [
          {
            id: 'parent-step',
            type: 'run-command',
            config: { type: 'run-command', command: 'echo parent' },
          },
        ],
      };
      writeFileSync(join(parentDir, 'preset.json'), JSON.stringify(parent));

      // Create child
      const childDir = join(testPresetsDir, 'child3');
      mkdirSync(childDir, { recursive: true });
      const child: Preset = {
        id: 'child3',
        name: 'Child',
        description: 'Child',
        inherits: 'parent3',
        files: {},
        steps: [
          {
            id: 'child-step',
            type: 'run-command',
            config: { type: 'run-command', command: 'echo child' },
          },
        ],
      };
      writeFileSync(join(childDir, 'preset.json'), JSON.stringify(child));

      const resolved = resolveInheritance(child);
      strictEqual(resolved.steps.length, 2);
      strictEqual(resolved.steps[0].id, 'parent-step');
      strictEqual(resolved.steps[1].id, 'child-step');
    });

    test('throws error for nonexistent parent preset', () => {
      const childDir = join(testPresetsDir, 'orphan');
      mkdirSync(childDir, { recursive: true });
      const child: Preset = {
        id: 'orphan',
        name: 'Orphan',
        description: 'No parent',
        inherits: 'nonexistent-parent',
        files: {},
        steps: [],
      };
      writeFileSync(join(childDir, 'preset.json'), JSON.stringify(child));

      throws(
        () => resolveInheritance(child),
        /Failed to resolve inheritance/
      );
    });

    test('supports multi-level inheritance', () => {
      // Create grandparent
      const gpDir = join(testPresetsDir, 'grandparent');
      mkdirSync(gpDir, { recursive: true });
      const gp: Preset = {
        id: 'grandparent',
        name: 'GP',
        description: 'GP',
        files: { 'gp.ts': 'gp-template.ts' },
        steps: [
          {
            id: 'gp-step',
            type: 'run-command',
            config: { type: 'run-command', command: 'echo gp' },
          },
        ],
      };
      writeFileSync(join(gpDir, 'preset.json'), JSON.stringify(gp));

      // Create parent
      const pDir = join(testPresetsDir, 'parent4');
      mkdirSync(pDir, { recursive: true });
      const p: Preset = {
        id: 'parent4',
        name: 'P',
        description: 'P',
        inherits: 'grandparent',
        files: { 'p.ts': 'p-template.ts' },
        steps: [
          {
            id: 'p-step',
            type: 'run-command',
            config: { type: 'run-command', command: 'echo p' },
          },
        ],
      };
      writeFileSync(join(pDir, 'preset.json'), JSON.stringify(p));

      // Create child
      const cDir = join(testPresetsDir, 'child4');
      mkdirSync(cDir, { recursive: true });
      const c: Preset = {
        id: 'child4',
        name: 'C',
        description: 'C',
        inherits: 'parent4',
        files: { 'c.ts': 'c-template.ts' },
        steps: [
          {
            id: 'c-step',
            type: 'run-command',
            config: { type: 'run-command', command: 'echo c' },
          },
        ],
      };
      writeFileSync(join(cDir, 'preset.json'), JSON.stringify(c));

      const resolved = resolveInheritance(c);
      deepStrictEqual(resolved.files, {
        'gp.ts': 'gp-template.ts',
        'p.ts': 'p-template.ts',
        'c.ts': 'c-template.ts',
      });
      strictEqual(resolved.steps.length, 3);
      strictEqual(resolved.steps[0].id, 'gp-step');
      strictEqual(resolved.steps[1].id, 'p-step');
      strictEqual(resolved.steps[2].id, 'c-step');
    });
  });
});
