import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectConflicts, resolveConflicts } from './apply/conflict-handler.ts';
import { executeSteps } from './apply/step-executor.ts';
import { green, yellow, red, cyan, write, SHOW_CURSOR } from './colors.ts';
import { recordApplication } from './history/tracker.ts';
import { detectPackageManager } from './package-manager/detector.ts';
import {
  createPresetInteractive,
  editPreset,
  deletePreset
} from './preset-creator.ts';
import {
  resolveInheritance,
  loadPreset,
  listPresets
} from './presets/loader.ts';
import type { ExecutionContext } from './types.ts';
import { printBanner, formatTime } from './ui.ts';
import {
  ensureSetupProDir,
  ensureHistoryDir,
  getProjectRoot,
  getPresetPath,
  setCustomPresetSource
} from './utils/paths.ts';
import { promptVariables } from './variables/prompter.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION: string = (() => {
  for (const base of [__dirname, join(__dirname, '..')]) {
    const p = join(base, 'package.json');
    if (!existsSync(p)) continue;
    try {
      const pkg = JSON.parse(readFileSync(p, 'utf-8'));
      if (pkg.name === 'setup-project') return pkg.version;
    } catch {}
  }
  return '0.0.0';
})();

process.on('SIGINT', () => {
  write(SHOW_CURSOR + '\n');
  process.exit(130);
});

type Command = 'preset' | 'apply' | 'help';
type PresetAction = 'create' | 'list' | 'delete' | 'edit' | 'open' | 'detail';

interface CliArgs {
  command: Command;
  presetName?: string;
  presetAction?: PresetAction;
  presetTarget?: string;
  source?: string;
  packageManager?: string;
  autoYes: boolean;
  dryRun: boolean;
  verbose: boolean;
}

function parseArgs(): CliArgs {
  const raw = process.argv.slice(2);
  const defaults = { autoYes: false, dryRun: false, verbose: false };

  if (!raw.length || raw.includes('--help') || raw.includes('-h')) {
    return { command: 'help', ...defaults };
  }

  const first = raw[0];
  const command: Command =
    first === 'preset' || first === 'apply' ? first : 'help';

  const consumed = new Set<number>([0]);
  let source: string | undefined;
  let packageManager: string | undefined;
  let autoYes = false;
  let dryRun = false;
  let verbose = false;

  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a === '--source' && raw[i + 1]) {
      source = raw[i + 1];
      consumed.add(i);
      consumed.add(i + 1);
      i++;
    } else if ((a === '--pm' || a === '--package-manager') && raw[i + 1]) {
      packageManager = raw[i + 1];
      consumed.add(i);
      consumed.add(i + 1);
      i++;
    } else if (a === '--yes' || a === '-y') {
      autoYes = true;
      consumed.add(i);
    } else if (a === '--dry-run') {
      dryRun = true;
      consumed.add(i);
    } else if (a === '--verbose' || a === '-v') {
      verbose = true;
      consumed.add(i);
    }
  }

  const result: CliArgs = {
    command,
    source,
    packageManager,
    autoYes,
    dryRun,
    verbose
  };

  if (command === 'apply') {
    for (let i = 1; i < raw.length; i++) {
      if (!consumed.has(i) && !raw[i].startsWith('-')) {
        result.presetName = raw[i];
        break;
      }
    }
  }

  if (command === 'preset') {
    const nameFlags = new Set(['--delete', '--edit', '--open', '--detail']);
    for (let i = 1; i < raw.length; i++) {
      if (consumed.has(i)) continue;
      const a = raw[i];
      if (a === '--create') {
        result.presetAction = 'create';
      } else if (a === '--list') {
        result.presetAction = 'list';
      } else if (nameFlags.has(a)) {
        result.presetAction = a.slice(2) as PresetAction;
        if (raw[i + 1] && !raw[i + 1].startsWith('-')) {
          result.presetTarget = raw[i + 1];
        }
        break;
      }
    }
  }

  return result;
}

