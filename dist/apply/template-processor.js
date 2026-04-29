import { readFileSync } from 'fs';
export function loadTemplate(templatePath) {
    try {
        return readFileSync(templatePath, 'utf-8');
    }
    catch (error) {
        throw new Error(`Failed to load template ${templatePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
export function processTemplate(content, variables) {
    let result = content;
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = content.matchAll(variableRegex);
    const missingVariables = new Set();
    for (const match of matches) {
        const varName = match[1];
        if (!(varName in variables)) {
            missingVariables.add(varName);
        }
    }
    if (missingVariables.size > 0) {
        throw new Error(`Missing variables in template: ${Array.from(missingVariables).join(', ')}`);
    }
    result = interpolateString(result, variables);
    return result;
}
export function interpolateString(str, variables) {
    let result = str;
    for (const [varName, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
        result = result.replace(regex, value);
    }
    return result;
}
export function detectVariablesInString(str) {
    const variables = new Set();
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = str.matchAll(variableRegex);
    for (const match of matches) {
        variables.add(match[1]);
    }
    return Array.from(variables).sort();
}
export function validateTemplateVariables(templateContent, providedVariables) {
    const required = detectVariablesInString(templateContent);
    const missing = required.filter((v) => !(v in providedVariables));
    return {
        valid: missing.length === 0,
        missing,
    };
}
