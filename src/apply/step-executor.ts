import { execSync } from 'child_process';
import { join } from 'path';

import { buildInstallCommand } from '../package-manager/detector.ts';
import type {
  Step,
  ExecutionContext,
  ExecutionResult,
  CopyFileStepConfig,
  CopyFilesStepConfig,
  GenerateFromTemplateStepConfig,
  InstallDepsStepConfig,
  RunCommandStepConfig
} from '../types.ts';
import { promptVariables } from '../variables/prompter.ts';
import { writeFile } from './file-writer.ts';
import {
  loadTemplate,
  processTemplate,
  detectVariablesInString
} from './template-processor.ts';

export function orderSteps(steps: Step[]): Step[] {
  const stepsWithOrder = steps.map((step, index) => ({
    ...step,
    _index: index,
    _order: step.order ?? index
  }));

  const sorted = stepsWithOrder.sort((a, b) => {
    if (a._order !== b._order) {
      return a._order - b._order;
    }
    return a._index - b._index;
  });

  return sorted as Step[];
}

function detectVariablesInStep(step: Step): string[] {
  const variables = new Set<string>();

  if (step.type === 'run-command') {
    const config = step.config as RunCommandStepConfig;
    detectVariablesInString(config.command).forEach((v) => variables.add(v));
  } else if (step.type === 'generate-from-template') {
    const config = step.config as GenerateFromTemplateStepConfig;
    for (const file of config.files) {
      if (file.variables) {
        Object.keys(file.variables).forEach((v) => variables.add(v));
      }
    }
  }

  return Array.from(variables).sort();
}

export async function executeSteps(
  steps: Step[],
  context: ExecutionContext
): Promise<ExecutionResult> {
  const result: ExecutionResult = {
    success: true,
    stepsExecuted: [],
    output: [],
    errors: []
  };

  const orderedSteps = orderSteps(steps);
  const completedSteps = new Set<string>();

  for (const step of orderedSteps) {
    try {
      if (step.dependsOn) {
        for (const dependency of step.dependsOn) {
          if (!completedSteps.has(dependency)) {
            throw new Error(
              `Dependency '${dependency}' not completed before step '${step.id}'`
            );
          }
        }
      }

      const requiredVariables = detectVariablesInStep(step);
      const missingVariables = requiredVariables.filter(
        (v) => !(v in context.variables)
      );

      if (missingVariables.length > 0 && !context.dryRun) {
        const newVariables = await promptVariables(missingVariables);
        context.variables = { ...context.variables, ...newVariables };
      }

      const output = await executeStep(step, context);

      if (context.verbose || context.dryRun) {
        console.log(`[${step.id}] ${step.description || step.type}`);
        if (output) {
          console.log(output);
        }
      }

      result.stepsExecuted.push(step.id);
      if (output) {
        result.output.push(`${step.id}: ${output}`);
      }

      completedSteps.add(step.id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.success = false;
      result.errors.push(`Step '${step.id}' failed: ${errorMsg}`);

      if (!context.dryRun) {
        break;
      }
    }
  }

  return result;
}

async function executeStep(
  step: Step,
  context: ExecutionContext
): Promise<string> {
  if (context.dryRun) {
    return `[DRY RUN] Would execute ${step.type}`;
  }

  switch (step.type) {
    case 'install-deps':
      return executeInstallDeps(step, context);
    case 'run-command':
      return executeRunCommand(step, context);
    case 'generate-from-template':
      return executeGenerateFromTemplate(step, context);
    case 'copy-file':
      return executeCopyFile(step, context);
    case 'copy-files':
      return executeCopyFiles(step, context);
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

async function executeInstallDeps(
  step: Step,
  context: ExecutionContext
): Promise<string> {
  const config = step.config as InstallDepsStepConfig;
  const prodDeps = config.packages?.prod || [];
  const devDeps = config.packages?.dev || [];

  if (!prodDeps.length && !devDeps.length) {
    return buildInstallCommand(context.packageManager, []);
  }

  const outputs: string[] = [];

  if (prodDeps.length) {
    const cmd = buildInstallCommand(context.packageManager, prodDeps, false);
    executeCommand(cmd, context.projectRoot);
    outputs.push(`Installed prod dependencies: ${prodDeps.join(', ')}`);
  }

  if (devDeps.length) {
    const cmd = buildInstallCommand(context.packageManager, devDeps, true);
    executeCommand(cmd, context.projectRoot);
    outputs.push(`Installed dev dependencies: ${devDeps.join(', ')}`);
  }

  return outputs.join('\n');
}

async function executeRunCommand(
  step: Step,
  context: ExecutionContext
): Promise<string> {
  const config = step.config as RunCommandStepConfig;
  let command = config.command;

  for (const [varName, value] of Object.entries(context.variables)) {
    const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
    command = command.replace(regex, value);
  }

  return executeCommand(command, context.projectRoot);
}

async function executeGenerateFromTemplate(
  step: Step,
  context: ExecutionContext
): Promise<string> {
  const config = step.config as GenerateFromTemplateStepConfig;
  const outputs: string[] = [];

  for (const file of config.files) {
    const templatePath = join(context.presetPath, file.template);
    const templateContent = loadTemplate(templatePath);

    const allVariables = { ...file.variables, ...context.variables };
    const processed = processTemplate(templateContent, allVariables);

    const destination = join(context.projectRoot, file.destination);
    writeFile(destination, processed);

    outputs.push(`Generated ${file.destination}`);
  }

  return outputs.join('\n');
}

async function executeCopyFile(
  step: Step,
  context: ExecutionContext
): Promise<string> {
  const config = step.config as CopyFileStepConfig;
  const source = join(context.presetPath, config.source);
  const destination = join(context.projectRoot, config.destination);

  const content = loadTemplate(source);
  writeFile(destination, content);

  return `Copied ${config.source} to ${config.destination}`;
}

async function executeCopyFiles(
  step: Step,
  context: ExecutionContext
): Promise<string> {
  const config = step.config as CopyFilesStepConfig;
  const outputs: string[] = [];

  for (const file of config.files) {
    const source = join(context.presetPath, file);
    const destinationPath = join(
      context.projectRoot,
      config.destination,
      file.split('/').pop() || ''
    );

    const content = loadTemplate(source);
    writeFile(destinationPath, content);

    outputs.push(`Copied ${file} to ${config.destination}`);
  }

  return outputs.join('\n');
}

async function executeCommand(command: string, cwd: string): Promise<string> {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return output.trim();
  } catch (error) {
    if (error instanceof Error && 'stdout' in error) {
      const stdout =
        ((error as Record<string, unknown>).stdout as string) || '';
      const stderr =
        ((error as Record<string, unknown>).stderr as string) || '';
      throw new Error(`Command failed: ${command}\n${stdout}\n${stderr}`);
    }
    throw new Error(
      `Command failed: ${command}\n${error instanceof Error ? error.message : String(error)}`
    );
  }
}