function openPresetInEditor(presetId: string): void {
  const presetPath = getPresetPath(presetId);
  const editor = process.env['EDITOR'] || 'code';

  let r: SpawnSyncReturns<unknown>;

  if (process.platform === 'win32') {
    r = spawnSync(`${editor} ${presetPath}`, { shell: true });
  } else {
    r = spawnSync(editor, [presetPath]);
  }

  if (r.status === 0) return;

  console.log(`${cyan('Preset directory:')} ${presetPath}`);
}

function printHelp(): void {
  console.log(`
${cyan('setup-project CLI')} v${VERSION}

${green('USAGE')}
  uppro <command> [options]

${green('COMMANDS')}
  preset             Manage presets (use flags below)
  apply <preset>     Apply a preset to the current project
  help               Show this help message

${green('PRESET FLAGS')}
  --create           Create a new preset interactively
  --list             List all available presets
  --delete <name>    Delete a preset
  --edit <name>      Edit a preset
  --open <name>      Open preset directory in editor
  --detail <name>    Show preset details

${green('APPLY FLAGS')}
  --dry-run          Preview changes without applying
  --yes, -y          Skip confirmation prompts
  --pm, --package-manager <name>  Package manager (npm, yarn, pnpm, bun)

${green('GLOBAL FLAGS')}
  --source <dir>     Custom presets directory
  --pm, --package-manager <name>  Package manager to use
  --yes, -y          Skip confirmation prompts
  --dry-run          Preview without applying
  --verbose, -v      Verbose output
  -h, --help         Show this help message

${green('EXAMPLES')}
  uppro preset --create
  uppro preset --list
  uppro preset --delete my-preset
  uppro preset --detail react-base
  uppro apply react-base
  uppro apply react-base --dry-run
  uppro apply react-base --pm pnpm
  uppro apply react-base --source ./my-presets
`);
}

function printPresetHelp(): void {
  console.log(`
${cyan('Preset Management')}

${green('USAGE')}
  uppro preset <flag> [name]

${green('FLAGS')}
  --create           Create a new preset
  --list             List all presets
  --delete <name>    Delete a preset
  --edit <name>      Edit a preset
  --open <name>      Open preset in editor
  --detail <name>    Show preset details

${green('EXAMPLES')}
  uppro preset --create
  uppro preset --list
  uppro preset --delete my-preset
  uppro preset --edit react-base
  uppro preset --open react-base
  uppro preset --detail react-base
`);
}

async function handleList(): Promise<void> {
  console.log(`\n${cyan('Available Presets:')}\n`);

  const presets = listPresets();

  if (!presets.length) {
    console.log(`  ${yellow('No presets found')}`);
    return;
  }

  for (const preset of presets) {
    const inherits = preset.inherits
      ? ` ${cyan('(inherits:')} ${preset.inherits}${cyan(')')}`
      : '';
    console.log(`  ${green(preset.id)}`);
    console.log(`    ${preset.name}`);
    console.log(`    ${preset.description}${inherits}\n`);
  }
}

