import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';

export function writeFile(filePath: string, content: string): void {
  try {
    const dir = dirname(filePath);

    mkdirSync(dir, { recursive: true });

    writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function backupFile(filePath: string): string {
  try {
    if (!existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = dirname(filePath);
    const ext = filePath.includes('.') ? '' : '.backup';
    const backupPath = join(
      dir,
      `${filePath.split('/').pop()}.backup.${timestamp}${ext}`
    );

    copyFileSync(filePath, backupPath);

    return backupPath;
  } catch (error) {
    throw new Error(
      `Failed to backup file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function writeFileWithBackup(filePath: string, content: string): void {
  if (existsSync(filePath)) {
    backupFile(filePath);
  }

  writeFile(filePath, content);
}
