import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { printBanner, formatTime } from "./ui.js";
import { resolveInheritance, loadProfile, listProfiles } from "./profiles/loader.js";
import { detectPackageManager } from "./package-manager/detector.js";
import { promptVariables } from "./variables/prompter.js";
import { detectConflicts, resolveConflicts } from "./apply/conflict-handler.js";
import { executeSteps } from "./apply/step-executor.js";
import { ensureSetupProDir, ensureHistoryDir, getProjectRoot, getProfilePath, setCustomProfileSource, } from "./utils/paths.js";
import { recordApplication } from "./history/tracker.js";
import { createProfileInteractive, editProfile, deleteProfile, } from "./profile-creator.js";
import { green, yellow, red, cyan } from "./colors.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = (() => {
    for (const base of [__dirname, join(__dirname, '..')]) {
        const p = join(base, 'package.json');
        if (!existsSync(p))
            continue;
        try {
            const pkg = JSON.parse(readFileSync(p, 'utf-8'));
            if (pkg.name === 'setup-project')
                return pkg.version;
        }
        catch { }
    }
    return '0.0.0';
})();
function parseArgs() {
    const raw = process.argv.slice(2);
    const defaults = { autoYes: false, dryRun: false, verbose: false };
    if (!raw.length || raw.includes('--help') || raw.includes('-h')) {
        return { command: 'help', ...defaults };
    }
    const first = raw[0];
    const command = first === 'profile' || first === 'apply' ? first : 'help';
    const consumed = new Set([0]);
    let source;
    let packageManager;
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
        }
        else if ((a === '--pm' || a === '--package-manager') && raw[i + 1]) {
            packageManager = raw[i + 1];
            consumed.add(i);
            consumed.add(i + 1);
            i++;
        }
        else if (a === '--yes' || a === '-y') {
            autoYes = true;
            consumed.add(i);
        }
        else if (a === '--dry-run') {
            dryRun = true;
            consumed.add(i);
        }
        else if (a === '--verbose' || a === '-v') {
            verbose = true;
            consumed.add(i);
        }
    }
    const result = { command, source, packageManager, autoYes, dryRun, verbose };
    if (command === 'apply') {
        for (let i = 1; i < raw.length; i++) {
            if (!consumed.has(i) && !raw[i].startsWith('-')) {
                result.profileName = raw[i];
                break;
            }
        }
    }
    if (command === 'profile') {
        const nameFlags = new Set(['--delete', '--edit', '--open', '--detail']);
        for (let i = 1; i < raw.length; i++) {
            if (consumed.has(i))
                continue;
            const a = raw[i];
            if (a === '--create') {
                result.profileAction = 'create';
            }
            else if (a === '--list') {
                result.profileAction = 'list';
            }
            else if (nameFlags.has(a)) {
                result.profileAction = a.slice(2);
                if (raw[i + 1] && !raw[i + 1].startsWith('-')) {
                    result.profileTarget = raw[i + 1];
                }
                break;
            }
        }
    }
    return result;
}
function openProfileInEditor(profileId) {
    const profilePath = getProfilePath(profileId);
    const vscode = spawnSync('code', [profilePath], { shell: true });
    if (vscode.status === 0)
        return;
    const editor = process.env['EDITOR'];
    if (editor) {
        const r = spawnSync(editor, [profilePath], { shell: true });
        if (r.status === 0)
            return;
    }
    console.log(`${cyan('Profile directory:')} ${profilePath}`);
}
function printHelp() {
    console.log(`
${cyan('setup-project CLI')} v${VERSION}

${green('USAGE')}
  setpro <command> [options]

${green('COMMANDS')}
  profile            Manage profiles (use flags below)
  apply <profile>    Apply a profile to the current project
  help               Show this help message

${green('PROFILE FLAGS')}
  --create           Create a new profile interactively
  --list             List all available profiles
  --delete <name>    Delete a profile
  --edit <name>      Edit a profile
  --open <name>      Open profile directory in editor
  --detail <name>    Show profile details

${green('APPLY FLAGS')}
  --dry-run          Preview changes without applying
  --yes, -y          Skip confirmation prompts
  --pm, --package-manager <name>  Package manager (npm, yarn, pnpm, bun)

${green('GLOBAL FLAGS')}
  --source <dir>     Custom profiles directory
  --pm, --package-manager <name>  Package manager to use
  --yes, -y          Skip confirmation prompts
  --dry-run          Preview without applying
  --verbose, -v      Verbose output
  -h, --help         Show this help message

${green('EXAMPLES')}
  setpro profile --create
  setpro profile --list
  setpro profile --delete my-profile
  setpro profile --detail react-base
  setpro apply react-base
  setpro apply react-base --dry-run
  setpro apply react-base --pm pnpm
  setpro apply react-base --source ./my-profiles
`);
}
function printProfileHelp() {
    console.log(`
${cyan('Profile Management')}

${green('USAGE')}
  setpro profile <flag> [name]

${green('FLAGS')}
  --create           Create a new profile
  --list             List all profiles
  --delete <name>    Delete a profile
  --edit <name>      Edit a profile
  --open <name>      Open profile in editor
  --detail <name>    Show profile details

${green('EXAMPLES')}
  setpro profile --create
  setpro profile --list
  setpro profile --delete my-profile
  setpro profile --edit react-base
  setpro profile --open react-base
  setpro profile --detail react-base
`);
}
async function handleList() {
    console.log(`\n${cyan('Available Profiles:')}\n`);
    const profiles = listProfiles();
    if (!profiles.length) {
        console.log(`  ${yellow('No profiles found')}`);
        return;
    }
    for (const profile of profiles) {
        const inherits = profile.inherits
            ? ` ${cyan('(inherits:')} ${profile.inherits}${cyan(')')}`
            : '';
        console.log(`  ${green(profile.id)}`);
        console.log(`    ${profile.name}`);
        console.log(`    ${profile.description}${inherits}\n`);
    }
}
async function handleDetail(profileId) {
    try {
        const profile = loadProfile(profileId);
        const resolved = resolveInheritance(profile);
        console.log(`\n${cyan(profile.name)} (${profileId})`);
        console.log(`  Version: ${profile.version}`);
        if (profile.inherits) {
            console.log(`  Inherits: ${profile.inherits}`);
        }
        console.log(`  ${profile.description}`);
        if (resolved.dependencies.prod.length ||
            resolved.dependencies.dev.length) {
            console.log(`\n  ${cyan('Dependencies:')}`);
            if (resolved.dependencies.prod.length) {
                console.log(`    Production: ${resolved.dependencies.prod.join(', ')}`);
            }
            if (resolved.dependencies.dev.length) {
                console.log(`    Development: ${resolved.dependencies.dev.join(', ')}`);
            }
        }
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
    }
    catch (error) {
        console.error(`${red('Error:')} ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}
async function handleProfile(args) {
    const { profileAction, profileTarget } = args;
    const requiresTarget = (action) => ['delete', 'edit', 'open', 'detail'].includes(action);
    if (!profileAction) {
        printProfileHelp();
        return;
    }
    if (requiresTarget(profileAction) && !profileTarget) {
        console.error(`${red('Error:')} --${profileAction} requires a profile name`);
        process.exit(1);
    }
    try {
        switch (profileAction) {
            case 'create':
                await createProfileInteractive();
                break;
            case 'list':
                await handleList();
                break;
            case 'delete':
                await deleteProfile(profileTarget);
                break;
            case 'edit':
                await editProfile(profileTarget);
                break;
            case 'open':
                openProfileInEditor(profileTarget);
                break;
            case 'detail':
                await handleDetail(profileTarget);
                break;
        }
    }
    catch (error) {
        console.error(`${red('Error:')} ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}
async function handleApply(args) {
    if (!args.profileName) {
        console.error(`${red('Error:')} Profile name is required. Usage: setpro apply <profile>`);
        process.exit(1);
    }
    if (args.source) {
        setCustomProfileSource(args.source);
    }
    const startTime = Date.now();
    try {
        ensureSetupProDir();
        ensureHistoryDir();
        console.log(`\n${cyan('Loading profile...')} ${args.profileName}`);
        const profile = loadProfile(args.profileName);
        const resolved = resolveInheritance(profile);
        const projectRoot = getProjectRoot();
        console.log(`${cyan('Project root:')} ${projectRoot}`);
        console.log(`${cyan('Detecting package manager...')}`);
        const packageManager = args.packageManager
            ? {
                name: args.packageManager,
                installCommand: '',
                addCommand: '',
                version: '0.0.0',
            }
            : detectPackageManager(projectRoot);
        console.log(`${cyan('Package manager:')} ${packageManager.name} ${packageManager.version}`);
        console.log(`\n${cyan('Prompting for variables...')}`);
        const variables = await promptVariables(resolved.steps
            .flatMap((s) => {
            if (s.type === 'run-command') {
                const cmd = s.config.command;
                const matches = cmd.match(/\{\{(\w+)\}\}/g) || [];
                return matches.map((m) => m.replace(/\{\{|\}\}/g, ''));
            }
            return [];
        })
            .filter((v, i, arr) => arr.indexOf(v) === i));
        const conflicts = detectConflicts(resolved, projectRoot);
        if (conflicts.length) {
            console.log(`\n${yellow('Found')} ${conflicts.length} ${conflicts.length === 1 ? 'conflict' : 'conflicts'}`);
            await resolveConflicts(conflicts);
            console.log('Conflicts resolved');
        }
        const context = {
            projectRoot,
            packageManager,
            variables,
            dryRun: args.dryRun,
            verbose: args.verbose,
        };
        console.log(`\n${cyan('Executing steps...')}`);
        const result = await executeSteps(resolved.steps, context);
        if (!result.success) {
            console.log(`\n${red('Errors:')}`);
            result.errors.forEach((err) => console.log(`  ${red('✗')} ${err}`));
        }
        if (result.stepsExecuted.length) {
            console.log(`\n${green('✓')} Profile applied successfully`);
            console.log(`  ${green(String(result.stepsExecuted.length))} steps executed`);
            recordApplication(profile, {
                filesCreated: [],
                filesModified: [],
                dependenciesInstalled: [],
                stepsExecuted: result.stepsExecuted,
            });
        }
        const elapsed = Date.now() - startTime;
        console.log(`${cyan('Time:')} ${formatTime(elapsed)}\n`);
    }
    catch (error) {
        console.error(`\n${red('Error:')} ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
    }
}
async function main() {
    await printBanner(VERSION);
    const args = parseArgs();
    switch (args.command) {
        case 'help':
            printHelp();
            break;
        case 'profile':
            await handleProfile(args);
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