async function handleDetail(presetId: string): Promise<void> {
  try {
    const preset = loadPreset(presetId);
    const resolved = resolveInheritance(preset);

    console.log(`\n${cyan(preset.name)} (${presetId})`);
    if (preset.inherits) {
      console.log(`  Inherits: ${preset.inherits}`);
    }
    console.log(`  ${preset.description}`);

    if (Object.keys(resolved.files).length) {
      console.log(`\n  ${cyan('Files:')}`);
      for (const [dest, src] of Object.entries(resolved.files)) {
        console.log(`    ${dest} ← ${src}`);
      }
    }

    if (resolved.steps.length) {
      console.log(`\n  ${cyan('Steps:')}`);
      for (const step of resolved.steps) {
        console.log(`    ${step.id}: ${step.description || step.type}`);
      }
    }

    console.log();
  } catch (error) {
    console.error(
      `${red('Error:')} ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

async function handlePreset(args: CliArgs): Promise<void> {
  const { presetAction, presetTarget } = args;

  const requiresTarget = (action: string) =>
    ['delete', 'edit', 'open', 'detail'].includes(action);

  if (!presetAction) {
    printPresetHelp();
    return;
  }

  if (requiresTarget(presetAction) && !presetTarget) {
    console.error(`${red('Error:')} --${presetAction} requires a preset name`);
    process.exit(1);
  }

  try {
    switch (presetAction) {
      case 'create':
        await createPresetInteractive();
        break;
      case 'list':
        await handleList();
        break;
      case 'delete':
        await deletePreset(presetTarget!);
        break;
      case 'edit':
        await editPreset(presetTarget!);
        break;
      case 'open':
        openPresetInEditor(presetTarget!);
        break;
      case 'detail':
        await handleDetail(presetTarget!);
        break;
    }
  } catch (error) {
    console.error(
      `${red('Error:')} ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

async function handleApply(args: CliArgs): Promise<void> {
  if (!args.presetName) {
    console.error(
      `${red('Error:')} Preset name is required. Usage: uppro apply <preset>`
    );
    process.exit(1);
  }

  if (args.source) {
    setCustomPresetSource(args.source);
  }

  const startTime = Date.now();

  try {
    ensureSetupProDir();
    ensureHistoryDir();

    console.log(`\n${cyan('Loading preset...')} ${args.presetName}`);
    const preset = loadPreset(args.presetName);
    const resolved = resolveInheritance(preset);

    const projectRoot = getProjectRoot();
    console.log(`${cyan('Project root:')} ${projectRoot}`);

    console.log(`${cyan('Detecting package manager...')}`);
    const packageManager = args.packageManager
      ? {
          name: args.packageManager as any,
          installCommand: '',
          addCommand: '',
          version: '0.0.0'
        }
      : detectPackageManager(projectRoot);

    console.log(
      `${cyan('Package manager:')} ${packageManager.name} ${packageManager.version}`
    );

    const conflicts = detectConflicts(resolved, projectRoot);
    if (conflicts.length) {
      console.log(
        `\n${yellow('Found')} ${conflicts.length} ${conflicts.length === 1 ? 'conflict' : 'conflicts'}`
      );
      await resolveConflicts(conflicts);
      console.log('Conflicts resolved');
    }

    const context: ExecutionContext = {
      projectRoot,
      presetPath: getPresetPath(args.presetName),
      packageManager,
      dryRun: args.dryRun,
      verbose: args.verbose,
      variables: {}
    };

    console.log(`\n${cyan('Executing steps...')}`);
    const result = await executeSteps(resolved.steps, context);

    if (!result.success) {
      console.log(`\n${red('Errors:')}`);
      result.errors.forEach((err) => console.log(`  ${red('✗')} ${err}`));
    }

    if (result.stepsExecuted.length) {
      console.log(`\n${green('✓')} Preset applied successfully`);
      console.log(
        `  ${green(String(result.stepsExecuted.length))} steps executed`
      );

      recordApplication(preset, {
        filesCreated: [],
        filesModified: [],
        dependenciesInstalled: [],
        stepsExecuted: result.stepsExecuted
      });
    }

    const elapsed = Date.now() - startTime;
    console.log(`${cyan('Time:')} ${formatTime(elapsed)}\n`);
  } catch (error) {
    console.error(
      `\n${red('Error:')} ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  switch (args.command) {
    case 'help':
      await printBanner(VERSION);
      printHelp();
      break;
    case 'preset':
      await handlePreset(args);
      break;
    case 'apply':
      await handleApply(args);
      break;
    default:
      printHelp();
  }
}

main().catch((err) => {
  console.error(`\n${red('Error:')} ${err.message}\n`);
  process.exit(1);
});
