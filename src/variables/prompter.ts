import { createInterface } from 'readline';
import type { VariableMap } from '../types.ts';

export async function promptVariables(
  variables: string[]
): Promise<VariableMap> {
  const values: VariableMap = {};

  if (!variables.length) {
    return values;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  for (const variable of variables) {
    await new Promise<void>((resolve) => {
      rl.question(
        `Enter value for ${variable}: `,
        (answer) => {
          values[variable] = answer;
          resolve();
        }
      );
    });
  }

  rl.close();

  return values;
}

export function validateVariableInput(
  value: string,
  variable: string
): { valid: boolean; error?: string } {
  if (!value || !value.trim()) {
    return {
      valid: false,
      error: `${variable} cannot be empty`,
    };
  }

  return { valid: true };
}
