import { test, describe } from 'node:test';
import { strictEqual } from 'node:assert';
import { formatTime } from '../../src/ui.ts';

describe('formatTime', () => {
  test('formats zero milliseconds', () => {
    strictEqual(formatTime(0), '0ms');
  });

  test('formats milliseconds for values less than 1000', () => {
    strictEqual(formatTime(500), '500ms');
    strictEqual(formatTime(999), '999ms');
  });

  test('formats exactly 1 second', () => {
    strictEqual(formatTime(1000), '1.0s');
  });

  test('formats seconds with decimal for values between 1000 and 59999', () => {
    strictEqual(formatTime(1500), '1.5s');
    strictEqual(formatTime(5000), '5.0s');
    strictEqual(formatTime(30000), '30.0s');
  });

  test('formats exactly 1 minute', () => {
    strictEqual(formatTime(60000), '1m 0s');
  });

  test('formats minutes and seconds for values 60000 or greater', () => {
    strictEqual(formatTime(90000), '1m 30s');
    strictEqual(formatTime(120000), '2m 0s');
    strictEqual(formatTime(125000), '2m 5s');
  });

  test('formats large time values in minutes and seconds', () => {
    strictEqual(formatTime(3661000), '61m 1s');
  });

  test('handles edge case near minute boundary', () => {
    strictEqual(formatTime(59999), '60.0s');
    strictEqual(formatTime(60001), '1m 0s');
  });
});
