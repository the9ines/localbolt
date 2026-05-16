import { describe, it, expect } from 'vitest';
import { formatSpeed, formatTime, formatSize } from '@the9ines/localbolt-browser';

describe('formatSpeed (SDK canonical)', () => {
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

describe('formatTime (SDK canonical)', () => {
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

describe('formatSize (SDK canonical)', () => {
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
