import { test, describe, before, after } from 'node:test';
import {
  strictEqual,
  ok,
  throws,
} from 'node:assert';
import {
  mkdirSync,
  rmSync,
  readFileSync,
  existsSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import {
  writeFile,
  backupFile,
  writeFileWithBackup,
} from '../../src/apply/file-writer.ts';

const testDir = join(tmpdir(), `uppro-file-writer-${randomBytes(4).toString('hex')}`);

describe('file-writer integration', () => {
  before(() => {
    mkdirSync(testDir, { recursive: true });
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('writeFile', () => {
    test('creates file with content', () => {
      const filePath = join(testDir, 'test.txt');
      writeFile(filePath, 'Hello, World!');

      ok(existsSync(filePath));
      strictEqual(readFileSync(filePath, 'utf-8'), 'Hello, World!');
    });

    test('creates intermediate directories', () => {
      const filePath = join(testDir, 'subdir/nested/deep/file.txt');
      writeFile(filePath, 'nested content');

      ok(existsSync(filePath));
      strictEqual(readFileSync(filePath, 'utf-8'), 'nested content');
    });

    test('overwrites existing file', () => {
      const filePath = join(testDir, 'overwrite.txt');
      writeFile(filePath, 'original content');
      writeFile(filePath, 'new content');

      strictEqual(readFileSync(filePath, 'utf-8'), 'new content');
    });

    test('handles empty content', () => {
      const filePath = join(testDir, 'empty.txt');
      writeFile(filePath, '');

      ok(existsSync(filePath));
      strictEqual(readFileSync(filePath, 'utf-8'), '');
    });
  });

  describe('backupFile', () => {
    test('throws error if file does not exist', () => {
      const nonExistentPath = join(testDir, 'nonexistent.txt');

      throws(
        () => backupFile(nonExistentPath),
        /File does not exist/
      );
    });
  });

  describe('writeFileWithBackup', () => {
    test('writes file without backup if file does not exist', () => {
      const filePath = join(testDir, 'new-file.txt');
      writeFileWithBackup(filePath, 'new content');

      ok(existsSync(filePath));
      strictEqual(readFileSync(filePath, 'utf-8'), 'new content');
    });
  });
});
