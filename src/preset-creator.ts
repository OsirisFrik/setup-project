import { createInterface } from 'readline';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { getPresetPath, ensurePresetsDir } from './utils/paths.ts';
import { loadPreset } from './presets/loader.ts';
import type { Preset } from './types.ts';

const PRESET_SCHEMA_URL = 'https://raw.githubusercontent.com/OsirisFrik/setup-project/refs/heads/main/preset.schema.json';

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

  const prodDeps = await prompt('Production dependencies (comma-separated, or blank): ');
  const prodDepsArray = prodDeps
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const devDeps = await prompt('Dev dependencies (comma-separated, or blank): ');
  const devDepsArray = devDeps
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const preset: Preset = {
    id,
    name,
    description,
    inherits,
    files: {},
    steps: [],
  };

  // Auto-add install-deps step if dependencies exist
  if (prodDepsArray.length || devDepsArray.length) {
    preset.steps.push({
      id: 'install-deps',
      type: 'install-deps',
      description: 'Install dependencies',
      config: {
        type: 'install-deps',
        packages: {
          prod: prodDepsArray,
          dev: devDepsArray,
        },
      },
    });
  }

  ensurePresetsDir();
  const presetPath = getPresetPath(id);
  mkdirSync(presetPath, { recursive: true });
  mkdirSync(join(presetPath, 'templates'), { recursive: true });

  const presetJsonPath = join(presetPath, 'preset.json');
  const presetWithSchema = {
    $schema: PRESET_SCHEMA_URL,
    ...preset,
  };
  writeFileSync(presetJsonPath, JSON.stringify(presetWithSchema, null, 2), 'utf-8');

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
    const prodDepsArray = prodDeps
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const devDeps = await prompt('Dev dependencies (comma-separated): ');
    const devDepsArray = devDeps
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Update or add install-deps step based on dependencies
    const hasDependencies =
      prodDepsArray.length || devDepsArray.length;
    const hasInstallStep = preset.steps.some((s) => s.id === 'install-deps');

    if (hasDependencies && !hasInstallStep) {
      preset.steps.unshift({
        id: 'install-deps',
        type: 'install-deps',
        description: 'Install dependencies',
        config: {
          type: 'install-deps',
          packages: {
            prod: prodDepsArray,
            dev: devDepsArray,
          },
        },
      });
    } else if (hasDependencies && hasInstallStep) {
      // Update existing install-deps step with new dependencies
      const installStep = preset.steps.find((s) => s.id === 'install-deps');
      if (installStep) {
        installStep.config = {
          type: 'install-deps',
          packages: {
            prod: prodDepsArray,
            dev: devDepsArray,
          },
        };
      }
    } else if (!hasDependencies && hasInstallStep) {
      preset.steps = preset.steps.filter((s) => s.id !== 'install-deps');
    }
  }

  const presetPath = getPresetPath(presetId);
  const presetJsonPath = join(presetPath, 'preset.json');
  const presetWithSchema = {
    $schema: PRESET_SCHEMA_URL,
    ...preset,
  };
  writeFileSync(presetJsonPath, JSON.stringify(presetWithSchema, null, 2), 'utf-8');

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
