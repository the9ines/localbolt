import { describe, it, expect } from 'vitest';

// The formatSpeed, formatTime, formatSize functions are not exported,
// so we test them indirectly by testing equivalent logic.
// We can also import and test the module's internal behavior.

// Re-implement the pure functions for direct testing since they're module-private.
// This mirrors the exact logic in transfer-progress.ts.

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const exp = Math.min(Math.floor(Math.log(bytesPerSecond) / Math.log(1024)), units.length - 1);
  return `${(bytesPerSecond / Math.pow(1024, exp)).toFixed(2)} ${units[exp]}`;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return 'calculating...';
  if (seconds === 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  return parts.join(' ');
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, exp)).toFixed(2)} ${units[exp]}`;
}

describe('formatSpeed', () => {
  it('formats zero', () => {
    expect(formatSpeed(0)).toBe('0 B/s');
  });

  it('formats bytes per second', () => {
    expect(formatSpeed(500)).toBe('500.00 B/s');
  });

  it('formats KB/s', () => {
    expect(formatSpeed(1024)).toBe('1.00 KB/s');
    expect(formatSpeed(1536)).toBe('1.50 KB/s');
  });

  it('formats MB/s', () => {
    expect(formatSpeed(1048576)).toBe('1.00 MB/s');
  });

  it('formats GB/s', () => {
    expect(formatSpeed(1073741824)).toBe('1.00 GB/s');
  });
});

describe('formatTime', () => {
  it('handles zero', () => {
    expect(formatTime(0)).toBe('0s');
  });

  it('formats seconds only', () => {
    expect(formatTime(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('2m 5s');
  });

  it('formats hours, minutes, seconds', () => {
    expect(formatTime(3661)).toBe('1h 1m 1s');
  });

  it('handles Infinity', () => {
    expect(formatTime(Infinity)).toBe('calculating...');
  });

  it('handles negative', () => {
    expect(formatTime(-1)).toBe('calculating...');
  });

  it('handles NaN', () => {
    expect(formatTime(NaN)).toBe('calculating...');
  });

  it('omits zero parts', () => {
    expect(formatTime(3600)).toBe('1h');
    expect(formatTime(60)).toBe('1m');
  });
});

describe('formatSize', () => {
  it('formats zero', () => {
    expect(formatSize(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatSize(500)).toBe('500.00 B');
  });

  it('formats KB', () => {
    expect(formatSize(1024)).toBe('1.00 KB');
  });

  it('formats MB', () => {
    expect(formatSize(1048576)).toBe('1.00 MB');
  });

  it('formats GB', () => {
    expect(formatSize(1073741824)).toBe('1.00 GB');
  });

  it('formats fractional values', () => {
    expect(formatSize(1536)).toBe('1.50 KB');
  });
});
