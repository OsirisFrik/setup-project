import { test, describe, afterEach } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { join } from 'path';
import { homedir } from 'os';
import {
  getPresetsDir,
  getPresetPath,
  setCustomPresetSource,
  getCustomPresetSource,
  resetCustomPresetSource,
  getSetupProDir,
} from '../../../src/utils/paths.ts';

describe('paths utilities', () => {
  afterEach(() => {
    resetCustomPresetSource();
  });

  describe('getSetupProDir', () => {
    test('returns .setuppro directory under home', () => {
      const result = getSetupProDir();
      strictEqual(result, join(homedir(), '.setuppro'));
    });
  });

  describe('getPresetsDir', () => {
    test('returns default presets dir when no custom source is set', () => {
      const result = getPresetsDir();
      strictEqual(result, join(homedir(), '.setuppro', 'presets'));
    });

    test('returns custom preset source when set', () => {
      const customPath = '/tmp/custom-presets';
      setCustomPresetSource(customPath);
      strictEqual(getPresetsDir(), customPath);
    });

    test('returns default presets dir after reset', () => {
      setCustomPresetSource('/tmp/custom');
      resetCustomPresetSource();
      strictEqual(getPresetsDir(), join(homedir(), '.setuppro', 'presets'));
    });
  });

  describe('getPresetPath', () => {
    test('returns path to preset in default dir', () => {
      const result = getPresetPath('my-preset');
      strictEqual(result, join(homedir(), '.setuppro', 'presets', 'my-preset'));
    });

    test('returns path to preset in custom dir', () => {
      const customDir = '/tmp/presets';
      setCustomPresetSource(customDir);
      const result = getPresetPath('my-preset');
      strictEqual(result, join(customDir, 'my-preset'));
    });
  });

  describe('setCustomPresetSource and getCustomPresetSource', () => {
    test('returns null when no custom source is set', () => {
      strictEqual(getCustomPresetSource(), null);
    });

    test('stores and retrieves custom preset source', () => {
      const customPath = '/custom/path';
      setCustomPresetSource(customPath);
      strictEqual(getCustomPresetSource(), customPath);
    });

    test('updates custom preset source when set multiple times', () => {
      setCustomPresetSource('/first');
      setCustomPresetSource('/second');
      strictEqual(getCustomPresetSource(), '/second');
    });

    test('allows resetting custom source back to null', () => {
      setCustomPresetSource('/tmp/presets');
      ok(getCustomPresetSource() !== null);
      resetCustomPresetSource();
      strictEqual(getCustomPresetSource(), null);
    });
  });

  describe('resetCustomPresetSource', () => {
    test('clears the custom preset source', () => {
      setCustomPresetSource('/some/path');
      resetCustomPresetSource();
      strictEqual(getCustomPresetSource(), null);
    });

    test('affects getPresetsDir after reset', () => {
      setCustomPresetSource('/custom');
      resetCustomPresetSource();
      strictEqual(getPresetsDir(), join(homedir(), '.setuppro', 'presets'));
    });
  });
});
