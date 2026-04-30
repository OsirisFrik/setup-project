import { createInterface } from 'readline';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { getPresetPath, ensurePresetsDir } from './utils/paths.ts';
import { loadPreset } from './presets/loader.ts';
import type { Preset } from './types.ts';

async function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function createPresetInteractive(): Promise<void> {
  console.log('\n📋 Create New Preset\n');

  const id = await prompt('Preset ID (e.g., react-base): ');
  if (!id) throw new Error('Preset ID is required');

  const name = await prompt('Preset name (e.g., React Base Setup): ');
  if (!name) throw new Error('Preset name is required');

  const description = await prompt('Description: ');

  const inheritsRaw = await prompt('Inherit from another preset? (leave blank for none): ');
  const inherits = inheritsRaw || undefined;

  const preset: Preset = {
    id,
    name,
    description,
    inherits,
    dependencies: {
      prod: [],
      dev: [],
    },
    files: {},
    steps: [],
  };

  const prodDeps = await prompt('Production dependencies (comma-separated, or blank): ');
  if (prodDeps) {
    preset.dependencies.prod = prodDeps
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const devDeps = await prompt('Dev dependencies (comma-separated, or blank): ');
  if (devDeps) {
    preset.dependencies.dev = devDeps
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  ensurePresetsDir();
  const presetPath = getPresetPath(id);
  mkdirSync(presetPath, { recursive: true });
  mkdirSync(join(presetPath, 'templates'), { recursive: true });

  const presetJsonPath = join(presetPath, 'preset.json');
  writeFileSync(presetJsonPath, JSON.stringify(preset, null, 2), 'utf-8');

  console.log(`\n✓ Preset '${id}' created successfully`);
  console.log(`  Location: ${presetPath}`);
  console.log(`  Templates: ${join(presetPath, 'templates')}`);
}

export async function editPreset(presetId: string): Promise<void> {
  const preset = loadPreset(presetId);

  console.log(`\n📝 Edit Preset: ${presetId}\n`);
  console.log('Current preset:');
  console.log(JSON.stringify(preset, null, 2));

  const shouldEditDeps = await prompt(
    '\nEdit dependencies? (y/n): '
  );

  if (shouldEditDeps.toLowerCase() === 'y') {
    const prodDeps = await prompt('Production dependencies (comma-separated): ');
    if (prodDeps) {
      preset.dependencies.prod = prodDeps
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const devDeps = await prompt('Dev dependencies (comma-separated): ');
    if (devDeps) {
      preset.dependencies.dev = devDeps
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const presetPath = getPresetPath(presetId);
  const presetJsonPath = join(presetPath, 'preset.json');
  writeFileSync(presetJsonPath, JSON.stringify(preset, null, 2), 'utf-8');

  console.log(`\n✓ Preset '${presetId}' updated`);
}

export async function deletePreset(presetId: string): Promise<void> {
  const presetPath = getPresetPath(presetId);

  if (!existsSync(presetPath)) {
    throw new Error(`Preset not found: ${presetId}`);
  }

  const confirm = await prompt(
    `⚠ Are you sure you want to delete '${presetId}'? (y/N): `
  );

  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled');
    return;
  }

  rmSync(presetPath, { recursive: true, force: true });
  console.log(`✓ Preset '${presetId}' deleted`);
}
