import { createInterface } from 'readline';
export async function promptVariables(variables) {
    const values = {};
    if (!variables.length) {
        return values;
    }
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    for (const variable of variables) {
        await new Promise((resolve) => {
            rl.question(`Enter value for ${variable}: `, (answer) => {
                values[variable] = answer;
                resolve();
            });
        });
    }
    rl.close();
    return values;
}
export function validateVariableInput(value, variable) {
    if (!value || !value.trim()) {
        return {
            valid: false,
            error: `${variable} cannot be empty`,
        };
    }
    return { valid: true };
}
