import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { printBanner } from './ui.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION: string = (() => {
  for (const base of [__dirname, resolve(__dirname, '..')]) {
    const p = join(base, 'package.json');
    if (!existsSync(p)) continue;
    try {
      const pkg = JSON.parse(readFileSync(p, 'utf-8'));
      if (pkg.name === 'autoskills') return pkg.version;
    } catch {}
  }
  return '0.0.0';
})();

interface CliArgs {
  profile: string;
  autoYes: boolean;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
  clearCache: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const agents: string[] = [];
  const agentIdx = args.findIndex((a) => a === '-a' || a === '--agent');
  if (agentIdx !== -1) {
    for (let i = agentIdx + 1; i < args.length; i++) {
      if (args[i].startsWith('-')) break;
      agents.push(args[i]);
    }
  }

  const profileIndex = args.findIndex((a) => a === '-p' || a === '--profile');
  let profile: string | undefined;
  if (profileIndex !== -1) {
    profile = args[profileIndex + 1];
  }

  if (!profile) {
    console.error(
      `\n  ⚠ You must specify a profile to use.\n  Run \`setpro --help\` for more information.\n`
    );
    process.exit(1);
  }

  return {
    autoYes: args.includes('-y') || args.includes('--yes'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    help: args.includes('--help') || args.includes('-h'),
    clearCache: args.includes('--clear-cache'),
    profile
  };
}

async function main() {
  await printBanner(VERSION);

  const args = parseArgs();

  console.log(args);
}

main().catch((err) => {
  console.error(`\n Error: ${err.message}\n`);
  process.exit(1);
});
